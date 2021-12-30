import {GetHeight, ReSeed} from "../../GetHeight.mjs";
import * as MapSD from "./MapSharedData.mjs";
ReSeed(17);
const EventHandler = {};
self.onmessage = function(Event){
  EventHandler[Event.data.Request]?.(Event.data);
};

let SharedData;
const FoundPeaks = new Set;

let MapTiles = {};
const FreeArrayBuffers = [];

let Scale;
let TileSize;
let TileSizeMinus1;

let PeakMinX;
let PeakMinZ;
let PeakMaxX;
let PeakMaxZ;

let LoadMinX;
let LoadMinZ;
let LoadMaxX;
let LoadMaxZ;

let VisibleMinX;
let VisibleMaxX;
let VisibleMinZ;
let VisibleMaxZ;


EventHandler.SharedData = function(Data){
  SharedData = Data.SharedData;
};

EventHandler.SeedUpdate = function(Data){
  ReSeed(Data.Seed); //Re-seed heightmap noise function.
  FoundPeaks.clear();
  Unload(true);
};

void function PaintMap(){
  if(!SharedData){
    self.setTimeout(PaintMap, 100);
    return;
  }

  const Updated = SharedData[MapSD.MAP_NEEDS_TO_BE_DRAWN] !== 0       ||
                  VisibleMinX !== SharedData[MapSD.MAP_VISIBLE_MIN_X] ||
                  VisibleMaxX !== SharedData[MapSD.MAP_VISIBLE_MAX_X] ||
                  VisibleMinZ !== SharedData[MapSD.MAP_VISIBLE_MIN_Z] ||
                  VisibleMaxZ !== SharedData[MapSD.MAP_VISIBLE_MAX_Z];

  SharedData[MapSD.MAP_NEEDS_TO_BE_DRAWN] = 0;

  VisibleMinX = SharedData[MapSD.MAP_VISIBLE_MIN_X];
  VisibleMaxX = SharedData[MapSD.MAP_VISIBLE_MAX_X];
  VisibleMinZ = SharedData[MapSD.MAP_VISIBLE_MIN_Z];
  VisibleMaxZ = SharedData[MapSD.MAP_VISIBLE_MAX_Z];

  Scale = SharedData[MapSD.MAP_SCALE];
  TileSize = SharedData[MapSD.MAP_TILE_SIZE];
  TileSizeMinus1 = TileSize - 1;

  if(Updated){
    for(let X1 = VisibleMinX; X1 < VisibleMaxX + TileSize; X1 += TileSize) for(let Z1 = VisibleMinZ; Z1 < VisibleMaxZ + TileSize; Z1 += TileSize){

      const TileX = Math.floor(X1 / TileSize);
      const TileZ = Math.floor(Z1 / TileSize);
      const Identifier = TileX + "," + TileZ;
      const Tile = MapTiles[Identifier];
      if(!Tile) continue;
      const SharedImageDataArray = Tile.ImageArray;
      if(!SharedImageDataArray) continue;

      const MinX = TileX * TileSize < VisibleMinX ? VisibleMinX : TileX * TileSize;
      const MinZ = TileZ * TileSize < VisibleMinZ ? VisibleMinZ : TileZ * TileSize;

      const MaxX = (TileX + 1) * TileSize > VisibleMaxX ? VisibleMaxX : (TileX + 1) * TileSize;
      const MaxZ = (TileZ + 1) * TileSize > VisibleMaxZ ? VisibleMaxZ : (TileZ + 1) * TileSize;

      for(let X = MinX; X < MaxX; X++){
        for(let Z = MinZ; Z < MaxZ; Z++) ApproximateHeightAt(X, Z);
        Tile.NeedsUpdate[0] = 1;
      }
    }
  }

  self.setTimeout(PaintMap, 100); //Call Paint again when the painting Task is finished.
}();

