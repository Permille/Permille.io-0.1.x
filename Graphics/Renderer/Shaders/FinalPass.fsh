varying vec2 vUv;

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


uniform highp usampler2D iIntermediatePassData;
uniform lowp usampler2D iSmallTargetData;
uniform ivec3 iCloseVoxelsOffset;
uniform lowp usampler3D iCloseVoxelsTexture;
uniform bool iRenderAmbientOcclusion;
uniform bool iRenderShadows;
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


float Random(vec4 v){
  return fract(1223.34 * sin(dot(v,vec4(18.111, 13.252, 17.129, 18.842))));
}
float Random(vec3 v){
  return fract(1223.34 * sin(dot(v,vec3(18.111, 13.252, 17.129))));
}

uint GetInfo64(ivec3 RayPosFloor, uint Depth){
  ivec3 Position = RayPosFloor.zyx - iOffset64[Depth].zyx;
  if((Position & 7) != Position) return 0xffffffffu; //Out of bounds
  Position.z += int(Depth) * 8; //Select correct LOD level
  return texelFetch(iTexInfo64, Position, 0).r;
}
int GetLocation64(ivec3 RayPosFloor, uint Depth){
  uint Info64 = GetInfo64(RayPosFloor, Depth);
  if(Info64 == 0xffffffffu || ((Info64 >> 29) & 1u) == 0u) return -1;
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
  //return length(vec3(RayPosFloor) - vec3(4.)) > 3.;
  ivec3 ModRayPosFloor = RayPosFloor & 7;
  int Pos1XY = (ModRayPosFloor.x << 3) | ModRayPosFloor.y;
  return ((texelFetch(iTexData1, ivec3(Pos1XY, Location8 & 511, Location8 >> 9), 0).r >> ModRayPosFloor.z) & 1u) == 1u;
}

uint GetInfo64NoOffset(ivec3 Position, uint Depth){
  Position.z += int(Depth) * 8; //Select correct LOD level
  return texelFetch(iTexInfo64, Position, 0).r;
}



