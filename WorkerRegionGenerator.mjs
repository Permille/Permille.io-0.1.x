import {Region} from "./World/Region.mjs";
import REGION_SD from "./World/RegionSD.mjs";
import BlockRegistry from "./Block/BlockRegistry.mjs";
import SVM from "./Libraries/SVM/SVM.mjs";
import SVMUtils from "./Libraries/SVM/SVMUtils.mjs";
import {GetHeight, ReSeed} from "./GetHeight.mjs";
import * as DataManager from "./World/LoadManager/DataManager.mjs";

ReSeed(17); //This is for pasting trees..

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

let Data8Length = 262144;
let Data8Mod = 262143;

function AllocateData8(StartIndex8, x8, y8, z8) {
  const Index = Atomics.add(AllocationIndex, 0, 1) & Data8Mod;
  const Location = Atomics.exchange(AllocationArray, Index, 2147483647); //Probably doesn't need to be atomic. Setting 2147483647 to mark location as invalid.
  Data8[(StartIndex8 << 9) | (x8 << 6) | (y8 << 3) | z8] = Location;
  return Location;
}

function AllocateData64(x64, y64, z64){
  x64 -= Data64Offset[0];
  y64 -= Data64Offset[1];
  z64 -= Data64Offset[2];
  //Need to set coordinates within boundaries
  const Index = Atomics.add(AllocationIndex64, 0, 1) & 511;
  const Location64 = Atomics.exchange(AllocationArray64, Index, 65535);

  Data64[(x64 << 6) | (y64 << 3) | z64] &=~0b1000000111111111; //Reset any previous location, and set first bit to 0 to mark existence.
  Data64[(x64 << 6) | (y64 << 3) | z64] |= Location64; //This is the StartIndex8 used in the other function.
  return Location64;
}

