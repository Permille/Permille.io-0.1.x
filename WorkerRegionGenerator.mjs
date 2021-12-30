import {Region} from "./World/Region.mjs";
import REGION_SD from "./World/RegionSD.mjs";
import BlockRegistry from "./Block/BlockRegistry.mjs";
import SVM from "./Libraries/SVM/SVM.mjs";
import SVMUtils from "./Libraries/SVM/SVMUtils.mjs";
import {GetHeight, ReSeed} from "./GetHeight.mjs";

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
  console.time();
  ScaledDistancedPointMap["-1"] = Data.DistancedPointMap;
  const OriginalDPM = ScaledDistancedPointMap["-1"];
  let Width = 16;
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

EventHandler.GenerateRegionData = function(Data){
  const RegionX = Data.RegionX;
  const RegionY = Data.RegionY;
  const RegionZ = Data.RegionZ;

  if(Data.SharedData[REGION_SD.UNLOAD_TIME] >= 0){
    if(OwnQueueSize) OwnQueueSize[0]--;
    return;
  }
  Requests++;

  const SIDE_LENGTH_SQUARED = Region.X_LENGTH * Region.Z_LENGTH;
  const RegionData = Data.RegionData;

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
  for(let X = RegionX * Region.X_LENGTH, rX = 0, Stride = 0; rX < Region.X_LENGTH; X++, rX++){
    for(let Z = RegionZ * Region.Z_LENGTH, rZ = 0; rZ < Region.Z_LENGTH; Z++, rZ++){
      const Height = Math.floor(HeightMap[Stride]);
      const Slope = SlopeMap[Stride++];
      for(let Y = RegionY * Region.Y_LENGTH, rY = 0; rY < Region.Y_LENGTH; Y++, rY++){
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
        //TODO: Add a mesh that's specific for uniform region data when it's filled with water.
        if(UniformType !== false){
          if(UniformType === undefined) UniformType = Type;
          else if(Type !== UniformType) UniformType = false;
        }
        RegionData[rX * Region.Z_LENGTH * Region.Y_LENGTH + rY * Region.Z_LENGTH + rZ] = Type;
        if(IsEntirelySolid && (Type === 0 || Type === 4)) IsEntirelySolid = false;
      }
    }
  }

  let CommonBlock = -1;
  if(UniformType !== false) CommonBlock = UniformType;

  if(OwnQueueSize) OwnQueueSize[0]--;
  self.postMessage({
    "Request": "SaveRegionData",
    "RegionX": Data.RegionX,
    "RegionY": Data.RegionY,
    "RegionZ": Data.RegionZ,
    "RegionData": RegionData,
    "CommonBlock": CommonBlock,
    "IsEntirelySolid": IsEntirelySolid
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