int GetTypeDirectly2(vec3 RayPosFloor){
  ivec3 DividedRayPosFloor = ivec3(RayPosFloor);
  uint Info64 = GetInfo64(DividedRayPosFloor >> 6, 0u);
  if(((Info64 >> 31) & 1u) == 1u) return 0; //49151
  int Location64 = int(Info64 & 0x0fffffffu);
  uint Info8 = GetInfo8(Location64, DividedRayPosFloor >> 3);
  if(((Info8 >> 31) & 1u) == 1u) return 0; //49151
  return GetType1(int(Info8 & 0x0fffffffu), DividedRayPosFloor);
}
int GetTypeDirectly2(ivec3 RayPosFloor){
  uint Info64 = GetInfo64(RayPosFloor >> 6, 0u);
  if(((Info64 >> 31) & 1u) == 1u) return 0; //49151
  int Location64 = int(Info64 & 0x0fffffffu);
  uint Info8 = GetInfo8(Location64, RayPosFloor >> 3);
  if(((Info8 >> 31) & 1u) == 1u) return 0; //49151
  return GetType1(int(Info8 & 0x0fffffffu), RayPosFloor);
}
int GetTypeDirectly2(uint Depth, ivec3 Position64, ivec3 Position8, ivec3 Position1){
  uint Info64 = GetInfo64NoOffset(Position64, Depth);
  if(((Info64 >> 31) & 1u) == 1u) return 0;
  uint Info8 = GetInfo8(int(Info64 & 0x00ffffffu), Position8);
  if(((Info8 >> 31) & 1u) == 1u) return 0;
  return GetType1(int(Info8 & 0x0fffffffu), Position1);
}
int GetTypeDirectlyWithOffset64(ivec3 Position, uint Depth){
  uint Info64 = GetInfo64NoOffset((Position >> 6).zyx, Depth);
  if(((Info64 >> 31) & 1u) == 1u) return 0;
  uint Info8 = GetInfo8(int(Info64 & 0x00ffffffu), (Position >> 3) & 7);
  if(((Info8 >> 31) & 1u) == 1u) return 0;
  return GetType1(int(Info8 & 0x0fffffffu), Position & 7);
}
bool IsEmptyDirectlyWithOffset64(ivec3 Position, uint Depth){
  uint Info64 = GetInfo64NoOffset((Position >> 6).zyx, Depth);
  if(((Info64 >> 31) & 1u) == 1u) return true;
  uint Info8 = GetInfo8(int(Info64 & 0x00ffffffu), (Position >> 3) & 7);
  if(((Info8 >> 31) & 1u) == 1u) return true;
  return IsEmpty1(int(Info8 & 0x0fffffffu), Position & 7);
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

float CalculateAOIntensityFast(ivec3 Position, vec3 FractPosition, bvec3 Mask, uint Depth){
  if(!iRenderAmbientOcclusion) return 1.;

  vec3 FractRayPosSquared = FractPosition * FractPosition;
  vec3 NFractRayPosSquared = (1. - FractPosition) * (1. - FractPosition);
  vec3 OffsetFractPosition = FractPosition - .5;
  ivec3 FaceSign = ivec3(OffsetFractPosition.x > 0. ? 1 : -1, OffsetFractPosition.y > 0. ? 1 : -1, OffsetFractPosition.z > 0. ? 1 : -1);

  float Contributions = 1.;

  if(Mask.x){
    ivec3 RayPosShifted = ivec3(Position.x + FaceSign.x, Position.yz);
    Contributions = float(IsSolid(RayPosShifted));

    bvec4 NESW = bvec4(
    IsSolid(RayPosShifted + ivec3(0, 1, 0)),
    IsSolid(RayPosShifted + ivec3(0, 0, 1)),
    IsSolid(RayPosShifted + ivec3(0,-1, 0)),
    IsSolid(RayPosShifted + ivec3(0, 0,-1))
    );
    Contributions += dot(vec4(FractRayPosSquared.yz, NFractRayPosSquared.yz) * vec4(NESW), vec4(1.));

    bvec4 NESW2 = bvec4(
    !any(NESW.xy) && IsSolid(RayPosShifted + ivec3(0, 1, 1)),
    !any(NESW.zy) && IsSolid(RayPosShifted + ivec3(0,-1, 1)),
    !any(NESW.zw) && IsSolid(RayPosShifted + ivec3(0,-1,-1)),
    !any(NESW.xw) && IsSolid(RayPosShifted + ivec3(0, 1,-1))
    );
    vec4 Combined = vec4(FractRayPosSquared.yz, NFractRayPosSquared.yz);
    Contributions += dot(vec4(Combined.xzzx * Combined.yyww) * vec4(NESW2), vec4(1.));
  }
  else if(Mask.y){
    ivec3 RayPosShifted = ivec3(Position.x, Position.y + FaceSign.y, Position.z);
    Contributions = float(IsSolid(RayPosShifted));

    bvec4 NESW = bvec4(
    IsSolid(RayPosShifted + ivec3( 1, 0, 0)),
    IsSolid(RayPosShifted + ivec3( 0, 0, 1)),
    IsSolid(RayPosShifted + ivec3(-1, 0, 0)),
    IsSolid(RayPosShifted + ivec3( 0, 0,-1))
    );
    Contributions += dot(vec4(FractRayPosSquared.xz, NFractRayPosSquared.xz) * vec4(NESW), vec4(1.));

    bvec4 NESW2 = bvec4(
    !any(NESW.xy) && IsSolid(RayPosShifted + ivec3( 1, 0, 1)),
    !any(NESW.zy) && IsSolid(RayPosShifted + ivec3(-1, 0, 1)),
    !any(NESW.zw) && IsSolid(RayPosShifted + ivec3(-1, 0,-1)),
    !any(NESW.xw) && IsSolid(RayPosShifted + ivec3( 1, 0,-1))
    );
    vec4 Combined = vec4(FractRayPosSquared.xz, NFractRayPosSquared.xz);
    Contributions += dot(vec4(Combined.xzzx * Combined.yyww) * vec4(NESW2), vec4(1.));
  }
  else if(Mask.z){
    ivec3 RayPosShifted = ivec3(Position.xy, Position.z + FaceSign.z);
    Contributions = float(IsSolid(RayPosShifted));

    bvec4 NESW = bvec4(
    IsSolid(RayPosShifted + ivec3( 1, 0, 0)),
    IsSolid(RayPosShifted + ivec3( 0, 1, 0)),
    IsSolid(RayPosShifted + ivec3(-1, 0, 0)),
    IsSolid(RayPosShifted + ivec3( 0,-1, 0))
    );
    Contributions += dot(vec4(FractRayPosSquared.xy, NFractRayPosSquared.xy) * vec4(NESW), vec4(1.));

    bvec4 NESW2 = bvec4(
    !any(NESW.xy) && IsSolid(RayPosShifted + ivec3( 1, 1, 0)),
    !any(NESW.zy) && IsSolid(RayPosShifted + ivec3(-1, 1, 0)),
    !any(NESW.zw) && IsSolid(RayPosShifted + ivec3(-1,-1, 0)),
    !any(NESW.xw) && IsSolid(RayPosShifted + ivec3( 1,-1, 0))
    );
    vec4 Combined = vec4(FractRayPosSquared.xy, NFractRayPosSquared.xy);
    Contributions += dot(vec4(Combined.xzzx * Combined.yyww) * vec4(NESW2), vec4(1.));
  }

  return 1. - Contributions * .25;
}

float CalculateAOIntensity(ivec3 Position, vec3 FractPosition, bvec3 Mask, uint Depth){
  if(!iRenderAmbientOcclusion) return 1.;
  //The biggest bottleneck to this function are the voxel type lookups since they need to check Data64s and Data8s beforehand.
  //Surprisingly, reusing these when possible (e.g. when Position & 7 is between 1 and 6) doesn't seem to improve performance.

  vec3 FractRayPosSquared = FractPosition * FractPosition;
  vec3 NFractRayPosSquared = (1. - FractPosition) * (1. - FractPosition);
  vec3 OffsetFractPosition = FractPosition - .5;
  ivec3 FaceSign = ivec3(OffsetFractPosition.x > 0. ? 1 : -1, OffsetFractPosition.y > 0. ? 1 : -1, OffsetFractPosition.z > 0. ? 1 : -1);

  if(Mask.x){
    ivec3 RayPosShifted = ivec3(Position.x + FaceSign.x, Position.yz);
    float Contributions = float(!IsEmptyDirectlyWithOffset64(RayPosShifted, Depth));

    bvec4 NESW = bvec4(
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(0, 1, 0), Depth),
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(0, 0, 1), Depth),
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(0,-1, 0), Depth),
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(0, 0,-1), Depth)
    );
    Contributions += dot(vec4(FractRayPosSquared.yz, NFractRayPosSquared.yz) * vec4(NESW), vec4(1.));

    bvec4 NESW2 = bvec4(
    !(any(NESW.xy) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(0, 1, 1), Depth)),
    !(any(NESW.zy) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(0,-1, 1), Depth)),
    !(any(NESW.zw) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(0,-1,-1), Depth)),
    !(any(NESW.xw) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(0, 1,-1), Depth))
    );
    vec4 Combined = vec4(FractRayPosSquared.yz, NFractRayPosSquared.yz);
    Contributions += dot(vec4(Combined.xzzx * Combined.yyww) * vec4(NESW2), vec4(1.));

    return 1. - Contributions * .25;
  }
  else if(Mask.y){
    ivec3 RayPosShifted = ivec3(Position.x, Position.y + FaceSign.y, Position.z);
    float Contributions = float(!IsEmptyDirectlyWithOffset64(RayPosShifted, Depth));

    bvec4 NESW = bvec4(
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3( 1, 0, 0), Depth),
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3( 0, 0, 1), Depth),
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(-1, 0, 0), Depth),
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3( 0, 0,-1), Depth)
    );
    Contributions += dot(vec4(FractRayPosSquared.xz, NFractRayPosSquared.xz) * vec4(NESW), vec4(1.));

    bvec4 NESW2 = bvec4(
    !(any(NESW.xy) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3( 1, 0, 1), Depth)),
    !(any(NESW.zy) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(-1, 0, 1), Depth)),
    !(any(NESW.zw) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(-1, 0,-1), Depth)),
    !(any(NESW.xw) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3( 1, 0,-1), Depth))
    );
    vec4 Combined = vec4(FractRayPosSquared.xz, NFractRayPosSquared.xz);
    Contributions += dot(vec4(Combined.xzzx * Combined.yyww) * vec4(NESW2), vec4(1.));

    return 1. - Contributions * .25;
  }
  else if(Mask.z){
    ivec3 RayPosShifted = ivec3(Position.xy, Position.z + FaceSign.z);
    float Contributions = float(!IsEmptyDirectlyWithOffset64(RayPosShifted, Depth));

    bvec4 NESW = bvec4(
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3( 1, 0, 0), Depth),
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3( 0, 1, 0), Depth),
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(-1, 0, 0), Depth),
    !IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3( 0,-1, 0), Depth)
    );
    Contributions += dot(vec4(FractRayPosSquared.xy, NFractRayPosSquared.xy) * vec4(NESW), vec4(1.));

    bvec4 NESW2 = bvec4(
    !(any(NESW.xy) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3( 1, 1, 0), Depth)),
    !(any(NESW.zy) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(-1, 1, 0), Depth)),
    !(any(NESW.zw) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3(-1,-1, 0), Depth)),
    !(any(NESW.xw) || IsEmptyDirectlyWithOffset64(RayPosShifted + ivec3( 1,-1, 0), Depth))
    );
    vec4 Combined = vec4(FractRayPosSquared.xy, NFractRayPosSquared.xy);
    Contributions += dot(vec4(Combined.xzzx * Combined.yyww) * vec4(NESW2), vec4(1.));

    return 1. - Contributions * .25;
  }
  return 0.;
}

