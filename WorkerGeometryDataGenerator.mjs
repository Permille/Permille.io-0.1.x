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

const VIRTUAL_REGION_MESH_BORDER_PATCHER_TOLERANCE = 5;
const MAXIMUM_VIRTUAL_REGION_MESH_BORDER_PATCHER_TOLERANCE = 5;
const VRMBPT = VIRTUAL_REGION_MESH_BORDER_PATCHER_TOLERANCE;
const MAX_VRMBPT = MAXIMUM_VIRTUAL_REGION_MESH_BORDER_PATCHER_TOLERANCE;

const X_LENGTH = Region.X_LENGTH;
const Y_LENGTH = Region.Y_LENGTH;
const Z_LENGTH = Region.Z_LENGTH; //I kid you not, this gives a 5x performance increase...

const U_START = 0;
const U_END = 1;
const V_START = 2;
const V_END = 3;

const GEOMETRY_FACES = [
  {
    "Direction": [-1, 0, 0],//Left
    "Corners": [
      { "Position": [ 0, 1, 0 ], "UV": [ 0, 1 ] },
      { "Position": [ 0, 0, 0 ], "UV": [ 0, 0 ] },
      { "Position": [ 0, 1, 1 ], "UV": [ 1, 1 ] },
      { "Position": [ 0, 0, 1 ], "UV": [ 1, 0 ] }
    ]
  },
  {
    "Direction": [1, 0, 0],//Right
    "Corners": [
      { "Position": [ 1, 1, 1 ], "UV": [ 0, 1 ] },
      { "Position": [ 1, 0, 1 ], "UV": [ 0, 0 ] },
      { "Position": [ 1, 1, 0 ], "UV": [ 1, 1 ] },
      { "Position": [ 1, 0, 0 ], "UV": [ 1, 0 ] }
    ]
  },
  {
    "Direction": [0, -1, 0],//Bottom
    "Corners": [
      { "Position": [ 1, 0, 1 ], "UV": [ 1, 0 ] },
      { "Position": [ 0, 0, 1 ], "UV": [ 0, 0 ] },
      { "Position": [ 1, 0, 0 ], "UV": [ 1, 1 ] },
      { "Position": [ 0, 0, 0 ], "UV": [ 0, 1 ] }
    ]
  },
  {
    "Direction": [0, 1, 0],//Top
    "Corners": [
      { "Position": [ 0, 1, 1 ], "UV": [ 1, 1 ] },
      { "Position": [ 1, 1, 1 ], "UV": [ 0, 1 ] },
      { "Position": [ 0, 1, 0 ], "UV": [ 1, 0 ] },
      { "Position": [ 1, 1, 0 ], "UV": [ 0, 0 ] }
    ]
  },
  {
    "Direction": [0, 0, -1],//Back
    "Corners": [
      { "Position": [ 1, 0, 0 ], "UV": [ 0, 0 ] },
      { "Position": [ 0, 0, 0 ], "UV": [ 1, 0 ] },
      { "Position": [ 1, 1, 0 ], "UV": [ 0, 1 ] },
      { "Position": [ 0, 1, 0 ], "UV": [ 1, 1 ] }
    ]
  },
  {
    "Direction": [0, 0, 1],//Front
    "Corners": [
      { "Position": [ 0, 0, 1 ], "UV": [ 0, 0 ] },
      { "Position": [ 1, 0, 1 ], "UV": [ 1, 0 ] },
      { "Position": [ 0, 1, 1 ], "UV": [ 0, 1 ] },
      { "Position": [ 1, 1, 1 ], "UV": [ 1, 1 ] }
    ]
  }
];

let CallCount = 0;
let EventHandler = {};

self.onmessage = function(Event){
  EventHandler[Event.data.Request]?.(Event.data);
};

function* Generator(Seed){ //Bad random number generator which always produces the same results.
  while(true) yield (Seed = Seed * 0x41a7 % 0x7fffffff) / 0x7fffffff;
}

const Noise = new Float32Array(X_LENGTH * Y_LENGTH * Z_LENGTH);
const RNG = Generator(0x53a1d748);
for(let i = 0, Length = Noise.length; i < Length; i++){
  Noise[i] = RNG.next().value;
}

let RequiredRegions;
let MergedUVMapping;
const FloatUVMapping = new Float32Array(65536 * 4);
let MainBlockRegistry;
let AtlasWidth, AtlasHeight;


let OwnQueueSize;

const IS_TRANSPARENT = 0;
const IS_INVISIBLE = 1;
const IS_DAF = 2;
const FBP_COUNT = 3;

const FloatBlockProperties = new Uint8Array(65536 * FBP_COUNT); //I know this is silly but it gives a massive performance gain... 8200 -> 6800

EventHandler.SaveStuff = function(Data){
  MergedUVMapping = Data.MergedUVMapping;
  AtlasWidth = Data.AtlasWidth;
  AtlasHeight = Data.AtlasHeight;
  RequiredRegions = Data.RequiredRegions;
  OwnQueueSize = Data.OwnQueueSize;
  for(const i in MergedUVMapping){
    FloatUVMapping[i * 4 + U_START] = MergedUVMapping[i].startU; //This approach is much faster, as it doesn't use object access 8300 -> 6600
    FloatUVMapping[i * 4 + U_END] = MergedUVMapping[i].endU;
    FloatUVMapping[i * 4 + V_START] = MergedUVMapping[i].startV;
    FloatUVMapping[i * 4 + V_END] = MergedUVMapping[i].endV;
  }
  //MainBlockRegistry = BlockRegistry.Initialise(Data.BlockIDMapping, null); //Block Identifiers aren't needed.
  const BlockIDMapping = Data.BlockIDMapping;
  for(const ID in Data.BlockIDMapping){
    const BlockProperties = BlockIDMapping[ID].Properties;
    if(BlockProperties.Transparent) FloatBlockProperties[FBP_COUNT * ID + IS_TRANSPARENT] = 1;
    if(BlockProperties.Invisible) FloatBlockProperties[FBP_COUNT * ID + IS_INVISIBLE] = 1;
    if(BlockProperties.DrawAllFaces) FloatBlockProperties[FBP_COUNT * ID + IS_DAF] = 1;
  }
};

