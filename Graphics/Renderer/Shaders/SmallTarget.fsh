#version 300 es

precision highp float;
precision highp int;

layout(location = 0) out uint IsRequired;

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 iPosition;
uniform vec3 iRotation;
uniform float FOV;
uniform lowp usampler3D iTexData1;
uniform lowp usampler3D iTexData8;
uniform lowp usampler3D iTexData64;
uniform mediump usampler3D iTexType1;
uniform highp usampler3D iTexInfo8;
uniform highp usampler3D iTexInfo64;
uniform highp usampler3D iTexBoundingBox1;
uniform ivec3 iOffset64[8];
uniform float iUpscalingKernelSize;
uniform vec3 iSunPosition;
uniform float iShadowExponent;
uniform float iShadowMultiplier;
uniform float iShadowDarkness;
uniform float iFogFactor;

uniform ivec3 iCloseVoxelsOffset;
uniform lowp usampler3D iCloseVoxelsTexture;
uniform int iRaytracingGridDistance;

const float InDegrees = .01745329;
const float PI = 3.14159;


mat3 RotateX(float a){
  float c = cos(a);
  float s = sin(a);
  return mat3(1.,0.,0.,
  0., c,-s,
  0., s, c);
}
mat3 RotateY(float a){
  float c = cos(a);
  float s = sin(a);
  return mat3(c, 0., s,
  0., 1.,0.,
  -s, 0., c);
}
mat3 RotateZ(float a){
  float c = cos(a);
  float s = sin(a);
  return mat3(c, s,0.,
  -s, c,0.,
  0.,0.,1.);
}

bool IsSolid(ivec3 Coordinate){
  ivec3 ModCoordinate = Coordinate & 7;
  ivec3 Offset = 4 - iCloseVoxelsOffset;
  int x8 = ((Coordinate.x >> 3) + Offset.x);
  int y8 = ((Coordinate.y >> 3) + Offset.y);
  int z8 = ((Coordinate.z >> 3) + Offset.z);
  if(x8 < 0 || x8 > 7 || y8 < 0 || y8 > 7 || z8 < 0 || z8 > 7) return false;
  //if(((x8 | y8 | z8) & 0xfffffff8) != 0) return false;
  return ((texelFetch(iCloseVoxelsTexture, ivec3(ModCoordinate.y, (z8 << 3) | ModCoordinate.x, (x8 << 3) | y8), 0).r >> ModCoordinate.z) & 1u) == 0u;
}

bool Raytrace8Fast(vec3 RayOrigin, vec3 RayDirection){
  ivec3 RayDirectionSign = ivec3(sign(RayDirection));
  ivec3 RayPosFloor = ivec3(floor(RayOrigin));

  vec3 DeltaDistance = abs(1. / RayDirection);
  vec3 SideDistance = (vec3(RayDirectionSign) * (.5 - fract(RayOrigin)) + .5) * DeltaDistance;

  bvec3 Mask = bvec3(false);
  bool HitVoxel = false;

  for(int i = 0; i < 27; ++i){
    if(IsSolid(RayPosFloor)){
      HitVoxel = true;
      break;
    }
    Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
    SideDistance = vec3(Mask) * DeltaDistance + SideDistance;
    RayPosFloor = ivec3(vec3(Mask)) * RayDirectionSign + RayPosFloor;
  }

  return HitVoxel && length(vec3(Mask) * (SideDistance - DeltaDistance)) < 14.;
}

void main(){
  vec2 uv = ((gl_FragCoord.xy - 1.) * float(iRaytracingGridDistance) * 2. - iResolution.xy) / iResolution.y;
  uv.x *= -1.;

  vec3 RayOrigin = iPosition.xyz;
  vec3 RayDirection = (normalize(vec3(uv, 1. / tan(FOV / 2.))) * RotateX(-iRotation.x) * RotateY(iRotation.y - PI));
  RayDirection += vec3(equal(RayDirection, vec3(0.))) * 1e-3; //When RayDirection is 0 NaNs get created and the perf tanks

  IsRequired = Raytrace8Fast(RayOrigin, RayDirection) ? 1u : 0u;
}