float CalculateShadowIntensity1(float ShadowIntensity, float CumulativeDistance, int Location8, vec3 RayPosExact, vec3 RayDirection, ivec3 RayDirectionSign, vec3 DeltaDistance){
  ivec3 RayPosFloor = ivec3(floor(RayPosExact));
  vec3 SideDistance = (vec3(RayDirectionSign) * (.5 - fract(RayPosExact)) + .5) * DeltaDistance;
  bvec3 Mask = bvec3(false);

  float DistancePrior = 0.;
  float DistanceNow = 0.;

  for(int i = 0; i < 30; ++i){
    if((RayPosFloor & 7) != RayPosFloor) break;
    bool IsSolid = !IsEmpty1(Location8, RayPosFloor);
    if(IsSolid){
      DistancePrior = length(vec3(Mask) * (SideDistance - DeltaDistance));
    }
    Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
    SideDistance = vec3(Mask) * DeltaDistance + SideDistance;
    RayPosFloor = ivec3(vec3(Mask)) * RayDirectionSign + RayPosFloor;
    if(IsSolid){
      DistanceNow = length(vec3(Mask) * (SideDistance - DeltaDistance));
      ShadowIntensity += (DistanceNow - DistancePrior) * iShadowMultiplier / (0.01 + pow(CumulativeDistance + DistancePrior, iShadowExponent));
      if(ShadowIntensity >= 1.) break;
    }
  }
  return ShadowIntensity;
}