function IsTransparentOrInvisible(ID){ //For invisible / semi-transparent blocks
  return FloatBlockProperties[FBP_COUNT * ID + IS_TRANSPARENT] || FloatBlockProperties[2 * ID + IS_INVISIBLE];
}
function IsInvisible(ID){ //For invisible blocks
  return FloatBlockProperties[FBP_COUNT * ID + IS_INVISIBLE];
}
function IsTransparent(ID){ //For liquids
  return FloatBlockProperties[FBP_COUNT * ID + IS_TRANSPARENT];
}
function IsDAF(ID){ //For liquids
  return FloatBlockProperties[FBP_COUNT * ID + IS_DAF];
}
function GetVoxelFromRelativeRegionData(rX, rY, rZ, SelectedRegion){
  const CommonBlock = SelectedRegion.SharedData[REGION_SD.COMMON_BLOCK];
  const IsEntirelySolid = SelectedRegion.SharedData[REGION_SD.IS_ENTIRELY_SOLID];
  if(!SelectedRegion.RegionData) return CommonBlock !== -1 ? CommonBlock : IsEntirelySolid ? 61440 : 0;
  return SelectedRegion.RegionData[rX * X_LENGTH * Y_LENGTH + rY * Z_LENGTH + rZ];
}

function IsOccluded(RegionP00, RegionM00, Region0P0, Region0M0, Region00P, Region00M){
  for(let Y = 0; Y < Y_LENGTH; Y++) for(let Z = 0; Z < Z_LENGTH; Z++) if(IsTransparentOrInvisible(GetVoxelFromRelativeRegionData(0, Y, Z, RegionP00))) return false;
  for(let X = 0; X < X_LENGTH; X++) for(let Z = 0; Z < Z_LENGTH; Z++) if(IsTransparentOrInvisible(GetVoxelFromRelativeRegionData(X, 0, Z, Region0P0))) return false;
  for(let X = 0; X < X_LENGTH; X++) for(let Y = 0; Y < Y_LENGTH; Y++) if(IsTransparentOrInvisible(GetVoxelFromRelativeRegionData(X, Y, 0, Region00P))) return false;
  for(let Y = 0; Y < Y_LENGTH; Y++) for(let Z = 0; Z < Z_LENGTH; Z++) if(IsTransparentOrInvisible(GetVoxelFromRelativeRegionData(X_LENGTH - 1, Y, Z, RegionM00))) return false;
  for(let X = 0; X < X_LENGTH; X++) for(let Z = 0; Z < Z_LENGTH; Z++) if(IsTransparentOrInvisible(GetVoxelFromRelativeRegionData(X, Y_LENGTH - 1, Z, Region0M0))) return false;
  for(let X = 0; X < X_LENGTH; X++) for(let Y = 0; Y < Y_LENGTH; Y++) if(IsTransparentOrInvisible(GetVoxelFromRelativeRegionData(X, Y, Z_LENGTH - 1, Region00M))) return false;
  return true;
}
function IsSemiOccluded(RegionP00, RegionM00, Region0P0, Region0M0, Region00P, Region00M){
  for(let Y = 0; Y < Y_LENGTH; Y++) for(let Z = 0; Z < Z_LENGTH; Z++) if(IsInvisible(GetVoxelFromRelativeRegionData(0, Y, Z, RegionP00))) return false;
  for(let X = 0; X < X_LENGTH; X++) for(let Z = 0; Z < Z_LENGTH; Z++) if(IsInvisible(GetVoxelFromRelativeRegionData(X, 0, Z, Region0P0))) return false;
  for(let X = 0; X < X_LENGTH; X++) for(let Y = 0; Y < Y_LENGTH; Y++) if(IsInvisible(GetVoxelFromRelativeRegionData(X, Y, 0, Region00P))) return false;
  for(let Y = 0; Y < Y_LENGTH; Y++) for(let Z = 0; Z < Z_LENGTH; Z++) if(IsTransparent(GetVoxelFromRelativeRegionData(X_LENGTH - 1, Y, Z, RegionM00))) return false;
  for(let X = 0; X < X_LENGTH; X++) for(let Z = 0; Z < Z_LENGTH; Z++) if(IsTransparent(GetVoxelFromRelativeRegionData(X, Y_LENGTH - 1, Z, Region0M0))) return false;
  for(let X = 0; X < X_LENGTH; X++) for(let Y = 0; Y < Y_LENGTH; Y++) if(IsTransparent(GetVoxelFromRelativeRegionData(X, Y, Z_LENGTH - 1, Region00M))) return false;
  return true;
}
const TypedOPositions = new Float32Array(786432);
const TypedTPositions = new Float32Array(786432);
const TypedONormals = new Int8Array(786432);
const TypedTNormals = new Int8Array(786432);
const TypedOUVs = new Float32Array(524288);
const TypedTUVs = new Float32Array(524288);
const TypedOVertexAOs = new Uint8Array(262144);
const TypedTVertexAOs = new Uint8Array(262144);
{
  const TransparentVoxelsCache = new Int8Array((X_LENGTH + 2) * (Y_LENGTH + 2) * (Z_LENGTH + 2)).fill(-1);
  const VoxelTypeArray = new Uint16Array((X_LENGTH + 2) * (Y_LENGTH + 2) * (Z_LENGTH + 2));

  //Not entirely sure if this caching improves performance.
  const IsTransparentAt = function(X, Y, Z){
    const Index = (X + 1) * (Y_LENGTH + 2) * (Z_LENGTH + 2) + (Y + 1) * (Z_LENGTH + 2) + (Z + 1);

    const Transparency = TransparentVoxelsCache[Index];
    if(Transparency !== -1) return Transparency;
    else return TransparentVoxelsCache[Index] = IsTransparent(VoxelTypeArray[Index]);
  };

  const IsNotTransparentAt = function(X, Y, Z){
    const Index = (X + 1) * (Y_LENGTH + 2) * (Z_LENGTH + 2) + (Y + 1) * (Z_LENGTH + 2) + (Z + 1);

    const Transparency = TransparentVoxelsCache[Index];
    if(Transparency !== -1) return Transparency ^ 1;
    else return (TransparentVoxelsCache[Index] = IsTransparent(VoxelTypeArray[Index])) ^ 1;
  };

  const BorderPositions = new Uint8Array(9736 * 3);

  for(let x = 0, PosCounter = 0; x < 32; x++) for(let y = 0; y < 64; y++) for(let z = 0; z < 32; z++){
    if(x > 0 && x < 31 && y > 0 && y < 63 && z > 0 && z < 31) continue;
    BorderPositions[PosCounter++] = x;
    BorderPositions[PosCounter++] = y;
    BorderPositions[PosCounter++] = z;
  }

  EventHandler.GenerateGeometryData = function(Data){
    let Time = self.performance.now();

    const RegionX = Data.RegionX;
    const RegionY = Data.RegionY;
    const RegionZ = Data.RegionZ;

    const Regions = Data.Regions;

    const Region000 = Regions[RegionX + "," + RegionY + "," + RegionZ]; if(Region000.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return OwnQueueSize && OwnQueueSize[0]--;
    const RegionP00 = Regions[(RegionX + 1) + "," + RegionY + "," + RegionZ];// if(RegionP00.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return OwnQueueSize && OwnQueueSize[0]--;
    const RegionM00 = Regions[(RegionX - 1) + "," + RegionY + "," + RegionZ];// if(RegionM00.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return OwnQueueSize && OwnQueueSize[0]--;
    const Region0P0 = Regions[RegionX + "," + (RegionY + 1) + "," + RegionZ];// if(Region0P0.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return OwnQueueSize && OwnQueueSize[0]--;
    const Region0M0 = Regions[RegionX + "," + (RegionY - 1) + "," + RegionZ];// if(Region0M0.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return OwnQueueSize && OwnQueueSize[0]--;
    const Region00P = Regions[RegionX + "," + RegionY + "," + (RegionZ + 1)];// if(Region00P.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return OwnQueueSize && OwnQueueSize[0]--;
    const Region00M = Regions[RegionX + "," + RegionY + "," + (RegionZ - 1)];// if(Region00M.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return OwnQueueSize && OwnQueueSize[0]--;

    /*let Occluded = IsOccluded(RegionP00, RegionM00, Region0P0, Region0M0, Region00P, Region00M);
    let SemiOccluded = IsSemiOccluded(RegionP00, RegionM00, Region0P0, Region0M0, Region00P, Region00M);

    if(Occluded && SemiOccluded) return OwnQueueSize && OwnQueueSize[0]--;*/

    Requests++;

    let OIndicesCounter = 0;
    let TIndicesCounter = 0;

    let OPositionStride = 0;
    let TPositionStride = 0;
    let ONormalStride = 0;
    let TNormalStride = 0;
    let OUVStride = 0;
    let TUVStride = 0;
    let OVertexAOStride = 0;
    let TVertexAOStride = 0;

    const SetVoxel = function(X, Y, Z, Voxel){
      VoxelTypeArray[(X + 1) * (Y_LENGTH + 2) * (Z_LENGTH + 2) + (Y + 1) * (Z_LENGTH + 2) + (Z + 1)] = Voxel;
    };
    const GetVoxel = function(X, Y, Z){
      return VoxelTypeArray[(X + 1) * (64 + 2) * (32 + 2) + (Y + 1) * (32 + 2) + (Z + 1)];
    };

    const Region000Data = Region000.RegionData;
    const Region000CommonBlock = Region000.SharedData[REGION_SD.COMMON_BLOCK];
    const Region000IsEntirelySolid = Region000.SharedData[REGION_SD.IS_ENTIRELY_SOLID];

    if(Region000Data) for(let Position = 2279, rX = 0, Stride = 0; rX < 32; rX++, Position += 68) for(let rY = 0; rY < 64; rY++, Position += 2) for(let rZ = 0; rZ < 32; rZ++, Position++, Stride++){
      VoxelTypeArray[Position] = Region000Data[Stride];
    }
    else for(let Position = 2279, rX = 0; rX < 32; rX++, Position += 68) for(let rY = 0; rY < 64; rY++, Position += 2) for(let rZ = 0; rZ < 32; rZ++, Position++) VoxelTypeArray[Position] = Region000CommonBlock;
    for(let rY = 0; rY < Y_LENGTH; rY++) for(let rZ = 0; rZ < Z_LENGTH; rZ++){
      SetVoxel(X_LENGTH, rY, rZ, GetVoxelFromRelativeRegionData(0, rY, rZ, RegionP00));
      SetVoxel(-1, rY, rZ, GetVoxelFromRelativeRegionData(X_LENGTH - 1, rY, rZ, RegionM00));
    }
    for(let rX = 0; rX < X_LENGTH; rX++) for(let rZ = 0; rZ < Z_LENGTH; rZ++){
      SetVoxel(rX, Y_LENGTH, rZ, GetVoxelFromRelativeRegionData(rX, 0, rZ, Region0P0));
      SetVoxel(rX, -1, rZ, GetVoxelFromRelativeRegionData(rX, Y_LENGTH - 1, rZ, Region0M0));
    }
    for(let rX = 0; rX < X_LENGTH; rX++) for(let rY = 0; rY < Y_LENGTH; rY++){
      SetVoxel(rX, rY, Z_LENGTH, GetVoxelFromRelativeRegionData(rX, rY, 0, Region00P));
      SetVoxel(rX, rY, -1, GetVoxelFromRelativeRegionData(rX, rY, Z_LENGTH - 1, Region00M));
    }

    const DirectionXY = new Int8Array([-1, 0, 1, 0, 0, -1, 0, 1]);

    const XOffset = 0;
    const YOffset = 0;
    const ZOffset = 0;

    if(Region000CommonBlock === -1 && Region000IsEntirelySolid !== 1){ //Have to iterate entire region array.
      for(let X = RegionX * Region.X_LENGTH, MaxX = (RegionX + 1) * Region.X_LENGTH, OCounter = 0, TCounter = 0, rX = 0, Stride = 0; X < MaxX; X += 1, rX += 1){
        for(let Y = RegionY * Region.Y_LENGTH, MaxY = (RegionY + 1) * Region.Y_LENGTH, rY = 0; Y < MaxY; Y += 1, rY += 1){
          for(let Z = RegionZ * Region.Z_LENGTH, MaxZ = (RegionZ + 1) * Region.Z_LENGTH, rZ = 0; Z < MaxZ; Z += 1, rZ += 1, Stride++){
            const Voxel = GetVoxel(rX, rY, rZ);

            if(!IsInvisible(Voxel)){
              const TextureDim = (FloatUVMapping[Voxel * 4 + V_START] - FloatUVMapping[Voxel * 4 + V_END]) * AtlasHeight;
              const Textures = ((FloatUVMapping[Voxel * 4 + U_END] - FloatUVMapping[Voxel * 4 + U_START]) * AtlasWidth) / TextureDim;
              const TextureWidth = (FloatUVMapping[Voxel * 4 + U_END] - FloatUVMapping[Voxel * 4 + U_START]) / Textures;
              let Side = -1;
              for(const {Direction, Corners} of GEOMETRY_FACES){
                Side++;

                const Direction0 = Direction[0];
                const Direction1 = Direction[1];
                const Direction2 = Direction[2];

                const drX = rX + Direction0;
                const drY = rY + Direction1;
                const drZ = rZ + Direction2;

                const DirectionSign = Direction0 + Direction1 + Direction2; //Used to determine whether DAF faces should be drawn.

                const Neighbour = GetVoxel(drX, drY, drZ);

                const DrawAllFaces = IsDAF(Voxel);

                if(Neighbour === Voxel && !DrawAllFaces) continue;

                const VoxelIsTransparent = IsTransparent(Voxel);

                const SelectedTexture = Math.floor(Noise[Stride] * Textures);

                const NeighbourIsInvisibleOrTransparent = IsInvisible(Neighbour) || IsTransparent(Neighbour);

                const DAFCondition = (IsDAF(Neighbour) && (DirectionSign === 1 || Neighbour !== Voxel));

                if(!VoxelIsTransparent && (NeighbourIsInvisibleOrTransparent || DAFCondition)){
                  const Ndx = OCounter;
                  OCounter += 4;

                  let Result = 0;

                  //Note: Variable names (probably) aren't the same as the engine's cardinal directions.
                  if(Side < 2){
                    const N = IsNotTransparentAt(drX, rY - 1, rZ);
                    const E = IsNotTransparentAt(drX, rY, rZ - 1);
                    const S = IsNotTransparentAt(drX, rY + 1, rZ);
                    const W = IsNotTransparentAt(drX, rY, rZ + 1);
                    const NE = !(N || E) ? IsNotTransparentAt(drX, rY - 1, rZ - 1) : 0;
                    const SE = !(S || E) ? IsNotTransparentAt(drX, rY + 1, rZ - 1) : 0;
                    const SW = !(S || W) ? IsNotTransparentAt(drX, rY + 1, rZ + 1) : 0;
                    const NW = !(N || W) ? IsNotTransparentAt(drX, rY - 1, rZ + 1) : 0;

                    Result = N | (NE << 1) | (E << 2) | (SE << 3) | (S << 4) | (SW << 5) | (W << 6) | (NW << 7);
                  }else if(Side < 4){
                    const N = IsNotTransparentAt(rX - 1, drY, rZ);
                    const E = IsNotTransparentAt(rX, drY, rZ - 1);
                    const S = IsNotTransparentAt(rX + 1, drY, rZ);
                    const W = IsNotTransparentAt(rX, drY, rZ + 1);
                    const NE = !(N || E) ? IsNotTransparentAt(rX - 1, drY, rZ - 1) : 0;
                    const SE = !(S || E) ? IsNotTransparentAt(rX + 1, drY, rZ - 1) : 0;
                    const SW = !(S || W) ? IsNotTransparentAt(rX + 1, drY, rZ + 1) : 0;
                    const NW = !(N || W) ? IsNotTransparentAt(rX - 1, drY, rZ + 1) : 0;

                    Result = N | (NE << 1) | (E << 2) | (SE << 3) | (S << 4) | (SW << 5) | (W << 6) | (NW << 7);
                  } else{
                    const N = IsNotTransparentAt(rX - 1, rY, drZ);
                    const E = IsNotTransparentAt(rX, rY - 1, drZ);
                    const S = IsNotTransparentAt(rX + 1, rY, drZ);
                    const W = IsNotTransparentAt(rX, rY + 1, drZ);
                    const NE = !(N || E) ? IsNotTransparentAt(rX - 1, rY - 1, drZ) : 0;
                    const SE = !(S || E) ? IsNotTransparentAt(rX + 1, rY - 1, drZ) : 0;
                    const SW = !(S || W) ? IsNotTransparentAt(rX + 1, rY + 1, drZ) : 0;
                    const NW = !(N || W) ? IsNotTransparentAt(rX - 1, rY + 1, drZ) : 0;

                    Result = N | (NE << 1) | (E << 2) | (SE << 3) | (S << 4) | (SW << 5) | (W << 6) | (NW << 7);
                  }

                  TypedOVertexAOs[OVertexAOStride++] = 0;
                  TypedOVertexAOs[OVertexAOStride++] = 0;
                  TypedOVertexAOs[OVertexAOStride++] = Result;
                  TypedOVertexAOs[OVertexAOStride++] = Result;

                  for(const {Position, UV} of Corners){
                    TypedOPositions[OPositionStride++] = Position[0] + rX + XOffset;
                    TypedOPositions[OPositionStride++] = Position[1] + rY + YOffset;
                    TypedOPositions[OPositionStride++] = Position[2] + rZ + ZOffset;

                    TypedONormals[ONormalStride++] = Direction[0];
                    TypedONormals[ONormalStride++] = Direction[1];
                    TypedONormals[ONormalStride++] = Direction[2];

                    const Rotation = (Noise[(Stride + 0x8000) & 0xffff] * 4) >> 0;

                    if(UV[0] === ((Rotation & 2) >> 1)) TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + U_START] + SelectedTexture * TextureWidth;
                    else TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + U_END] + (SelectedTexture - Textures + 1) * TextureWidth;

                    if(UV[1] === (Rotation & 1)) TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + V_START];
                    else TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + V_END];
                  }
                  OIndicesCounter += 6;
                }

                if(VoxelIsTransparent && (IsInvisible(Neighbour) || DAFCondition)){
                  const Ndx = TCounter;
                  TCounter += 4;
                  for(const {Position, UV} of Corners){
                    TypedTPositions[TPositionStride++] = Position[0] + rX + XOffset;
                    TypedTPositions[TPositionStride++] = Position[1] + rY + YOffset;
                    TypedTPositions[TPositionStride++] = Position[2] + rZ + ZOffset;

                    TypedTNormals[TNormalStride++] = Direction[0];
                    TypedTNormals[TNormalStride++] = Direction[1];
                    TypedTNormals[TNormalStride++] = Direction[2];

                    const Rotation = (Noise[(Stride + 0x8000) & 0xffff] * 4) >> 0;

                    if(UV[0] === ((Rotation & 2) >> 1)) TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + U_START] + SelectedTexture * TextureWidth;
                    else TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + U_END] + (SelectedTexture - Textures + 1) * TextureWidth;

                    if(UV[1] === (Rotation & 1)) TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + V_START];
                    else TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + V_END];
                  }
                  TIndicesCounter += 6;
                }
              }
            }
          }
        }
      }
    } else{ //There is a CommonBlock or the region is entirely solid. This means that only the edges need to be iterated.
      for(let Counter = 0, OCounter = 0, TCounter = 0; Counter < 29208; Counter += 3){
        const rX = BorderPositions[Counter];
        const rY = BorderPositions[Counter + 1];
        const rZ = BorderPositions[Counter + 2];

        const Index = rX * 2048 + rY * 32 + rZ;

        const Voxel = GetVoxel(rX, rY, rZ);

        if(!IsInvisible(Voxel)){
          const TextureDim = (FloatUVMapping[Voxel * 4 + V_START] - FloatUVMapping[Voxel * 4 + V_END]) * AtlasHeight;
          const Textures = ((FloatUVMapping[Voxel * 4 + U_END] - FloatUVMapping[Voxel * 4 + U_START]) * AtlasWidth) / TextureDim;
          const TextureWidth = (FloatUVMapping[Voxel * 4 + U_END] - FloatUVMapping[Voxel * 4 + U_START]) / Textures;
          let Side = -1;
          for(const {Direction, Corners} of GEOMETRY_FACES){
            Side++;

            const drX = rX + Direction[0];
            const drY = rY + Direction[1];
            const drZ = rZ + Direction[2];
            if(drX > 0 && drX < 31 && drY > 0 && drY < 63 && drZ > 0 && drZ < 31) continue;

            const Neighbour = GetVoxel(drX, drY, drZ);

            if(Neighbour === Voxel) continue;

            const VoxelIsTransparent = IsTransparent(Voxel);

            const SelectedTexture = Math.floor(Noise[Index] * Textures);

            if(!VoxelIsTransparent && (IsInvisible(Neighbour) || IsTransparent(Neighbour))){
              const Ndx = OCounter;
              OCounter += 4;

              let Result = 0;

              //Note: Variable names (probably) aren't the same as the engine's cardinal directions.
              if(Side < 2){
                const N = IsNotTransparentAt(drX, rY - 1, rZ);
                const E = IsNotTransparentAt(drX, rY, rZ - 1);
                const S = IsNotTransparentAt(drX, rY + 1, rZ);
                const W = IsNotTransparentAt(drX, rY, rZ + 1);
                const NE = !(N || E) ? IsNotTransparentAt(drX, rY - 1, rZ - 1) : 0;
                const SE = !(S || E) ? IsNotTransparentAt(drX, rY + 1, rZ - 1) : 0;
                const SW = !(S || W) ? IsNotTransparentAt(drX, rY + 1, rZ + 1) : 0;
                const NW = !(N || W) ? IsNotTransparentAt(drX, rY - 1, rZ + 1) : 0;

                Result = N | (NE << 1) | (E << 2) | (SE << 3) | (S << 4) | (SW << 5) | (W << 6) | (NW << 7);
              }else if(Side < 4){
                const N = IsNotTransparentAt(rX - 1, drY, rZ);
                const E = IsNotTransparentAt(rX, drY, rZ - 1);
                const S = IsNotTransparentAt(rX + 1, drY, rZ);
                const W = IsNotTransparentAt(rX, drY, rZ + 1);
                const NE = !(N || E) ? IsNotTransparentAt(rX - 1, drY, rZ - 1) : 0;
                const SE = !(S || E) ? IsNotTransparentAt(rX + 1, drY, rZ - 1) : 0;
                const SW = !(S || W) ? IsNotTransparentAt(rX + 1, drY, rZ + 1) : 0;
                const NW = !(N || W) ? IsNotTransparentAt(rX - 1, drY, rZ + 1) : 0;

                Result = N | (NE << 1) | (E << 2) | (SE << 3) | (S << 4) | (SW << 5) | (W << 6) | (NW << 7);
              } else{
                const N = IsNotTransparentAt(rX - 1, rY, drZ);
                const E = IsNotTransparentAt(rX, rY - 1, drZ);
                const S = IsNotTransparentAt(rX + 1, rY, drZ);
                const W = IsNotTransparentAt(rX, rY + 1, drZ);
                const NE = !(N || E) ? IsNotTransparentAt(rX - 1, rY - 1, drZ) : 0;
                const SE = !(S || E) ? IsNotTransparentAt(rX + 1, rY - 1, drZ) : 0;
                const SW = !(S || W) ? IsNotTransparentAt(rX + 1, rY + 1, drZ) : 0;
                const NW = !(N || W) ? IsNotTransparentAt(rX - 1, rY + 1, drZ) : 0;

                Result = N | (NE << 1) | (E << 2) | (SE << 3) | (S << 4) | (SW << 5) | (W << 6) | (NW << 7);
              }

              TypedOVertexAOs[OVertexAOStride++] = 0;
              TypedOVertexAOs[OVertexAOStride++] = 0;
              TypedOVertexAOs[OVertexAOStride++] = Result;
              TypedOVertexAOs[OVertexAOStride++] = Result;

              for(const {Position, UV} of Corners){
                TypedOPositions[OPositionStride++] = Position[0] + rX + XOffset;
                TypedOPositions[OPositionStride++] = Position[1] + rY + YOffset;
                TypedOPositions[OPositionStride++] = Position[2] + rZ + ZOffset;

                TypedONormals[ONormalStride++] = Direction[0];
                TypedONormals[ONormalStride++] = Direction[1];
                TypedONormals[ONormalStride++] = Direction[2];

                const Rotation = (Noise[(Index + 0x8000) & 0xffff] * 4) >> 0;

                if(UV[0] === ((Rotation & 2) >> 1)) TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + U_START] + SelectedTexture * TextureWidth;
                else TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + U_END] + (SelectedTexture - Textures + 1) * TextureWidth;

                if(UV[1] === (Rotation & 1)) TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + V_START];
                else TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + V_END];
              }
              OIndicesCounter += 6;
            }

            if(VoxelIsTransparent && IsInvisible(Neighbour)){
              const Ndx = TCounter;
              TCounter += 4;
              for(const {Position, UV} of Corners){
                TypedTPositions[TPositionStride++] = Position[0] + rX + XOffset;
                TypedTPositions[TPositionStride++] = Position[1] + rY + YOffset;
                TypedTPositions[TPositionStride++] = Position[2] + rZ + ZOffset;

                TypedTNormals[TNormalStride++] = Direction[0];
                TypedTNormals[TNormalStride++] = Direction[1];
                TypedTNormals[TNormalStride++] = Direction[2];

                const Rotation = (Noise[(Index + 0x8000) & 0xffff] * 4) >> 0;

                if(UV[0] === ((Rotation & 2) >> 1)) TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + U_START] + SelectedTexture * TextureWidth;
                else TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + U_END] + (SelectedTexture - Textures + 1) * TextureWidth;

                if(UV[1] === (Rotation & 1)) TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + V_START];
                else TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + V_END];
              }
              TIndicesCounter += 6;
            }
          }
        }
      }
    }

    //if(OIndicesCounter > 20000) debugger;

    TransparentVoxelsCache.fill(-1); //Clear cache for next use.
    VoxelTypeArray.fill(0);

    const SlicedOPositions = TypedOPositions.slice(0, OPositionStride);
    const SlicedTPositions = TypedTPositions.slice(0, TPositionStride);
    const SlicedONormals = TypedONormals.slice(0, ONormalStride);
    const SlicedTNormals = TypedTNormals.slice(0, TNormalStride);
    const SlicedOUVs = TypedOUVs.slice(0, OUVStride);
    const SlicedTUVs = TypedTUVs.slice(0, TUVStride);
    const SlicedOVertexAOs = TypedOVertexAOs.slice(0, OVertexAOStride);
    const SlicedTVertexAOs = TypedTVertexAOs.slice(0, TVertexAOStride);

    OIndicesCounter = Math.min(SlicedOPositions.length / 2, OIndicesCounter, 786432);
    TIndicesCounter = Math.min(SlicedTPositions.length / 2, TIndicesCounter, 786432);

    OwnQueueSize && OwnQueueSize[0]--; //Decrease own queue size, if applicable.

    self.postMessage({
      "Request": "SaveGeometryData",
      "RegionX": RegionX,
      "RegionY": RegionY,
      "RegionZ": RegionZ,
      "SharedData": Region000.SharedData,
      "Time": self.performance.now() - Time,
      "Opaque":{
        "Positions": SlicedOPositions,
        "Normals": SlicedONormals,
        "IndexCount": OIndicesCounter, //Not a TypedArray! This is just a counter.
        "UVs": SlicedOUVs,
        "VertexAOs": SlicedOVertexAOs
      },
      "Transparent":{
        "Positions": SlicedTPositions,
        "Normals": SlicedTNormals,
        "IndexCount": TIndicesCounter,
        "UVs": SlicedTUVs,
        "VertexAOs": SlicedTVertexAOs
      }
    }, [SlicedOPositions.buffer, SlicedTPositions.buffer, SlicedONormals.buffer, SlicedTNormals.buffer, SlicedOUVs.buffer, SlicedTUVs.buffer, SlicedOVertexAOs.buffer, SlicedTVertexAOs.buffer]);
  };
}

