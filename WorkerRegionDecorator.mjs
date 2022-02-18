import {Region} from "./World/Region.mjs";
import REGION_SD from "./World/RegionSD.mjs";
import BlockRegistry from "./Block/BlockRegistry.mjs";
import SVM from "./Libraries/SVM/SVM.mjs";

let Requests = 0;
let RequestsWhenLastGC = 0;
let RequestsWhenLastCheck = 0;

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

function* RandomNumberGenerator(Seed){
  while(true) yield (Seed = Seed * 0x41a7 % 0x7fffffff) / 0x7fffffff;
}

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
let DistancedPointMap;

let Structures = [];

let VoxelTypes, Data1, Data8, Data64;
let AllocationIndex, AllocationArray;
let AllocationIndex64, AllocationArray64;
let Data64Offset;

const EmptyData1 = new Uint8Array(64).fill(0b11111111); //Empty
const EmptyVoxelTypes = new Uint16Array(512); //Air

function AllocateData8(Location64, x8, y8, z8) {
  const Index = Atomics.add(AllocationIndex, 0, 1) & 0x0003ffff;
  const Location = Atomics.exchange(AllocationArray, Index, 2147483647); //Probably doesn't need to be atomic. Setting 2147483647 to mark location as invalid.
  Data8[(Location64 << 9) | (x8 << 6) | (y8 << 3) | z8] = Location | 0x40000000; //GPU update
  Data1.set(EmptyData1, Location << 6);
  VoxelTypes.set(EmptyVoxelTypes, Location << 9);
  return Location;
}

function AllocateData64(x64, y64, z64){
  const Index = Atomics.add(AllocationIndex64, 0, 1) & 4095;
  const Location64 = Atomics.exchange(AllocationArray64, Index, 65535);
  if(Location64 === 65535) debugger;
  const Index64 = (x64 << 6) | (y64 << 3) | z64;
  if(((Data64[Index64] >> 16) & 1) === 1){ //Region was unloaded... well, that's a slight problem...
    Data64[Index64] &= ~(1 << 16); //Unflag unloaded
    Data64[Index64] |= 1 << 17;    //Make unloadable
    Data64[Index64] &= ~(3 << 12); //Reset loading state
  }
  Data64[Index64] &=~0b1000111111111111; //Reset any previous location, and set first bit to 0 to mark existence.
  Data64[Index64] |= Location64; //This is the StartIndex8 used in the other function.
  Data64[Index64] |= 1 << 14; //Set GPU update to true
  return Location64;
}

function DeallocateData8(Index8){
  const Location = Data8[Index8];
  if((Location & 0x80000000) !== 0) return;
  const DeallocIndex = Atomics.add(AllocationIndex, 1, 1) & 0x0003ffff;
  Atomics.store(AllocationArray, DeallocIndex, Location);
  Data8[Index8] = 0x80000000;
}

function UnloadData64(x64, y64, z64){
  const Index64 = (x64 << 6) | (y64 << 3) | z64;
  if(((Data64[Index64] >> 15) & 1) === 1 || ((Data64[Index64] >> 17) & 1) === 1) return; //Is all air or is unloadable
  const DeallocIndex = Atomics.add(AllocationIndex64, 1, 1) & 4095; //Indexing 1 for deallocation.
  const Location64 = Data64[Index64] & 0x0fff;
  for(let i = 0; i < 512; ++i) DeallocateData8((Location64 << 9) | i)
  Atomics.store(AllocationArray64, DeallocIndex, Location64); //Add location back to the allocation array to be reused.
  Data64[(x64 << 6) | (y64 << 3) | z64] &=~0b1000111111111111; //Reset previous location and existence marker.
  Data64[(x64 << 6) | (y64 << 3) | z64] |=0b11000000000000000; //Set unloaded and inexistence markers.
}

EventHandler.InitialiseBlockRegistry = function(Data){
  MainBlockRegistry = BlockRegistry.Initialise(Data.BlockIDMapping, Data.BlockIdentifierMapping);
};

EventHandler.TransferRequiredRegionsArray = function(Data){
  RequiredRegions = Data.RequiredRegions;
};

EventHandler.ShareQueueSize = function(Data){
  OwnQueueSize = Data.OwnQueueSize;
};