float CalculateShadowIntensity8(float ShadowIntensity, float CumulativeDistance, int Location64, vec3 RayPosExact, vec3 RayDirection, ivec3 RayDirectionSign, vec3 DeltaDistance){
  ivec3 RayPosFloor = ivec3(floor(RayPosExact));
  vec3 SideDistance = (vec3(RayDirectionSign) * (.5 - fract(RayPosExact)) + .5) * DeltaDistance;
  bvec3 Mask = bvec3(false);

  for(int i = 0; i < 30; ++i){
    if((RayPosFloor & 7) != RayPosFloor) break;
    uint Info8 = GetInfo8(Location64, RayPosFloor);
    if((Info8 >> 31) != 1u){
      int Location8 = int(Info8 & 0x0fffffffu);

      float Distance = length(vec3(Mask) * (SideDistance - DeltaDistance));
      vec3 CurrentRayPosition = RayPosExact + RayDirection * Distance;
      CurrentRayPosition += vec3(Mask) * RayDirection * 1e-3;

      ShadowIntensity = CalculateShadowIntensity1(ShadowIntensity, CumulativeDistance + Distance * 8., Location8, mod(CurrentRayPosition * 8., 8.), RayDirection, RayDirectionSign, DeltaDistance);
      if(ShadowIntensity >= 1.) break;
    }
    Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
    SideDistance = vec3(Mask) * DeltaDistance + SideDistance;
    RayPosFloor = ivec3(vec3(Mask)) * RayDirectionSign + RayPosFloor;
  }
  return ShadowIntensity;
}