EventHandler.StartLoadLoop = function(Data){
  PeakMinX = SharedData[MapSD.MAP_PEAK_MIN_SEGMENT_X];
  PeakMinZ = SharedData[MapSD.MAP_PEAK_MIN_SEGMENT_Z];
  PeakMaxX = SharedData[MapSD.MAP_PEAK_MAX_SEGMENT_X];
  PeakMaxZ = SharedData[MapSD.MAP_PEAK_MAX_SEGMENT_Z];

  LoadMinX = SharedData[MapSD.MAP_LOAD_MIN_SEGMENT_X];
  LoadMinZ = SharedData[MapSD.MAP_LOAD_MIN_SEGMENT_Z];
  LoadMaxX = SharedData[MapSD.MAP_LOAD_MAX_SEGMENT_X];
  LoadMaxZ = SharedData[MapSD.MAP_LOAD_MAX_SEGMENT_Z];

  /*VisibleMinX = SharedData[MapSD.MAP_VISIBLE_MIN_X];
  VisibleMaxX = SharedData[MapSD.MAP_VISIBLE_MAX_X];
  VisibleMinZ = SharedData[MapSD.MAP_VISIBLE_MIN_Z];
  VisibleMaxZ = SharedData[MapSD.MAP_VISIBLE_MAX_Z];*/

  Scale = SharedData[MapSD.MAP_SCALE];
  TileSize = SharedData[MapSD.MAP_TILE_SIZE];
  TileSizeMinus1 = TileSize - 1;

  for(let X = PeakMinX; X < PeakMaxX; X++) for(let Z = PeakMinZ; Z < PeakMaxZ; Z++){
    MapTiles[X + "," + Z] ||= {};
    const Tile = MapTiles[X + "," + Z];
    Tile.X ||= X;
    Tile.Z ||= Z;
    Tile.HeightMap ||= new Float64Array(TileSize ** 2).fill(Infinity);
    Tile.ImageArray ||= null;
    Tile.NeedsUpdate ||= null;
    Tile.Done ||= false;
  }

  const NewImageArrays = [];

  for(let X = LoadMinX; X < LoadMaxX; X++) for(let Z = LoadMinZ; Z < LoadMaxZ; Z++){
    const Tile = MapTiles[X + "," + Z];
    if(Tile.ImageArray === null){
      Tile.ImageArray = FreeArrayBuffers.pop() ?? new Uint8ClampedArray(new SharedArrayBuffer(4 * TileSize * TileSize));
      Tile.NeedsUpdate = new Uint8Array(new SharedArrayBuffer(1));
      NewImageArrays.push({
        "X": X,
        "Z": Z,
        "ImageArray": Tile.ImageArray,
        "NeedsUpdate": Tile.NeedsUpdate
      });
    }
  }

  if(NewImageArrays.length !== 0){
    self.postMessage({
      "Request": "ShareImageArrays",
      "Tiles": NewImageArrays
    });
  }

  //console.time();

  //Main peak finding logic

  for(const Identifier in MapTiles){
    if(FoundPeaks.has(Identifier)) continue;
    const Tile = MapTiles[Identifier];

    let Peaks = FindPeaks(Tile);
    Peaks = FilterPeaks(Peaks);
    Peaks = FindProminenceAndFilter(Peaks);

    if(NewImageArrays.length !== 0) self.postMessage({
      "Request": "SavePeaks",
      "Peaks": Peaks
    });

    FoundPeaks.add(Identifier);
  }

  Unload();
  self.setTimeout(EventHandler.StartLoadLoop, 100);
};

function Unload(Everything = false){
  for(const Identifier in MapTiles){
    const Tile = MapTiles[Identifier];
    if(!Everything && Tile.X >= PeakMinX && Tile.X < PeakMaxX && Tile.Z >= PeakMinZ && Tile.Z < PeakMaxZ) continue;

    //Random note:
    //If this was multithreaded, it could happen that the image array was being written to as it was being disposed.
    //This (probably) DOES happen in the 3d world generation, since it is multithreaded, but WON'T happen here.
    //To be clear, using .fill on the array wouldn't fix the issue since the later writes would not be cleared.

    Tile.ImageArray.fill(0);
    FreeArrayBuffers.push(Tile.ImageArray);
    delete MapTiles[Identifier];
    self.postMessage({
      "Request": "UnloadedTile",
      "TileX": Tile.X,
      "TileZ": Tile.Z
    });
  }
}

