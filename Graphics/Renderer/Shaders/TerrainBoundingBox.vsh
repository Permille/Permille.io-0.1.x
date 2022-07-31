#version 300 es
#define attribute in
#define varying out

precision highp float;
precision highp int;

attribute highp int info;

varying vec3 vmvPosition;

flat varying int vSide;
flat varying vec3 vModelOffset;
flat varying vec3 vModelScale;

flat varying int vLocation8;
flat varying int vShouldBeDiscarded;
flat varying uint vBound;
flat varying ivec3 vSampleLocation;
flat varying uint vDepth;

flat varying int vCoordinate64;
flat varying int vCoordinate8;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat3 normalMatrix;


uniform lowp usampler3D iTexData1;
uniform lowp usampler3D iTexData8;
uniform lowp usampler3D iTexData64;
uniform mediump usampler3D iTexType1;
uniform highp usampler3D iTexInfo8;
uniform highp usampler3D iTexInfo64;
uniform highp usampler3D iTexBoundingBox1;
uniform ivec3 iOffset64[8];



uint GetInfo64(ivec3 RayPosFloor, uint Depth){
  ivec3 Position = RayPosFloor.zyx - iOffset64[Depth].zyx;
  if(Position.x < 0 || Position.y < 0 || Position.z < 0 || Position.x > 7 || Position.y > 7 || Position.z > 7) return 0xffffffffu;
  Position.z += int(Depth) * 8; //Select correct LOD level
  return texelFetch(iTexInfo64, Position, 0).r;
}
int GetLocation64(ivec3 RayPosFloor, uint Depth){
  ivec3 Position = RayPosFloor.zyx - iOffset64[Depth].zyx;

  uint Info64 = GetInfo64(RayPosFloor, Depth);
  if(Info64 == 0xffffffffu) return -1;
  if(((Info64 >> 29) & 1u) == 0u) return -1;
  else return int(Info64 & 0x0fffffffu);
}
uint GetInfo8(int Location64, ivec3 RayPosFloor){
  ivec3 ModRayPosFloor = RayPosFloor & 7;
  int Pos8XYZ = ((Location64 & 7) << 6) | (ModRayPosFloor.x << 3) | ModRayPosFloor.y;
  return texelFetch(iTexInfo8, ivec3(ModRayPosFloor.z, Pos8XYZ, Location64 >> 3), 0).r;
}
int GetLocation8(int Location64, ivec3 RayPosFloor){
  return int(GetInfo8(Location64, RayPosFloor) & 0x0fffffffu);
}
int GetType1(int Location8, ivec3 RayPosFloor){
  ivec3 ModRayPosFloor = RayPosFloor & 7;
  int Pos1XY = (ModRayPosFloor.x << 3) | ModRayPosFloor.y;
  return int(texelFetch(iTexType1, ivec3((Pos1XY << 3) | ModRayPosFloor.z, Location8 & 511, Location8 >> 9), 0).r);
}
bool IsEmpty64(ivec3 RayPosFloor, uint Depth){
  ivec3 Position = RayPosFloor.zyx - iOffset64[Depth].zyx;
  if(Position.x < 0 || Position.y < 0 || Position.z < 0 || Position.x > 7 || Position.y > 7 || Position.z > 7) return false;
  Position.z += int(Depth * 8u);
  uint Info64 = texelFetch(iTexInfo64, Position, 0).r;
  return (Info64 >> 31) == 1u;
}
bool IsEmpty8(int Location64, ivec3 RayPosFloor){
  return texelFetch(iTexData8, ivec3(0), 0).r == 0u;
}
bool IsEmpty1(int Location8, ivec3 RayPosFloor){
  ivec3 ModRayPosFloor = RayPosFloor & 7;
  int Pos1XY = (ModRayPosFloor.x << 3) | ModRayPosFloor.y;
  return ((texelFetch(iTexData1, ivec3(Pos1XY, Location8 & 511, Location8 >> 9), 0).r >> ModRayPosFloor.z) & 1u) == 1u;
}

void main(){
  vModelOffset = modelMatrix[3].xyz;
  vModelScale = vec3(modelMatrix[0][0], modelMatrix[1][1], modelMatrix[2][2]);
  uint Depth = uint(int(log2(vModelScale.x)));
  vDepth = Depth;
  ivec3 Coordinates = ivec3(floor(vModelOffset / vModelScale)) >> 6;

  int LocalIndex8 = info & 511;
  ivec3 Data8Coordinate = ivec3(((LocalIndex8 >> 6) & 7), ((LocalIndex8 >> 3) & 7), LocalIndex8 & 7);

  vShouldBeDiscarded = 0;
  if(Depth != 0u){
    ivec3 LowerDepthCoordinates = Coordinates * 2 + (Data8Coordinate >> 2);
    uint LowerDepthInfo64 = GetInfo64(LowerDepthCoordinates, Depth - 1u);
    if(LowerDepthInfo64 != 0xffffffffu && (((LowerDepthInfo64 >> 28) & 3u) == 3u || (((LowerDepthInfo64 >> 31) & 1u) == 1u && ((LowerDepthInfo64 >> 29) & 1u) == 1u))){ //Is not out of bounds and has a mesh and is fully uploaded
      vShouldBeDiscarded = 1;
      return;
    }
  }

  vec3 Position = vec3((Data8Coordinate.x << 3) + ((info >> 17) & 15), (Data8Coordinate.y << 3) + ((info >> 13) & 15), (Data8Coordinate.z << 3) + ((info >> 9) & 15));

  vSide = ((info >> 21) & 7) - 3;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(Position, 1.);

  vmvPosition = Position;
  switch(abs(vSide)){
    case 1: vmvPosition.x += 1e-3 * float(sign(vSide)); break;
    case 2: vmvPosition.y += 1e-3 * float(sign(vSide)); break;
    case 3: vmvPosition.z += 1e-3 * float(sign(vSide)); break;
  }

  int Location64 = GetLocation64(Coordinates, Depth);

  ivec3 SampleCoordinate8 = ivec3(LocalIndex8 & 7, ((Location64 & 7) << 6) | (LocalIndex8 >> 3), Location64 >> 3);
  vBound = texelFetch(iTexBoundingBox1, SampleCoordinate8, 0).r;

  int Location8 = int(texelFetch(iTexInfo8, SampleCoordinate8, 0).r & 0x0fffffffu);
  vLocation8 = Location8;
  vSampleLocation = ivec3(0, vLocation8 & 511, vLocation8 >> 9);

  vCoordinate8 = LocalIndex8;
  ivec3 Temp = Coordinates.zyx - iOffset64[Depth].zyx;
  vCoordinate64 = (Temp.x << 6) | (Temp.y << 3) | Temp.z;
}