import {Region} from "./World/Region.mjs";
import REGION_SD from "./World/RegionSD.mjs";
import BlockRegistry from "./Block/BlockRegistry.mjs";
import SVM from "./Libraries/SVM/SVM.mjs";
import SVMUtils from "./Libraries/SVM/SVMUtils.mjs";
import {GetHeight, ReSeed} from "./GetHeight.mjs";
import * as DataManager from "./World/LoadManager/DataManager.mjs";

ReSeed(17); //This is for pasting trees..

class NoData8Exception extends Error {
  constructor() {
    super("Ran out of Data8 memory.");
    this.name = "NoData8Exception";
  }
}

let Requests = 0;
let RequestsWhenLastGC = 0;
let RequestsWhenLastCheck = 0;
let Structures = [];

if(self.gc) void function CollectGarbage(){
  self.setTimeout(CollectGarbage, 1000);
  let RequestsSinceLastGC = Requests - RequestsWhenLastGC;
  let RequestsSinceLastCheck = Requests - RequestsWhenLastCheck;
  if(RequestsSinceLastGC > 2000 && RequestsSinceLastCheck < 4){
    //Do a GC if there have been a lot of requests AND if the worker isn't busy.
    self.gc();
    RequestsWhenLastGC = Requests;
  }
  RequestsWhenLastCheck = Requests;
}();

function Hash(x){
  x = ((x >>> 16) ^ x) * 0x045d9f3b;
  x = ((x >>> 16) ^ x) * 0x045d9f3b;
  x = (x >>> 16) ^ x;
  return x / 0xffffffff + .5;
}

//Yes, it's not actually random and yes, it's good enough.
function RandomValue(X, Y, Z){
  let w = ((X & 0xfff) << 20) | ((Y & 0xff) << 12) | (Z & 0xfff);
  w = ((w >>> 16) ^ w) * 0x045d9f3b;
  w = ((w >>> 16) ^ w) * 0x045d9f3b;
  w = (w >>> 16) ^ w;
  return w / 0xffffffff + .5;
}

const EventHandler = {};

self.onmessage = function(Event){
  EventHandler[Event.data.Request]?.(Event.data);
};

let MainBlockRegistry;
let RequiredRegions;
let OwnQueueSize;
let ScaledDistancedPointMap = [];

let VoxelTypes, Data1, Data8, Data64;
let AllocationIndex, AllocationArray;
let AllocationIndex64, AllocationArray64;
let Data64Offset;

function AllocateData8(StartIndex8, x8, y8, z8){
  const Index = Atomics.add(AllocationIndex, 0, 1) & (AllocationArray.length - 1);
  const Location = Atomics.exchange(AllocationArray, Index, 2147483647); //Probably doesn't need to be atomic. Setting 2147483647 to mark location as invalid.
  if(Location === 2147483647){
    Atomics.sub(AllocationIndex, 0, 1);
    throw new NoData8Exception;
  }
  Data8[(StartIndex8 << 9) | (x8 << 6) | (y8 << 3) | z8] = Location | 0x40000000;
  return Location;
}

function AllocateData64(x64, y64, z64, Depth){
  const Index = Atomics.add(AllocationIndex64, 0, 1) & 4095;
  const Location64 = Atomics.exchange(AllocationArray64, Index, 65535);
  //IMP/ORTANT: This sets the empty bit to not empty (1). It will have to be re-set manually if the Data64 is not deallocated. This is done because this might cause loading issues later.
  Data64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64] &=~(1 << 15);
  Data64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64] &=~0b0000111111111111; //Reset any previous location.
  //I can't just set it directly because I need to preserve the load state which should be 1 (started loading).
  Data64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64] |= Location64; //This is the StartIndex8 used in the other function.
  return Location64;
}

