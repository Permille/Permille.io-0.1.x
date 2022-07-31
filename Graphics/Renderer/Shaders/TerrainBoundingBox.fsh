#version 300 es
#define varying in

precision highp float;
precision highp int;

layout(location = 0) out uvec2 outPositionData;

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


ivec3 SampleLocation = ivec3(0);
bool IsEmpty1(uvec3 RayPosFloor){
  SampleLocation.x = int((RayPosFloor.x << 3) | RayPosFloor.y);
  return ((texelFetch(iTexData1, SampleLocation, 0).r >> RayPosFloor.z) & 1u) == 1u;
}

struct RayTraceResult{
  bvec3 Mask;
  uvec3 RayPosFloor;
  vec3 ExactPosition;
};

RayTraceResult Raytrace8(inout vec3 TrueRayOrigin, inout vec3 RayDirection){
  vec3 RayOrigin = mod(TrueRayOrigin, 8.);
  vec3 RayOriginOffset = TrueRayOrigin - RayOrigin;

  vec3 RayInverse = 1. / RayDirection;
  vec3 RaySign = sign(RayDirection);//vec3(RayDirection.x > 0. ? 1. : -1., RayDirection.y > 0. ? 1. : -1., RayDirection.z > 0. ? 1. : -1.);
  vec3 RayPosFloor = floor(RayOrigin);
  vec3 SideDistance = (RayPosFloor - RayOrigin + .5 + RaySign * .5) * RayInverse;
  bvec3 Mask;
  vec3 FloatMask;
  bool HitVoxel = false;

  vec3 MinBound = vec3((vBound >> 15u) & 7u, (vBound >> 12u) & 7u, (vBound >> 9u) & 7u);
  vec3 MaxBound = vec3((vBound >> 6u) & 7u, (vBound >> 3u) & 7u, vBound & 7u);

  for(int i = 0; i < 25; ++i){
    if(any(greaterThan(RayPosFloor, MaxBound)) || any(lessThan(RayPosFloor, MinBound))) discard;
    if(!IsEmpty1(uvec3(RayPosFloor))){
      HitVoxel = true;
      break;
    }
    FloatMask = step(SideDistance, min(SideDistance.yxy, SideDistance.zzx));
    SideDistance += FloatMask * RaySign * RayInverse;
    RayPosFloor += FloatMask * RaySign;
  }

  Mask = bvec3(FloatMask);

  if(!HitVoxel) discard;
  vec3 ExactPosition = RayDirection * length(vec3(Mask) * (SideDistance - abs(RayInverse))) + TrueRayOrigin;

  if(!any(Mask)){
    switch(abs(vSide)){
      case 1: Mask.x = true; break;
      case 2: Mask.y = true; break;
      case 3: Mask.z = true; break;
    }
  }

  return RayTraceResult(
  Mask,
  uvec3(RayPosFloor),
  ExactPosition
  );
}

void main(){
  if(vShouldBeDiscarded == 1) discard;

  SampleLocation = vSampleLocation;

  vec3 RayOrigin = vmvPosition;
  vec3 RayDirection = normalize(RayOrigin - (iPosition - vModelOffset) / vModelScale);


  RayTraceResult Result = Raytrace8(RayOrigin, RayDirection);


  ivec3 ExactFractPosition = ivec3(fract(Result.ExactPosition) * 256.);

  ExactFractPosition *= ivec3(not(Result.Mask)); //Set the mask index to zero to avoid wrong rounding between the values 0 and 255
  if(dot(sign(RayDirection * vec3(Result.Mask)), vec3(1.)) < 0.) ExactFractPosition += 255 * ivec3(Result.Mask); //Set it to 255 if it's the negative side

  outPositionData = uvec2(
  (vCoordinate64 << 23) | (vCoordinate8 << 14) | (int(vDepth) << 11) | ((Result.Mask.x ? 1 : Result.Mask.y ? 2 : 3) << 9) | int((Result.RayPosFloor.x << 6) | (Result.RayPosFloor.y << 3) | Result.RayPosFloor.z),
  (1 << 30) | (((vCoordinate64 >> 9) & 63) << 24) | (ExactFractPosition.x << 16) | (ExactFractPosition.y << 8) | ExactFractPosition.z
  );
}