import {Region, VirtualRegion} from "./World/Region.mjs";
import REGION_SD from "./World/RegionSD.mjs";

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

let VoxelTypes;
let Data8;
let Data64;
let GPUBoundingBox1;
let GPUInfo8;
let GPUInfo64;
let Data64Offset;
let OwnQueueSize;

let EventHandler = {};

self.onmessage = function(Event){
  EventHandler[Event.data.Request]?.(Event.data);
};

EventHandler.SaveStuff = function(Data){
  VoxelTypes = Data.VoxelTypes;
  Data8 = Data.Data8;
  Data64 = Data.Data64;
  GPUBoundingBox1 = Data.GPUBoundingBox1;
  GPUInfo8 = Data.GPUInfo8;
  GPUInfo64 = Data.GPUInfo64;
  Data64Offset = Data.Data64Offset;
  OwnQueueSize = Data.OwnQueueSize;
};

EventHandler.GenerateBoundingGeometry = function(Data){
  Requests++;

  const RegionX = Data.RegionX;
  const RegionY = Data.RegionY;
  const RegionZ = Data.RegionZ;
  const Depth = Data.Depth;
  const Info = [];

  const x64 = RegionX - Data64Offset[Depth * 3 + 0];
  const y64 = RegionY - Data64Offset[Depth * 3 + 1];
  const z64 = RegionZ - Data64Offset[Depth * 3 + 2];

  const Info64 = GPUInfo64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64];


  const Location64 = Info64 & 0x0fffffff;
  const CPULocation64 = Data64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64] & 0x0007ffff;
  let IndexCounter = 0;




  //Important: The order in which these triangles are entered could influence how fast the mesh is rendered.
  //This could be leveraged to boost fps even more depending on the direction that's being looked at, however,
  //that would require multiple versions of the same mesh to be sent to the gpu.
  //This order is probably the best compromise, since x/z sides are more likely to be looked at than the y side.
  //
  //For reference, this is how different orders performed:
  //xyz, while looking at +x, +z: 480 fps
  //xyz, while looking at -x, -z: 230 fps
  //yxz, while looking anywhere:  330 fps (+/- 30 fps depending on x/z)
  //The latter is the best choice because it gives a consistent framerate regardless of which direction the camera is facing.
  //
  //It also matters whether the loops iterate from 0 -> 7 or 7 -> 0: the former works better for looking in +ve directions
  //of the outermost loop direction, and the latter for -ve directions. This could be the best and easiest optimisation
  //to undertake, and could possibly yield a ~30% fps boost, at the cost of doubling or tripling the meshes sent to the gpu.
  //In this case, it probably makes sense to use the order xzy or zxy.

  for(let y8 = 7; y8 >= 0; --y8) for(let x8 = 7; x8 >= 0; --x8) for(let z8 = 7; z8 >= 0; --z8){
    const Exists = ((GPUInfo8[(Location64 << 9) | (x8 << 6) | (y8 << 3) | z8] >> 31) & 1) === 0;
    if(Exists){
      const LocalIndex8 = (x8 << 6) | (y8 << 3) | z8;
      const Index8 = (Location64 << 9) | LocalIndex8;
      const Location8 = GPUInfo8[Index8] & 0x0fffffff;

      const MinX = (GPUBoundingBox1[Index8] >> 15) & 7;
      const MinY = (GPUBoundingBox1[Index8] >> 12) & 7;
      const MinZ = (GPUBoundingBox1[Index8] >> 9) & 7;
      const MaxX = (GPUBoundingBox1[Index8] >> 6) & 7;
      const MaxY = (GPUBoundingBox1[Index8] >> 3) & 7;
      const MaxZ = GPUBoundingBox1[Index8] & 7;

      if(MaxX < MinX || MaxY < MinY || MaxZ < MinZ) continue;

      //This section optimises the bounding box faces by removing the parts which are occluded by the blocks in front of it.
      //TODO: I disabled this!!
      //1. I should not do this on faces of 8-chunks which are in the middle of a 64-chunk so that there aren't holes when
      //half of a chunk is hidden
      //2. When the AllocationIndex[0] exceeds the Data8 buffer size, indexing VoxelTypes starts to give strange results
      //and strange holes in the mesh can be seen (because the code thinks the side is occluded)
      //Using this can increase the fps by a lot. (10-30%)
      PlusX: {
        let NewMinY = MinY;
        let NewMinZ = MinZ;
        let NewMaxY = MaxY;
        let NewMaxZ = MaxZ;

        if(false && MinX === 0){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
          const x8Search = x8 - 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
          let Info8 = -1;
          if(x8Search >= 0) Info8 = Data8[(CPULocation64 << 9) | (x8Search << 6) | (y8 << 3) | z8];

          if(Info8 !== -1){
            //(below) Has CommonBlock which isn't air (TODO: make this work for all transparent blocks)
            if(((Info8 >> 28) & 1) === 1 && (Info8 & 0x0000ffff) !== 0) break PlusX; //Side isn't required because it's occluded
            if(((Info8 >> 31) & 1) !== 1){ //Is not empty
              NewMinY = 7;
              NewMinZ = 7;
              NewMaxY = 0;
              NewMaxZ = 0;
              const Location8 = Info8 & 0x0fffffff;
              for(let y1 = MinY; y1 <= MaxY; ++y1) for(let z1 = MinZ; z1 <= MaxZ; ++z1){
                if(VoxelTypes[(Location8 << 9) | (7 << 6) | (y1 << 3) | z1] === 0){ //TODO: make this work for all transparent blocks
                  if(NewMinY > y1) NewMinY = y1;
                  if(NewMinZ > z1) NewMinZ = z1;
                  if(NewMaxY < y1) NewMaxY = y1;
                  if(NewMaxZ < z1) NewMaxZ = z1;
                }
              }
              if(NewMinY > NewMaxY || NewMinZ > NewMaxZ) break PlusX;
            }
          }
        }
        //This is because it is at the outer side of a block
        NewMaxY++;
        NewMaxZ++;

        IndexCounter += 6;

        Info.push(
          (4 << 21) | (MinX << 17) | (NewMaxY << 13) | (NewMinZ << 9) | LocalIndex8,
          (4 << 21) | (MinX << 17) | (NewMinY << 13) | (NewMinZ << 9) | LocalIndex8,
          (4 << 21) | (MinX << 17) | (NewMaxY << 13) | (NewMaxZ << 9) | LocalIndex8,
          (4 << 21) | (MinX << 17) | (NewMinY << 13) | (NewMaxZ << 9) | LocalIndex8
        );
      }

      PlusY: {
        let NewMinX = MinX;
        let NewMinZ = MinZ;
        let NewMaxX = MaxX;
        let NewMaxZ = MaxZ;

        if(false && MinY === 0){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
          const y8Search = y8 - 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
          let Info8 = -1;
          if(y8Search >= 0) Info8 = Data8[(CPULocation64 << 9) | (x8 << 6) | (y8Search << 3) | z8];

          if(Info8 !== -1){
            //(below) Has CommonBlock which isn't air (TODO: make this work for all transparent blocks)
            if(((Info8 >> 28) & 1) === 1 && (Info8 & 0x0000ffff) !== 0) break PlusY; //Side isn't required because it's occluded
            if(((Info8 >> 31) & 1) !== 1){ //Is not empty
              NewMinX = 7;
              NewMinZ = 7;
              NewMaxX = 0;
              NewMaxZ = 0;
              const Location8 = Info8 & 0x0fffffff;
              for(let x1 = MinX; x1 <= MaxX; ++x1) for(let z1 = MinZ; z1 <= MaxZ; ++z1){
                if(VoxelTypes[(Location8 << 9) | (x1 << 6) | (7 << 3) | z1] === 0){ //TODO: make this work for all transparent blocks
                  if(NewMinX > x1) NewMinX = x1;
                  if(NewMinZ > z1) NewMinZ = z1;
                  if(NewMaxX < x1) NewMaxX = x1;
                  if(NewMaxZ < z1) NewMaxZ = z1;
                }
              }
              if(NewMinX > NewMaxX || NewMinZ > NewMaxZ) break PlusY;
            }
          }
        }
        //This is because it is at the outer side of a block
        NewMaxX++;
        NewMaxZ++;

        IndexCounter += 6;

        Info.push(
          (5 << 21) | (NewMaxX << 17) | (MinY << 13) | (NewMaxZ << 9) | LocalIndex8,
          (5 << 21) | (NewMinX << 17) | (MinY << 13) | (NewMaxZ << 9) | LocalIndex8,
          (5 << 21) | (NewMaxX << 17) | (MinY << 13) | (NewMinZ << 9) | LocalIndex8,
          (5 << 21) | (NewMinX << 17) | (MinY << 13) | (NewMinZ << 9) | LocalIndex8
        );
      }

      PlusZ: {
        let NewMinX = MinX;
        let NewMinY = MinY;
        let NewMaxX = MaxX;
        let NewMaxY = MaxY;

        if(false && MinZ === 0){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
          const z8Search = z8 - 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
          let Info8 = -1;
          if(z8Search >= 0) Info8 = Data8[(CPULocation64 << 9) | (x8 << 6) | (y8 << 3) | z8Search];

          if(Info8 !== -1){
            //(below) Has CommonBlock which isn't air (TODO: make this work for all transparent blocks)
            if(((Info8 >> 28) & 1) === 1 && (Info8 & 0x0000ffff) !== 0) break PlusZ; //Side isn't required because it's occluded
            if(((Info8 >> 31) & 1) !== 1){ //Is not empty
              NewMinX = 7;
              NewMinY = 7;
              NewMaxX = 0;
              NewMaxY = 0;
              const Location8 = Info8 & 0x0fffffff;
              for(let x1 = MinX; x1 <= MaxX; ++x1) for(let y1 = MinY; y1 <= MaxY; ++y1){
                if(VoxelTypes[(Location8 << 9) | (x1 << 6) | (y1 << 3) | 7] === 0){ //TODO: make this work for all transparent blocks
                  if(NewMinX > x1) NewMinX = x1;
                  if(NewMinY > y1) NewMinY = y1;
                  if(NewMaxX < x1) NewMaxX = x1;
                  if(NewMaxY < y1) NewMaxY = y1;
                }
              }
              if(NewMinX > NewMaxX || NewMinY > NewMaxY) break PlusZ;
            }
          }
        }
        //This is because it is at the outer side of a block
        NewMaxX++;
        NewMaxY++;

        IndexCounter += 6;

        Info.push(
          (6 << 21) | (NewMaxX << 17) | (NewMinY << 13) | (MinZ << 9) | LocalIndex8,
          (6 << 21) | (NewMinX << 17) | (NewMinY << 13) | (MinZ << 9) | LocalIndex8,
          (6 << 21) | (NewMaxX << 17) | (NewMaxY << 13) | (MinZ << 9) | LocalIndex8,
          (6 << 21) | (NewMinX << 17) | (NewMaxY << 13) | (MinZ << 9) | LocalIndex8
        );
      }

      MinusX: {
        let NewMinY = MinY;
        let NewMinZ = MinZ;
        let NewMaxY = MaxY;
        let NewMaxZ = MaxZ;

        if(false && MaxX === 7){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
          const x8Search = x8 + 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
          let Info8 = -1;
          if(x8Search <= 7) Info8 = Data8[(CPULocation64 << 9) | (x8Search << 6) | (y8 << 3) | z8];

          if(Info8 !== -1){
            //(below) Has CommonBlock which isn't air (TODO: make this work for all transparent blocks)
            if(((Info8 >> 28) & 1) === 1 && (Info8 & 0x0000ffff) !== 0) break MinusX; //Side isn't required because it's occluded
            if(((Info8 >> 31) & 1) !== 1){ //Is not empty
              NewMinY = 7;
              NewMinZ = 7;
              NewMaxY = 0;
              NewMaxZ = 0;
              const Location8 = Info8 & 0x0fffffff;
              for(let y1 = MinY; y1 <= MaxY; ++y1) for(let z1 = MinZ; z1 <= MaxZ; ++z1){
                if(VoxelTypes[(Location8 << 9) | (0 << 6) | (y1 << 3) | z1] === 0){ //TODO: make this work for all transparent blocks
                  if(NewMinY > y1) NewMinY = y1;
                  if(NewMinZ > z1) NewMinZ = z1;
                  if(NewMaxY < y1) NewMaxY = y1;
                  if(NewMaxZ < z1) NewMaxZ = z1;
                }
              }
              if(NewMinY > NewMaxY || NewMinZ > NewMaxZ) break MinusX;
            }
          }
        }
        //This is because it is at the outer side of a block
        NewMaxY++;
        NewMaxZ++;

        IndexCounter += 6;

        Info.push(
          (2 << 21) | ((MaxX + 1) << 17) | (NewMaxY << 13) | (NewMaxZ << 9) | LocalIndex8,
          (2 << 21) | ((MaxX + 1) << 17) | (NewMinY << 13) | (NewMaxZ << 9) | LocalIndex8,
          (2 << 21) | ((MaxX + 1) << 17) | (NewMaxY << 13) | (NewMinZ << 9) | LocalIndex8,
          (2 << 21) | ((MaxX + 1) << 17) | (NewMinY << 13) | (NewMinZ << 9) | LocalIndex8
        );
      }

      MinusY: {
        let NewMinX = MinX;
        let NewMinZ = MinZ;
        let NewMaxX = MaxX;
        let NewMaxZ = MaxZ;

        if(false && MaxY === 7){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
          const y8Search = y8 + 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
          let Info8 = -1;
          if(y8Search <= 7) Info8 = Data8[(CPULocation64 << 9) | (x8 << 6) | (y8Search << 3) | z8];

          if(Info8 !== -1){
            //(below) Has CommonBlock which isn't air (TODO: make this work for all transparent blocks)
            if(((Info8 >> 28) & 1) === 1 && (Info8 & 0x0000ffff) !== 0) break MinusY; //Side isn't required because it's occluded
            if(((Info8 >> 31) & 1) !== 1){ //Is not empty
              NewMinX = 7;
              NewMinZ = 7;
              NewMaxX = 0;
              NewMaxZ = 0;
              const Location8 = Info8 & 0x0fffffff;
              for(let x1 = MinX; x1 <= MaxX; ++x1) for(let z1 = MinZ; z1 <= MaxZ; ++z1){
                if(VoxelTypes[(Location8 << 9) | (x1 << 6) | (0 << 3) | z1] === 0){ //TODO: make this work for all transparent blocks
                  if(NewMinX > x1) NewMinX = x1;
                  if(NewMinZ > z1) NewMinZ = z1;
                  if(NewMaxX < x1) NewMaxX = x1;
                  if(NewMaxZ < z1) NewMaxZ = z1;
                }
              }
              if(NewMinX > NewMaxX || NewMinZ > NewMaxZ) break MinusY;
            }
          }
        }
        //This is because it is at the outer side of a block
        NewMaxX++;
        NewMaxZ++;

        IndexCounter += 6;

        Info.push(
          (1 << 21) | (NewMinX << 17) | ((MaxY + 1) << 13) | (NewMaxZ << 9) | LocalIndex8,
          (1 << 21) | (NewMaxX << 17) | ((MaxY + 1) << 13) | (NewMaxZ << 9) | LocalIndex8,
          (1 << 21) | (NewMinX << 17) | ((MaxY + 1) << 13) | (NewMinZ << 9) | LocalIndex8,
          (1 << 21) | (NewMaxX << 17) | ((MaxY + 1) << 13) | (NewMinZ << 9) | LocalIndex8
        );
      }

      MinusZ: {
        let NewMinX = MinX;
        let NewMinY = MinY;
        let NewMaxX = MaxX;
        let NewMaxY = MaxY;

        if(false && MaxZ === 7){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
          const z8Search = z8 + 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
          let Info8 = -1;
          if(z8Search <= 7) Info8 = Data8[(CPULocation64 << 9) | (x8 << 6) | (y8 << 3) | z8Search];

          if(Info8 !== -1){
            //(below) Has CommonBlock which isn't air (TODO: make this work for all transparent blocks)
            if(((Info8 >> 28) & 1) === 1 && (Info8 & 0x0000ffff) !== 0) break MinusZ; //Side isn't required because it's occluded
            if(((Info8 >> 31) & 1) !== 1){ //Is not empty
              NewMinX = 7;
              NewMinY = 7;
              NewMaxX = 0;
              NewMaxY = 0;
              const Location8 = Info8 & 0x0fffffff;
              for(let x1 = MinX; x1 <= MaxX; ++x1) for(let y1 = MinY; y1 <= MaxY; ++y1){
                if(VoxelTypes[(Location8 << 9) | (x1 << 6) | (y1 << 3) | 0] === 0){ //TODO: make this work for all transparent blocks
                  if(NewMinX > x1) NewMinX = x1;
                  if(NewMinY > y1) NewMinY = y1;
                  if(NewMaxX < x1) NewMaxX = x1;
                  if(NewMaxY < y1) NewMaxY = y1;
                }
              }
              if(NewMinX > NewMaxX || NewMinY > NewMaxY) break MinusZ;
            }
          }
        }
        //This is because it is at the outer side of a block
        NewMaxX++;
        NewMaxY++;

        IndexCounter += 6;

        Info.push(
          (0 << 21) | (NewMinX << 17) | (NewMinY << 13) | ((MaxZ + 1) << 9) | LocalIndex8,
          (0 << 21) | (NewMaxX << 17) | (NewMinY << 13) | ((MaxZ + 1) << 9) | LocalIndex8,
          (0 << 21) | (NewMinX << 17) | (NewMaxY << 13) | ((MaxZ + 1) << 9) | LocalIndex8,
          (0 << 21) | (NewMaxX << 17) | (NewMaxY << 13) | ((MaxZ + 1) << 9) | LocalIndex8
        );
      }
    }
  }



  if(OwnQueueSize !== undefined) Atomics.sub(OwnQueueSize, 0, 1); //Decrease own queue size if needed

  const TypedInfo = new Uint32Array(Info);
  self.postMessage({
    "Request": "GenerateBoundingGeometry",
    "IndexCount": IndexCounter,
    "Info": TypedInfo,
    "RegionX": RegionX,
    "RegionY": RegionY,
    "RegionZ": RegionZ,
    "Depth": Depth,
    "Time": Data.Time
  }, [TypedInfo.buffer]);
};