function DeallocateData8(Index8){
  const Location = Data8[Index8];
  if((Location & 0x80000000) !== 0) return;
  if((Location & 0x10000000) === 0){ //Doesn't have uniform type, so has to deallocate Data1 and VoxelTypes memory
    const DeallocIndex = Atomics.add(AllocationIndex, 1, 1) & (AllocationArray.length - 1);
    Atomics.store(AllocationArray, DeallocIndex, Location);
  }
  Data8[Index8] = 0x80000000;
}

function DeallocateData64(Location64, x64, y64, z64, Depth){
  const DeallocIndex = Atomics.add(AllocationIndex64, 1, 1) & 4095; //Indexing 1 for deallocation.
  Atomics.store(AllocationArray64, DeallocIndex, Location64); //Add location back to the allocation array to be reused.
  Data64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64] &=~0b1000111111111111; //Reset previous location and existence marker.
  Data64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64] |= 0b1000000000000000; //Set existence marker to indicate that it's empty.
}

EventHandler.InitialiseBlockRegistry = function(Data){
  MainBlockRegistry = BlockRegistry.Initialise(Data.BlockIDMapping, Data.BlockIdentifierMapping);
};

EventHandler.TransferRequiredRegionsArray = function(Data){
  RequiredRegions = Data.RequiredRegions;
};

EventHandler.ShareDataBuffers = function(Data){
  VoxelTypes = Data.VoxelTypes;
  Data1 = Data.Data1;
  Data8 = Data.Data8;
  Data64 = Data.Data64;
  AllocationIndex = Data.AllocationIndex;
  AllocationArray = Data.AllocationArray;
  AllocationIndex64 = Data.AllocationIndex64;
  AllocationArray64 = Data.AllocationArray64;
  Data64Offset = Data.Data64Offset;
};

EventHandler.ShareQueueSize = function(Data){
  OwnQueueSize = Data.OwnQueueSize;
};

EventHandler.SaveDistancedPointMap = function(Data){
  console.time();
  ScaledDistancedPointMap[0] = Data.DistancedPointMap;
  let Width = 8;
  let Depth = 1;
  do{
    ScaledDistancedPointMap[Depth] = {};
    const CurrentSDPM = ScaledDistancedPointMap[Depth];
    const PreviousSDPM = ScaledDistancedPointMap[Depth - 1];

    for(const Density in PreviousSDPM){
      CurrentSDPM[Density] = {};
      const CurrentDensity = CurrentSDPM[Density];
      const PreviousDensity = PreviousSDPM[Density];
      for(let X = 0; X < Width; X += 2) for(let Z = 0; Z < Width; Z += 2){
        const x = X / 2;
        const z = Z / 2;
        const Identifier = x * Width / 2 + z; //Identifiers always multiply by 16.
        CurrentDensity[Identifier] = [];
        for(let dx = 0; dx < 2; dx++) for(let dz = 0; dz < 2; dz++) {
          for(const Point of PreviousDensity[(X + dx) * Width + Z + dz]){
            const PointX = Point.X;
            const PointZ = Point.Z;
            CurrentDensity[Identifier].push({"X": (64 << (Depth - 1)) * dx + PointX, "Z": (64 << (Depth - 1)) * dz + PointZ});
          }
        }
      }
    }
  } while(Depth++, (Width /= 2) > 1);
  console.timeEnd();
};

EventHandler.ShareStructures = function(Data){
  for(const Structure of Data.Structures){
    Structure.Selection = SVM.FromObject(Structure.Selection);
    Structures.push(Structure);
  }
};

const TempDataBuffer = new Uint16Array(8 * 8 * 8);
const TempTypeBuffer = new Uint16Array(8 * 8);

const EmptyDataBuffer = new Uint16Array(8 * 8 * 8);
const EmptyTypeBuffer = new Uint16Array(8 * 8); //Somehow, TypedArray.set(Empty, 0) is 5x faster than TypedArray.fill(0)... so enjoy.