function HeightAt(X, Z){
  const tX = X & TileSizeMinus1; //Only works for powers of 2, but unlike %, it gives the euclidean modulo, and is also 2x faster.
  const tZ = Z & TileSizeMinus1;

  const TileX = (X - tX) / TileSize;
  const TileZ = (Z - tZ) / TileSize;

  if(TileX < PeakMinX || TileX >= PeakMaxX || TileZ < PeakMinZ || TileZ >= PeakMaxZ) return GetHeight(X * Scale, Z * Scale);

  const Identifier = TileX + "," + TileZ;

  const Tile = MapTiles[Identifier];
  if(Tile === undefined) return GetHeight(X * Scale, Z * Scale);

  const HeightMap = Tile.HeightMap;

  const Index = tZ * TileSize + tX;

  let Height;

  if(HeightMap[Index] !== Infinity) Height = HeightMap[Index];
  else Height = GetHeight(X * Scale, Z * Scale), HeightMap[Index] = Height;

  if(TileX < LoadMinX || TileX >= LoadMaxX || TileZ < LoadMinZ || TileZ >= LoadMaxZ) return Height;

  const SharedImageDataArray = Tile.ImageArray;

  const NeedsPaint = SharedImageDataArray[Index * 4 + 3] !== 255;

  if(NeedsPaint === true) Paint(SharedImageDataArray, Index, Height), Tile.NeedsUpdate[0] = 1;

  return Height;
}

function ApproximateHeightAt(X, Z){
  const tX = X & TileSizeMinus1; //Only works for powers of 2, but unlike %, it gives the euclidean modulo, and is also 2x faster.
  const tZ = Z & TileSizeMinus1;

  const TileX = (X - tX) / TileSize;
  const TileZ = (Z - tZ) / TileSize;

  if(TileX < PeakMinX || TileX >= PeakMaxX || TileZ < PeakMinZ || TileZ >= PeakMaxZ) return GetHeight(X * Scale, Z * Scale);

  const Identifier = TileX + "," + TileZ;

  const Tile = MapTiles[Identifier];

  const HeightMap = Tile.HeightMap;

  const Index = tZ * TileSize + tX;

  let Height;

  if(HeightMap[Index] !== Infinity) Height = HeightMap[Index];
  else{
    const Modulo = tX % 4;
    if(Modulo === 0) Height = GetHeight(X * Scale, Z * Scale);
    else{
      const PreviousX = X - Modulo;
      const NextX = PreviousX + 4;
      Height = (Modulo * HeightAt(NextX, Z) + (4 - Modulo) * HeightAt(PreviousX, Z)) / 4;
    }
    HeightMap[Index] = Height;
  }

  if(TileX < LoadMinX || TileX >= LoadMaxX || TileZ < LoadMinZ || TileZ >= LoadMaxZ) return Height;

  const SharedImageDataArray = Tile.ImageArray;

  const NeedsPaint = SharedImageDataArray[Index * 4 + 3] !== 255;

  if(NeedsPaint === true) Paint(SharedImageDataArray, Index, Height), Tile.NeedsUpdate[0] = 1;

  return Height;
}