float[8] PowerOfTwo = float[8](1., 2., 4., 8., 16., 32., 64., 128.);

float CalculateShadowIntensity(ivec3 Position, vec3 FractPosition, bvec3 _Mask, uint Depth){
  if(!iRenderShadows) return 1.;
  float ShadowIntensity = 0.;

  vec3 RayDirection = normalize(iSunPosition * vec3(1., -1., 1.));

  FractPosition += vec3(_Mask) * RayDirection * 1e-1;
  Position = Position + ivec3(floor(FractPosition));
  FractPosition = fract(FractPosition);


  ivec3 RayPosFloor = Position >> 6;
  vec3 RayPosFract = (vec3(Position & 63) + FractPosition) / 64.;
  ivec3 RayDirectionSign = ivec3(RayDirection.x > 0. ? 1 : -1, RayDirection.y > 0. ? 1 : -1, RayDirection.z > 0. ? 1 : -1);

  vec3 DeltaDistance = abs(1. / RayDirection);
  vec3 SideDistance = (vec3(RayDirectionSign) * (.5 - RayPosFract) + .5) * DeltaDistance;

  bvec3 Mask = bvec3(false);
  float Distance = 0.;

  for(int i = 0; i < 64; ++i){
    if((RayPosFloor & 7) != RayPosFloor || Distance >= 400.) break;

    uint Info64 = GetInfo64NoOffset(RayPosFloor.zyx, Depth);

    if((Info64 >> 31) != 1u && ((Info64 >> 29) & 1u) == 1u){ //Not empty and completely loaded
      int Location64 = int(Info64 & 0x00ffffffu);

      Distance = length(vec3(Mask) * (SideDistance - DeltaDistance));// * PowerOfTwo[Depth];
      vec3 CurrentRayPosition = RayPosFract + RayDirection * Distance;
      CurrentRayPosition += vec3(Mask) * RayDirection * 1e-3;

      ShadowIntensity = CalculateShadowIntensity8(ShadowIntensity, Distance * 64., Location64, mod(CurrentRayPosition * 8., 8.), RayDirection, RayDirectionSign, DeltaDistance);
      if(ShadowIntensity >= 1.) break;
    }
    Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
    SideDistance = vec3(Mask) * DeltaDistance + SideDistance;
    RayPosFloor = ivec3(vec3(Mask)) * RayDirectionSign + RayPosFloor;
  }

  return 1. - iShadowDarkness * min(ShadowIntensity, 1.);
}

vec3[10] Colours = vec3[10](
vec3(255./255., 0./255., 255./255.),
vec3(70./255., 109./255., 53./255.),
vec3(.45, .45, .45),
vec3(.28, .28, .28),
vec3(30./255., 153./255., 163./255.),
vec3(1., 0., 0.),
vec3(46./255., 73./255., 46./255.),
vec3(59./255., 38./255., 16./255.),
vec3(72./255., 104./255., 28./255.),
vec3(100./255., 71./255., 38./255.)
);

// For random functions:
// The MIT License
// Copyright (c) 2017 Inigo Quilez
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

