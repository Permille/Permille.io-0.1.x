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
  const Region000 = Data.Regions[RegionX + "," + RegionY + "," + RegionZ];
  const Points6 = DistancedPointMap[6][(RegionX & 15) * 16 + (RegionZ & 15)];
  const RNG = RandomNumberGenerator((RegionX >>> 0) * 65536 + (RegionY >>> 0) * 256 + (RegionZ >>> 0)); //Number can't be negative!

  //const Points = PointGenerator(RegionX, RegionZ, 8);

  if(Region000.SharedData[REGION_SD.UNLOAD_TIME] >= 0){
    if(OwnQueueSize) OwnQueueSize[0]--;
    return;
  }
  Requests++;

  const AirID = MainBlockRegistry.GetBlockByIdentifier("primary:air").ID;
  const GrassID = MainBlockRegistry.GetBlockByIdentifier("default:grass").ID;
  const RockID = MainBlockRegistry.GetBlockByIdentifier("default:rock").ID;
  const Rock1ID = MainBlockRegistry.GetBlockByIdentifier("default:rock1").ID;
  const WaterID = MainBlockRegistry.GetBlockByIdentifier("default:water").ID;

  const RegionData = new Array(27).fill().map(function(){return {};});

  for(let x = -1; x < 2; x++) for(let y = -1; y < 2; y++) for(let z = -1; z < 2; z++){
    const Region = Data.Regions[(RegionX + x) + "," + (RegionY + y) + "," + (RegionZ + z)];
    RegionData[13 + x * 9 + y * 3 + z] = Region.RegionData;// ?? new Uint16Array(65536).fill(Region.SharedData[REGION_SD.COMMON_BLOCK]);
  }

  const AccessedRegions = new Set;

  const SetBlock = function(X, Y, Z, BlockType){
    if(BlockType === 0) return;
    const RegionX = Math.floor(X / 32);
    const RegionY = Math.floor(Y / 64);
    const RegionZ = Math.floor(Z / 32);
    if(RegionX < -1 || RegionX > 1 || RegionY < -1 || RegionY > 1 || RegionZ < -1 || RegionZ > 1) return; //Just to be 100% safe.
    const Identifier = 13 + RegionX * 9 + RegionY * 3 + RegionZ;
    RegionData[Identifier][(X & 31) * 2048 + (Y & 63) * 32 + (Z & 31)] = BlockType;
    AccessedRegions.add(Identifier);
  };

  for(const {X, Z} of Points6){
    const Maps = Data.Maps[Region000.RegionX + "," + Region000.RegionZ];
    const PasteHeight = (Maps.HeightMap[X * 32 + Z]) | 0;
    const Temperature = Maps.TemperatureMap[X * 32 + Z];

    const Random = RandomValue(X + RegionX * 32, 0, Z + RegionZ * 32);

    if((RegionY + 1) * 64 > PasteHeight && PasteHeight > RegionY * 64){
      if(Random > Temperature / 2) continue;
      if(PasteHeight < 0) continue;
      const Y = PasteHeight - RegionY * 64;
      //if(Random < 0.97) continue;
      //                             Important: the Y vvv value is 1 as to generate a different hash than for the temperature.
      const Tree = (RandomValue(X + RegionX * 32, 1, Z + RegionZ * 32) * Structures.length) >> 0;
      Structures[Tree].Selection.DirectPaste(X, Y, Z, 1, null, SetBlock);
      //SetBlock(X, PasteHeight - RegionY * 64, Z, 5);
    }
  }

  for(let RIdentifier of AccessedRegions){
    const RegionX = Math.floor(RIdentifier / 9) + Region000.RegionX - 1;
    RIdentifier %= 9;
    const RegionY = Math.floor(RIdentifier / 3) + Region000.RegionY - 1;
    RIdentifier %= 3;
    const RegionZ = RIdentifier + Region000.RegionZ - 1;

    Data.Regions[RegionX + "," + RegionY + "," + RegionZ].SharedData[REGION_SD.COMMON_BLOCK] = -1;
  }

  if(OwnQueueSize) OwnQueueSize[0]--;

  self.postMessage({
    "Request": "Finished",
    RegionX,
    RegionY,
    RegionZ
  });
};