function ApproximateHeightAt_Equal(X, Z){
  const tX = X & TileSizeMinus1; //Only works for powers of 2, but unlike %, it gives the euclidean modulo, and is also 2x faster.
  const tZ = Z & TileSizeMinus1;

  const TileX = (X - tX) / TileSize;
  const TileZ = (Z - tZ) / TileSize;

  if(TileX < PeakMinX || TileX >= PeakMaxX || TileZ < PeakMinZ || TileZ >= PeakMaxZ) return GetHeight(X * Scale, Z * Scale);

  const Identifier = TileX + "," + TileZ;

  const Tile = MapTiles[Identifier];

  const HeightMap = Tile.HeightMap;

  const Index = tZ * TileSize + tX;

  let Height;

  if(HeightMap[Index] !== Infinity) Height = HeightMap[Index];
  else{
    const ModuloX = tX & 3;
    const ModuloZ = tZ & 3;
    if(ModuloX === 0 && ModuloZ === 0) Height = GetHeight(X * Scale, Z * Scale);
    else{
      const PreviousX = X - ModuloX;
      const NextX = PreviousX + 4;
      const PreviousZ = Z - ModuloZ;
      const NextZ = PreviousZ + 4;
      Height = (ModuloX * HeightAt(NextX, Z) + (4 - ModuloX) * HeightAt(PreviousX, Z) + ModuloZ * HeightAt(X, NextZ) + (4 - ModuloZ) * HeightAt(X, PreviousZ)) / 8;
    }
    HeightMap[Index] = Height;
  }

  if(TileX < LoadMinX || TileX >= LoadMaxX || TileZ < LoadMinZ || TileZ >= LoadMaxZ) return Height;

  const SharedImageDataArray = Tile.ImageArray;

  const NeedsPaint = SharedImageDataArray[Index * 4 + 3] !== 255;

  if(NeedsPaint === true) Paint(SharedImageDataArray, Index, Height), Tile.NeedsUpdate[0] = 1;

  return Height;
}

function OptimisedHeightAt(X, Z, SharedImageDataArray){ //Optimised for filling
  const Height = GetHeight(X * Scale, Z * Scale);

  const tX = X & TileSizeMinus1; //Only works for powers of 2, but unlike %, it gives the euclidean modulo, and is also 2x faster.
  const tZ = Z & TileSizeMinus1;

  const Index = tZ * TileSize + tX;

  const NeedsPaint = SharedImageDataArray[Index * 4 + 3] !== 255;

  if(NeedsPaint === true) Paint(SharedImageDataArray, Index, Height);

  return Height;
}

function Paint(SharedImageDataArray, Index, Height){
  const Lightness = Math.abs(Height / 2623) ** 0.5;

  if(Height < 0){
    let RGB = HSLToRGB(209 / 360, 0.7, 0.5 - Lightness);
    SharedImageDataArray[Index * 4 + 0] = RGB[0];
    SharedImageDataArray[Index * 4 + 1] = RGB[1];
    SharedImageDataArray[Index * 4 + 2] = RGB[2];
    SharedImageDataArray[Index * 4 + 3] = 255;
  } else if(Lightness < 0.4){
    let RGB = HSLToRGB(111 / 360, 0.7 - 0.5 * Lightness, 0.4 - 0.6 * Lightness);
    SharedImageDataArray[Index * 4 + 0] = RGB[0];
    SharedImageDataArray[Index * 4 + 1] = RGB[1];
    SharedImageDataArray[Index * 4 + 2] = RGB[2];
    SharedImageDataArray[Index * 4 + 3] = 255;
  } else if(Lightness < 0.9){
    let RGB = HSLToRGB(111 / 360, 0.7 - 0.5 * ((Lightness - 0.4) * 2.2 + 0.4), 0.4 - 0.6 * 0.4 + 0.6 * (Lightness - 0.4));
    SharedImageDataArray[Index * 4 + 0] = RGB[0];
    SharedImageDataArray[Index * 4 + 1] = RGB[1];
    SharedImageDataArray[Index * 4 + 2] = RGB[2];
    SharedImageDataArray[Index * 4 + 3] = 255;
  } else{
    let RGB = HSLToRGB(111 / 360, 0.7 - 0.5 * ((Lightness - 0.4) * 2.2 + 0.4), 0.4 - 0.6 * 0.4 + 0.6 * (Lightness - 0.4) + 1 * (Lightness - 0.9));
    SharedImageDataArray[Index * 4 + 0] = RGB[0];
    SharedImageDataArray[Index * 4 + 1] = RGB[1];
    SharedImageDataArray[Index * 4 + 2] = RGB[2];
    SharedImageDataArray[Index * 4 + 3] = 255;
  }
}