float Random(ivec2 Input){
  Input = 1103515245 * ((Input >> 1u) ^ (Input.yx));
  uint n = 1103515245u * uint((Input.x) ^ (Input.y >> 1u));
  return float(n) * (1.0/float(0xffffffffu));
}
float Random(ivec3 Input){
  Input = 1103515245 * ((Input.xzy >> 1u) ^ (Input.yxz) ^ (Input.zxy >> 2u));
  uint n = 1103515245u * uint((Input.x) ^ (Input.y >> 1u) ^ (Input.z >> 2u));
  return float(n) * (1.0/float(0xffffffffu));
}

ivec3 PreviousRayPosDiff;
ivec3 PreviousCoordinate = ivec3(2147483647);
bvec3 TypeSides = bvec3(false);

bool GetRoughnessMap2(ivec3 RayPosFloor, int Type, float Distance, ivec3 Coordinate){
  float Unloading = pow(clamp((Distance - 5.) / 12., 0., 1.), 2.);
  ivec3 Intermediate = RayPosFloor - 31 - (RayPosFloor >> 5); // The offset is needed to make the range [0, 64] instead of [0, 63], which makes it easier to determine the distance from center
  bvec3 RayPosSides = greaterThanEqual(abs(Intermediate), ivec3(28));
  ivec3 RayPosDiff = ivec3(sign(Intermediate)) * ivec3(RayPosSides);
  ivec3 RayPosScaled = RayPosFloor >> 2;

  if(all(not(RayPosSides))) return true; //In the middle

  if((PreviousRayPosDiff != RayPosDiff || PreviousCoordinate != Coordinate)){
    TypeSides.x = RayPosDiff.x == 0 || !IsSolid(Coordinate + ivec3(RayPosDiff.x, 0, 0));
    TypeSides.y = RayPosDiff.y == 0 || !IsSolid(Coordinate + ivec3(0, RayPosDiff.y, 0));
    TypeSides.z = RayPosDiff.z == 0 || !IsSolid(Coordinate + ivec3(0, 0, RayPosDiff.z));
    PreviousRayPosDiff = RayPosDiff;
    PreviousCoordinate = Coordinate;
  }

  if(dot(vec3(RayPosSides), vec3(1.)) > 1.){
    RayPosSides = bvec3(RayPosSides.x && TypeSides.x, RayPosSides.y && TypeSides.y, RayPosSides.z && TypeSides.z);
    //return true;
  }
  if(all(not(RayPosSides))) return true; //Not visible (between blocks)

  vec3 Depth = vec3(32 - abs(Intermediate));
  ivec3 NotRayPosSides = ivec3(not(RayPosSides));
  ivec3 RandomOffset = Coordinate << 6;

  bool Result = true;
  if(RayPosSides.x){
    ivec3 RayPosModified = RayPosScaled;
    RayPosModified.x = RayPosFloor.x;
    float RandomNum = Random(RayPosModified * NotRayPosSides + RandomOffset);
    Result = RandomNum - Unloading < Depth.x / 4.;
  }
  if(!Result) return Result;
  if(RayPosSides.y){
    ivec3 RayPosModified = RayPosScaled;
    RayPosModified.y = RayPosFloor.y;
    float RandomNum = Random(RayPosModified * NotRayPosSides + RandomOffset);
    Result = RandomNum - Unloading < Depth.y / 4.;
  }
  if(!Result) return Result;
  if(RayPosSides.z){
    ivec3 RayPosModified = RayPosScaled;
    RayPosModified.z = RayPosFloor.z;
    float RandomNum = Random(RayPosModified * NotRayPosSides + RandomOffset);
    Result = RandomNum - Unloading < Depth.z / 4.;
  }

  return Result;
}

struct DetailedRaytraceResult{
  bool HitVoxel;
  float Distance;
  ivec3 RayPosFloor;
  vec3 ExactRayPosition;
  bvec3 Mask;
  bvec3 Mask1;
};

struct SmallRaytraceResult{
  vec3 FloatMask;
  bool HitVoxel;
};