function DeallocateData64(Location64, x64, y64, z64){
  x64 -= Data64Offset[0];
  y64 -= Data64Offset[1];
  z64 -= Data64Offset[2];
  const DeallocIndex = Atomics.add(AllocationIndex64, 1, 1) & 511; //Indexing 1 for deallocation.
  Atomics.store(AllocationArray64, DeallocIndex, Location64); //Add location back to the allocation array to be reused.
  Data64[(x64 << 6) | (y64 << 3) | z64] &=~0b1000000111111111; //Reset previous location and existence marker.
  Data64[(x64 << 6) | (y64 << 3) | z64] |= 0b1000000000000000; //Set existence marker to indicate that it's empty.
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
  ScaledDistancedPointMap["-1"] = Data.DistancedPointMap;
  const OriginalDPM = ScaledDistancedPointMap["-1"];
  let Width = 8;
  let Depth = 0;
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
            CurrentDensity[Identifier].push({"X": 32 * (2 ** (Depth)) * dx + PointX, "Z": 32 * (2 ** (Depth)) * dz + PointZ});
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

  let UniformType = undefined;
  let IsEntirelySolid = true;

  const Location64 = AllocateData64(RegionX, RegionY, RegionZ);

  const x1Offset = RegionX * 64;
  const y1Offset = RegionY * 64;
  const z1Offset = RegionZ * 64;

  let WrittenTo64 = false;
  for(let x8 = 0; x8 < 8; ++x8) for(let y8 = 0; y8 < 8; ++y8) for(let z8 = 0; z8 < 8; ++z8){
    TempDataBuffer.set(EmptyDataBuffer, 0);
    TempTypeBuffer.set(EmptyTypeBuffer, 0);
    let WrittenTo8 = false;
    for(let x1 = 0; x1 < 8; ++x1) for(let z1 = 0; z1 < 8; ++z1){
      const XPos64 = (x8 << 3) | x1;
      const ZPos64 = (z8 << 3) | z1;
      const MapIndex = (XPos64 << 6) | ZPos64;
      const Height = HeightMap[MapIndex];
      const Slope = SlopeMap[MapIndex];
      for(let y1 = 0; y1 < 8; ++y1){
        let Type;
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

        if(Type !== 0) WrittenTo8 = true;
        TempDataBuffer[(x1 << 6) | (y1 << 3) | z1] = Type;
        if(Type !== 0){ //For now, this just checks against air, but it will be more complicated than that...
          TempTypeBuffer[(x1 << 3) | y1] |= 0 << z1 * 2;
        } else TempTypeBuffer[(x1 << 3) | y1] |= 1 << z1;
      }
    }
    if(!WrittenTo8) continue;
    WrittenTo64 = true;
    //Now, since something was actually written to the temp buffer, write it to the Data1 buffer:
    const Location8 = AllocateData8(Location64, x8, y8, z8); //This automatically registers the Data8
    VoxelTypes.set(TempDataBuffer, Location8 << 9); //Location8 << 9 is the starting index of the voxel data 8x8x8 group.
    Data1.set(TempTypeBuffer, Location8 << 6); //This is Location8 << 6, because the Z axis is compressed into the number.
  }
  const Index64 = (rx64 << 6) | (ry64 << 3) | rz64;
  if(Data64[Index64] & 0x8000) console.log(Data64[Index64]);

  if(!WrittenTo64){
    DeallocateData64(Location64, RegionX, RegionY, RegionZ);
  }


  Data64[Index64] = (Data64[Index64] & ~(0b0111 << 12)) | (0b0010 << 12); //Set state to 0bX010 (finished terrain loading)

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
  const Depth = Data.Depth;
  const RegionX = Data.RegionX;
  const RegionY = Data.RegionY;
  const RegionZ = Data.RegionZ;

  if(Data.SharedData[REGION_SD.UNLOAD_TIME] >= 0){
    if(OwnQueueSize) OwnQueueSize[0]--;
    return;
  }
  Requests++;

  const FACTOR = 2 ** (1 + Data.Depth);
  const X_SCALE = Region.X_LENGTH * FACTOR;
  const Y_SCALE = Region.Y_LENGTH * FACTOR;
  const Z_SCALE = Region.Z_LENGTH * FACTOR;
  const SIDE_LENGTH_SQUARED = Region.X_LENGTH * Region.Z_LENGTH;
  const RegionData = Data.RegionData;
  const IntHeightMap = Data.IntHeightMap;

  const AirID = MainBlockRegistry.GetBlockByIdentifier("primary:air").ID;
  const GrassID = MainBlockRegistry.GetBlockByIdentifier("default:grass").ID;
  const RockID = MainBlockRegistry.GetBlockByIdentifier("default:rock").ID;
  const Rock1ID = MainBlockRegistry.GetBlockByIdentifier("default:rock1").ID;
  const WaterID = MainBlockRegistry.GetBlockByIdentifier("default:water").ID;
  const LeavesID = MainBlockRegistry.GetBlockByIdentifier("default:oak_leaves").ID;

  const HeightMap = Data.HeightMap;
  const SlopeMap = Data.SlopeMap;
  const TemperatureMap = Data.TemperatureMap;

  let UniformType = undefined;
  let IsEntirelySolid = true;

  for(let X = RegionX * X_SCALE, rX = 0, Stride = 0; rX < Region.X_LENGTH; X += FACTOR, rX++){
    for(let Z = RegionZ * Z_SCALE, rZ = 0; rZ < Region.Z_LENGTH; Z += FACTOR, rZ++){
      const Height = Math.floor(HeightMap[Stride] / FACTOR) * FACTOR;
      const Slope = SlopeMap[Stride];
      IntHeightMap[Stride++] = Math.min(Math.max((Height / FACTOR) - RegionY * Region.Y_LENGTH, -128), 127);
      for(let Y = RegionY * Y_SCALE, rY = 0; rY < Region.Y_LENGTH; Y += FACTOR, rY++){
        let Type;
        if(Height > Y){
          if(Slope < 4 - Height / 350) Type = GrassID;
          else if(Slope < 5.5570110493301 - Height / 350) Type = RockID;
          else Type = Rock1ID;
        }
        else{
          if(Height < 0 && Y < 0){
            Type = WaterID;
          } else{
            Type = AirID;
          }
        }
        if(UniformType !== false){
          if(UniformType === undefined) UniformType = Type;
          else if(Type !== UniformType) UniformType = false;
        }

        RegionData[rX * Region.Z_LENGTH * Region.Y_LENGTH + rY * Region.Z_LENGTH + rZ] = Type;
        if(IsEntirelySolid && (Type === 0 || Type === 4)) IsEntirelySolid = false;
      }
    }
  }

  const Paster = function(x, y, z, BlockType){
    if(BlockType === 0) return;
    if(x < 0 || x >= 32 || y < 0 || y >= 64 || z < 0 || z >= 32) return;
    RegionData[x * 2048 + y * 32 + z] = BlockType;
  };

  const Scale = 2 ** (Depth + 1);

  if(Depth <= 3){
    const Width = 16 / (2 ** (Depth + 1));
    const SDPM6 = ScaledDistancedPointMap[Depth][6][(RegionX & (Width - 1)) * Width + (RegionZ & (Width - 1))]; //Change this later.

    for(const Point of SDPM6){
      const RNG = RandomValue(Point.X + RegionX * Scale * 32, 0, Point.Z + RegionZ * Scale * 32);

      const OriginalX = Point.X;
      const OriginalZ = Point.Z;

      const X = Math.round(Point.X / Scale - 0.5);
      const Z = Math.round(Point.Z / Scale - 0.5); //The -0.5 is so the values are in range [0, 31]

      const Temperature = TemperatureMap[X * 32 + Z];

      if(RNG > Temperature / 2) continue;

      if(Depth === 3 && RandomValue(Point.X, 0, Point.Z) > 0.25) continue;

      const PasteHeight = Math.floor(HeightMap[X * 32 + Z] / Scale);
      if(PasteHeight < 0) continue;
      if((RegionY + 1) * 64 > PasteHeight && PasteHeight > RegionY * 64 - 32){
        IsEntirelySolid = false;
        UniformType = false;
        //                             Important: the Y vvv value is 1 as to generate a different hash than for the temperature.
        const Tree = (RandomValue(X + RegionX * 32, 1, Z + RegionZ * 32) * Structures.length) >> 0;
        Structures[Tree].Selection.DirectPaste(X, PasteHeight - RegionY * 64, Z, Scale, MainBlockRegistry, Paster);

        if(Depth > 1 && PasteHeight > RegionY * 64 && PasteHeight < (RegionY + 1) * 64){
          const Height = Math.floor(HeightMap[X * 32 + Z] / Scale) - RegionY * 64 + 1;
          if(PasteHeight < 0 || PasteHeight >= 64) continue;

          RegionData[X * 2048 + Height * 32 + Z] = LeavesID;
        }
      }
    }
  } else{
    for(let i = 0; i < 60 * (Depth + 1); i++){
      const X = Math.floor(Math.random() * 32);
      const Z = Math.floor(Math.random() * 32);

      const RNG = RandomValue(X, 0, Z); //Don't really care.

      const Temperature = TemperatureMap[X * 32 + Z];

      if(RNG > Temperature / 2) continue;

      const PasteHeight = Math.floor(HeightMap[X * 32 + Z] / Scale);
      if(PasteHeight > RegionY * 64 && PasteHeight < (RegionY + 1) * 64){
        const Height = Math.floor(HeightMap[X * 32 + Z] / Scale) - RegionY * 64;// + 1;
        if(PasteHeight < 0 || PasteHeight >= 64) continue;

        RegionData[X * 2048 + Height * 32 + Z] = LeavesID;
      }
    }
  }

  let CommonBlock = -1;
  if(UniformType !== false) CommonBlock = UniformType;

  if(OwnQueueSize) OwnQueueSize[0]--;

  self.postMessage({
    "Request": "SaveVirtualRegionData",
    "Depth": Depth,
    "RegionX": Data.RegionX,
    "RegionY": Data.RegionY,
    "RegionZ": Data.RegionZ,
    "RegionData": RegionData,
    "IntHeightMap": IntHeightMap,
    "CommonBlock": CommonBlock,
    "IsEntirelySolid": IsEntirelySolid
  });
};