EventHandler.GenerateRegionData = function(Data){
  const RegionX = Data.RegionX;
  const RegionY = Data.RegionY;
  const RegionZ = Data.RegionZ;

  const rx64 = RegionX - Data64Offset[0];
  const ry64 = RegionY - Data64Offset[1];
  const rz64 = RegionZ - Data64Offset[2];

  Requests++;

  const AirID = MainBlockRegistry.GetBlockByIdentifier("primary:air").ID;
  const GrassID = MainBlockRegistry.GetBlockByIdentifier("default:grass").ID;
  const RockID = MainBlockRegistry.GetBlockByIdentifier("default:rock").ID;
  const Rock1ID = MainBlockRegistry.GetBlockByIdentifier("default:rock1").ID;
  const WaterID = MainBlockRegistry.GetBlockByIdentifier("default:water").ID;

  const HeightMap = Data.HeightMap;
  const SlopeMap = Data.SlopeMap;
  const TemperatureMap = Data.TemperatureMap;


  const Location64 = AllocateData64(rx64, ry64, rz64, 0);

  const x1Offset = RegionX * 64;
  const y1Offset = RegionY * 64;
  const z1Offset = RegionZ * 64;

  const Index64 = (rx64 << 6) | (ry64 << 3) | rz64;
  let WrittenTo64 = false;
  for(let x8 = 0; x8 < 8; ++x8) for(let y8 = 0; y8 < 8; ++y8) for(let z8 = 0; z8 < 8; ++z8){
    const Index8 = (Location64 << 9) | (x8 << 6) | (y8 << 3) | z8;
    TempDataBuffer.set(EmptyDataBuffer, 0);
    TempTypeBuffer.set(EmptyTypeBuffer, 0);
    let WrittenTo8 = false;
    let UniformType = -1;
    let HasUniformType = -1;
    for(let x1 = 0; x1 < 8; ++x1) for(let z1 = 0; z1 < 8; ++z1){
      const XPos64 = (x8 << 3) | x1;
      const ZPos64 = (z8 << 3) | z1;
      const MapIndex = (XPos64 << 6) | ZPos64;
      const Height = Math.floor(HeightMap[MapIndex]);
      const Slope = SlopeMap[MapIndex];
      for(let y1 = 0; y1 < 8; ++y1){
        let Type;
        const X = x1Offset + x8 * 8 + x1;
        const Z = z1Offset + z8 * 8 + z1;
        const Y = y1Offset + y8 * 8 + y1;

        if(Height > Y){
          if(Slope < 4 - Height / 350) Type = GrassID;
          else if(Slope < 5.5570110493302 - Height / 350) Type = RockID;
          else Type = Rock1ID;
        }
        else{
          if(Height < 0 && Y < 0){
            Type = WaterID;
          } else{
            Type = AirID;
          }
        }
        if(Type !== UniformType){
          UniformType = Type;
          HasUniformType++;
        }
        if(Type !== 0) WrittenTo8 = true;
        TempDataBuffer[(x1 << 6) | (y1 << 3) | z1] = Type;
        if(Type !== 0){ //For now, this just checks against air, but it will be more complicated than that...
          TempTypeBuffer[(x1 << 3) | y1] |= 0 << z1 * 2;
        } else TempTypeBuffer[(x1 << 3) | y1] |= 1 << z1;
      }
    }
    if(!WrittenTo8) continue;
    WrittenTo64 = true;
    if(HasUniformType === 0){ //Means that it has a uniform type, and can be compressed.
      Data8[Index8] = (1 << 28);    //Mark Data8 region as uniform type
      Data8[Index8] |= UniformType; //Set uniform type in first 16 bits
      Data8[Index8] |= (1 << 30);   //Mark it as updated to be sent to the gpu (this is usually done in AllocateData8 function)
      continue;
    }
    //Now, since something was actually written to the temp buffer, write it to the Data1 buffer:
    let Location8;
    try {
      Location8 = AllocateData8(Location64, x8, y8, z8); //This automatically registers the Data8
    } catch(Error){
      if(Error instanceof NoData8Exception){
        Data64[Index64] &= ~(7 << 19); //Set stage to 0
        for(let i = 0; i < 512; ++i){
          const Index8 = (Location64 << 9) | i;
          DeallocateData8(Index8);
        }
        DeallocateData64(Location64, rx64, ry64, rz64, 0);
        if(OwnQueueSize) OwnQueueSize[0]--;
        return self.postMessage({
          "Request": "NoData8"
        });
      } else throw Error;
    }

    VoxelTypes.set(TempDataBuffer, Location8 << 9); //Location8 << 9 is the starting index of the voxel data 8x8x8 group.
    Data1.set(TempTypeBuffer, Location8 << 6); //This is Location8 << 6, because the Z axis is compressed into the number.
  }
  if(Data64[Index64] & 0x8000) console.log(Data64[Index64]);

  if(!WrittenTo64){
    DeallocateData64(Location64, rx64, ry64, rz64, 0);
  } else{
    Data64[Index64] &=~ (1 << 15); //Mark the Data64 as not empty (this is required because of AllocateData64 not setting the existence marker!)
  }


  Data64[Index64] = (Data64[Index64] & ~(7 << 19)) | (2 << 19); //Set stage to 2 (finished terrain loading)

  if(OwnQueueSize) OwnQueueSize[0]--;

  self.postMessage({
    "Request": "GeneratedRegionData",
    "RegionX": Data.RegionX,
    "RegionY": Data.RegionY,
    "RegionZ": Data.RegionZ,
    "LoadingBatch": Data.LoadingBatch
  });
};