SmallRaytraceResult RaytraceSmaller(vec3 RayOrigin, vec3 RayDirection, vec3 FloatMask, vec3 Coordinate, float Distance, vec3 RaySign, vec3 RayInverse){
  vec3 RayPosFloor = floor(RayOrigin);

  vec3 SideDistance = (RayPosFloor - RayOrigin + .5 + RaySign * .5) * RayInverse;

  for(int i = 0; i < 200; ++i){
    if(mod(RayPosFloor, 64.) != RayPosFloor) return SmallRaytraceResult(FloatMask, false);
    if(GetRoughnessMap2(ivec3(RayPosFloor), 1, Distance, ivec3(Coordinate))){
      return SmallRaytraceResult(FloatMask, true);
    }
    FloatMask = step(SideDistance, min(SideDistance.yxy, SideDistance.zzx));
    SideDistance += FloatMask * RaySign * RayInverse;
    RayPosFloor += FloatMask * RaySign;
  }
  return SmallRaytraceResult(FloatMask, false);
}

DetailedRaytraceResult RaytraceClose(vec3 RayOrigin, vec3 RayDirection){
  vec3 RayInverse = 1. / RayDirection;
  vec3 RaySign = sign(RayDirection);//vec3(RayDirection.x > 0. ? 1. : -1., RayDirection.y > 0. ? 1. : -1., RayDirection.z > 0. ? 1. : -1.);
  vec3 RayPosFloor = floor(RayOrigin);
  vec3 SideDistance = (RayPosFloor - RayOrigin + .5 + RaySign * .5) * RayInverse;
  vec3 FloatMask;
  vec3 FloatMask1;
  bool HitVoxel = false;
  float Distance;
  vec3 ExactFractRayPosition;
  vec3 RayOriginFract = mod(RayOrigin, 64.);

  for(int i = 0; i < 25; ++i){
    bool IsSolid = IsSolid(ivec3(RayPosFloor));
    if(IsSolid){
      Distance = length(abs(FloatMask) * (SideDistance - abs(RayInverse)));
      if(Distance > 14.) break;
      ExactFractRayPosition = RayOriginFract + RayDirection * Distance;
      ExactFractRayPosition += abs(FloatMask) * vec3(RaySign) * 1e-4;

      SmallRaytraceResult Result = RaytraceSmaller(mod(ExactFractRayPosition * 64., 64.), RayDirection, FloatMask, RayPosFloor, Distance, RaySign, RayInverse);

      HitVoxel = Result.HitVoxel;
      if(HitVoxel){
        FloatMask = Result.FloatMask;
        break;
      }
    }
    FloatMask = step(SideDistance, min(SideDistance.yxy, SideDistance.zzx));
    SideDistance += FloatMask * RaySign * RayInverse;
    RayPosFloor += FloatMask * RaySign;
    if(!IsSolid) FloatMask1 = FloatMask;
  }

  return DetailedRaytraceResult(
  HitVoxel,
  Distance,
  ivec3(RayPosFloor),
  ExactFractRayPosition,
  bvec3(FloatMask),
  bvec3(FloatMask1)
  );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 uv = (fragCoord.xy * 2. - iResolution.xy) / iResolution.y;
  uv.x *= -1.;
  vec3 RayOrigin = iPosition;
  vec3 RayDirection = (normalize(vec3(uv, 1. / tan(FOV / 2.))) * RotateX(-iRotation.x) * RotateY(iRotation.y - PI));
  RayDirection += vec3(equal(RayDirection, vec3(0.))) * 1e-3; //When RayDirection is 0 NaNs get created and the perf tanks
  ivec3 RayDirectionSign = ivec3(RayDirection.x > 0. ? 1 : -1, RayDirection.y > 0. ? 1 : -1, RayDirection.z > 0. ? 1 : -1);

  fragColor.w = 1.;

  bool ShouldBeTraced = false;
  ivec2 SmallTextureCoordinate = ivec2(floor(gl_FragCoord.xy / vec2(iRaytracingGridDistance)) + 1.);

  for(int dx = -1; dx < 2; ++dx) for(int dy = -1; dy < 2; ++dy){
    ShouldBeTraced = ShouldBeTraced || texelFetch(iSmallTargetData, SmallTextureCoordinate + ivec2(dx, dy), 0).r != 0u;
    if(ShouldBeTraced) break;
  }

  DetailedRaytraceResult NearTrace;
  if(ShouldBeTraced) NearTrace = RaytraceClose(RayOrigin, RayDirection);

  if(NearTrace.HitVoxel){
    float Weighting = pow(clamp(NearTrace.Distance / 14., 0., 1.), 1.4);
    int Type = GetTypeDirectly2(NearTrace.RayPosFloor);
    vec3 Colour = Colours[Type];

    Colour.xyz *= 1.075 - Random(ivec3(floor(mod(NearTrace.ExactRayPosition, 64.) * 16.))) * .15;
    Colour.xyz *= length((vec3(NearTrace.Mask1) * Weighting + vec3(NearTrace.Mask) * (1. - Weighting)) * vec3(.75, RayDirectionSign.y < 0 ? 1. : .625, .5));

    fragColor.xyz = Colour;
    fragColor.xyz *= CalculateAOIntensityFast(NearTrace.RayPosFloor, fract(NearTrace.ExactRayPosition), NearTrace.Mask1, 0u);
    fragColor.xyz *= CalculateShadowIntensity(NearTrace.RayPosFloor - (iOffset64[0] << 6u), fract(NearTrace.ExactRayPosition), NearTrace.Mask1, 0u);
  } else{
    uvec2 Data = texelFetch(iIntermediatePassData, ivec2(fragCoord), 0).rg;
    uint Data1 = Data.r;
    uint Data2 = Data.g;

    if(Data1 == 0u) discard;

    uint MaskBits = (Data1 >> 9) & 3u;
    ivec3 Position1 = ivec3(
    (Data1 >> 6) & 7u,
    (Data1 >> 3) & 7u,
    Data1 & 7u
    );
    ivec3 Position8 = ivec3(
    (Data1 >> 20) & 7u,
    (Data1 >> 17) & 7u,
    (Data1 >> 14) & 7u
    );
    uint Depth = (Data1 >> 11) & 7u;
    ivec3 Coordinate64 = ivec3( //This has reversed z and x
    (Data1 >> 29) & 7u,
    (Data1 >> 26) & 7u,
    (Data1 >> 23) & 7u
    );
    ivec3 Position = (Coordinate64.zyx << 6) | (Position8 << 3) | Position1; //This has normal z and x
    vec3 FractPosition = vec3(
    (Data2 >> 16) & 0xffu,
    (Data2 >> 8) & 0xffu,
    Data2 & 0xffu
    ) / 256.;


    ivec3 PlayerPosition = (ivec3(floor(iPosition)) >> Depth) - (iOffset64[Depth] << 6u);
    float Distance = length(vec3((Position - PlayerPosition) << Depth));

    bvec3 Mask = bvec3(MaskBits == 1u, MaskBits == 2u, MaskBits == 3u);
    float MaskContribution = length(vec3(Mask) * vec3(.75, sign(RayDirection.y) < 0. ? 1. : .625, .5));

    int Type = GetTypeDirectlyWithOffset64(Position, Depth);

    fragColor = vec4(Colours[Type] * MaskContribution, 1.);
    fragColor.xyz *= 1.075 - Random(vec4(Position & 63, 0) + vec4(floor(FractPosition * 16.) / 16., 0.)) * .15;
    fragColor.xyz *= CalculateAOIntensity(Position, FractPosition, Mask, Depth);
    fragColor.xyz *= CalculateShadowIntensity(Position, FractPosition, Mask, Depth);

    vec3 FogEffect = pow(vec3(2.71), vec3(-iFogFactor * Distance) * vec3(1., 2., 3.));
    fragColor.rgb = FogEffect * fragColor.rgb + (1. - FogEffect);
  }
}


void main(){
  mainImage(gl_FragColor, vUv * iResolution.xy);
}