EventHandler.SaveDistancedPointMap = function(Data){
  DistancedPointMap = Data.DistancedPointMap;
  console.log(DistancedPointMap);
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

EventHandler.ShareStructures = function(Data){
  for(const Structure of Data.Structures){
    Structure.Selection = SVM.FromObject(Structure.Selection);
    Structures.push(Structure);
  }
};

EventHandler.DecorateRegion = function(Data){
  const RegionX = Data.RegionX;
  const RegionY = Data.RegionY;
  const RegionZ = Data.RegionZ;
  const rx64 = RegionX - Data64Offset[0];
  const ry64 = RegionY - Data64Offset[1];
  const rz64 = RegionZ - Data64Offset[2];
  if(rx64 < 0 || rx64 > 7 || ry64 < 0 || ry64 > 7 || rz64 < 0 || rz64 > 7) console.warn("Generating out of bounds!!");
  Requests++;

  const Index64 = (rx64 << 6) | (ry64 << 3) | rz64;
  const ModifiedData64 = new Set([Index64]); //Add current region to modification set (so it's uploaded to the gpu)
  Data64[Index64] &= ~(1 << 14); //Suppress updates while region is being modified. This will be set at the end.
  const SetBlock = function(X, Y, Z, BlockType){
    if(BlockType === 0) return;
    const ix64 = rx64 + (X >> 6);
    const iy64 = ry64 + (Y >> 6);
    const iz64 = rz64 + (Z >> 6);
    const Index64 = (ix64 << 6) | (iy64 << 3) | iz64;
    ModifiedData64.add(Index64);
    let Info64 = Data64[Index64];
    let Location64 = Info64 & 0x0fff;
    //I could probably remove this check by allocating it beforehand, and deallocating it if nothing was written to it
    if((Info64 & 0x8000) !== 0) Location64 = AllocateData64(ix64, iy64, iz64);
    Data64[Index64] |= 0x4000;
    Data64[Index64] &= ~(1 << 15);
    const Index8 = (Location64 << 9) | (((X >> 3) & 7) << 6) | (((Y >> 3) & 7) << 3) | ((Z >> 3) & 7);
    let Info8 = Data8[Index8];
    if((Info8 & 0x80000000) !== 0) Info8 = AllocateData8(Location64, (X >> 3) & 7, (Y >> 3) & 7, (Z >> 3) & 7);
    else if((Info8 & 0x10000000) !== 0){ //Uniform type, have to decompress
      const UniformType = Info8 & 0x0000ffff;
      Info8 = AllocateData8(Location64, (X >> 3) & 7, (Y >> 3) & 7, (Z >> 3) & 7);
      const Location8 = Info8 & 0x0003ffff;
      for(let i = 0; i < 512; ++i) VoxelTypes[(Location8 << 9) | i] = UniformType;
      for(let i = 0; i < 64; ++i) Data1[(Location8 << 6) | i] = 0;
    }
    const Location8 = Info8 & 0x0003ffff;
    Data8[Index8] |= 0x40000000; //Looks like this has to be done every time. (GPU update)
    const Index = (Location8 << 6) | ((X & 7) << 3) | (Y & 7);
    Data1[Index] &= ~(1 << (Z & 7)); //Sets it to 0, which means subdivide (full)
    VoxelTypes[(Index << 3) | (Z & 7)] = BlockType;
  };

  const Points6 = DistancedPointMap[6][(RegionX & 7) * 8 + (RegionZ & 7)];
  for(const {X, Z} of Points6){
    const PasteHeight = (Data.Maps.HeightMap[X * 64 + Z]) | 0;
    const Temperature = Data.Maps.TemperatureMap[X * 64 + Z];

    const Random = RandomValue(X + RegionX * 64, 0, Z + RegionZ * 64);

    if((RegionY + 1) * 64 > PasteHeight && PasteHeight >= RegionY * 64){
      if(Random > Temperature / 2) continue;
      if(PasteHeight < 0) continue;
      const Y = PasteHeight - RegionY * 64;
      //if(Random < 0.97) continue;
      //                        Important: the Y vvv value is 1 as to generate a different hash than for the temperature.
      const Tree = (RandomValue(X + RegionX * 64, 1, Z + RegionZ * 64) * Structures.length) >> 0;
      Structures[Tree].Selection.DirectPaste(X, Y, Z, 1, null, SetBlock);
      //SetBlock(X, PasteHeight - RegionY * 64, Z, 5);
    }
  }
  for(const Index64 of ModifiedData64) Data64[Index64] |= (1 << 14); //Request update (Finished stage 3)
  if(OwnQueueSize) OwnQueueSize[0]--;
  self.postMessage({
    "Request": "Finished",
    RegionX,
    RegionY,
    RegionZ
  });
};