{

  EventHandler.GenerateVirtualGeometryData = function(Data){
    if(Data.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return OwnQueueSize && OwnQueueSize[0]--;

    Requests++;

    let Time = self.performance.now();

    const RegionX = Data.RegionX;
    const RegionY = Data.RegionY;
    const RegionZ = Data.RegionZ;
    const Depth = Data.Depth;

    const RegionData = Data.RegionData;
    const SharedData = Data.SharedData;
    const IntHeightMap = Data.IntHeightMap;

    let OIndicesCounter = 0;
    let TIndicesCounter = 0;

    CallCount++;


    let OPositionStride = 0;
    let TPositionStride = 0;
    let ONormalStride = 0;
    let TNormalStride = 0;
    let OUVStride = 0;
    let TUVStride = 0;
    let OVertexAOStride = 0;
    let TVertexAOStride = 0;

    const MergedVoxelArrays = new Uint16Array((X_LENGTH + 2) * (Y_LENGTH + 2) * (Z_LENGTH + 2));
    const SetVoxel = function(X, Y, Z, Voxel){
      MergedVoxelArrays[(X + 1) * (Y_LENGTH + 2) * (Z_LENGTH + 2) + (Y + 1) * (Z_LENGTH + 2) + (Z + 1)] = Voxel;
    };
    const GetVoxel = function(X, Y, Z, Voxel){
      return MergedVoxelArrays[(X + 1) * (64 + 2) * (32 + 2) + (Y + 1) * (32 + 2) + (Z + 1)];
    };

    //Initialise array

    for(let Position = 2279, rX = 0, Stride = 0; rX < 32; rX++, Position += 68) for(let rY = 0; rY < 64; rY++, Position += 2) for(let rZ = 0; rZ < 32; rZ++) MergedVoxelArrays[Position++] = RegionData[Stride++];
    for(let rZ = 0; rZ < Z_LENGTH; rZ++){
      const HeightStart = IntHeightMap[0 + rZ];
      const HeightLimit = IntHeightMap[(X_LENGTH - 1) * X_LENGTH + rZ];
      for(let rY = 0; rY < Y_LENGTH; rY++){
        const TypeStart = GetVoxel(0, rY, rZ);
        const TypeLimit = GetVoxel(X_LENGTH - 1, rY, rZ);

        if(!IsTransparent(TypeLimit)) SetVoxel(X_LENGTH, rY, rZ, HeightLimit > rY + VRMBPT ? 61440 : 0);
        else SetVoxel(X_LENGTH, rY, rZ, TypeLimit);

        if(!IsTransparent(TypeStart)) SetVoxel(-1, rY, rZ, HeightStart > rY + VRMBPT ? 61440 : 0);
        else SetVoxel(-1, rY, rZ, TypeStart);
      }
    }
    for(let rX = 0; rX < X_LENGTH; rX++) for(let rZ = 0; rZ < Z_LENGTH; rZ++){
      const Height = IntHeightMap[rX * X_LENGTH + rZ];
      const TypeLimit = GetVoxel(rX, Y_LENGTH - 1, rZ);
      const TypeStart = GetVoxel(rX, 0, rZ);
      if(!IsTransparent(TypeLimit)) SetVoxel(rX, Y_LENGTH, rZ, Height > Y_LENGTH ? 61440 : 0);
      else SetVoxel(rX, Y_LENGTH, rZ, TypeLimit);
      if(!IsTransparent(TypeStart)) SetVoxel(rX, -1, rZ, Height > 0 ? 61440 : 0);
      else SetVoxel(rX, -1, rZ, TypeStart);
    }
    for(let rX = 0; rX < X_LENGTH; rX++) for(let rY = 0; rY < Y_LENGTH; rY++){
      const HeightStart = IntHeightMap[rX * X_LENGTH + 0];
      const HeightLimit = IntHeightMap[rX * X_LENGTH + Z_LENGTH - 1];
      for(let rY = 0; rY < Y_LENGTH; rY++){
        const TypeLimit = GetVoxel(rX, rY, Z_LENGTH - 1);
        const TypeStart = GetVoxel(rX, rY, 0);

        if(!IsTransparent(TypeLimit)) SetVoxel(rX, rY, Z_LENGTH, HeightLimit > rY + VRMBPT ? 61440 : 0);
        else SetVoxel(rX, rY, Z_LENGTH, TypeLimit);

        if(!IsTransparent(TypeStart)) SetVoxel(rX, rY, -1, HeightStart > rY + VRMBPT ? 61440 : 0);
        else SetVoxel(rX, rY, -1, TypeStart);
      }
    }



    const DirectionXY = new Int8Array([-1, 0, 1, 0, 0, -1, 0, 1]);


    for(let OCounter = 0, TCounter = 0, rX = 0, Stride = 0; rX < X_LENGTH; rX++) {
      for(let rY = 0; rY < Y_LENGTH; rY++) {
        let RunCounter = 0;


        let ORequired = [false, false, false, false, false, false];
        let TRequired = [false, false, false, false, false, false];
        //let ORequiredFirst = [null, null, null, null, null, null];
        //let TRequiredFirst = [null, null, null, null, null, null];
        let ORequiredLast = [null, null, null, null, null, null];
        let TRequiredLast = [null, null, null, null, null, null];

        let NextVoxel = GetVoxel(rX, rY, 0);//GetVoxelFromRelativeRegionData(rX, rY, 0, CurrentRegion);
        let RunVoxelType = NextVoxel;
        let VoxelIsInvisible = IsInvisible(RunVoxelType);
        let VoxelIsTransparent = IsTransparent(RunVoxelType);

        for(let rZ = 0; rZ < Z_LENGTH; rZ++, Stride++) {
          const LastZIteration = rZ === Z_LENGTH - 1;
          const Voxel = NextVoxel;

          NextVoxel = GetVoxel(rX, rY, rZ + 1);

          if(!VoxelIsInvisible) { //Extra logic near end of Z loop!

            RunCounter++;
            RunVoxelType = Voxel;

            if(!VoxelIsTransparent) for(let Side = 0; Side < 4; Side++){
              const Neighbour = GetVoxel(rX + DirectionXY[Side * 2], rY + DirectionXY[1 + Side * 2], rZ);
              if(IsInvisible(Neighbour) || IsTransparent(Neighbour) || IsDAF(Neighbour)){
                ORequired[Side] = true;
                //ORequiredFirst[Side] ??= rZ;
                ORequiredLast[Side] = 1 + rZ;
              }
            }
            else for(let Side = 0; Side < 4; Side++){
              let Neighbour = GetVoxel(rX + DirectionXY[Side * 2], rY + DirectionXY[1 + Side * 2], rZ);
              if(Voxel === 4 && rY + DirectionXY[1 + Side * 2] === Region.Y_LENGTH && RegionY === -1) Neighbour = 0; //WARNING: This is a very stupid temporary fix.
              if(IsInvisible(Neighbour)){
                TRequired[Side] = true;
                //TRequiredFirst[Side] ??= rZ;
                TRequiredLast[Side] = 1 + rZ;
              }
            }

            if(Voxel === NextVoxel && !LastZIteration) continue;



            //Run has been broken (Voxel !== NextVoxel), so the rectangular geometry has to be added.



            let Side = -1;
            for(const {Direction, Corners} of GEOMETRY_FACES) {
              Side++;
              let Direction2 = Direction[2];
              if(Direction[2] === -1) Direction2 = Direction[2] * RunCounter;
              const drX = rX + Direction[0];
              const drY = rY + Direction[1];
              const drZ = rZ + Direction2;

              const Neighbour = GetVoxel(drX, drY, drZ);
              //if(Neighbour === Voxel) continue;

              const TextureDim = (FloatUVMapping[Voxel * 4 + V_START] - FloatUVMapping[Voxel * 4 + V_END]) * AtlasHeight;
              const Textures = ((FloatUVMapping[Voxel * 4 + U_END] - FloatUVMapping[Voxel * 4 + U_START]) * AtlasWidth) / TextureDim;
              const TextureWidth = (FloatUVMapping[Voxel * 4 + U_END] - FloatUVMapping[Voxel * 4 + U_START]) / Textures;

              const SelectedTexture = Math.floor(Noise[Stride] * Textures);
              // For X and Y sides |  For Z side
              if(ORequired[Side] || (!VoxelIsTransparent && (IsInvisible(Neighbour) || IsTransparent(Neighbour) || IsDAF(Neighbour)))) {

                const Ndx = OCounter;
                OCounter += 4;

                for(const {Position, UV} of Corners) {

                  const Start = /*ORequiredFirst[Side] ??*/ rZ - RunCounter + 1;
                  const End = ORequiredLast[Side] ?? Start;
                  const Length = End - Start;

                  let Position2 = Position[2];
                  if(Direction[0] !== 0 || Direction[1] !== 0) {
                    Position2 = Position[2] * Math.ceil(Length) - (RunCounter - 1);
                  }

                  let Factor = 1;

                  if(Direction[2] === -1){
                    TypedOPositions[OPositionStride++] = Position[0] + rX;
                    TypedOPositions[OPositionStride++] = Position[1] + rY;
                    TypedOPositions[OPositionStride++] = Position2 + Start;
                  }
                  else{
                    TypedOPositions[OPositionStride++] = Position[0] + rX;
                    TypedOPositions[OPositionStride++] = Position[1] + rY;
                    TypedOPositions[OPositionStride++] = Position2 + rZ;
                  }
                  TypedONormals[ONormalStride++] = Direction[0];
                  TypedONormals[ONormalStride++] = Direction[1];
                  TypedONormals[ONormalStride++] = Direction[2];

                  if(UV[0] === 0) TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + U_START] + SelectedTexture * TextureWidth * Factor;
                  else TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + U_START] + (SelectedTexture + 1) * TextureWidth * Factor;

                  if(UV[1] === 0) TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + V_START];
                  else TypedOUVs[OUVStride++] = FloatUVMapping[Voxel * 4 + V_END];

                }
                OIndicesCounter += 6;

                //ORequiredFirst[Side] = null;
                ORequiredLast[Side] = null;
                ORequired[Side] = false;
              }

              // For X and Y sides |  For Z side
              if(TRequired[Side] || VoxelIsTransparent && IsInvisible(Neighbour)) {
                const Ndx = TCounter;
                TCounter += 4;


                for(const {Position, UV} of Corners) {

                  const Start = /*TRequiredFirst[Side] ??*/ rZ - RunCounter + 1;
                  const End = TRequiredLast[Side] ?? Start;
                  const Length = End - Start;

                  let Position2 = Position[2];
                  if(Direction[0] !== 0 || Direction[1] !== 0) {
                    Position2 = Position[2] * Math.ceil(Length) - (RunCounter - 1);
                  }

                  let Factor = 1;

                  if(Direction[2] === -1){
                    TypedTPositions[TPositionStride++] = Position[0] + rX;
                    TypedTPositions[TPositionStride++] = Position[1] + rY;
                    TypedTPositions[TPositionStride++] = Position2 + Start;
                  }
                  else{
                    TypedTPositions[TPositionStride++] = Position[0] + rX;
                    TypedTPositions[TPositionStride++] = Position[1] + rY;
                    TypedTPositions[TPositionStride++] = Position2 + rZ;
                  }
                  TypedTNormals[TNormalStride++] = Direction[0];
                  TypedTNormals[TNormalStride++] = Direction[1];
                  TypedTNormals[TNormalStride++] = Direction[2];

                  if(UV[0] === 0) TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + U_START] + SelectedTexture * TextureWidth * Factor;
                  else TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + U_START] + (SelectedTexture + 1) * TextureWidth * Factor;

                  if(UV[1] === 0) TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + V_START];
                  else TypedTUVs[TUVStride++] = FloatUVMapping[Voxel * 4 + V_END];

                }
                TIndicesCounter += 6;

                //TRequiredFirst[Side] = null;
                TRequiredLast[Side] = null;
                TRequired[Side] = false;
              }
            }
          }

          RunCounter = 0;
          RunVoxelType = Voxel;

          if(LastZIteration) break; //Prevent out of range access for the functions below.
          //The voxel type is about to switch (unless LastZIteration === true)

          VoxelIsInvisible = IsInvisible(NextVoxel);
          VoxelIsTransparent = IsTransparent(NextVoxel);

        }
      }
    }

    const SlicedOPositions = TypedOPositions.slice(0, OPositionStride);
    const SlicedTPositions = TypedTPositions.slice(0, TPositionStride);
    const SlicedONormals = TypedONormals.slice(0, ONormalStride);
    const SlicedTNormals = TypedTNormals.slice(0, TNormalStride);
    const SlicedOUVs = TypedOUVs.slice(0, OUVStride);
    const SlicedTUVs = TypedTUVs.slice(0, TUVStride);

    const OVertexAOs = new Uint8Array(OIndicesCounter * 2/3);
    const TVertexAOs = new Uint8Array(TIndicesCounter * 2/3);
    //These arrays are needed so that when the mesh is recycled, there will be an appropriately sized AO array in case it is used with normal regions that have AO.
    //Do note that this size is exactly what would be required, and not a high estimate.

    OwnQueueSize && OwnQueueSize[0]--;

    self.postMessage({
      "Request": "SaveVirtualGeometryData",
      "RegionX": RegionX,
      "RegionY": RegionY,
      "RegionZ": RegionZ,
      "Depth": Depth,
      "SharedData": SharedData,
      "Time": self.performance.now() - Time,
      "Opaque":{
        "Positions": SlicedOPositions,
        "Normals": SlicedONormals,
        "IndexCount": OIndicesCounter,
        "UVs": SlicedOUVs,
        "VertexAOs": OVertexAOs
      },
      "Transparent":{
        "Positions": SlicedTPositions,
        "Normals": SlicedTNormals,
        "IndexCount": TIndicesCounter,
        "UVs": SlicedTUVs,
        "VertexAOs": TVertexAOs
      }
    }, [SlicedOPositions.buffer, SlicedTPositions.buffer, SlicedONormals.buffer, SlicedTNormals.buffer, SlicedOUVs.buffer, SlicedTUVs.buffer, OVertexAOs.buffer, TVertexAOs.buffer]);
  };
}