EventHandler.GenerateVirtualRegionData = function(Data){
  const RegionX = Data.RegionX;
  const RegionY = Data.RegionY;
  const RegionZ = Data.RegionZ;
  const Depth = Data.Depth;

  const rx64 = RegionX - Data64Offset[Depth * 3 + 0];
  const ry64 = RegionY - Data64Offset[Depth * 3 + 1];
  const rz64 = RegionZ - Data64Offset[Depth * 3 + 2];

  Requests++;

  const Factor = 2 ** Data.Depth;

  const AirID = MainBlockRegistry.GetBlockByIdentifier("primary:air").ID;
  const GrassID = MainBlockRegistry.GetBlockByIdentifier("default:grass").ID;
  const RockID = MainBlockRegistry.GetBlockByIdentifier("default:rock").ID;
  const Rock1ID = MainBlockRegistry.GetBlockByIdentifier("default:rock1").ID;
  const WaterID = MainBlockRegistry.GetBlockByIdentifier("default:water").ID;
  const LeavesID = MainBlockRegistry.GetBlockByIdentifier("default:leaves").ID;

  const HeightMap = Data.HeightMap;
  const SlopeMap = Data.SlopeMap;
  const TemperatureMap = Data.TemperatureMap;

  const Location64 = AllocateData64(rx64, ry64, rz64, Depth);
  const Index64 = (Depth << 9) | (rx64 << 6) | (ry64 << 3) | rz64;

  if(Data64[Index64] & 0x8000) console.log("Allocation: " + Data64[Index64]);

  try {
    let WrittenTo64 = false;
    for (let x8 = 0; x8 < 8; ++x8) for (let y8 = 0; y8 < 8; ++y8) for (let z8 = 0; z8 < 8; ++z8) {
      const Index8 = (Location64 << 9) | (x8 << 6) | (y8 << 3) | z8;
      TempDataBuffer.set(EmptyDataBuffer, 0);
      TempTypeBuffer.set(EmptyTypeBuffer, 0);
      let WrittenTo8 = false;
      let UniformType = -1;
      let HasUniformType = -1;
      for (let x1 = 0; x1 < 8; ++x1) for (let z1 = 0; z1 < 8; ++z1) {
        const XPos64 = (x8 << 3) | x1;
        const ZPos64 = (z8 << 3) | z1;
        const MapIndex = (XPos64 << 6) | ZPos64;
        const Height = Math.floor(HeightMap[MapIndex] / Factor) * Factor;
        const Slope = SlopeMap[MapIndex];
        for (let y1 = 0; y1 < 8; ++y1) {
          let Type;
          const Y = (RegionY * 64 + y8 * 8 + y1) * Factor;
          const X = (RegionX * 64 + x8 * 8 + x1) * Factor;
          const Z = (RegionZ * 64 + z8 * 8 + z1) * Factor;
          if (Height > Y) {
            if (Slope < 4 - Height / 350) Type = GrassID;
            else if (Slope < 5.5570110493302 - Height / 350) Type = RockID;
            else Type = Rock1ID;
          } else {
            if (Height < 0 && Y < 0) {
              Type = WaterID;
            } else {
              Type = AirID;
            }
          }
          if (Type !== UniformType) {
            UniformType = Type;
            HasUniformType++;
          }
          if (Type !== 0) WrittenTo8 = true;
          TempDataBuffer[(x1 << 6) | (y1 << 3) | z1] = Type;
          if (Type !== 0) { //For now, this just checks against air, but it will be more complicated than that...
            TempTypeBuffer[(x1 << 3) | y1] |= 0 << z1 * 2;
          } else TempTypeBuffer[(x1 << 3) | y1] |= 1 << z1;
        }
      }
      if (!WrittenTo8) continue;
      WrittenTo64 = true;
      if (HasUniformType === 0) { //Means that it has a uniform type, and can be compressed.
        Data8[Index8] = (1 << 28);    //Mark Data8 region as uniform type
        Data8[Index8] |= UniformType; //Set uniform type in first 16 bits
        Data8[Index8] |= (1 << 30);   //Mark it as updated to be sent to the gpu (this is usually done in AllocateData8 function)
        continue;
      }
      //Now, since something was actually written to the temp buffer, write it to the Data1 buffer:
      const Location8 = AllocateData8(Location64, x8, y8, z8); //This automatically registers the Data8
      VoxelTypes.set(TempDataBuffer, Location8 << 9); //Location8 << 9 is the starting index of the voxel data 8x8x8 group.
      Data1.set(TempTypeBuffer, Location8 << 6); //This is Location8 << 6, because the Z axis is compressed into the number.
    }
    const SetBlock = function (X, Y, Z, BlockType) {
      if (BlockType === 0 || X < 0 || Y < 0 || Z < 0 || X >= 64 || Y >= 64 || Z >= 64) return;

      const Index8 = (Location64 << 9) | (((X >> 3) & 7) << 6) | (((Y >> 3) & 7) << 3) | ((Z >> 3) & 7);
      let Info8 = Data8[Index8];
      if ((Info8 & 0x80000000) !== 0) {
        Info8 = AllocateData8(Location64, (X >> 3) & 7, (Y >> 3) & 7, (Z >> 3) & 7);
        for (let i = 0; i < 64; ++i) Data1[((Info8 & 0x00ffffff) << 6) | i] = 255; //Clear Data1
      } else if ((Info8 & 0x10000000) !== 0) { //Uniform type, have to decompress
        const UniformType = Info8 & 0x0000ffff;
        Info8 = AllocateData8(Location64, (X >> 3) & 7, (Y >> 3) & 7, (Z >> 3) & 7);
        const Location8 = Info8 & 0x00ffffff;
        for (let i = 0; i < 512; ++i) VoxelTypes[(Location8 << 9) | i] = UniformType;
        for (let i = 0; i < 64; ++i) Data1[(Location8 << 6) | i] = 0;
      }
      const Location8 = Info8 & 0x00ffffff;
      Data8[Index8] |= 0x40000000; //Looks like this has to be done every time. (GPU update)
      const Index = (Location8 << 6) | ((X & 7) << 3) | (Y & 7);
      Data1[Index] &= ~(1 << (Z & 7)); //Sets it to 0, which means subdivide (full)
      VoxelTypes[(Index << 3) | (Z & 7)] = BlockType;
    };

    if (Depth < 4) {
      const Width = 8 / Factor;
      const SDPM6 = ScaledDistancedPointMap[Depth][6][((RegionX & (Width - 1)) * Width) | (RegionZ & (Width - 1))];
      for (const Point of SDPM6) {
        const RNG = RandomValue(Point.X + RegionX * Factor * 64, 0, Point.Z + RegionZ * Factor * 64);
        const Random2 = RandomValue(Point.X + RegionX * Factor * 64, 3, Point.Z + RegionZ * Factor * 64);
        const OriginalX = Point.X;
        const OriginalZ = Point.Z;
        const X = Math.round(OriginalX / Factor - .5);
        const Z = Math.round(OriginalZ / Factor - .5);
        const Temperature = TemperatureMap[(X << 6) | Z];
        const Slope = Data.SlopeMap[(X << 6) | Z];

        if(RNG > Temperature / 2.) continue;
        if(Depth === 3 && RNG > Temperature / 3.) continue;

        const PasteHeight = Math.floor(HeightMap[(X << 6) | Z]) / Factor;
        if (PasteHeight < 0) continue;
        if (!((RegionY + 1) * 64 > PasteHeight && PasteHeight > RegionY * 64 - 32)) continue;
        if(Random2 < HeightMap[(X << 6) | Z] / 1000. || Random2 * 2 < Slope) continue;

        WrittenTo64 = true;
        const TreeRNG = RandomValue(Point.X + RegionX * Factor * 64, 1, Point.X + RegionZ * Factor * 64);
        //Notice how for ^^ the Y value is 1, this is so that a different random value is generated.
        const Tree = Math.floor(TreeRNG * Structures.length);
        Structures[Tree].Selection.DirectPaste(X, PasteHeight - RegionY * 64, Z, Factor, MainBlockRegistry, SetBlock);
      }
    } else {
      for (let X = 0; X < 64; ++X) for (let Z = 0; Z < 64; ++Z) {
        const RNG = RandomValue(X, 1, Z);
        const Temperature = TemperatureMap[(X << 6) | Z];
        const Slope = Data.SlopeMap[(X << 6) | Z];
        if(RNG > Temperature / 2.) continue;
        if(RNG < HeightMap[(X << 6) | Z] / 1000. || RNG * 2 < Slope) continue;

        const PasteHeight = Math.floor(HeightMap[(X << 6) | Z] / Factor) - RegionY * 64;
        if (PasteHeight < 0 || PasteHeight >= 64) continue;

        WrittenTo64 = true;
        SetBlock(X, PasteHeight, Z, LeavesID);
      }
    }

    if (Data64[Index64] & 0x8000) console.log(Data64[Index64]);

    if (!WrittenTo64) {
      DeallocateData64(Location64, rx64, ry64, rz64, Depth);
    } else{
      Data64[Index64] &=~ (1 << 15); //Mark the Data64 as not empty (this is required because of AllocateData64 not setting the existence marker!)
    }

    Data64[Index64] = (Data64[Index64] & ~(7 << 19)) | (7 << 19); //Set state to 7 (finished loading)
    Data64[Index64] |= (1 << 14);
  } catch(Error){
    if(Error instanceof NoData8Exception){
      Data64[Index64] &= ~(7 << 19); //Set state to 0
      for(let i = 0; i < 512; ++i){
        const Index8 = (Location64 << 9) | i;
        DeallocateData8(Index8);
      }
      DeallocateData64(Location64, rx64, ry64, rz64, 0);
      return self.postMessage({
        "Request": "NoData8"
      });
    } else throw Error;
  }

  if(OwnQueueSize) OwnQueueSize[0]--;


  self.postMessage({
    "Request": "GeneratedRegionData",
    "RegionX": Data.RegionX,
    "RegionY": Data.RegionY,
    "RegionZ": Data.RegionZ,
    "Depth": Data.Depth,
    "LoadingBatch": Data.LoadingBatch
  });
};
