import {Region} from "./World/Region.mjs";
import {GetHeight, ReSeed} from "./GetHeight.mjs";
import Simplex from "./Simplex.js";
Simplex.seed(17);

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

ReSeed(17);


/*
  Might be more effective performance-wise to have all of these points saved in a file and then load them into
  memory when needed instead of generating them on the fly. However, this could be ~1MB in json format, and
  I can't be bothered to write a compressor/decompressor just to save maybe 200ms per load, at least for now.
 */

//console.time();


/*const DistancedNearbyPointMap = {};

for(const Density of [6, 10, 15]){
  DistancedNearbyPointMap[Density] = {};
  let DensityObject = DistancedNearbyPointMap[Density];
  for(let RegionX = 0; RegionX < 16; RegionX++) for(let RegionZ = 0; RegionZ < 16; RegionZ++){
    const Points = [];
    for(let dX = -1; dX < 2; dX++) for(let dZ = -1; dZ < 2; dZ++){
      const rX = dX + RegionX;
      const rZ = dZ + RegionZ;
      const NewPoints = DistancedPointMap[Density][(rX & 15) * 16 + (rZ & 15)];
      for(const {X, Z} of NewPoints) Points.push({"X": X + Math.sign(dX) * 32, "Z": Z + Math.sign(dZ) * 32});
    }
    const Identifier = RegionX * 16 + RegionZ;
    DensityObject[Identifier] = Points;
  }
}*/
//console.timeEnd();

self.EventHandler = {};

self.onmessage = function(Event){
  EventHandler[Event.data.Request]?.(Event.data);
};

EventHandler.SetSeed = function(Data){
  ReSeed(Data.Seed);
};

let OwnQueueSize;
EventHandler.ShareQueueSize = function(Data){
  OwnQueueSize = Data.OwnQueueSize;
};

EventHandler.GenerateHeightMap = function(Data){
  Requests++;
  const RegionX = Data.RegionX;
  const RegionZ = Data.RegionZ;
  const Factor = 2 ** Data.Depth;

  const FloatHeightMap = new Float32Array(64 * 64);
  const FloatTemperatureMap = new Float32Array(64 * 64);
  const FloatSlopeMap = new Float32Array(64 * 64);

  const XLength = Data.XLength;
  const ZLength = Data.ZLength;

  let MinHeight = Infinity;
  let MaxHeight = -Infinity;

  for(let X = RegionX * 64, rX = 0, Stride = 0; rX < XLength; X++, rX++){
    for(let Z = RegionZ * 64, rZ = 0; rZ < ZLength; Z++, rZ++){
      const Height = GetHeight(X * Factor, Z * Factor);
      FloatHeightMap[Stride] = Height;
      FloatTemperatureMap[Stride++] = (Simplex.simplex2(Factor * X / 1000, Factor * Z / 1000) / 2 + .5);
      if(MinHeight > Height) MinHeight = Height;
      if(MaxHeight < Height) MaxHeight = Height;
    }
  }
  if(Data.GenerateSlopeMap){
    const AverageLength = 3;
    const XRatio = AverageLength / 64;
    const ZRatio = AverageLength / 64;
    for(let X = RegionX * 64, rX = 0, Stride = 0; rX < 64; X++, rX++){
      const CurrentX = Math.ceil(rX - rX * XRatio);
      for(let Z = RegionZ * 64, rZ = 0; rZ < 64; Z++, rZ++){
        const CurrentZ = Math.ceil(rZ - rZ * ZRatio);
        const Height = FloatHeightMap[CurrentX * 64 + CurrentZ];
        const SlopeX = Math.abs(FloatHeightMap[(CurrentX + AverageLength - 1) * 64 + CurrentZ] - Height);
        const SlopeZ = Math.abs(FloatHeightMap[CurrentX * 64 + AverageLength + CurrentZ - 1] - Height);
        const Slope = Math.max(SlopeX, SlopeZ); //TODO: Make a better slope calculation.
        FloatSlopeMap[Stride++] = Slope / Factor;
      }
    }
  }
  if(OwnQueueSize) OwnQueueSize[0]--;
  self.postMessage({
    "Request": "SaveHeightMap",
    "XLength": XLength,
    "ZLength": ZLength,
    "RegionX": Data.RegionX,
    "RegionZ": Data.RegionZ,
    "Depth": Data.Depth, //Could be undefined if it's not for a virtual region.
    "HeightMap": FloatHeightMap,
    "SlopeMap": FloatSlopeMap,
    "TemperatureMap": FloatTemperatureMap,
    "MinHeight": MinHeight,
    "MaxHeight": MaxHeight/*,
    "Points": Data.Depth === -1 ? {
      "6": DistancedPointMap[6][(RegionX & 15) * 16 + (RegionZ & 15)],
      "10": DistancedPointMap[10][(RegionX & 15) * 16 + (RegionZ & 15)],
      "15": DistancedPointMap[15][(RegionX & 15) * 16 + (RegionZ & 15)]
    } : {}*/
  });
};