function HSLToRGB(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function FindPeaks(Tile){
  const Peaks = [];

  const MinX = Tile.X * TileSize;
  const MaxX = (Tile.X + 1) * TileSize;
  const MinZ = Tile.Z * TileSize;
  const MaxZ = (Tile.Z + 1) * TileSize;

  const SearchOffset = 64;

  const N = 0;
  const NE = 1;
  const E = 2;
  const SE = 3;
  const S = 4;
  const SW = 5;
  const W = 6;
  const NW = 7;

  for(let x = MinX + SearchOffset / 2; x < MaxX; x += SearchOffset){
    for(let z = MinZ + SearchOffset / 2; z < MaxZ; z += SearchOffset){
      let X = x;
      let Z = z;

      let Height = HeightAt(X, Z);
      let OtherHeight = 0;

      let PreviousDirection = N;
      let Step = 1;

      While: while(true){
        let Found = false;
        let DirectionBefore = PreviousDirection;
        Surroundings: for(let i = PreviousDirection; i < PreviousDirection + 8; i++){
          const Choice = i & 7;
          Switch: switch(Choice){
            case N:{
              if((OtherHeight = HeightAt(X + Step, Z)) > Height){
                Found = true, PreviousDirection = N, Height = OtherHeight, X += Step;
                break Surroundings;
              }
              break Switch;
            }
            case E:{
              if((OtherHeight = HeightAt(X, Z + Step)) > Height){
                Found = true, PreviousDirection = E, Height = OtherHeight, Z += Step;
                break Surroundings;
              }
              break Switch;
            }
            case W:{
              if((OtherHeight = HeightAt(X, Z - Step)) > Height){
                Found = true, PreviousDirection = W, Height = OtherHeight, Z -= Step;
                break Surroundings;
              }
              break Switch;
            }
            case S:{
              if((OtherHeight = HeightAt(X - Step, Z)) > Height){
                Found = true, PreviousDirection = S, Height = OtherHeight, X -= Step;
                break Surroundings;
              }
              break Switch;
            }
            case NE:{
              if((OtherHeight = HeightAt(X + Step, Z + Step)) > Height){
                Found = true, PreviousDirection = NE, Height = OtherHeight, X += Step, Z += Step;
                break Surroundings;
              }
              break Switch;
            }
            case NW:{
              if((OtherHeight = HeightAt(X + Step, Z - Step)) > Height){
                Found = true, PreviousDirection = NW, Height = OtherHeight, X += Step, Z -= Step;
                break Surroundings;
              }
              break Switch;
            }
            case SE:{
              if((OtherHeight = HeightAt(X - Step, Z + Step)) > Height){
                Found = true, PreviousDirection = SE, Height = OtherHeight, X -= Step, Z += Step;
                break Surroundings;
              }
              break Switch;
            }
            case SW:{
              if((OtherHeight = HeightAt(X - Step, Z - Step)) > Height){
                Found = true, PreviousDirection = SW, Height = OtherHeight, X -= Step, Z -= Step;
                break Surroundings;
              }
              break Switch;
            }
          }
        }
        if(DirectionBefore === PreviousDirection) Step++;
        else Step = 1;

        if(!Found){
          let sX = X - 15;
          let sZ = Z - 15;
          Found = false;
          Perimeter: for(let i = 10, XDiff = 0, ZDiff = -3, Iteration = 0; i >= 9; i -= 1){
            for(let j = 0; j < 2; j++){
              do{
                XDiff += ZDiff;
                ZDiff -= XDiff;
              } while(XDiff + ZDiff === 0);

              for(let k = 0; k < i; k++, Iteration++){

                if((OtherHeight = HeightAt(sX, sZ)) > Height){
                  Height = OtherHeight;
                  X = sX;
                  Z = sZ;
                  Found = true;
                  break Perimeter;
                }

                sX -= XDiff;
                sZ += ZDiff;
              }
            }
          }

          if(!Found){
            sX = X;
            sZ = Z;
            Search: for(let i = 1, XDiff = 0, ZDiff = -1, Iteration = 0; i <= 15; i++){
              if(i === 10) XDiff *= 2, ZDiff *= 2, sX -= 2, sZ -= 2;
              for(let j = 0; j < 2; j++){
                do{
                  XDiff += ZDiff;
                  ZDiff -= XDiff;
                } while(XDiff + ZDiff === 0);

                for(let k = 0, Limit = i < 10 ? i : i / 2; k < Limit; k++, Iteration++){

                  if((OtherHeight = HeightAt(sX, sZ)) > Height){
                    Height = OtherHeight;
                    X = sX;
                    Z = sZ;
                    Found = true;
                    break Search;
                  }

                  sX -= XDiff;
                  sZ += ZDiff;
                }
              }
            }
            if(!Found) break While; //Found highest local peak.
          }
        }
      }
      Peaks.push({"X": X, "Z": Z, "Height": Height});
    }
  }
  return Peaks;
}

function FilterPeaks(Peaks){
  Outer: for(let i = Peaks.length - 1; i >= 0; i--){ //Filter based on close peaks (isolation-based, 20m)
    const CurrentPeak = Peaks[i];
    for(let j = Peaks.length - 1; j >= 0; j--){
      if(j === i) continue;
      const Peak = Peaks[j];
      if(Math.abs(CurrentPeak.X - Peak.X) < 40 && Math.abs(CurrentPeak.Z - Peak.Z) < 40){
        if(Peak.Height <= CurrentPeak.Height){
          Peaks.splice(j, 1);
          i--;
        }
        else{
          Peaks.splice(i, 1);
          continue Outer;
        }
      }
    }
  }
  return Peaks;
}

const FindProminenceAndIsolation = function(){
  const WeightLookupTable = new Uint16Array(2048);
  for(let i = 0; i < 2048; i++){
    WeightLookupTable[i] = i ** 1.6;
  }

  const FloodfillArray = new Uint8Array(1024 * 1024); //The actual range is a lot higher; it depends on the weighting function provided.
  const FloodfillArrayWidth = 1024;
  const HalfFloodfillArrayWidth = FloodfillArrayWidth / 2;

  return function(OwnHeight, MaxRange, X, Y, CheckX, CheckY){
    let FillStack = [];
    let NextFillStack = [];

    const StartX = X;
    const StartY = Y;

    const MinX = PeakMinX * TileSize;
    const MaxX = PeakMaxX * TileSize;
    const MinY = PeakMinZ * TileSize;
    const MaxY = PeakMaxZ * TileSize;

    FillStack.push([0, 0]);

    let FirstIteration = true;

    const FilledPoints = [];

    let Found = false;

    let MinHeight = OwnHeight;
    let Prominence = 0;

    let Step = 32;

    let i = 0;

    ProminenceTester: while(i++ < 256){
      {
        //Switch stacks. Right now, FillStack is always empty.
        const Temp = NextFillStack;
        NextFillStack = FillStack;
        FillStack = Temp;
      }
      Found = false;
      while(FillStack.length > 0){
        const [dx, dy] = FillStack.pop();
        const ModifiedX = Math.sign(dx) * WeightLookupTable[Math.abs(dx)];
        const ModifiedY = Math.sign(dy) * WeightLookupTable[Math.abs(dy)];

        const XUncertainty = Math.abs(WeightLookupTable[Math.abs(dx + 1)] - WeightLookupTable[Math.abs(dx)]);
        const YUncertainty = Math.abs(WeightLookupTable[Math.abs(dy + 1)] - WeightLookupTable[Math.abs(dy)]);

        const x = X + ModifiedX;
        const y = Y + ModifiedY;

        if(Math.abs(dx) > HalfFloodfillArrayWidth - 3 || Math.abs(dy) > HalfFloodfillArrayWidth - 3){
          Found = {"X": x, "Z": y, "Prominence": Prominence, "Inaccurate": true}; //Search went outside of the floodfill array bounds.
          break ProminenceTester;
        }

        const CurrentHeight = HeightAt(x, y);

        const FloodfillIndex = (dx + HalfFloodfillArrayWidth) * FloodfillArrayWidth + dy + HalfFloodfillArrayWidth;

        if(FloodfillArray[FloodfillIndex] !== 0) continue;

        if(CurrentHeight < MinHeight){
          NextFillStack.push([dx, dy]);
          continue;
        }

        if((Math.abs(x - CheckX) < Math.abs(XUncertainty * 2) && Math.abs(y - CheckY) < Math.abs(YUncertainty * 2)) || OwnHeight < CurrentHeight){
          Found = {"X": x, "Z": y, "Prominence": Prominence, "Inaccurate": false};
          break;
        }

        if(FirstIteration && (x <= MinX || x >= MaxX || y <= MinY || y >= MaxY)){
          Found = {"X": x, "Z": y, "Prominence": Prominence, "Inaccurate": false}; //Handle edge cases, this will be filtered out later
          break;
        }

        if(Math.abs(StartX - x) > MaxRange || Math.abs(StartY - y) > MaxRange){
          Found = {"X": x, "Z": y, "Prominence": Prominence, "Inaccurate": MaxRange > 10000}; //Could happen when two peaks have very similar heights, and the search jumps over the peak. Also when no other peak was found (MaxRange > 10000).
          break;
        }

        FloodfillArray[FloodfillIndex] = 1;

        FilledPoints.push(FloodfillIndex);

        if(x < CheckX){
          FillStack.push([dx + 1, dy]);
          FillStack.push([dx - 1, dy]);
        } else{
          FillStack.push([dx - 1, dy]);
          FillStack.push([dx + 1, dy]);
        }

        if(y < CheckY){
          FillStack.push([dx, dy + 1]);
          FillStack.push([dx, dy - 1]);
        } else{
          FillStack.push([dx, dy - 1]);
          FillStack.push([dx, dy + 1]);
        }

        FirstIteration = false;
      }

      if(!Found){
        Prominence += Step;
      } else{
        if(Step === 1) break;

        Prominence -= Step;
        Step = Math.ceil(Step / 8);
        NextFillStack = [[0, 0]]; //Clear next fillstack. This has to be done because the previous next fillstack would've been for a bigger height than was acceptable.
        FillStack = []; //Clear current fillstack. This will almost never be empty beforehand! (since the other loop was "break"ed) This would become a problem in 2 iterations.

        while(FilledPoints.length > 0) FloodfillArray[FilledPoints.pop()] = 0; //Clear array.
      }

      MinHeight = OwnHeight - Prominence;
    }

    while(FilledPoints.length > 0) FloodfillArray[FilledPoints.pop()] = 0;

    return Found;
  };
}();

function FindProminenceAndFilter(Peaks){
  for(let i = Peaks.length - 1; i >= 0; i--){
    const CurrentPeak = Peaks[i];
    let ClosestHigherPeak = null;
    let ClosestDistance = 0;
    for(let j = 0, Length = Peaks.length; j < Length; j++){
      if(i === j) continue;
      const Peak = Peaks[j];
      const PeakDistance = Math.sqrt((CurrentPeak.X - Peaks[j].X) ** 2 + (CurrentPeak.Z - Peaks[j].Z) ** 2);

      if(CurrentPeak.Height < Peak.Height && (!ClosestHigherPeak || ClosestDistance > PeakDistance)){
        ClosestHigherPeak = Peak;
        ClosestDistance = PeakDistance;
      }
    }
    if(!ClosestHigherPeak){
      ClosestDistance = 30000; //Limit the range for finding higher peaks
      ClosestHigherPeak = {
        "X": CurrentPeak.X - 100000,
        "Z": CurrentPeak.Z - 100000,
        "Fake": true
      };
    }
    const Result = FindProminenceAndIsolation(CurrentPeak.Height, (ClosestDistance + 3) * 1.3, CurrentPeak.X, CurrentPeak.Z, ClosestHigherPeak.X, ClosestHigherPeak.Z);

    const XDiff = Result.X - CurrentPeak.X;
    const ZDiff = Result.Z - CurrentPeak.Z;

    CurrentPeak.Prominence = Result.Prominence;
    CurrentPeak.Isolation = Math.sqrt(XDiff ** 2 + ZDiff ** 2);
    if(!Result.Inaccurate){
      CurrentPeak.HigherX = Result.X;
      CurrentPeak.HigherZ = Result.Z;
    }

    if(CurrentPeak.Isolation < 100 - Result.Prominence / 1) Peaks.splice(i, 1); //Filter similar peaks
  }
  return Peaks;
}
