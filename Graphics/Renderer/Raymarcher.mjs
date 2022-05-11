import * as THREE from "../../Libraries/Three/Three.js";
import Simplex from "../../Simplex.js";

export default class Raymarcher{
  static LOW_RES_PASS = 0;
  static FULL_RES_INITIAL_PASS = 1;
  static FULL_RES_INITIAL_BYPASS_PASS = 2;
  static SHADOW_PASS = 3;
  static FULL_RES_FINAL_PASS = 4;
  constructor(World, Renderer){
    this.World = World;
    this.Renderer = Renderer;
    this.Scene = this.Renderer.Scene;
    this.Statistics = {
      "RD": 0,
      "VD": 0
    };

    this.Data1 = this.World.Data1;//new Uint16Array(64*2048*256); //64 MB
    // (it's actually supposed to be 1024*2048*64 to be full-size, but that including types would probably start wasting storage).
    // it's unlikely that the entire buffer will be used anyway, and I can always add functionality to expand it if and when required.
    this.VoxelTypes = this.World.VoxelTypes;//new Uint16Array(512*2048*256); //512 MB
    this.Data8 = this.World.Data8;//new Uint32Array(512 * 512); //1 MB
    this.Data64 = this.World.Data64;//new Uint16Array(8*8*8*8); //8 kB (8*8*8, and 8 LODs)

    this.GPUData1 = this.World.GPUData1;//new Uint8Array(new SharedArrayBuffer(64 * 512 * 512));
    this.GPUData8 = this.World.GPUData8;//new Uint32Array(new SharedArrayBuffer(512 * 512));
    this.GPUData64 = this.World.GPUData64;//new Uint16Array(new SharedArrayBuffer(8 * 8 * 8 * 8));
    this.GPUTypes = this.World.GPUTypes;//new Uint16Array(new SharedArrayBuffer(512 * 512 * 512));


    this.VoxelTypesTex = new THREE.DataTexture3D(this.GPUTypes, 512, 512, 512);
    this.VoxelTypesTex.internalFormat = "R16UI";
    this.VoxelTypesTex.format = THREE.RedIntegerFormat;
    this.VoxelTypesTex.type = THREE.UnsignedShortType;
    this.VoxelTypesTex.minFilter = this.VoxelTypesTex.magFilter = THREE.NearestFilter;
    this.VoxelTypesTex.unpackAlignment = 1;
    this.VoxelTypesTex.needsUpdate = true;


    this.Tex1 = new THREE.DataTexture3D(this.GPUData1, 64, 512, 512);
    this.Tex1.internalFormat = "R8UI";
    this.Tex1.format = THREE.RedIntegerFormat;
    this.Tex1.type = THREE.UnsignedByteType;
    this.Tex1.minFilter = this.Tex1.magFilter = THREE.NearestFilter;
    this.Tex1.unpackAlignment = 1;
    this.Tex1.needsUpdate = true;


    this.Tex8 = new THREE.DataTexture3D(this.GPUData8, 8, 512, 512);
    this.Tex8.internalFormat = "R32UI";
    this.Tex8.format = THREE.RedIntegerFormat;
    this.Tex8.type = THREE.UnsignedIntType;
    this.Tex8.minFilter = this.Tex8.magFilter = THREE.NearestFilter;
    this.Tex8.unpackAlignment = 1;
    this.Tex8.needsUpdate = true;


    this.Tex64 = new THREE.DataTexture3D(this.GPUData64, 8, 8, 8*8);
    this.Tex64.internalFormat = "R16UI";
    this.Tex64.format = THREE.RedIntegerFormat;
    this.Tex64.type = THREE.UnsignedShortType;
    this.Tex64.minFilter = this.Tex64.magFilter = THREE.NearestFilter;
    this.Tex64.unpackAlignment = 1;
    this.Tex64.needsUpdate = true;


    this.DummyColourTexture = new THREE.DataTexture(new Uint8Array(16), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.DummyColourTexture.internalFormat = "RGBA8UI";

    this.DummyDepthTexture = new THREE.DataTexture(new Uint16Array(16), 1, 1, THREE.DepthFormat, THREE.UnsignedShortType);
    this.DummyDepthTexture.internalFormat = "R16UI";

    this.Material = new THREE.ShaderMaterial({
      "uniforms": {
        iResolution: {value: new THREE.Vector2(1920, 1080)},
        iTime: {value: 0},
        iMouse: {value: new THREE.Vector2(0, 0)},
        iRotation: {value: new THREE.Vector3(0, 0, 0)},
        iPosition: {value: new THREE.Vector3(0, 0, 0)},
        iScalingFactor: {value: 0},
        iVoxelTypesTex: {value: this.VoxelTypesTex},
        iTex1: {value: this.Tex1},
        iTex8: {value: this.Tex8},
        iTex64: {value: this.Tex64},
        iOffset64: {value: this.World.Data64Offset, "type": "iv"},
        iColour: {value: this.Renderer.ScaledTarget.texture},
        iDepth: {value: this.Renderer.ScaledTarget.depthTexture},
        iShadowColour: {value: this.Renderer.ShadowTarget.texture},
        iRenderSize: {value: 1.},
        iPassID: {value: 0},
        iUpscalingKernelSize: {value: 2},
        iSunPosition: {value: new THREE.Vector3(0., 0., 0.)},
        FOV: {value: 110},
        iShadowTargetSize: {value: new THREE.Vector2(0., 0.)},
        iMaxShadowSteps: {value: 150},
        iShadowExponent: {value: 0.85},
        iShadowMultiplier: {value: 2.4},
        iShadowDarkness: {value: 0.5},
        iFogFactor: {value: 0.00002}
      },
      "transparent": true,
      "blending": THREE.NormalBlending,
      "alphaTest": 1.,
      "depthTest": true,
      "depthWrite": true, //#######################
      "vertexShader": `
        varying vec2 vUv;
        varying vec4 vPosition;
        varying vec4 vmvPosition;
        void main(){
          //vUv = uv;
          //gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          //vPosition = gl_Position;
          vUv = uv;
          gl_Position = vec4(position, 1.0);
          
          
          vmvPosition = projectionMatrix * vec4( position, 1.);
        }
      `,
      "fragmentShader": `
        varying vec2 vUv;
        varying vec4 vPosition;
        varying vec4 vmvPosition;
        
        uniform vec2 iResolution;
        uniform float iTime;
        uniform vec3 iPosition;
        uniform vec3 iRotation;
        uniform float FOV;
        uniform lowp usampler3D iTex1;
        uniform highp usampler3D iTex8;
        uniform mediump usampler3D iTex64;
        uniform mediump usampler3D iVoxelTypesTex;
        uniform sampler2D iColour;
        uniform sampler2D iDepth;
        uniform sampler2D iShadowColour;
        uniform ivec3 iOffset64[8];
        uniform int iPassID;
        uniform float iUpscalingKernelSize;
        uniform float iRenderSize;
        uniform vec3 iSunPosition;
        uniform vec2 iShadowTargetSize;
        uniform int iMaxShadowSteps;
        uniform float iShadowExponent;
        uniform float iShadowMultiplier;
        uniform float iShadowDarkness;
        uniform float iFogFactor;
        
        #define LOW_RES_PASS 0
        #define FULL_RES_INITIAL_PASS 1
        #define FULL_RES_INITIAL_BYPASS_PASS 2
        #define SHADOW_PASS 3
        #define FULL_RES_FINAL_PASS 4
        
        
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
        
        
        //Voxel grid hierarchy implementation
        //Based on abje's octree tracer: https://www.shadertoy.com/view/4sVfWw
        const float MAX_DISTANCE = 42000.;
        const float MAX_ROUGHNESS_DISTANCE = 10.;
        const float MAX_ROUGHNESS_FALLOFF = 30.;
        const int MAX_DETAIL = 2;
        const int MIN_DETAIL = -2;
        
        const float Log42000 = log(42000.);
        
        float EncodeLogarithmicDepth(float Depth){
          return log(Depth + 1.) / Log42000;
        }
        
        float DecodeLogarithmicDepth(float Depth){
          return exp(Depth * Log42000) - 1.;
        }
        
        float Random(vec4 v){
          return fract(1223.34 * sin(dot(v,vec4(18.111, 13.252, 17.129, 18.842))));
        }
        float Random(vec3 v){
          //return sin(iTime / 2000.) / 2. + .5;
          return fract(1223.34 * sin(dot(v,vec3(18.111, 13.252, 17.129))));
        }
        
        
        float rand(vec2 n) { 
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }
        
        float noise(vec2 p){
          vec2 ip = floor(p);
          vec2 u = fract(p);
          u = u*u*(3.0-2.0*u);
          
          float res = mix(
            mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
            mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
          return res*res;
        }
        
        vec3 positivefract(vec3 x){
          return x - floor(x);
        }
        
        
        int GetLocation64(vec3 RayPosFloor, uint Depth){
          ivec3 mRayPosFloor = ivec3(RayPosFloor) >> (6u + Depth); //Divides by 64 (times the LOD level). (gets location within 64, don't need to mod because this is the texture size)
          ivec3 Position = mRayPosFloor.zyx - iOffset64[Depth].zyx;
          if(Position.x < 0 || Position.y < 0 || Position.z < 0 || Position.x > 7 || Position.y > 7 || Position.z > 7) return -1;
          Position.z += int(Depth) * 8; //Select correct LOD level
          int Info64 = int(texelFetch(iTex64, Position, 0).r);
          if(((Info64 >> 13) & 1) == 0) return -1;
          else return Info64;
        }
        uint GetLocation8(int Location64, vec3 RayPosFloor){
          ivec3 mRayPosFloor = (ivec3(RayPosFloor) >> 3) & 7; //Gets location within 8
          int Pos8XYZ = ((Location64 & 7) << 6) | (mRayPosFloor.x << 3) | mRayPosFloor.y;
          return texelFetch(iTex8, ivec3(mRayPosFloor.z, Pos8XYZ, Location64 >> 3), 0).r;
        }
        int GetType1(int Location8, vec3 RayPosFloor, out int Colour){
          //if(RayPosFloor.x < 0. || RayPosFloor.y < 0. || RayPosFloor.z < 0. || RayPosFloor.x > 511. || RayPosFloor.y > 511. || RayPosFloor.z > 511.) return 0;
          ivec3 mRayPosFloor = ivec3(RayPosFloor) & 7; //Gets location within 1
          int Pos1XY = (mRayPosFloor.x << 3) | mRayPosFloor.y;
          
          //First set colour (it is passed by reference)
          Colour = int(texelFetch(iVoxelTypesTex, ivec3((Pos1XY << 3) | mRayPosFloor.z, Location8 & 511, Location8 >> 9), 0).r);
          return int((texelFetch(iTex1, ivec3(Pos1XY, Location8 & 511, Location8 >> 9), 0).r >> mRayPosFloor.z) & 1u);
        }
        int GetType1(int Location8, vec3 RayPosFloor){
          if(RayPosFloor.x < 0. || RayPosFloor.y < 0. || RayPosFloor.z < 0. || RayPosFloor.x > 511. || RayPosFloor.y > 511. || RayPosFloor.z > 511.) return 0;
          ivec3 mRayPosFloor = ivec3(RayPosFloor) & 7; //Gets location within 1
          int Pos1XY = (mRayPosFloor.x << 3) | mRayPosFloor.y;
          return int((texelFetch(iTex1, ivec3(Pos1XY, Location8 & 511, Location8 >> 9), 0).r >> mRayPosFloor.z) & 1u);
        }
        
        int GetType1Test(vec3 RayPosFloor, out int Colour){
          if(RayPosFloor.x < 0. || RayPosFloor.y < 0. || RayPosFloor.z < 0. || RayPosFloor.x > 511. || RayPosFloor.y > 511. || RayPosFloor.z > 511.) return 1;
          Colour = 1;////int(texelFetch(iVoxelTypesTex, ivec3((Pos1XY << 3) | mRayPosFloor.z, Location8 & 2047, Location8 >> 11), 0).r);
          ivec3 iRayPosFloor = ivec3(RayPosFloor);
          int Offset = iRayPosFloor.x & 7;
          iRayPosFloor.x >>= 3;
          return int((texelFetch(iTex1, iRayPosFloor, 0).r >> Offset) & 1u);
        }
        int GetTypeDirectly(vec3 RayPosFloor){
          int Location64 = GetLocation64(RayPosFloor, 0u);
          if((Location64 & 0x8000) != 0) return 0; //49151
          uint Location8 = GetLocation8(Location64 & 0x0fff, RayPosFloor);
          if((Location8 & 0x80000000u) != 0u) return 0; //49151
          int Colour;
          GetType1(int(Location8 & 0x3fffffffu), RayPosFloor, Colour);
          return Colour;
        }
        int GetTypeDirectly(vec3 RayPosFloor, uint Depth){
          int Location64 = GetLocation64(RayPosFloor, Depth);
          if((Location64 & 0x8000) != 0) return 0; //49151
          float Size = float(1 << Depth);
          uint Location8 = GetLocation8(Location64 & 0x0fff, RayPosFloor / Size);
          if((Location8 & 0x80000000u) != 0u) return 0; //49151
          int Colour;
          GetType1(int(Location8 & 0x3fffffffu), RayPosFloor / Size, Colour);
          return Colour;
        }
        int GetMaskDirectly(vec3 RayPosFloor){
          int Location64 = GetLocation64(RayPosFloor, 0u);
          if((Location64 & 0x8000) != 0) return 1;
          uint Location8 = GetLocation8(Location64 & 0x0fff, RayPosFloor);
          if((Location8 & 0x80000000u) != 0u) return 1;
          return GetType1(int(Location8 & 0x3fffffffu), RayPosFloor);
        }
        int GetRoughnessMap(vec3 RayPosFloor, int Type, int Level, float Distance){
          if(Level > -2) return 0;
          //if(Distance > (MAX_ROUGHNESS_DISTANCE + 25.)) return 2;
          float Unloading = max((Distance - MAX_ROUGHNESS_DISTANCE) / MAX_ROUGHNESS_FALLOFF, 0.);
          
          vec3 Intermediate = fract(RayPosFloor) - .4995;
          bvec3 RayPosSides = greaterThanEqual(abs(Intermediate), vec3(7./16.));
          vec3 RayPosDiff = sign(Intermediate) * vec3(RayPosSides);
          vec3 RayPosScaled = floor(RayPosFloor * 16.) / 16.;
          
          if(all(not(RayPosSides))) return 2; //In the middle
          
          vec3 RayPosFloorFloor = floor(RayPosFloor);
          
          if(dot(vec3(RayPosSides), vec3(1.)) > 1.){
            RayPosSides.x = RayPosSides.x && GetTypeDirectly(RayPosFloorFloor + vec3(RayPosDiff.x, 0., 0.)) != Type;
            RayPosSides.y = RayPosSides.y && GetTypeDirectly(RayPosFloorFloor + vec3(0., RayPosDiff.y, 0.)) != Type;
            RayPosSides.z = RayPosSides.z && GetTypeDirectly(RayPosFloorFloor + vec3(0., 0., RayPosDiff.z)) != Type;
          }
          
          if(all(not(RayPosSides))) return 2; //Not visible (occluded)
          
          vec3 Depth = abs((fract(RayPosFloor) - .5)) * 16. - 7.;
          vec3 NotRayPosSides = vec3(not(RayPosSides));
          
          vec3 Correction = floor(Intermediate) / 4.; //For some reason, normally, the + side of each block is 1/4 higher...
          
          if(RayPosSides.x){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.x = RayPosFloor.x;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.x;
            if(RandomNum + Unloading < Depth.x) return 0;
          }
          if(RayPosSides.y){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.y = RayPosFloor.y;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.y;
            if(RandomNum + Unloading < Depth.y) return 0;
          }
          if(RayPosSides.z){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.z = RayPosFloor.z;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.z;
            if(RandomNum + Unloading < Depth.z) return 0;
          }
          return 2;
        }
        
        
        
        float CalculateShadowIntensity(vec3 RayOrigin, vec3 RayDirection, uint Depth, float MainRayDistance){
          
          float Factor = float(1 << Depth);
          
          vec3 TrueRayOrigin = RayOrigin;
          vec3 RayDirectionSign = sign(RayDirection);
          vec3 Mask = vec3(0.);
          vec3 Mask1 = vec3(0.);
          bool NextLODLevel = false;
          int Level = MAX_DETAIL;
          float Size = pow(8., float(MAX_DETAIL)) * Factor;
          bool HitVoxel = false;
          
          vec4 Colour = vec4(0.);
          int VoxelType = 0;
          
          vec3 s = vec3(0.);
          
          vec3 RayOriginOffset = floor(RayOrigin / Size) * Size;
          RayOrigin -= RayOriginOffset;
          
          vec3 RayPosFloor = floor(RayOrigin / Size) * Size; //Voxel coordinate
          vec3 RayPosFract = RayOrigin - RayPosFloor; //Sub-voxel coordinate                   
          vec3 LastRayPosFloor = RayPosFloor;
          vec3 Correction = 1./max(abs(RayDirection), 1e-4);
          int Location64 = 0;
          int Location8 = 0;
          
          float Distance = 0.;
          
          float ShadowIntensity = 0.;
          
          
          for(int i = 0; i < iMaxShadowSteps; ++i){
            if(!(ShadowIntensity < 1. && Depth < 8u)) continue;
            if(NextLODLevel || i > int(Depth) * 100 + 500 && Depth < 7u){
              NextLODLevel = false;
              Depth++;
              Factor *= 2.;
              Size *= 2.;
              
              RayOrigin = RayPosFloor + RayPosFract + RayOriginOffset;
              RayOriginOffset = floor(RayOrigin / Size) * Size;
              RayOrigin -= RayOriginOffset;
              
              RayPosFloor = floor(RayOrigin / Size) * Size; //Voxel coordinate
              RayPosFract = RayOrigin - RayPosFloor; //Sub-voxel coordinate
            }
            
            vec3 TrueRayPosFloor = RayPosFloor + RayOriginOffset;
            
            int VoxelState;
            switch(Level){
              case 0:{
                VoxelState = GetType1(Location8, TrueRayPosFloor / Factor, VoxelType);
                //if(VoxelState == 0) VoxelState = 2;
                break;
              }
              case 1:{
                uint Result = GetLocation8(Location64, TrueRayPosFloor / Factor);
                VoxelState = int(Result >> 31);
                Location8 = int(Result & 0x3fffffffu);
                break;
              }
              case 2:{ //64
                int Result;
                Result = GetLocation64(TrueRayPosFloor, Depth);
                
                if(Result == -1){
                  NextLODLevel = true;
                }
                
                Location64 = Result & 0x0fff;
                VoxelState = Result >> 15; //Get whether it exists
                break;
              }
              default:{ //-2 and -1
                VoxelState = (Depth == 0u && i < 40 && Distance < .5) ? GetRoughnessMap(TrueRayPosFloor, VoxelType, Level, Distance + MainRayDistance) : 2;
              }
            }
            //VoxelState = GetType1Test(TrueRayPosFloor, VoxelType);
            switch(VoxelState){ //Get random voxel at proper scale (Size)
              case 0:{ //Subdivide
                if(Level > MIN_DETAIL){
                  Level--;
                  for(int j = 0; j < 3; ++j){
                    Size /= 2.;
                    vec3 Step = step(vec3(Size), RayPosFract) * Size;
                    RayPosFloor += Step;
                    RayPosFract -= Step;
                  }
                  break; //Only break switch if the level was less than the max detail. Otherwise, pretend as if the same level is kept.
                }
              }
              case 2:
              case 1:{ //Empty
                float HalfSize = Size / 2.;
                vec3 Hit = -Correction * (RayDirectionSign * (RayPosFract - HalfSize) - HalfSize); //Trace ray to next voxel
                Mask = vec3(lessThanEqual(Hit.xyz, min(Hit.yzx, Hit.zxy))); //Determine which side was hit
                if(Level >= 0 && VoxelState != 0) Mask1 = Mask;
                float NearestVoxelDistance = dot(Hit, Mask);
                Distance += NearestVoxelDistance;
                if(VoxelState == 2) ShadowIntensity += NearestVoxelDistance * iShadowMultiplier / (0.0001 + pow(Distance, iShadowExponent));
                vec3 Step = Mask * RayDirectionSign * Size;
                
                RayPosFract += RayDirection * NearestVoxelDistance - Step;
                
                LastRayPosFloor = RayPosFloor;
                RayPosFloor += Step;
                
                while(Level < MAX_DETAIL && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.)){
                  Level++;
                  for(int i = 0; i < 3; ++i){
                    Size *= 2.;
                    vec3 NewRayPosFloor = floor(RayPosFloor/Size) * Size;
                    RayPosFract += RayPosFloor - NewRayPosFloor;
                    RayPosFloor = NewRayPosFloor;
                  }
                }
                break;
              }
            }
          }
          
          /*for(int i = 0; i < 500; ++i){
            if(GetTypeDirectly(TrueRayOrigin + (float(i) * .1 + .4) * RayDirection, 0u) != 0) return 1.;
          }*/
          return ShadowIntensity;
        }
        
        struct RayTraceResult{
          vec4 Colour;
          float Distance;
          bool HitVoxel;
        };
        
        RayTraceResult Raytrace(vec3 RayOrigin, vec3 RayDirection, float Distance, uint Depth, vec4 Distances){
          float Factor = float(1 << Depth);
          
          vec3 TrueRayOrigin = RayOrigin;
          vec3 RayDirectionSign = sign(RayDirection);
          vec3 Mask = vec3(0.);
          vec3 Mask1 = vec3(0.);
          bool NextLODLevel = false;
          int Level = MAX_DETAIL;
          float Size = pow(8., float(MAX_DETAIL)) * Factor;
          bool HitVoxel = false;
          
          vec4 Colour = vec4(0.);
          int VoxelType = 0;
          
          vec3 s = vec3(0.);
          
          vec3 RayOriginOffset = floor(RayOrigin / Size) * Size;
          RayOrigin -= RayOriginOffset;
          
          vec3 RayPosFloor = floor(RayOrigin / Size) * Size; //Voxel coordinate
          vec3 RayPosFract = RayOrigin - RayPosFloor; //Sub-voxel coordinate                   
          vec3 LastRayPosFloor = RayPosFloor;
          vec3 Correction = 1./max(abs(RayDirection), 1e-4);
          int Location64 = 0;
          int Location8 = 0;
          
          int Max = iPassID == LOW_RES_PASS || iPassID == FULL_RES_INITIAL_BYPASS_PASS ? 1500 : 75;
          for(int i = 0; i < Max && Distance < MAX_DISTANCE && !HitVoxel && Depth < 8u; ++i){
            if(NextLODLevel || i > int(Depth) * 100 + 500 && Depth < 7u){
              NextLODLevel = false;
              Depth++;
              Factor *= 2.;
              Size *= 2.;
              
              RayOrigin = RayPosFloor + RayPosFract + RayOriginOffset;
              RayOriginOffset = floor(RayOrigin / Size) * Size;
              RayOrigin -= RayOriginOffset;
              
              RayPosFloor = floor(RayOrigin / Size) * Size; //Voxel coordinate
              RayPosFract = RayOrigin - RayPosFloor; //Sub-voxel coordinate
            }
            
            vec3 TrueRayPosFloor = RayPosFloor + RayOriginOffset;
            
            int VoxelState;
            switch(Level){
              case 0:{
                VoxelState = GetType1(Location8, TrueRayPosFloor / Factor, VoxelType);//GetType1Test(TrueRayPosFloor, VoxelType);//
                //VoxelState = GetType1Test(TrueRayPosFloor, VoxelType);//GetType1(Location8, TrueRayPosFloor / Factor, VoxelType);//
                break;
              }
              case 1:{
                uint Result = GetLocation8(Location64, TrueRayPosFloor / Factor);
                VoxelState = int(Result >> 31);
                Location8 = int(Result & 0x3fffffffu);
                break;
              }
              case 2:{ //64
                int Result;
                Result = GetLocation64(TrueRayPosFloor, Depth);
                
                if(Result == -1){
                  NextLODLevel = true;
                }
                
                Location64 = Result & 0x0fff;
                VoxelState = Result >> 15; //Get whether it exists
                break;
              }
              default:{ //-2 and -1
                VoxelState = Depth == 0u ? GetRoughnessMap(TrueRayPosFloor, VoxelType, Level, Distance) : 2;
              }
            }
            //VoxelState = GetType1Test(TrueRayPosFloor, VoxelType);
            switch(VoxelState){ //Get random voxel at proper scale (Size)
              case 0:{ //Subdivide
                if(Level > MIN_DETAIL){
                  Level--;
                  for(int j = 0; j < 3; ++j){
                    Size /= 2.;
                    vec3 Step = step(vec3(Size), RayPosFract) * Size;
                    RayPosFloor += Step;
                    RayPosFract -= Step;
                  }
                  break; //Only break switch if the level was less than the max detail. Otherwise, pretend as if the same level is kept.
                }
              }
              case 1:{ //Empty
                float HalfSize = Size / 2.;
                vec3 Hit = -Correction * (RayDirectionSign * (RayPosFract - HalfSize) - HalfSize); //Trace ray to next voxel
                Mask = vec3(lessThanEqual(Hit.xyz, min(Hit.yzx, Hit.zxy))); //Determine which side was hit
                if(Level >= 0 && VoxelState != 0) Mask1 = Mask;
                float NearestVoxelDistance = dot(Hit, Mask);
                Distance += NearestVoxelDistance;
                vec3 Step = Mask * RayDirectionSign * Size;
                
                RayPosFract += RayDirection * NearestVoxelDistance - Step;
                
                LastRayPosFloor = RayPosFloor;
                RayPosFloor += Step;
                
                while(Level < MAX_DETAIL && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.)){
                  Level++;
                  for(int i = 0; i < 3; ++i){
                    Size *= 2.;
                    vec3 NewRayPosFloor = floor(RayPosFloor/Size) * Size;
                    RayPosFract += RayPosFloor - NewRayPosFloor;
                    RayPosFloor = NewRayPosFloor;
                  }
                }
                break;
              }
              case 2: HitVoxel = true;
            }
          }
          
          
          if(Level < 0 && Mask != Mask1){  //Hit roughness side
            Mask *= 1. - max((Distance - 25.) / MAX_ROUGHNESS_DISTANCE, 0.01);
          }
          if(HitVoxel){
            switch(VoxelType){
              case 1:{
                Colour = vec4(70./256., 109./256., 53./256., 1.);//vec3(.133, .335, .898);//
                //Colour += vec4(vec3(-.5) * vec3(0.07, 0.2, 0.02), 0.);
                break;
              }
              case 2:{
                Colour = vec4(.45, .45, .45, 1.);
                break;
              }
              case 3:{
                Colour = vec4(.28, .28, .28, 1.);
                break;
              }
              case 4:{
                Colour = vec4(30./256., 153./256., 163./256., 1.);
                break;
              }
              case 6:{
                Colour = vec4(46./256., 73./256., 46./256., 1.);
                break;
              }
              case 7:{
                Colour = vec4(59./256., 38./256., 16./256., 1.);
                break;
              }
              case 8:{
                Colour = vec4(72./256., 104./256., 28./256., 1.);
                break;
              }
              case 9:{
                Colour = vec4(100./256., 71./256., 38./256., 1.);
                break;
              }
            }
            //Colour = vec4(1.);
            Colour.xyz *= 1.075 - Random(vec4(floor((RayPosFloor + RayOriginOffset) * 16.) / 16., 0.)) * .15;
            if(length(Mask) == 0.) Mask = vec3(.75);
            Colour.xyz *= length(Mask * vec3(.75, 1., .5));
            if(Mask.y != 0. && RayDirectionSign.y > 0.) Colour.xyz *= .6; //Make bottom of blocks darker
          }
          else Colour = vec4(.25, .25, .25, 0.);
          
          gl_FragDepth = EncodeLogarithmicDepth(Distance);
          
          //AO
          if(Depth == 0u){
            vec3 RayPosExact = RayPosFloor + RayOriginOffset + 1./128.;
            /*if(GetTypeDirectly(floor(vec3(RayPosExact.x - 1., RayPosExact.y + 1., RayPosExact.z)), Depth) != 0) Colour.xyz *= fract(RayPosExact).x / 2. + .5;
            if(GetTypeDirectly(floor(vec3(RayPosExact.x + 1., RayPosExact.y + 1., RayPosExact.z)), Depth) != 0) Colour.xyz *= fract(-RayPosExact).x / 2. + .5;
            if(GetTypeDirectly(floor(vec3(RayPosExact.x, RayPosExact.y + 1., RayPosExact.z - 1.)), Depth) != 0) Colour.xyz *= fract(RayPosExact).z / 2. + .5;
            if(GetTypeDirectly(floor(vec3(RayPosExact.x, RayPosExact.y + 1., RayPosExact.z + 1.)), Depth) != 0) Colour.xyz *= fract(-RayPosExact).z / 2. + .5;*/
            
            vec3 RayPosUnitFract = fract(RayPosExact);
            vec3 RayPosUnitFractSquared = RayPosUnitFract * RayPosUnitFract;
            vec3 NRayPosUnitFract = fract(-RayPosExact);
            vec3 NRayPosUnitFractSquared = NRayPosUnitFract * NRayPosUnitFract;
            vec3 Intermediate = RayPosUnitFract - .5;
            vec3 FaceSign = sign(Intermediate);
            vec3 FaceDistance = abs(Intermediate);
            //float MaxComponent = max(max(DistanceFromCenter.x, DistanceFromCenter.y), DistanceFromCenter.z);
            if(Mask1.x != 0.){
              float Contributions = 0.;
              
              if(GetTypeDirectly(floor(vec3(RayPosExact.x + FaceSign.x, RayPosExact.y, RayPosExact.z)), Depth) != 0) Contributions += 1.;
              bool N = GetTypeDirectly(floor(vec3(RayPosExact.x + FaceSign.x, RayPosExact.y + 1., RayPosExact.z + 0.)), Depth) != 0;
              bool E = GetTypeDirectly(floor(vec3(RayPosExact.x + FaceSign.x, RayPosExact.y + 0., RayPosExact.z + 1.)), Depth) != 0;
              bool S = GetTypeDirectly(floor(vec3(RayPosExact.x + FaceSign.x, RayPosExact.y - 1., RayPosExact.z + 0.)), Depth) != 0;
              bool W = GetTypeDirectly(floor(vec3(RayPosExact.x + FaceSign.x, RayPosExact.y + 0., RayPosExact.z - 1.)), Depth) != 0;
              if(N) Contributions += RayPosUnitFractSquared.y;
              if(E) Contributions += RayPosUnitFractSquared.z;
              if(S) Contributions += NRayPosUnitFractSquared.y;
              if(W) Contributions += NRayPosUnitFractSquared.z;
              if(!(N || E) && GetTypeDirectly(floor(vec3(RayPosExact.x + FaceSign.x, RayPosExact.y + 1., RayPosExact.z + 1.)), Depth) != 0) Contributions += RayPosUnitFractSquared.y * RayPosUnitFractSquared.z;
              if(!(S || E) && GetTypeDirectly(floor(vec3(RayPosExact.x + FaceSign.x, RayPosExact.y - 1., RayPosExact.z + 1.)), Depth) != 0) Contributions += NRayPosUnitFractSquared.y * RayPosUnitFractSquared.z;
              if(!(S || W) && GetTypeDirectly(floor(vec3(RayPosExact.x + FaceSign.x, RayPosExact.y - 1., RayPosExact.z - 1.)), Depth) != 0) Contributions += NRayPosUnitFractSquared.y * NRayPosUnitFractSquared.z;
              if(!(N || W) && GetTypeDirectly(floor(vec3(RayPosExact.x + FaceSign.x, RayPosExact.y + 1., RayPosExact.z - 1.)), Depth) != 0) Contributions += RayPosUnitFractSquared.y * NRayPosUnitFractSquared.z;
              
              Colour.xyz *= vec3(1. - Contributions * .25);
            }
            else if(Mask1.y != 0.){
              float Contributions = 0.;
              
              if(GetTypeDirectly(floor(vec3(RayPosExact.x, RayPosExact.y + FaceSign.y, RayPosExact.z)), Depth) != 0) Contributions += 1.;
              bool N = GetTypeDirectly(floor(vec3(RayPosExact.x + 1., RayPosExact.y + FaceSign.y, RayPosExact.z + 0.)), Depth) != 0;
              bool E = GetTypeDirectly(floor(vec3(RayPosExact.x + 0., RayPosExact.y + FaceSign.y, RayPosExact.z + 1.)), Depth) != 0;
              bool S = GetTypeDirectly(floor(vec3(RayPosExact.x - 1., RayPosExact.y + FaceSign.y, RayPosExact.z + 0.)), Depth) != 0;
              bool W = GetTypeDirectly(floor(vec3(RayPosExact.x + 0., RayPosExact.y + FaceSign.y, RayPosExact.z - 1.)), Depth) != 0;
              if(N) Contributions += RayPosUnitFractSquared.x;
              if(E) Contributions += RayPosUnitFractSquared.z;
              if(S) Contributions += NRayPosUnitFractSquared.x;
              if(W) Contributions += NRayPosUnitFractSquared.z;
              if(!(N || E) && GetTypeDirectly(floor(vec3(RayPosExact.x + 1., RayPosExact.y + FaceSign.y, RayPosExact.z + 1.)), Depth) != 0) Contributions += RayPosUnitFractSquared.x * RayPosUnitFractSquared.z;
              if(!(S || E) && GetTypeDirectly(floor(vec3(RayPosExact.x - 1., RayPosExact.y + FaceSign.y, RayPosExact.z + 1.)), Depth) != 0) Contributions += NRayPosUnitFractSquared.x * RayPosUnitFractSquared.z;
              if(!(S || W) && GetTypeDirectly(floor(vec3(RayPosExact.x - 1., RayPosExact.y + FaceSign.y, RayPosExact.z - 1.)), Depth) != 0) Contributions += NRayPosUnitFractSquared.x * NRayPosUnitFractSquared.z;
              if(!(N || W) && GetTypeDirectly(floor(vec3(RayPosExact.x + 1., RayPosExact.y + FaceSign.y, RayPosExact.z - 1.)), Depth) != 0) Contributions += RayPosUnitFractSquared.x * NRayPosUnitFractSquared.z;
              
              Colour.xyz *= vec3(1. - Contributions * .25);
            }
            else if(Mask1.z != 0.){
              float Contributions = 0.;
              
              if(GetTypeDirectly(floor(vec3(RayPosExact.x, RayPosExact.y, RayPosExact.z + FaceSign.z)), Depth) != 0) Contributions += 1.;
              bool N = GetTypeDirectly(floor(vec3(RayPosExact.x + 1., RayPosExact.y + 0., RayPosExact.z + FaceSign.z)), Depth) != 0;
              bool E = GetTypeDirectly(floor(vec3(RayPosExact.x + 0., RayPosExact.y + 1., RayPosExact.z + FaceSign.z)), Depth) != 0;
              bool S = GetTypeDirectly(floor(vec3(RayPosExact.x - 1., RayPosExact.y + 0., RayPosExact.z + FaceSign.z)), Depth) != 0;
              bool W = GetTypeDirectly(floor(vec3(RayPosExact.x + 0., RayPosExact.y - 1., RayPosExact.z + FaceSign.z)), Depth) != 0;
              if(N) Contributions += RayPosUnitFractSquared.x;
              if(E) Contributions += RayPosUnitFractSquared.y;
              if(S) Contributions += NRayPosUnitFractSquared.x;
              if(W) Contributions += NRayPosUnitFractSquared.y;
              if(!(N || E) && GetTypeDirectly(floor(vec3(RayPosExact.x + 1., RayPosExact.y + 1., RayPosExact.z + FaceSign.z)), Depth) != 0) Contributions += RayPosUnitFractSquared.x * RayPosUnitFractSquared.y;
              if(!(S || E) && GetTypeDirectly(floor(vec3(RayPosExact.x - 1., RayPosExact.y + 1., RayPosExact.z + FaceSign.z)), Depth) != 0) Contributions += NRayPosUnitFractSquared.x * RayPosUnitFractSquared.y;
              if(!(S || W) && GetTypeDirectly(floor(vec3(RayPosExact.x - 1., RayPosExact.y - 1., RayPosExact.z + FaceSign.z)), Depth) != 0) Contributions += NRayPosUnitFractSquared.x * NRayPosUnitFractSquared.y;
              if(!(N || W) && GetTypeDirectly(floor(vec3(RayPosExact.x + 1., RayPosExact.y - 1., RayPosExact.z + FaceSign.z)), Depth) != 0) Contributions += RayPosUnitFractSquared.x * NRayPosUnitFractSquared.y;
              
              Colour.xyz *= vec3(1. - Contributions * .25);
            }
          }
          vec3 ExactRayPosition = RayPosFloor + RayOriginOffset + RayPosFract;
          if(Mask1.x != 0.) ExactRayPosition.x = round(ExactRayPosition.x);
          else if(Mask1.y != 0.) ExactRayPosition.y = round(ExactRayPosition.y);
          else if(Mask1.z != 0.) ExactRayPosition.z = round(ExactRayPosition.z);
          //Colour.xyz *= .5 + .5 * clamp(1. - CalculateShadowIntensity(ExactRayPosition, iSunPosition * vec3(1., -1., 1.), Depth), 0., 1.);
          
          
          return RayTraceResult(
            Colour + vec4(s / 200., 0.),
            Distance,
            HitVoxel
          );
        }
        
        void mainImage(out vec4 fragColor, in vec2 fragCoord){
          vec2 uv = (fragCoord.xy * 2. - iResolution.xy) / iResolution.y;
          vec3 RayOrigin = iPosition;
          vec3 RayDirection = normalize(vec3(uv, 1. / tan(FOV / 2.))) * RotateX(iRotation.x) * RotateY(iRotation.y);
          
          if(iPassID == LOW_RES_PASS || iPassID == FULL_RES_INITIAL_PASS || iPassID == FULL_RES_INITIAL_BYPASS_PASS){
            vec4 Colour;
            float Distance = 0.;
            vec4 Distances = vec4(0.); //This is for the nearby distances from the scaled rendering, which will be tried out to see if one of them is closer to the hit
            
            if(iPassID == FULL_RES_INITIAL_PASS){
              ivec2 ScaledCoordinates = ivec2(fragCoord.xy / iUpscalingKernelSize * iRenderSize);
              Colour = texelFetch(iColour, ScaledCoordinates, 0).rgba; //Backup colour in case nothing is hit
              
              float Depth = DecodeLogarithmicDepth(texelFetch(iDepth, ScaledCoordinates, 0).r);//intBitsToFloat((Converted.x << 24) | (Converted.y << 16) | (Converted.z << 8) | Converted.w);
              
              vec3 NewOffset = RayOrigin + max(0., Depth * .98 - 1.) * RayDirection;
              
              Distances = vec4(
                DecodeLogarithmicDepth(texelFetch(iDepth, ivec2((fragCoord.xy / iUpscalingKernelSize + vec2(1., 0.)) * iRenderSize), 0).r),
                DecodeLogarithmicDepth(texelFetch(iDepth, ivec2((fragCoord.xy / iUpscalingKernelSize + vec2(0., 1.)) * iRenderSize), 0).r),
                DecodeLogarithmicDepth(texelFetch(iDepth, ivec2((fragCoord.xy / iUpscalingKernelSize - vec2(1., 0.)) * iRenderSize), 0).r),
                DecodeLogarithmicDepth(texelFetch(iDepth, ivec2((fragCoord.xy / iUpscalingKernelSize - vec2(0., 1.)) * iRenderSize), 0).r)
              ) * .98 - 1.;
              
              Distance = length(RayOrigin - NewOffset);
              RayOrigin = NewOffset;
            }
            vec4 FallbackColour = Colour;
            float InitialDistance = Distance;
            RayTraceResult Result = Raytrace(RayOrigin, RayDirection, Distance, 0u, Distances);
            Colour = Result.Colour;
            float FinalDistance = Result.Distance;
            bool HitVoxel = Result.HitVoxel;
            if(Colour.a == 0. || !HitVoxel){
              if(FallbackColour.a != 0. && max(max(max(Distances.x, Distances.y), Distances.z), Distances.w) < 30000.) Colour = FallbackColour;
              else discard;
            }
            fragColor = Colour;
          }
          else if(iPassID == SHADOW_PASS){
            vec2 Resolution = iResolution;
            ivec2 Coordinates = ivec2(floor(vUv * iShadowTargetSize));//ivec2(floor(vUv * iShadowTargetSize * 2. - .1));//ivec2((vUv * round(iResolution / 2.) * 2. + .1) + 1.);
            float Depth = DecodeLogarithmicDepth(texelFetch(iDepth, Coordinates, 0).r - 1. / 65536.); //FIXME: This indexes weirdly on some resolutions
            
            
            
            fragColor = vec4(CalculateShadowIntensity(RayOrigin + RayDirection * Depth, iSunPosition * vec3(1., -1., 1.), 0u, Depth));
          } else if(iPassID == FULL_RES_FINAL_PASS){
            fragColor = texture(iColour, fragCoord / iResolution);
            fragColor.xyz *= (1. - iShadowDarkness) + iShadowDarkness * (1. - texture(iShadowColour, fragCoord / iResolution).xyz);
            
            
            vec3 FogEffect = pow(vec3(2.71), vec3(-iFogFactor * DecodeLogarithmicDepth(texture(iDepth, fragCoord / iResolution).r)) * vec3(1., 2., 3.));
            fragColor.rgb = FogEffect * fragColor.rgb + (1. - FogEffect);
          }
        }
        
        void main(){
          mainImage(gl_FragColor, vUv * iResolution.xy);
        }
      `
    });

    this.Renderer.Events.AddEventListener("RenderingScaledTarget", function(){
      this.Material.uniforms.iColour.value = this.DummyColourTexture;
      this.Material.uniforms.iDepth.value = this.DummyDepthTexture;

      this.Material.uniforms.iPassID.value = Raymarcher.LOW_RES_PASS;
    }.bind(this));
    this.Renderer.Events.AddEventListener("RenderingFullSizedTarget", function(){
      this.Material.uniforms.iColour.value = this.Renderer.ScaledTarget.texture;
      this.Material.uniforms.iDepth.value = this.Renderer.ScaledTarget.depthTexture;

      if(!this.Renderer.UseScaledTarget) this.Material.uniforms.iPassID.value = Raymarcher.FULL_RES_INITIAL_BYPASS_PASS;
      else this.Material.uniforms.iPassID.value = Raymarcher.FULL_RES_INITIAL_PASS;
    }.bind(this));
    this.Renderer.Events.AddEventListener("RenderingShadowTarget", function(){
      this.Material.uniforms.iColour.value = this.Renderer.ScaledTarget.texture;
      if(this.Material.uniforms.iUpscalingKernelSize !== 1.) this.Material.uniforms.iDepth.value = this.Renderer.ScaledTarget.depthTexture;
      else this.Material.uniforms.iDepth.value = this.Renderer.FullSizedTarget.depthTexture;
      this.Material.uniforms.iShadowColour.value = null; //So a "feedback loop" doesn't form

      this.Material.uniforms.iPassID.value = Raymarcher.SHADOW_PASS;
    }.bind(this));
    this.Renderer.Events.AddEventListener("RenderingCanvas", function(){
      this.Material.uniforms.iColour.value = this.Renderer.FullSizedTarget.texture;
      this.Material.uniforms.iShadowColour.value = this.Renderer.ShadowTarget.texture;
      this.Material.uniforms.iDepth.value = this.Renderer.FullSizedTarget.depthTexture;

      this.Material.uniforms.iPassID.value = Raymarcher.FULL_RES_FINAL_PASS;
    }.bind(this));

    const Mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.Material);
    Mesh.frustumCulled = false;
    this.Scene.add(Mesh);

    Application.Main.Renderer.Events.AddEventListener("BeforeRender", this.UpdateUniforms.bind(this));

    void function AnimationFrame(){
      window.requestAnimationFrame(AnimationFrame.bind(this));

      this.Material.uniforms.iOffset64.needsUpdate = true;
      this.Tex64.needsUpdate = true;

      //TODO: This still causes small lag spikes when updating.
      //Possible fixes: spread out updates, merge nearby segments, etc
      const UpdatedData64 = [];
      for(let Depth = 0; Depth < 8; ++Depth) for(let x64 = 0; x64 < 8; x64++) for(let y64 = 0; y64 < 8; y64++) for(let z64 = 0; z64 < 8; z64++){
        const Index64 = (Depth << 9) | (x64 << 6) | (y64 << 3) | z64;
        //Add to updated list only if it's fully loaded, and it needs an update.
        if(((this.Data64[Index64] >> 19) & 7) === 7 && ((this.GPUData64[Index64] >> 14) & 1) === 1) UpdatedData64.push(Index64);
      }

      if(UpdatedData64.length === 0){
        this.Material.uniforms.iOffset64.needsUpdate = true;
        this.Tex64.needsUpdate = true;
        return; //These textures will also be updated for when there was an update a bit further down.
      }

      const UpdatedSegments = new Set;
      for(const Index64 of UpdatedData64){
        const Info64 = this.GPUData64[Index64];
        const CPUInfo64 = this.Data64[Index64];
        if((Info64 & 0x8000) !== 0){ //Is empty
          if(((this.Data64[Index64] >> 19) & 7) === 7) this.GPUData64[Index64] |= 1 << 13; //Mark as fully uploaded if it's empty and fully loaded
          continue;
        }
        const Location64 = Info64 & 0x0fff;
        const StartIndex8 = Location64 << 9;
        let MissedSegments = false;
        for(let Index8 = StartIndex8; Index8 < StartIndex8 + 512; ++Index8){
          const Info8 = this.GPUData8[Index8];
          if((Info8 & 0x80000000) !== 0 || (Info8 & 0x40000000) === 0) continue; //Is either empty or has no changes (no update)
          const SegmentColumn = (Info8 & 0x0003fe00) >> 9;
          if(UpdatedSegments.size < 6 || UpdatedSegments.has(SegmentColumn)){
            UpdatedSegments.add(SegmentColumn); //if this.UpdatedSegments.size < 6
            this.GPUData8[Index8] &= ~(1 << 30); //Set update to false
          } else MissedSegments = true;
        }

        if(!MissedSegments){
          this.GPUData64[Index64] &= ~(1 << 14); //Toggle update to false
          this.GPUData64[Index64] |= 1 << 13; //Mark as fully uploaded
          const GPULocation64 = this.GPUData64[Index64] & 0x0fff;
          //int Pos8XYZ = ((Location64 & 7) << 6) | (mRayPosFloor.x << 3) | mRayPosFloor.y;
          //return texelFetch(iTex8, ivec3(mRayPosFloor.z, Pos8XYZ, Location64 >> 3), 0).r;
          this.Renderer.Renderer.copyTextureToTexture3D(
            new THREE.Box3(new THREE.Vector3(0, (GPULocation64 & 7) << 6, GPULocation64 >> 3), new THREE.Vector3(7, ((GPULocation64 & 7) << 6) | 63, GPULocation64 >> 3)),
            new THREE.Vector3(0, (GPULocation64 & 7) << 6, GPULocation64 >> 3),
            this.Tex8,
            this.Tex8
          );
        }
        //The if is there because if the size is greater than 10, most likely only part of the Data64 has been updated (due to segment distribution)
      }

      for(const SegmentLocation of UpdatedSegments){ //This is not sending individual segments, but entire columns
        //const YOffset = (SegmentLocation & 31) << 4;
        const ZOffset = SegmentLocation;// >> 5;

        this.Renderer.Renderer.copyTextureToTexture3D(
          new THREE.Box3(new THREE.Vector3(0, 0, ZOffset), new THREE.Vector3(63, 511, ZOffset)),
          new THREE.Vector3(0, 0, ZOffset),
          this.Tex1,
          this.Tex1
        );

        this.Renderer.Renderer.copyTextureToTexture3D(
          new THREE.Box3(new THREE.Vector3(0, 0, ZOffset), new THREE.Vector3(511, 511, ZOffset)),
          new THREE.Vector3(0, 0, ZOffset),
          this.VoxelTypesTex,
          this.VoxelTypesTex
        );
      }

      this.Material.uniforms.iOffset64.needsUpdate = true;
      this.Tex64.needsUpdate = true;
      //this.Tex8.needsUpdate = true;

    }.bind(this)();
  }
  SetKernelSize(Size){
    this.Material.uniforms["iUpscalingKernelSize"].value = Size;
    this.Renderer.UpscalingKernelSize = Size;
    this.Renderer.UpdateSize();
  }
  UpdateUniforms(){
    this.Material.uniforms["iRenderSize"].value = this.Renderer.ImageScale;
    this.Material.uniforms["iResolution"].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.Material.uniforms["iTime"].value = window.performance.now();
    this.Material.uniforms["iRotation"].value = new THREE.Vector3(this.Renderer.Camera.rotation.x, this.Renderer.Camera.rotation.y, this.Renderer.Camera.rotation.z);
    this.Material.uniforms["iPosition"].value = new THREE.Vector3(this.Renderer.Camera.position.x, this.Renderer.Camera.position.y, this.Renderer.Camera.position.z);
    this.Material.uniforms["iPosition"].needsUpdate = true;
    this.Material.uniforms["FOV"].value = Number.parseFloat(this.Renderer.Camera.fov) * Math.PI / 180. / this.Renderer.Camera.zoom;
    this.Material.uniforms["iSunPosition"].value = this.Renderer.BackgroundMaterial.uniforms["iSunPosition"].value;
    this.Material.uniforms["iShadowTargetSize"].value = new THREE.Vector2(this.Renderer.ShadowTarget.width, this.Renderer.ShadowTarget.height);
  }
};