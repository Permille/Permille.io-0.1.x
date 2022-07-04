import * as THREE from "../../Libraries/Three/Three.js";
import Simplex from "../../Simplex.js";
import {Uint16BufferAttribute} from "../../Libraries/Three/Three.js";

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
    this.RaytracedPassScene = this.Renderer.RaytracedPassScene;
    this.FinalPassScene = this.Renderer.FinalPassScene;
    this.TestPassScene = this.Renderer.TestPassScene;
    this.OutputPassScene = this.Renderer.OutputPassScene;
    this.SmallTargetScene = this.Renderer.SmallTargetScene;

    this.Data1 = this.World.Data1;//new Uint16Array(64*2048*256); //64 MB
    // (it's actually supposed to be 1024*2048*64 to be full-size, but that including types would probably start wasting storage).
    // it's unlikely that the entire buffer will be used anyway, and I can always add functionality to expand it if and when required.
    this.VoxelTypes = this.World.VoxelTypes;
    this.Data8 = this.World.Data8;
    this.Data64 = this.World.Data64;

    this.GPUData1 = this.World.GPUData1;
    this.GPUData8 = this.World.GPUData8;
    this.GPUData64 = this.World.GPUData64;
    this.GPUType1 = this.World.GPUType1;
    this.GPUInfo8 = this.World.GPUInfo8;
    this.GPUInfo64 = this.World.GPUInfo64;
    this.GPUBoundingBox1 = this.World.GPUBoundingBox1;


    this.TexType1 = new THREE.DataTexture3D(this.GPUType1, 512, 512, 512);
    this.TexType1.internalFormat = "R16UI";
    this.TexType1.format = THREE.RedIntegerFormat;
    this.TexType1.type = THREE.UnsignedShortType;
    this.TexType1.minFilter = this.TexType1.magFilter = THREE.NearestFilter;
    this.TexType1.unpackAlignment = 1;
    this.TexType1.needsUpdate = true;

    this.TexInfo8 = new THREE.DataTexture3D(this.GPUInfo8, 8, 512, 512);
    this.TexInfo8.internalFormat = "R32UI";
    this.TexInfo8.format = THREE.RedIntegerFormat;
    this.TexInfo8.type = THREE.UnsignedIntType;
    this.TexInfo8.minFilter = this.TexInfo8.magFilter = THREE.NearestFilter;
    this.TexInfo8.unpackAlignment = 1;
    this.TexInfo8.needsUpdate = true;

    this.TexBoundingBox1 = new THREE.DataTexture3D(this.GPUBoundingBox1, 8, 512, 512);
    this.TexBoundingBox1.internalFormat = "R32UI";
    this.TexBoundingBox1.format = THREE.RedIntegerFormat;
    this.TexBoundingBox1.type = THREE.UnsignedIntType;
    this.TexBoundingBox1.minFilter = this.TexBoundingBox1.magFilter = THREE.NearestFilter;
    this.TexBoundingBox1.unpackAlignment = 1;
    this.TexBoundingBox1.needsUpdate = true;

    this.TexInfo64 = new THREE.DataTexture3D(this.GPUInfo64, 8, 8, 8*8);
    this.TexInfo64.internalFormat = "R32UI";
    this.TexInfo64.format = THREE.RedIntegerFormat;
    this.TexInfo64.type = THREE.UnsignedIntType;
    this.TexInfo64.minFilter = this.TexInfo64.magFilter = THREE.NearestFilter;
    this.TexInfo64.unpackAlignment = 1;
    this.TexInfo64.needsUpdate = true;


    this.TexData1 = new THREE.DataTexture3D(this.GPUData1, 64, 512, 512);
    this.TexData1.internalFormat = "R8UI";
    this.TexData1.format = THREE.RedIntegerFormat;
    this.TexData1.type = THREE.UnsignedByteType;
    this.TexData1.minFilter = this.TexData1.magFilter = THREE.NearestFilter;
    this.TexData1.unpackAlignment = 1;
    this.TexData1.needsUpdate = true;

    this.TexData8 = new THREE.DataTexture3D(this.GPUData8, 1, 512, 512);
    this.TexData8.internalFormat = "R8UI";
    this.TexData8.format = THREE.RedIntegerFormat;
    this.TexData8.type = THREE.UnsignedByteType;
    this.TexData8.minFilter = this.TexData8.magFilter = THREE.NearestFilter;
    this.TexData8.unpackAlignment = 1;
    this.TexData8.needsUpdate = true;

    this.TexData64 = new THREE.DataTexture3D(this.GPUData64, 8, 8, 8);
    this.TexData64.internalFormat = "R8UI";
    this.TexData64.format = THREE.RedIntegerFormat;
    this.TexData64.type = THREE.UnsignedByteType;
    this.TexData64.minFilter = this.TexData64.magFilter = THREE.NearestFilter;
    this.TexData64.unpackAlignment = 1;
    this.TexData64.needsUpdate = true;

    this.CloseVoxels = new Uint8Array(8 * 64 * 64);
    this.CloseVoxelsTexture = new THREE.DataTexture3D(this.CloseVoxels, 8, 64, 64);
    this.CloseVoxelsTexture.internalFormat = "R8UI";
    this.CloseVoxelsTexture.format = THREE.RedIntegerFormat;
    this.CloseVoxelsTexture.type = THREE.UnsignedByteType;
    this.CloseVoxelsTexture.minFilter = this.CloseVoxelsTexture.magFilter = THREE.NearestFilter;
    this.CloseVoxelsTexture.unpackAlignment = 1;
    this.CloseVoxelsTexture.needsUpdate = true;


    this.DummyColourTexture = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.DummyColourTexture.internalFormat = "RGBA8UI";

    this.DummyDepthTexture = new THREE.DataTexture(new Float32Array(1), 1, 1, THREE.RedFormat, THREE.FloatType);
    this.DummyDepthTexture.internalFormat = "R16UI";

    this.CloseVoxelsOffset = new THREE.Vector3(0., 0., 0.);

    this.Uniforms = {
      iResolution: {value: new THREE.Vector2(1920, 1080)},
      iTime: {value: 0},
      iMouse: {value: new THREE.Vector2(0, 0)},
      iRotation: {value: new THREE.Vector3(0, 0, 0)},
      iPosition: {value: new THREE.Vector3(0, 0, 0)},
      iScalingFactor: {value: 0},
      iTexType1: {value: this.TexType1},
      iTexInfo8: {value: this.TexInfo8},
      iTexInfo64: {value: this.TexInfo64},
      iTexData1: {value: this.TexData1},
      iTexData8: {value: this.TexData8},
      iTexData64: {value: this.TexData64},
      iTexBoundingBox1: {value: this.TexBoundingBox1},
      iOffset64: {value: this.World.Data64Offset, "type": "iv"},
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
      iFogFactor: {value: 0.00002},
      iMeshOffset: {value: new THREE.Vector3(0., 0., 0.)}
    };

    this.RaytracedMaterial = new THREE.RawShaderMaterial({
      /*"stencilWrite": true,
      "stencilRef": 255,
      "stencilFunc": THREE.GreaterEqualStencilFunc,
      "stencilFail": THREE.KeepStencilOp,
      "stencilZFail": THREE.KeepStencilOp,
      "stencilZPass": THREE.ReplaceStencilOp,*/
      "uniforms": {
        ...this.Uniforms,
        iCloseVoxelsOffset: {value: this.CloseVoxelsOffset},
        iCloseVoxelsTexture: {value: this.CloseVoxelsTexture},
        iRaytracingGridDistance: {value: 0},
        iIsRenderingSmallTarget: {value: false},
        iSmallTargetDepth: {value: null}
      },
      "vertexShader": `#version 300 es
        #define attribute in
        #define varying out
        
        precision highp float;
        precision highp int;
        
        attribute highp vec3 position;
        
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform mat4 modelMatrix;
        uniform mat3 normalMatrix;
        
        void main(){
          gl_Position = vec4(position, 1.);
        }
      `,

      "fragmentShader": `#version 300 es
        #define varying in
        
        precision highp float;
        precision highp int;
        
        layout(location = 0) out vec4 outFragColor;
        layout(location = 1) out float outHighPrecisionDepth;
        //layout(location = 2) out float outPositionData1;
        //layout(location = 3) out float outPositionData2;
        
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
        
        uniform ivec3 iCloseVoxelsOffset;
        uniform lowp usampler3D iCloseVoxelsTexture;
        
        uniform int iRaytracingGridDistance;
        uniform bool iIsRenderingSmallTarget;
        uniform sampler2D iSmallTargetDepth;
        
        
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
        
        
        const float MAX_DISTANCE = 42000.;
        const float MAX_ROUGHNESS_DISTANCE = 20.;
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
        
        uint GetInfo64(ivec3 RayPosFloor, uint Depth){
          ivec3 Position = RayPosFloor.zyx - iOffset64[Depth].zyx;
          Position.z += int(Depth) * 8; //Select correct LOD level
          return texelFetch(iTexInfo64, Position, 0).r;
        }
        int GetLocation64(ivec3 RayPosFloor, uint Depth){
          ivec3 Position = RayPosFloor.zyx - iOffset64[Depth].zyx;
          if(Position.x < 0 || Position.y < 0 || Position.z < 0 || Position.x > 7 || Position.y > 7 || Position.z > 7) return -1;
          
          uint Info64 = GetInfo64(RayPosFloor, Depth);
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
          return (Info64 >> 31) == 1u;// && ((Info64 >> 29) & 1u) != 1u;
          
          /*ivec3 Position = RayPosFloor.zyx - iOffset64[Depth].zyx;
          if(Position.x < 0 || Position.y < 0 || Position.z < 0 || Position.x > 7 || Position.y > 7 || Position.z > 7) return false;
          //return false;
          return ((texelFetch(iTexData64, ivec3(Position.y, Position.x, Depth), 0).r >> Position.z) & 1u) == 1u;*/
        }
        bool IsEmpty8(int Location64, ivec3 RayPosFloor){
          return texelFetch(iTexData8, ivec3(0), 0).r == 0u;
          /*ivec3 ModRayPosFloor = RayPosFloor & 7;
          int Pos1XY = (ModRayPosFloor.x << 3) | ModRayPosFloor.y;
          return ((texelFetch(iTexData8, ivec3(0, (Pos1XY) | ((Location64 & 7) << 6), Location64 >> 3), 0).r >> ModRayPosFloor.z) & 1u) == 1u;*/
        }
        bool IsEmpty1(int Location8, ivec3 RayPosFloor){
          //return length(vec3(RayPosFloor) - vec3(4.)) > 3.;
          ivec3 ModRayPosFloor = RayPosFloor & 7;
          int Pos1XY = (ModRayPosFloor.x << 3) | ModRayPosFloor.y;
          return ((texelFetch(iTexData1, ivec3(Pos1XY, Location8 & 511, Location8 >> 9), 0).r >> ModRayPosFloor.z) & 1u) == 1u;
        }
        
        /*struct RayTraceResult{
          vec4 Colour;
          float Distance;
          bool HitVoxel;
        };
        
        
        int GetTypeDirectly2(vec3 RayPosFloor){
          ivec3 DividedRayPosFloor = ivec3(RayPosFloor);
          uint Info64 = GetInfo64(DividedRayPosFloor >> 6, 0u);
          if(((Info64 >> 31) & 1u) == 1u) return 0; //49151
          int Location64 = int(Info64 & 0x0fffffffu);
          uint Info8 = GetInfo8(Location64, DividedRayPosFloor >> 3);
          if(((Info8 >> 31) & 1u) == 1u) return 0; //49151
          return GetType1(int(Info8 & 0x0fffffffu), DividedRayPosFloor);
        }
        vec3 PreviousRayPosDiff = vec3(0.);
        vec3 PreviousRPFF = vec3(0.);
        bvec3 TypeSides = bvec3(false);
        bool FirstIteration = true;
        bool GetRoughnessMap2(vec3 RayPosFloor, int Type, float Distance){
          float Unloading = pow(clamp((Distance - 5.) / 12., 0., 1.), 2.);
          vec3 Intermediate = fract(RayPosFloor) - .4995;
          bvec3 RayPosSides = greaterThanEqual(abs(Intermediate), vec3(7./16.));
          vec3 RayPosDiff = sign(Intermediate) * vec3(RayPosSides);
          vec3 RayPosScaled = floor(RayPosFloor * 16.) / 16.;
          
          if(all(not(RayPosSides))) return false; //In the middle
          
          vec3 RayPosFloorFloor = floor(RayPosFloor);
          
          
          //"PreviousRayPosDiff != RayPosDiff || PreviousRPFF != RayPosFloorFloor" produces the correct results,
          //but this should be faster with almost the same visual quality
          if((PreviousRayPosDiff != RayPosDiff || PreviousRPFF != RayPosFloorFloor)){
            TypeSides.x = GetTypeDirectly2(RayPosFloorFloor + vec3(RayPosDiff.x, 0., 0.)) != Type;
            TypeSides.y = GetTypeDirectly2(RayPosFloorFloor + vec3(0., RayPosDiff.y, 0.)) != Type;
            TypeSides.z = GetTypeDirectly2(RayPosFloorFloor + vec3(0., 0., RayPosDiff.z)) != Type;
            PreviousRayPosDiff = RayPosDiff;
            PreviousRPFF = RayPosFloorFloor;
          }
          FirstIteration = false;
          if(dot(vec3(RayPosSides), vec3(1.)) > 1.){
            RayPosSides = bvec3(RayPosSides.x && TypeSides.x, RayPosSides.y && TypeSides.y, RayPosSides.z && TypeSides.z);
          }
          
          if(all(not(RayPosSides))) return false; //Not visible (occluded)
          
          vec3 Depth = abs((fract(RayPosFloor) - .5)) * 16. - 7.;
          vec3 NotRayPosSides = vec3(not(RayPosSides));
          
          vec3 Correction = floor(Intermediate) / 4.; //For some reason, normally, the + side of each block is 1/4 higher...
          
          if(RayPosSides.x){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.x = RayPosFloor.x;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.x;
            if(RandomNum + Unloading < Depth.x) return true;
          }
          if(RayPosSides.y){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.y = RayPosFloor.y;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.y;
            if(RandomNum + Unloading < Depth.y) return true;
          }
          if(RayPosSides.z){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.z = RayPosFloor.z;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.z;
            if(RandomNum + Unloading < Depth.z) return true;
          }
          return false;
        }
        
        int VoxelType = 1;
        int Location8 = 0;
        int Location64 = 0;
        bool IsEmpty(vec3 RayPosFloor, int Level, uint Depth, float Distance){
          //if(Level == 0) return length(RayPosFloor) < 2700.;
          //else return false;
          bool IsEmpty = false;
          float Factor = pow(2., float(int(Depth) + 3 * Level));
          ivec3 DividedRayPosFloor = ivec3(floor(RayPosFloor)) >> (Depth + uint(3 * Level));
          switch(Level){
            case -2:{
              IsEmpty = GetRoughnessMap2(RayPosFloor, VoxelType, Distance);
              break;
            }
            case -1:{
              IsEmpty = false;
              break;
            }
            case 0:{
              IsEmpty = IsEmpty1(Location8, DividedRayPosFloor);
              if(!IsEmpty) VoxelType = GetType1(Location8, DividedRayPosFloor);
              //IsEmpty = VoxelType == 0;
              break;
            }
            case 1:{
              IsEmpty = IsEmpty8(Location64, DividedRayPosFloor);
              if(!IsEmpty) Location8 = GetLocation8(Location64, DividedRayPosFloor);
              //IsEmpty = Location8 == 0;
              break;
            }
            case 2:{
              IsEmpty = IsEmpty64(DividedRayPosFloor, Depth);
              if(!IsEmpty) Location64 = GetLocation64(DividedRayPosFloor, Depth);
              //IsEmpty = Location64 == 0;
              break;
            }
            default:{
              IsEmpty = false;//Depth == 0u ? !GetRoughnessMap(RayPosFloor, VoxelType, Level, 0.) : false;
              break;
            }
          }
          return IsEmpty;
        }
        
        float CalculateShadowIntensity(vec3 RayOrigin, vec3 RayDirection, uint Depth, float MainRayDistance){
          vec3 RayDirectionSign = sign(RayDirection);
          float Distance = 0.;
          
          VoxelType = 0;
          Location8 = 0;
          Location64 = 0;
          
          vec3 Mask = vec3(0.);
          vec3 Mask1 = vec3(0.);
          bool ExitLevel = false;
          int Level = 2;
          float Size = 64.;
          bool NotFirstSolid = false;
          
          RayOrigin += RayDirection * 0.01;
          
          vec3 RayPosFloor = floor(RayOrigin);
          vec3 RayPosFract = RayOrigin - RayPosFloor;
          vec3 LastRayPosFloor = RayPosFloor;
          vec3 Correction = 1. / max(abs(RayDirection), 1e-4);
          
          float ShadowIntensity = 0.;
          
          for(int i = 0; i < iMaxShadowSteps; ++i){
            if(Location64 == -1){
              Location64 = -2;
              Depth++;
              Size *= 2.;
              
              RayOrigin = RayPosFloor + RayPosFract;
              
              RayPosFloor = floor(RayOrigin / Size) * Size; //Voxel coordinate
              RayPosFract = RayOrigin - RayPosFloor; //Sub-voxel coordinate
            }
            if(ExitLevel){
              Level++;
              Size *= 8.;
              vec3 NewRayPosFloor = floor(RayPosFloor / Size) * Size;
              RayPosFract += RayPosFloor - NewRayPosFloor;
              RayPosFloor = NewRayPosFloor;
              ExitLevel = Level < 2 && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.);
              continue;
            }
            
            bool IsEmpty = IsEmpty(RayPosFloor, Level, Depth, Distance);
            
            if(IsEmpty || Level <= 0){
              float HalfSize = Size / 2.;
              vec3 Hit = -Correction * (RayDirectionSign * (RayPosFract - HalfSize) - HalfSize);
              Mask = vec3(lessThanEqual(Hit.xyz, min(Hit.yzx, Hit.zxy)));
              if(Level == 0) Mask1 = Mask;
              float NearestVoxelDistance = dot(Hit, Mask);
              Distance += NearestVoxelDistance;
              if(!IsEmpty){
                ShadowIntensity += NearestVoxelDistance * iShadowMultiplier / (0.0001 + pow(Distance, iShadowExponent));
                if(ShadowIntensity >= 1.) return 1.;
              }
              vec3 Step = Mask * RayDirectionSign * Size;
              
              RayPosFract += RayDirection * NearestVoxelDistance - Step;
              
              LastRayPosFloor = RayPosFloor;
              RayPosFloor += Step;
              
              ExitLevel = Level < 2 && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.);
            } else{
              if(Level > -2){
                Level--;
                for(int j = 0; j < 3; ++j){
                  Size /= 2.;
                  vec3 Step = step(vec3(Size), RayPosFract) * Size;
                  RayPosFloor += Step;
                  RayPosFract -= Step;
                }
              }
            }
          }
          return ShadowIntensity;
          
        }
        
        RayTraceResult RaytraceDetailed(vec3 RayOrigin, vec3 RayDirection, float Distance){
          vec3 RayDirectionSign = sign(RayDirection);
          float Distance1 = Distance;
          uint Depth = 0u;
          
          vec3 Mask = vec3(0.);
          vec3 Mask1 = vec3(0.);
          bool ExitLevel = false;
          int Level = 2;
          float Size = 64.;
          bool HitVoxel = false;
          
          vec3 RayPosFloor = floor(RayOrigin);
          vec3 RayPosFract = RayOrigin - RayPosFloor;
          vec3 LastRayPosFloor = RayPosFloor;
          vec3 Correction = 1. / max(abs(RayDirection), 1e-4);
          
          for(int i = 0; i < 220; ++i){
            if(Distance > 14.) return RayTraceResult(vec4(0.), Distance, false);
            if(ExitLevel){
              Level++;
              Size *= 8.;
              vec3 NewRayPosFloor = floor(RayPosFloor / Size) * Size;
              RayPosFract += RayPosFloor - NewRayPosFloor;
              RayPosFloor = NewRayPosFloor;
              ExitLevel = Level < 2 && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.);
              continue;
            }
            
            bool IsEmpty = IsEmpty(RayPosFloor, Level, Depth, Distance);
            
            if(IsEmpty){
              float HalfSize = Size / 2.;
              vec3 Hit = -Correction * (RayDirectionSign * (RayPosFract - HalfSize) - HalfSize);
              Mask = vec3(lessThanEqual(Hit.xyz, min(Hit.yzx, Hit.zxy)));
              float NearestVoxelDistance = dot(Hit, Mask);
              Distance += NearestVoxelDistance;
              if(Level == 0){
                Mask1 = Mask;
                Distance1 = Distance;
              }
              vec3 Step = Mask * RayDirectionSign * Size;
              
              RayPosFract += RayDirection * NearestVoxelDistance - Step;
              
              LastRayPosFloor = RayPosFloor;
              RayPosFloor += Step;
              
              ExitLevel = Level < 2 && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.);
            } else{
              if(Level > -2){
                Level--;
                for(int j = 0; j < 3; ++j){
                  Size /= 2.;
                  vec3 Step = step(vec3(Size), RayPosFract) * Size;
                  RayPosFloor += Step;
                  RayPosFract -= Step;
                }
              } else{
                HitVoxel = true;
                break;
              }
            }
          }
          
          float Weighting = pow(clamp(Distance / 14., 0., 1.), 1.4);
          
          vec4 Colour;
          
          switch(VoxelType){
            case 1:{
              Colour = vec4(70./256., 109./256., 53./256., 1.);
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
          Colour.xyz *= 1.075 - Random(vec4(floor((RayPosFloor) * 16.) / 16., 0.)) * .15;
          Colour.xyz *= length((Mask1 * Weighting + Mask * (1. - Weighting)) * vec3(.75, RayDirectionSign.y < 0. ? 1. : .625, .5));
          return RayTraceResult(
            vec4(Colour),
            Distance,
            HitVoxel
          );
        }
        
        
        RayTraceResult Raytrace8Fast(vec3 RayOrigin, vec3 RayDirection){
          vec3 DeltaDistance = abs(vec3(length(RayDirection)) / RayDirection);
          ivec3 RayDirectionSign = ivec3(sign(RayDirection));
          ivec3 RayPosFloor = ivec3(floor(RayOrigin));
          vec3 SideDistance = (sign(RayDirection) * (vec3(RayPosFloor) - RayOrigin) + (sign(RayDirection) * 0.5) + 0.5) * DeltaDistance;
          bvec3 Mask;
          bool HitVoxel = false;
          int VoxelType = 1;
          
          ivec3 Offset = 4 - iCloseVoxelsOffset;
          
          for(int i = 0; i < 27; ++i){
            int x8 = ((RayPosFloor.x >> 3) + Offset.x);
            int y8 = ((RayPosFloor.y >> 3) + Offset.y);
            int z8 = ((RayPosFloor.z >> 3) + Offset.z);
            
            int Index = (x8 << 12) | (y8 << 9) | (z8 << 6) | ((RayPosFloor.x & 7) << 3) | (RayPosFloor.y & 7);
            if(((texelFetch(iCloseVoxelsTexture, ivec3(Index & 7, (Index >> 3) & 63, (Index >> 9) & 63), 0).r >> (RayPosFloor.z & 7)) & 1u) == 0u){
            //if(RayPosFloor.y > 200){
              HitVoxel = x8 >= 0 && x8 < 8 && y8 >= 0 && y8 < 8 && z8 >= 0 && z8 < 8; //Only hit a voxel if it's inside the bounds
              break;
            }
            
            Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
            SideDistance += vec3(Mask) * DeltaDistance;
            RayPosFloor += ivec3(vec3(Mask)) * RayDirectionSign;
          }
          
          if(!HitVoxel) discard;
          float ExactDistance = length(vec3(Mask) * (SideDistance - DeltaDistance));
          return RayTraceResult(
            vec4(0., .5, 1., 1.),
            ExactDistance,
            HitVoxel
          );
        }*/
        
        float sdSphere(vec3 p, float d) { return length(p) - d; } 

        float sdBox( vec3 p, vec3 b )
        {
          vec3 d = abs(p) - b;
          return min(max(d.x,max(d.y,d.z)),0.0) +
                 length(max(d,0.0));
        }
        
        bool GetVoxel(ivec3 c) {
          vec3 p = vec3(c) + vec3(0.5);
          float d = min(max(-sdSphere(p, 7.5), sdBox(p, vec3(6.0))), -sdSphere(p, 25.0));
          return d < 0.0;
        }
        
        bool GetVoxel2(uvec3 c){
            return ((c.x & 3u) ^ (c.y & 3u) ^ (c.z & 3u)) == 1u;
        }
        
        int GetTypeDirectly2(ivec3 RayPosFloor){
          uint Info64 = GetInfo64(RayPosFloor >> 6, 0u);
          if(((Info64 >> 31) & 1u) == 1u) return 0; //49151
          int Location64 = int(Info64 & 0x0fffffffu);
          uint Info8 = GetInfo8(Location64, RayPosFloor >> 3);
          if(((Info8 >> 31) & 1u) == 1u) return 0; //49151
          return GetType1(int(Info8 & 0x0fffffffu), RayPosFloor);
        }
        /*vec3 PreviousRayPosDiff = vec3(0.);
        vec3 PreviousRPFF = vec3(0.);
        bvec3 TypeSides = bvec3(false);
        bool FirstIteration = true;
        bool GetRoughnessMap2_(vec3 RayPosFloor, int Type, float Distance){
          float Unloading = pow(clamp((Distance - 5.) / 12., 0., 1.), 2.);
          vec3 Intermediate = fract(RayPosFloor) - .4995;
          bvec3 RayPosSides = greaterThanEqual(abs(Intermediate), vec3(7./16.));
          vec3 RayPosDiff = sign(Intermediate) * vec3(RayPosSides);
          vec3 RayPosScaled = floor(RayPosFloor * 16.) / 16.;
          
          if(all(not(RayPosSides))) return true; //In the middle
          
          vec3 RayPosFloorFloor = floor(RayPosFloor);
          
          
          if((PreviousRayPosDiff != RayPosDiff || PreviousRPFF != RayPosFloorFloor)){
            TypeSides.x = true;//GetTypeDirectly2(RayPosFloorFloor + vec3(RayPosDiff.x, 0., 0.)) != Type;
            TypeSides.y = true;//GetTypeDirectly2(RayPosFloorFloor + vec3(0., RayPosDiff.y, 0.)) != Type;
            TypeSides.z = true;//GetTypeDirectly2(RayPosFloorFloor + vec3(0., 0., RayPosDiff.z)) != Type;
            PreviousRayPosDiff = RayPosDiff;
            PreviousRPFF = RayPosFloorFloor;
          }
          FirstIteration = true;
          if(dot(vec3(RayPosSides), vec3(1.)) > 1.){
            RayPosSides = bvec3(RayPosSides.x && TypeSides.x, RayPosSides.y && TypeSides.y, RayPosSides.z && TypeSides.z);
          }
          
          if(all(not(RayPosSides))) return true; //Not visible (occluded)
          
          vec3 Depth = abs((fract(RayPosFloor) - .5)) * 16. - 7.;
          vec3 NotRayPosSides = vec3(not(RayPosSides));
          
          vec3 Correction = floor(Intermediate) / 4.; //For some reason, normally, the + side of each block is 1/4 higher...
          
          if(RayPosSides.x){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.x = RayPosFloor.x;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.x;
            if(RandomNum + Unloading < Depth.x) return false;
          }
          if(RayPosSides.y){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.y = RayPosFloor.y;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.y;
            if(RandomNum + Unloading < Depth.y) return false;
          }
          if(RayPosSides.z){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.z = RayPosFloor.z;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.z;
            if(RandomNum + Unloading < Depth.z) return false;
          }
          return true;
        }*/
        
        /*int Random(ivec3 Input){
          //return (Input.x ^ 0x5bc26701) + (Input.y ^ 0xa6c3b17a) + (Input.z ^ 0x9c01e524);
          Input = 0x5bc26701 * ((Input >> 1) ^ (Input.zxy));
          return 0x9c01e524 * ((((Input.x >> 1) ^ Input.y) >> 1) ^ Input.z);
        }*/
        
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
        
        // For random function:
        // The MIT License
        // Copyright (c) 2017 Inigo Quilez
        // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
        
        float Random(ivec2 Input){
            Input = 1103515245 * ((Input >> 1u) ^ (Input.yx));
            uint n = 1103515245u * uint((Input.x) ^ (Input.y >> 1u));
            return float(n) * (1.0/float(0xffffffffU));
        }
        float Random(ivec3 Input){
          Input = 1103515245 * ((Input.xzy >> 1u) ^ (Input.yxz) ^ (Input.zxy >> 2u));
          uint n = 1103515245u * uint((Input.x) ^ (Input.y >> 1u) ^ (Input.z >> 2u));
          return float(n) * (1.0/float(0xffffffffU));
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
          
          //if(RayPosSides.x && Depth.x > ((hash(RayPosFloor.zy) >> 29) & 3)) return true;
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
        
        struct RaytraceResult{
          bvec3 Mask;
          bool HitVoxel;
        };
        
        RaytraceResult RaytraceSmaller(vec3 RayOrigin, vec3 RayDirection, bvec3 Mask, ivec3 Coordinate, float Distance){
          uvec3 RayDirectionSign = uvec3(ivec3(sign(RayDirection)));
          uvec3 RayPosFloor = uvec3(floor(RayOrigin));
          
          vec3 DeltaDistance = abs(1. / RayDirection);
          vec3 SideDistance = (sign(RayDirection) * (vec3(RayPosFloor) - RayOrigin) + (sign(RayDirection) * 0.5) + 0.5) * DeltaDistance;
          vec3 vMask;
          
          for(int i = 0; i < 200; ++i){
            if(any(greaterThan(RayPosFloor, uvec3(63)))) return RaytraceResult(Mask, false);
            if(GetRoughnessMap2(ivec3(RayPosFloor), 1, Distance, Coordinate)){
              return RaytraceResult(Mask, true);
            }
            Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
            vMask = vec3(Mask);
            SideDistance = (vMask * DeltaDistance) + SideDistance;
            RayPosFloor = (uvec3(vMask) * RayDirectionSign) + RayPosFloor;
          }
          return RaytraceResult(Mask, false);
        }
        
        vec4[10] Colours = vec4[10](
          vec4(1./255., 0./255., 1./255., 1.),
          vec4(70./255., 109./255., 53./255., 1.),
          vec4(.45, .45, .45, 1.),
          vec4(.28, .28, .28, 1.),
          vec4(30./255., 153./255., 163./255., 1.),
          vec4(1., 0., 0., 1.),
          vec4(46./255., 73./255., 46./255., 1.),
          vec4(59./255., 38./255., 16./255., 1.),
          vec4(72./255., 104./255., 28./255., 1.),
          vec4(100./255., 71./255., 38./255., 1.)
        );
        
        void main(){
          outFragColor = vec4(0.);
          outHighPrecisionDepth = 0.;
          //outPositionData1 = 0.;
          //outPositionData2 = 0.;
          
          vec2 uv;
          if(iIsRenderingSmallTarget){
            uv = ((gl_FragCoord.xy - 1.) * float(iRaytracingGridDistance) * 2. - iResolution.xy) / iResolution.y;
            uv.x *= -1.;
          } else{
            bool ShouldBeTraced = false;
            ivec2 SmallTextureCoordinate = ivec2(floor(gl_FragCoord.xy / vec2(iRaytracingGridDistance)) + 1.);
            for(int dx = -1; dx < 2; ++dx) for(int dy = -1; dy < 2; ++dy){
              float LocalDistance = texelFetch(iSmallTargetDepth, SmallTextureCoordinate + ivec2(dx, dy), 0).r;
              if(LocalDistance > 0.) ShouldBeTraced = true;
            }
            if(!ShouldBeTraced) discard;
            
            //Distance = max(0., Distance - 2.); //The -2 is to make sure the ray doesn't start in the middle of a voxel
            uv = (gl_FragCoord.xy * 2. - iResolution.xy) / iResolution.y;
            uv.x *= -1.;
          }
          
          vec3 RayOrigin = iPosition.xyz;
          vec3 RayDirection = (normalize(vec3(uv, 1. / tan(FOV / 2.))) * RotateX(-iRotation.x) * RotateY(iRotation.y - PI));
          RayDirection += vec3(equal(RayDirection, vec3(0.))) * 1e-3; //When RayDirection is 0 NaNs get created and the perf tanks
          
          ivec3 RayDirectionSign = ivec3(sign(RayDirection));
          ivec3 RayPosFloor = ivec3(floor(RayOrigin));
          
          vec3 DeltaDistance = abs(1. / RayDirection);
          vec3 SideDistance = (sign(RayDirection) * (vec3(RayPosFloor) - RayOrigin) + (sign(RayDirection) * 0.5) + 0.5) * DeltaDistance;
          
          bvec3 Mask = bvec3(false);
          bool HitVoxel = false;
          
          float Distance = 0.;
          vec3 ExactRayPosition;
          vec3 Mask1;
          
          if(iIsRenderingSmallTarget){
            for(int i = 0; i < 27; ++i){
              if(IsSolid(RayPosFloor)){
                HitVoxel = true;
                break;
              }
              Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
              SideDistance = vec3(Mask) * DeltaDistance + SideDistance;
              RayPosFloor = ivec3(vec3(Mask)) * RayDirectionSign + RayPosFloor;
            }
          } else{
            for(int i = 0; i < 27; ++i){
              bool IsSolid = IsSolid(RayPosFloor);
              if(IsSolid){
                Distance = length(vec3(Mask) * (SideDistance - DeltaDistance));
                if(Distance > 14.) break;
                ExactRayPosition = RayOrigin + RayDirection * Distance;
                ExactRayPosition += vec3(Mask) * vec3(RayDirectionSign) * 1e-4;
                RaytraceResult Result = RaytraceSmaller(mod(ExactRayPosition * 64., 64.), RayDirection, Mask, RayPosFloor, Distance);
                
                HitVoxel = Result.HitVoxel;
                if(HitVoxel){
                  Mask = Result.Mask;
                  break;
                }
              }
              Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
              SideDistance = vec3(Mask) * DeltaDistance + SideDistance;
              RayPosFloor = ivec3(vec3(Mask)) * RayDirectionSign + RayPosFloor;
              if(!IsSolid) Mask1 = vec3(Mask);
            }
          }
          
          if(HitVoxel){
            if(iIsRenderingSmallTarget){
              outFragColor = vec4(1.);
              outHighPrecisionDepth = 2.;
              gl_FragDepth = 0.;
            } else{
              float Weighting = pow(clamp(Distance / 14., 0., 1.), 1.4);
              int Type = GetTypeDirectly2(RayPosFloor);
              vec4 Colour = Colours[Type];
              Colour.xyz *= 1.075 - Random(ivec3(floor(ExactRayPosition * 16.))) * .15;
              Colour.xyz *= length((vec3(Mask1) * Weighting + vec3(Mask) * (1. - Weighting)) * vec3(.75, RayDirectionSign.y < 0 ? 1. : .625, .5));
              
              vec3 FractRayPos = fract(ExactRayPosition);
              vec3 FractRayPosSquared = FractRayPos * FractRayPos;
              vec3 NFractRayPos = fract(-ExactRayPosition);
              vec3 NFractRayPosSquared = NFractRayPos * NFractRayPos;
              ivec3 FaceSign = ivec3(sign(FractRayPos - .5));
              
              if(Mask1.x != 0.){
                ivec3 RayPosShifted = ivec3(RayPosFloor.x + FaceSign.x, RayPosFloor.yz);
                float Contributions = float(IsSolid(RayPosShifted));
                
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
                
                Colour.xyz *= vec3(1. - Contributions * .25);
              }
              else if(Mask1.y != 0.){
                ivec3 RayPosShifted = ivec3(RayPosFloor.x, RayPosFloor.y + FaceSign.y, RayPosFloor.z);
                float Contributions = float(IsSolid(RayPosShifted));
                
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
                Colour.xyz *= vec3(1. - Contributions * .25);
              }
              else if(Mask1.z != 0.){
                ivec3 RayPosShifted = ivec3(RayPosFloor.xy, RayPosFloor.z + FaceSign.z);
                float Contributions = float(IsSolid(RayPosShifted));
                
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
                
                Colour.xyz *= vec3(1. - Contributions * .25);
              }
              
              
              outFragColor = Colour;
              outHighPrecisionDepth = 2.;
              gl_FragDepth = 0.;
              
              //ivec3 ExactFractPosition = ivec3(fract(Result.ExactPosition) * 256.);
              //outPositionData1 = 0.;
              //outPositionData2 = 0.;
              //  (vCoordinate64 << 23) | (vCoordinate8 << 14) | (int(vDepth) << 11) | ((Result.Mask.x ? 0 : Result.Mask.y ? 1 : 2) << 9) | int((Result.RayPosFloor.x << 6) | (Result.RayPosFloor.y << 3) | Result.RayPosFloor.z),
              //  (0 << 30) | (((vCoordinate64 >> 9) & 63) << 24) | (ExactFractPosition.x << 16) | (ExactFractPosition.y << 8) | ExactFractPosition.z
              //);
            }
          } else{
            discard;
          }
        }
        
        /*void main_(){
          outFragColor = vec4(0.);
          outHighPrecisionDepth = 0.;
          
          float Distance = 0.;
          
          vec2 uv;
          if(!iIsRenderingSmallTarget){
            bool ShouldBeTraced = false;
            ivec2 SmallTextureCoordinate = ivec2(floor(gl_FragCoord.xy / vec2(iRaytracingGridDistance)) + 1.);
            for(int dx = -1; dx < 2; ++dx) for(int dy = -1; dy < 2; ++dy){
              float LocalDistance = texelFetch(iSmallTargetDepth, SmallTextureCoordinate + ivec2(dx, dy), 0).r;
              if(LocalDistance > 0.) ShouldBeTraced = true;
            }
            if(!ShouldBeTraced) discard;
            //Distance = max(0., Distance - 2.); //The -2 is to make sure the ray doesn't start in the middle of a voxel
            uv = (gl_FragCoord.xy * 2. - iResolution.xy) / iResolution.y;
            uv.x *= -1.;
          } else{
            uv = ((gl_FragCoord.xy - 1.) * float(iRaytracingGridDistance) * 2. - iResolution.xy) / iResolution.y;
            uv.x *= -1.;
          }
            
          vec3 RayOrigin = iPosition.xyz;
          vec3 RayDirection = (normalize(vec3(uv, 1. / tan(FOV / 2.))) * RotateX(-iRotation.x) * RotateY(iRotation.y - PI));
          
          
          RayTraceResult Result = Raytrace8Fast(RayOrigin + Distance * RayDirection, RayDirection);
          if(!Result.HitVoxel) discard;
          if(!iIsRenderingSmallTarget){
            Result = RaytraceDetailed(RayOrigin + (Result.Distance - .01) * RayDirection, RayDirection, Result.Distance);
          }
          
          if(Result.HitVoxel){
            outFragColor = Result.Colour;
            outHighPrecisionDepth = Result.Distance;
            gl_FragDepth = 0.;
          }
          else{
            outFragColor = vec4(0.);
            outHighPrecisionDepth = 0.;
            gl_FragDepth = 1.;//clamp(0., 1., (Result.Distance - 1.) / (512. - 1.));
          }
        }*/
      `
    });

    this.TestMaterial = new THREE.RawShaderMaterial({
      "colorWrite": false,
      "uniforms": {
        "iCopy": {"value": this.Renderer.IntermediateTarget.texture}
      },
      "vertexShader": `#version 300 es
        precision highp float;
        precision highp int;
        
        in highp vec3 position;
        
        void main(){
          gl_Position = vec4(position, 1.);
        }
      `,

      "fragmentShader": `#version 300 es
        precision highp float;
        precision highp int;
        
        uniform highp usampler2D iCopy;
        
        //layout(location = 0) out vec4 outFragColor;
        //layout(location = 1) out float outHighPrecisionDepth;
        
        void main(){
          //outFragColor = vec4(0., 1., 0., 1.);
          //outHighPrecisionDepth = 0.;
          gl_FragDepth = texelFetch(iCopy, ivec2(gl_FragCoord.xy), 0).r == 0u ? 1. : 0.;
        }
      `
    });

    this.Material = new THREE.RawShaderMaterial({
      /*"stencilWrite": true,
      //"stencilFuncMask": 0,
      "stencilRef": 253,
      "stencilFunc": THREE.GreaterEqualStencilFunc,
      "stencilFail": THREE.KeepStencilOp,
      "stencilZFail": THREE.KeepStencilOp,
      "stencilZPass": THREE.ReplaceStencilOp,*/
      "uniforms": {
        ...this.Uniforms
      },/*
      "transparent": false,
      "blending": THREE.NormalBlending,
      "alphaTest": 1.,
      "depthTest": true,
      "depthWrite": true,
      */
      "vertexShader": `#version 300 es
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
          return (Info64 >> 31) == 1u;// && ((Info64 >> 29) & 1u) != 1u;
          
          /*ivec3 Position = RayPosFloor.zyx - iOffset64[Depth].zyx;
          if(Position.x < 0 || Position.y < 0 || Position.z < 0 || Position.x > 7 || Position.y > 7 || Position.z > 7) return false;
          //return false;
          return ((texelFetch(iTexData64, ivec3(Position.y, Position.x, Depth), 0).r >> Position.z) & 1u) == 1u;*/
        }
        bool IsEmpty8(int Location64, ivec3 RayPosFloor){
          return texelFetch(iTexData8, ivec3(0), 0).r == 0u;
          /*ivec3 ModRayPosFloor = RayPosFloor & 7;
          int Pos1XY = (ModRayPosFloor.x << 3) | ModRayPosFloor.y;
          return ((texelFetch(iTexData8, ivec3(0, (Pos1XY) | ((Location64 & 7) << 6), Location64 >> 3), 0).r >> ModRayPosFloor.z) & 1u) == 1u;*/
        }
        bool IsEmpty1(int Location8, ivec3 RayPosFloor){
          //return length(vec3(RayPosFloor) - vec3(4.)) > 3.;
          ivec3 ModRayPosFloor = RayPosFloor & 7;
          int Pos1XY = (ModRayPosFloor.x << 3) | ModRayPosFloor.y;
          return ((texelFetch(iTexData1, ivec3(Pos1XY, Location8 & 511, Location8 >> 9), 0).r >> ModRayPosFloor.z) & 1u) == 1u;
        }
        
        void main(){
          vModelOffset = modelMatrix[3].xyz;
          vModelScale = vec3(modelMatrix[0][0], modelMatrix[1][1], modelMatrix[2][2]);
          uint Depth = uint(int(log2(vModelScale.x) + 0.));
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
          
          //uvec3 MinBound = uvec3((vBound >> 15u) & 7u, (vBound >> 12u) & 7u, (vBound >> 9u) & 7u);
          //uvec3 MaxBound = uvec3((vBound >> 6u) & 7u, (vBound >> 3u) & 7u, vBound & 7u);
          //vBoundSize = MaxBound - MinBound;
          //vMinBound = MinBound;
          
          
          
          /*for(int i = 0; i < 4; ++i) for(int j = 0; j < 4; ++j){
            //I have to write to a separate variable to avoid a compiler warning
            uint Data = 0u;
            for(int k = 0; k < 4; ++k){
              Data |= (texelFetch(iTexData1, ivec3((i << 4) | (j << 2) | k, Location8 & 511, Location8 >> 9), 0).r) << (k * 8);
            }
            vData8[i][j] = Data;
          }*/
        }
      `,

      "fragmentShader": `#version 300 es
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
        
        float Random(vec4 v){
          return fract(1223.34 * sin(dot(v,vec4(18.111, 13.252, 17.129, 18.842))));
        }
        float Random(vec3 v){
          //return sin(iTime / 2000.) / 2. + .5;
          return fract(1223.34 * sin(dot(v,vec3(18.111, 13.252, 17.129))));
        }
        
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
          return (Info64 >> 31) == 1u;// && ((Info64 >> 29) & 1u) != 1u;
          
          /*ivec3 Position = RayPosFloor.zyx - iOffset64[Depth].zyx;
          if(Position.x < 0 || Position.y < 0 || Position.z < 0 || Position.x > 7 || Position.y > 7 || Position.z > 7) return false;
          //return false;
          return ((texelFetch(iTexData64, ivec3(Position.y, Position.x, Depth), 0).r >> Position.z) & 1u) == 1u;*/
        }
        bool IsEmpty8(int Location64, ivec3 RayPosFloor){
          return texelFetch(iTexData8, ivec3(0), 0).r == 0u;
          /*ivec3 ModRayPosFloor = RayPosFloor & 7;
          int Pos1XY = (ModRayPosFloor.x << 3) | ModRayPosFloor.y;
          return ((texelFetch(iTexData8, ivec3(0, (Pos1XY) | ((Location64 & 7) << 6), Location64 >> 3), 0).r >> ModRayPosFloor.z) & 1u) == 1u;*/
        }
        bool IsEmpty1_(int Location8, ivec3 RayPosFloor){
          //return length(vec3(RayPosFloor) - vec3(4.)) > 3.;
          //ivec3 ModRayPosFloor = RayPosFloor & 7;
          int Pos1XY = (RayPosFloor.x << 3) | RayPosFloor.y;
          return ((texelFetch(iTexData1, ivec3(Pos1XY, Location8 & 511, Location8 >> 9), 0).r >> RayPosFloor.z) & 1u) == 1u;
        }
        ivec3 SampleLocation = ivec3(0);
        bool IsEmpty1(inout uvec3 RayPosFloor){
          //return length(vec3(RayPosFloor) - vec3(4.)) > 3.;
          //ivec3 ModRayPosFloor = RayPosFloor & 7;
          SampleLocation.x = int((RayPosFloor.x << 3) | RayPosFloor.y);
          //return (texelFetch(iTexData1, SampleLocation, 0).r << (31u - RayPosFloor.z)) > 2147483647u;
          return ((texelFetch(iTexData1, SampleLocation, 0).r >> RayPosFloor.z) & 1u) == 1u;
        }
        
        int GetTypeDirectly2(ivec3 RayPosFloor, uint Depth){
          uint Info64 = GetInfo64(RayPosFloor >> 6, Depth);
          if(Info64 == 0xffffffffu || ((Info64 >> 31) & 1u) == 1u) return 0; //49151
          int Location64 = int(Info64 & 0x0fffffffu);
          uint Info8 = GetInfo8(Location64, RayPosFloor >> 3);
          if(((Info8 >> 31) & 1u) == 1u) return 0; //49151
          return GetType1(int(Info8 & 0x0fffffffu), RayPosFloor);
        }
        
        struct RayTraceResult{
          bvec3 Mask;
          uvec3 RayPosFloor;
          vec3 ExactPosition;
        };
        
        //uvec4[4] Data = uvec4[4](uvec4(0x00000000, 0x00000000, 0x00000000, 0x00000000), uvec4(0x00003c3c, 0x3c3c0000, 0x00003c3c, 0x3c3c0000), uvec4(0x00003c3c, 0x3c3c0000, 0x00003c3c, 0x3c3c0000), uvec4(0x00000000, 0x00000000, 0x00000000, 0x00000000));
        
        /*vec4[10] Colours = vec4[10](
          vec4(1./255., 0./255., 1./255., 1.),
          vec4(70./255., 109./255., 53./255., 1.),
          vec4(.45, .45, .45, 1.),
          vec4(.28, .28, .28, 1.),
          vec4(30./255., 153./255., 163./255., 1.),
          vec4(1., 0., 0., 1.),
          vec4(46./255., 73./255., 46./255., 1.),
          vec4(59./255., 38./255., 16./255., 1.),
          vec4(72./255., 104./255., 28./255., 1.),
          vec4(100./255., 71./255., 38./255., 1.)
        );*/
        
        RayTraceResult Raytrace8(inout vec3 TrueRayOrigin, inout vec3 RayDirection){
          vec3 RayOrigin = mod(TrueRayOrigin, 8.);
          vec3 RayOriginOffset = TrueRayOrigin - RayOrigin;
          
          vec3 DeltaDistance = abs(1. / RayDirection);
          uvec3 RayDirectionSign = uvec3(sign(RayDirection));
          uvec3 RayPosFloor = uvec3(floor(RayOrigin));
          vec3 SideDistance = (sign(RayDirection) * (vec3(RayPosFloor) - RayOrigin) + (sign(RayDirection) * 0.5) + 0.5) * DeltaDistance;
          bvec3 Mask;
          bool HitVoxel = false;
          
          uvec3 MinBound = uvec3((vBound >> 15u) & 7u, (vBound >> 12u) & 7u, (vBound >> 9u) & 7u);
          uvec3 MaxBound = uvec3((vBound >> 6u) & 7u, (vBound >> 3u) & 7u, vBound & 7u);
          uvec3 BoundSize = MaxBound - MinBound;
          for(int i = 0; i < 25; ++i){
            if(any(greaterThan(RayPosFloor - MinBound, BoundSize))) discard;
            //if(any(greaterThan(RayPosFloor, vBoundSize))) discard;
            //if(((floatBitsToUint(vData8[RayPosFloor.x >> 1][((RayPosFloor.x & 1) << 1) | (RayPosFloor.y >> 2)]) >> (((RayPosFloor.y & 3) << 3) | RayPosFloor.z)) & 1u) == 1u){
            //if(((vData8[RayPosFloor.x >> 1][((RayPosFloor.x & 1) << 1) | (RayPosFloor.y >> 2)] >> (((RayPosFloor.y & 3) << 3) | RayPosFloor.z)) & 1u) != 1u){
            if(!IsEmpty1(RayPosFloor)){
              HitVoxel = true;
              break;
            }
            Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
            SideDistance = vec3(Mask) * DeltaDistance + SideDistance;
            RayPosFloor = uvec3(ivec3(Mask)) * RayDirectionSign + RayPosFloor;
          }
          
          if(!HitVoxel) discard;
          vec3 ExactPosition = RayDirection * length(vec3(Mask) * (SideDistance - DeltaDistance)) + TrueRayOrigin;
          //float ExactDistance = length(-(ExactPosition * vModelScale) + (iPosition - vModelOffset));
          
          //if(abs(ExactDistance) < 11.) discard;
          if(!any(Mask)){
            switch(abs(vSide)){
              case 1: Mask.x = true; break;
              case 2: Mask.y = true; break;
              case 3: Mask.z = true; break;
            }
          }
          
          //int VoxelType = GetType1(vLocation8, ivec3(RayPosFloor));
          //vec4 Colour = Colours[VoxelType];
          //
          //Colour.xyz *= 1.075 - Random(vec4(floor((ExactPosition + RayOriginOffset) * 16.) / 16., 0.)) * .15;
          //vec3 Temp = vec3(Mask) * vec3(.75, int(RayDirectionSign.y) < 0 ? 1. : .625, .5);
          //Colour.xyz *= Temp.x + Temp.y + Temp.z;
          
          return RayTraceResult(
            Mask,
            RayPosFloor,
            ExactPosition
          );
        }
        
        void main(){
          if(vShouldBeDiscarded == 1) discard;
          
          SampleLocation = vSampleLocation;
          
          vec3 RayOrigin = vmvPosition;
          vec3 RayDirection = normalize(RayOrigin - (iPosition - vModelOffset) / vModelScale);
          
          
          
          //float Distance = length(iPosition - vmvPosition - vModelOffset);
          
          
          RayTraceResult Result = Raytrace8(RayOrigin, RayDirection);
          
          ivec3 ExactFractPosition = ivec3(fract(Result.ExactPosition) * 256.);
          
          ExactFractPosition *= ivec3(not(Result.Mask)); //Set the mask index to zero to avoid wrong rounding between the values 0 and 255
          if(dot(sign(RayDirection * vec3(Result.Mask)), vec3(1.)) < 0.) ExactFractPosition += 255 * ivec3(Result.Mask); //Set it to 255 if it's the negative side
          
          outPositionData = uvec2(
            (vCoordinate64 << 23) | (vCoordinate8 << 14) | (int(vDepth) << 11) | ((Result.Mask.x ? 1 : Result.Mask.y ? 2 : 3) << 9) | int((Result.RayPosFloor.x << 6) | (Result.RayPosFloor.y << 3) | Result.RayPosFloor.z),
            (1 << 30) | (((vCoordinate64 >> 9) & 63) << 24) | (ExactFractPosition.x << 16) | (ExactFractPosition.y << 8) | ExactFractPosition.z
          );
        }
      `
    });

    this.FinalPassMaterial = new THREE.ShaderMaterial({
      "uniforms": {
        ...this.Uniforms,
        iIntermediatePassData: {value: this.Renderer.IntermediateTarget.texture},
        iSmallTargetData: {value: this.Renderer.SmallRaytracingTarget.texture},
        iCloseVoxelsOffset: {value: this.CloseVoxelsOffset},
        iCloseVoxelsTexture: {value: this.CloseVoxelsTexture},
        iRenderAmbientOcclusion: {value: true},
        iRenderShadows: {value: true},
        iRaytracingGridDistance: {value: 1}
      },
      "transparent": false,
      "blending": THREE.NormalBlending,
      "alphaTest": 1.,
      "depthTest": false,
      "depthWrite": false,
      "vertexShader": `
        varying vec2 vUv;
        
        void main(){
          vUv = uv;
          gl_Position = vec4(position, 1.);
        }
      `,
      "fragmentShader": `
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
        
        
        const float MAX_DISTANCE = 42000.;
        const float MAX_ROUGHNESS_DISTANCE = 20.;
        const int MAX_DETAIL = 2;
        const int MIN_DETAIL = -2;
        
        struct RayTraceResult{
          vec4 Colour;
          float Distance;
          float Distance1;
          bool HitVoxel;
        };
        
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
          return (Info64 >> 31) == 1u;// && ((Info64 >> 29) & 1u) != 1u;
          
          /*ivec3 Position = RayPosFloor.zyx - iOffset64[Depth].zyx;
          if(Position.x < 0 || Position.y < 0 || Position.z < 0 || Position.x > 7 || Position.y > 7 || Position.z > 7) return false;
          //return false;
          return ((texelFetch(iTexData64, ivec3(Position.y, Position.x, Depth), 0).r >> Position.z) & 1u) == 1u;*/
        }
        bool IsEmpty8(int Location64, ivec3 RayPosFloor){
          return texelFetch(iTexData8, ivec3(0), 0).r == 0u;
          /*ivec3 ModRayPosFloor = RayPosFloor & 7;
          int Pos1XY = (ModRayPosFloor.x << 3) | ModRayPosFloor.y;
          return ((texelFetch(iTexData8, ivec3(0, (Pos1XY) | ((Location64 & 7) << 6), Location64 >> 3), 0).r >> ModRayPosFloor.z) & 1u) == 1u;*/
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
        /*vec3 PreviousRayPosDiff = vec3(0.);
        vec3 PreviousRPFF = vec3(0.);
        bvec3 TypeSides = bvec3(false);
        bool FirstIteration = true;
        bool GetRoughnessMap2(vec3 RayPosFloor, int Type, float Distance){
          float Unloading = pow(clamp((Distance - 5.) / 12., 0., 1.), 2.);
          vec3 Intermediate = fract(RayPosFloor) - .4995;
          bvec3 RayPosSides = greaterThanEqual(abs(Intermediate), vec3(7./16.));
          vec3 RayPosDiff = sign(Intermediate) * vec3(RayPosSides);
          vec3 RayPosScaled = floor(RayPosFloor * 16.) / 16.;
          
          if(all(not(RayPosSides))) return false; //In the middle
          
          vec3 RayPosFloorFloor = floor(RayPosFloor);
          
          
          //"PreviousRayPosDiff != RayPosDiff || PreviousRPFF != RayPosFloorFloor" produces the correct results,
          //but this should be faster with almost the same visual quality
          if(FirstIteration || Distance < 7. && (PreviousRayPosDiff != RayPosDiff || PreviousRPFF != RayPosFloorFloor)){
            TypeSides.x = GetTypeDirectly2(RayPosFloorFloor + vec3(RayPosDiff.x, 0., 0.)) != Type;
            TypeSides.y = GetTypeDirectly2(RayPosFloorFloor + vec3(0., RayPosDiff.y, 0.)) != Type;
            TypeSides.z = GetTypeDirectly2(RayPosFloorFloor + vec3(0., 0., RayPosDiff.z)) != Type;
            PreviousRayPosDiff = RayPosDiff;
            PreviousRPFF = RayPosFloorFloor;
          }
          FirstIteration = false;
          if(dot(vec3(RayPosSides), vec3(1.)) > 1.){
            RayPosSides = bvec3(RayPosSides.x && TypeSides.x, RayPosSides.y && TypeSides.y, RayPosSides.z && TypeSides.z);
          }
          
          if(all(not(RayPosSides))) return false; //Not visible (occluded)
          
          vec3 Depth = abs((fract(RayPosFloor) - .5)) * 16. - 7.;
          vec3 NotRayPosSides = vec3(not(RayPosSides));
          
          vec3 Correction = floor(Intermediate) / 4.; //For some reason, normally, the + side of each block is 1/4 higher...
          
          if(RayPosSides.x){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.x = RayPosFloor.x;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.x;
            if(RandomNum + Unloading < Depth.x) return true;
          }
          if(RayPosSides.y){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.y = RayPosFloor.y;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.y;
            if(RandomNum + Unloading < Depth.y) return true;
          }
          if(RayPosSides.z){
            vec3 RayPosModified = RayPosScaled;
            RayPosModified.z = RayPosFloor.z;
            float RandomNum = Random(RayPosModified * NotRayPosSides) - Correction.z;
            if(RandomNum + Unloading < Depth.z) return true;
          }
          return false;
        }
        
        int VoxelType = 1;
        int Location8 = 0;
        int Location64 = 0;
        bool IsEmpty(vec3 RayPosFloor, int Level, uint Depth, float Distance){
          //if(Level == 0) return length(RayPosFloor) < 2700.;
          //else return false;
          bool IsEmpty = false;
          float Factor = pow(2., float(int(Depth) + 3 * Level));
          ivec3 DividedRayPosFloor = ivec3(floor(RayPosFloor)) >> (Depth + uint(3 * Level));
          switch(Level){
            case -2:{
              IsEmpty = GetRoughnessMap2(RayPosFloor, VoxelType, Distance);
              break;
            }
            case -1:{
              IsEmpty = false;
              break;
            }
            case 0:{
              IsEmpty = IsEmpty1(Location8, DividedRayPosFloor);
              if(!IsEmpty) VoxelType = GetType1(Location8, DividedRayPosFloor);
              //IsEmpty = VoxelType == 0;
              break;
            }
            case 1:{
              IsEmpty = IsEmpty8(Location64, DividedRayPosFloor);
              if(!IsEmpty) Location8 = GetLocation8(Location64, DividedRayPosFloor);
              //IsEmpty = Location8 == 0;
              break;
            }
            case 2:{
              IsEmpty = IsEmpty64(DividedRayPosFloor, Depth);
              if(!IsEmpty) Location64 = GetLocation64(DividedRayPosFloor, Depth);
              //IsEmpty = Location64 == 0;
              break;
            }
            default:{
              IsEmpty = false;//Depth == 0u ? !GetRoughnessMap(RayPosFloor, VoxelType, Level, 0.) : false;
              break;
            }
          }
          return IsEmpty;
        }
        
        float CalculateShadowIntensity(vec3 RayOrigin, vec3 RayDirection, uint Depth, float MainRayDistance){
          vec3 RayDirectionSign = sign(RayDirection);
          float Distance = 0.;
          
          VoxelType = 0;
          Location8 = 0;
          Location64 = 0;
          
          vec3 Mask = vec3(0.);
          vec3 Mask1 = vec3(0.);
          bool ExitLevel = false;
          int Level = 2;
          float Size = 64.;
          bool NotFirstSolid = false;
          
          RayOrigin += RayDirection * 0.01;
          
          vec3 RayPosFloor = floor(RayOrigin);
          vec3 RayPosFract = RayOrigin - RayPosFloor;
          vec3 LastRayPosFloor = RayPosFloor;
          vec3 Correction = 1. / max(abs(RayDirection), 1e-4);
          
          float ShadowIntensity = 0.;
          
          for(int i = 0; i < iMaxShadowSteps; ++i){
            if(Location64 == -1){
              Location64 = -2;
              Depth++;
              Size *= 2.;
              
              RayOrigin = RayPosFloor + RayPosFract;
              
              RayPosFloor = floor(RayOrigin / Size) * Size; //Voxel coordinate
              RayPosFract = RayOrigin - RayPosFloor; //Sub-voxel coordinate
            }
            if(ExitLevel){
              Level++;
              Size *= 8.;
              vec3 NewRayPosFloor = floor(RayPosFloor / Size) * Size;
              RayPosFract += RayPosFloor - NewRayPosFloor;
              RayPosFloor = NewRayPosFloor;
              ExitLevel = Level < 2 && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.);
              continue;
            }
            
            bool IsEmpty = IsEmpty(RayPosFloor, Level, Depth, Distance);
            
            if(IsEmpty || Level <= 0){
              float HalfSize = Size / 2.;
              vec3 Hit = -Correction * (RayDirectionSign * (RayPosFract - HalfSize) - HalfSize);
              Mask = vec3(lessThanEqual(Hit.xyz, min(Hit.yzx, Hit.zxy)));
              if(Level == 0) Mask1 = Mask;
              float NearestVoxelDistance = dot(Hit, Mask);
              Distance += NearestVoxelDistance;
              if(!IsEmpty){
                ShadowIntensity += NearestVoxelDistance * iShadowMultiplier / (0.0001 + pow(Distance, iShadowExponent));
                if(ShadowIntensity >= 1.) return 1.;
              }
              vec3 Step = Mask * RayDirectionSign * Size;
              
              RayPosFract += RayDirection * NearestVoxelDistance - Step;
              
              LastRayPosFloor = RayPosFloor;
              RayPosFloor += Step;
              
              ExitLevel = Level < 2 && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.);
            } else{
              if(Level > -2){
                Level--;
                for(int j = 0; j < 3; ++j){
                  Size /= 2.;
                  vec3 Step = step(vec3(Size), RayPosFract) * Size;
                  RayPosFloor += Step;
                  RayPosFract -= Step;
                }
              }
            }
          }
          return ShadowIntensity;
          
        }
        
        RayTraceResult RaytraceDetailed(vec3 RayOrigin, vec3 RayDirection){
          vec3 RayDirectionSign = sign(RayDirection);
          float Distance = 0.;
          float Distance1 = 0.;
          uint Depth = 0u;
          
          vec3 Mask = vec3(0.);
          vec3 Mask1 = vec3(0.);
          bool ExitLevel = false;
          int Level = 2;
          float Size = 64.;
          bool HitVoxel = false;
          
          vec3 RayPosFloor = floor(RayOrigin);
          vec3 RayPosFract = RayOrigin - RayPosFloor;
          vec3 LastRayPosFloor = RayPosFloor;
          vec3 Correction = 1. / max(abs(RayDirection), 1e-4);
          
          for(int i = 0; i < 220; ++i){
            if(Distance > 14.) return RayTraceResult(vec4(0.), Distance, Distance, false);
            if(ExitLevel){
              Level++;
              Size *= 8.;
              vec3 NewRayPosFloor = floor(RayPosFloor / Size) * Size;
              RayPosFract += RayPosFloor - NewRayPosFloor;
              RayPosFloor = NewRayPosFloor;
              ExitLevel = Level < 2 && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.);
              continue;
            }
            
            bool IsEmpty = IsEmpty(RayPosFloor, Level, Depth, Distance);
            
            if(IsEmpty){
              float HalfSize = Size / 2.;
              vec3 Hit = -Correction * (RayDirectionSign * (RayPosFract - HalfSize) - HalfSize);
              Mask = vec3(lessThanEqual(Hit.xyz, min(Hit.yzx, Hit.zxy)));
              float NearestVoxelDistance = dot(Hit, Mask);
              Distance += NearestVoxelDistance;
              if(Level == 0){
                Mask1 = Mask;
                Distance1 = Distance;
              }
              vec3 Step = Mask * RayDirectionSign * Size;
              
              RayPosFract += RayDirection * NearestVoxelDistance - Step;
              
              LastRayPosFloor = RayPosFloor;
              RayPosFloor += Step;
              
              ExitLevel = Level < 2 && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.);
            } else{
              if(Level > -2){
                Level--;
                for(int j = 0; j < 3; ++j){
                  Size /= 2.;
                  vec3 Step = step(vec3(Size), RayPosFract) * Size;
                  RayPosFloor += Step;
                  RayPosFract -= Step;
                }
              } else{
                HitVoxel = true;
                break;
              }
            }
          }
          
          float Weighting = pow(clamp(Distance / 14., 0., 1.), 1.4);
          
          vec4 Colour;
          
          switch(VoxelType){
            case 1:{
              Colour = vec4(70./256., 109./256., 53./256., 1.);
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
          Colour.xyz *= 1.075 - Random(vec4(floor((RayPosFloor) * 16.) / 16., 0.)) * .15;
          Colour.xyz *= length((Mask1 * Weighting + Mask * (1. - Weighting)) * vec3(.75, RayDirectionSign.y < 0. ? 1. : .625, .5));
          return RayTraceResult(
            vec4(Colour),
            Distance,
            Distance1,
            HitVoxel
          );
        }*/
        
        /*void mainImage(out vec4 fragColor, in vec2 fragCoord){
          vec2 uv = (fragCoord.xy * 2. - iResolution.xy) / iResolution.y;
          uv.x *= -1.;
          vec3 RayOrigin = vec3(iPosition.x, iPosition.y, iPosition.z);
          vec3 RayDirection = (normalize(vec3(uv, 1. / tan(FOV / 2.))) * RotateX(-iRotation.x) * RotateY(iRotation.y - PI));
          
          fragColor = texelFetch(iIntermediatePassColour, ivec2(fragCoord), 0);
          float Depth = texelFetch(iIntermediatePassColour, ivec2(fragCoord), 0).r;
          
          bool Combined = false;
          //Fix mesh holes
          if(fragColor.a == 0.){
            vec4 ColourP0 = texelFetch(iIntermediatePassColour, ivec2(fragCoord) + ivec2(0, 1), 0);
            vec4 Colour0P = texelFetch(iIntermediatePassColour, ivec2(fragCoord) + ivec2(1, 0), 0);
            vec4 ColourM0 = texelFetch(iIntermediatePassColour, ivec2(fragCoord) + ivec2(0, -1), 0);
            vec4 Colour0M = texelFetch(iIntermediatePassColour, ivec2(fragCoord) + ivec2(-1, 0), 0);
            vec4 CombinedColour = (ColourP0 + Colour0P + ColourM0 + Colour0M) / 4.;
            if(CombinedColour.a >= .5){
              fragColor = CombinedColour;
              Combined = true;
            }
          }
          
          if(fragColor.a == 0.) discard;
          
          //Calculate shadows
          
          //float ShadowIntensity = Depth / 40.;//CalculateShadowIntensity(RayOrigin + RayDirection * Depth, iSunPosition * vec3(1., -1., 1.), 0u, Depth);
          //fragColor.xyz *= (1. - iShadowDarkness) + iShadowDarkness * (1. - ShadowIntensity);
        }*/
        
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
          ivec3 FaceSign = ivec3(sign(FractPosition - .5));
          
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
          ivec3 FaceSign = ivec3(sign(FractPosition - .5));
          
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
        
        float CalculateShadowIntensity1(float ShadowIntensity, float CumulativeDistance, int Location8, vec3 RayPosExact, vec3 RayDirection){
          ivec3 RayDirectionSign = ivec3(sign(RayDirection));
          ivec3 RayPosFloor = ivec3(floor(RayPosExact));
          
          vec3 DeltaDistance = abs(1. / RayDirection);
          vec3 SideDistance = (sign(RayDirection) * (.5 - fract(RayPosExact)) + .5) * DeltaDistance;
          
          bvec3 Mask = bvec3(false);
          
          float DistancePrior = 0.;
          float DistanceNow = 0.;
          
          for(int i = 0; i < 30; ++i){
            if((RayPosFloor & 7) != RayPosFloor || ShadowIntensity >= 1.) break;
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
            }
          }
          return ShadowIntensity;
        }
        
        float CalculateShadowIntensity8(float ShadowIntensity, float CumulativeDistance, int Location64, vec3 RayPosExact, vec3 RayDirection){
          ivec3 RayDirectionSign = ivec3(sign(RayDirection));
          ivec3 RayPosFloor = ivec3(floor(RayPosExact));
          
          vec3 DeltaDistance = abs(1. / RayDirection);
          vec3 SideDistance = (sign(RayDirection) * (.5 - fract(RayPosExact)) + .5) * DeltaDistance;
          
          bvec3 Mask = bvec3(false);
          
          for(int i = 0; i < 30; ++i){
            if((RayPosFloor & 7) != RayPosFloor || ShadowIntensity >= 1.) break;
            uint Info8 = GetInfo8(Location64, RayPosFloor);
            if((Info8 >> 31) != 1u){
              int Location8 = int(Info8 & 0x0fffffffu);
              
              float Distance = length(vec3(Mask) * (SideDistance - DeltaDistance));
              vec3 CurrentRayPosition = RayPosExact + RayDirection * Distance;
              CurrentRayPosition += vec3(Mask) * RayDirection * 1e-3;
              
              ShadowIntensity = CalculateShadowIntensity1(ShadowIntensity, CumulativeDistance + Distance * 8., Location8, mod(CurrentRayPosition * 8., 8.), RayDirection);
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
          ivec3 RayDirectionSign = ivec3(sign(RayDirection));
          
          vec3 DeltaDistance = abs(1. / RayDirection);
          vec3 SideDistance = (sign(RayDirection) * (.5 - RayPosFract) + .5) * DeltaDistance;
          
          bvec3 Mask = bvec3(false);
          float Distance = 0.;
          
          for(int i = 0; i < 64; ++i){
            if((RayPosFloor & 7) != RayPosFloor || ShadowIntensity >= 1. || Distance >= 400.) break;
            /*if((RayPosFloor & 7) != RayPosFloor){
              if(Depth == 7u) break;
              float d = length(vec3(Mask) * (SideDistance - DeltaDistance)) + 5e-4;
              vec3 CurrentRayPosition = RayPosFract + RayDirection * d;
              
              RayPosFloor = ((RayPosFloor + iOffset64[Depth]) >> 1) - iOffset64[Depth + 1u];
              SideDistance = (sign(RayDirection) * (.5 - fract(CurrentRayPosition / 2.)) + .5) * DeltaDistance;
              Depth++;
            }*/
            uint Info64 = GetInfo64NoOffset(RayPosFloor.zyx, Depth);
            
            if((Info64 >> 31) != 1u && ((Info64 >> 29) & 1u) == 1u){ //Not empty and completely loaded
              int Location64 = int(Info64 & 0x00ffffffu);
              
              Distance = length(vec3(Mask) * (SideDistance - DeltaDistance));// * PowerOfTwo[Depth];
              vec3 CurrentRayPosition = RayPosFract + RayDirection * Distance;
              CurrentRayPosition += vec3(Mask) * RayDirection * 1e-3;
              
              ShadowIntensity = CalculateShadowIntensity8(ShadowIntensity, Distance * 64., Location64, mod(CurrentRayPosition * 8., 8.), RayDirection);
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
          
          //if(RayPosSides.x && Depth.x > ((hash(RayPosFloor.zy) >> 29) & 3)) return true;
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
          bvec3 Mask;
          bool HitVoxel;
        };
        
        SmallRaytraceResult RaytraceSmaller(vec3 RayOrigin, vec3 RayDirection, bvec3 Mask, ivec3 Coordinate, float Distance){
          uvec3 RayDirectionSign = uvec3(ivec3(sign(RayDirection)));
          uvec3 RayPosFloor = uvec3(floor(RayOrigin));
          
          vec3 DeltaDistance = abs(1. / RayDirection);
          vec3 SideDistance = (sign(RayDirection) * (vec3(RayPosFloor) - RayOrigin) + (sign(RayDirection) * 0.5) + 0.5) * DeltaDistance;
          vec3 vMask;
          
          for(int i = 0; i < 200; ++i){
            if(any(greaterThan(RayPosFloor, uvec3(63)))) return SmallRaytraceResult(Mask, false);
            if(GetRoughnessMap2(ivec3(RayPosFloor), 1, Distance, Coordinate)){
              return SmallRaytraceResult(Mask, true);
            }
            Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
            vMask = vec3(Mask);
            SideDistance = (vMask * DeltaDistance) + SideDistance;
            RayPosFloor = (uvec3(vMask) * RayDirectionSign) + RayPosFloor;
          }
          return SmallRaytraceResult(Mask, false);
        }
        
        DetailedRaytraceResult RaytraceClose(vec3 RayOrigin, vec3 RayDirection){
          ivec3 RayDirectionSign = ivec3(sign(RayDirection));
          ivec3 RayPosFloor = ivec3(floor(RayOrigin));
          vec3 RayOriginFract = mod(RayOrigin, 64.); //This is so it doesn't lose too much precision (it usually would at 2048)
          
          vec3 DeltaDistance = abs(1. / RayDirection);
          vec3 SideDistance = (sign(RayDirection) * (vec3(RayPosFloor) - RayOrigin) + (sign(RayDirection) * 0.5) + 0.5) * DeltaDistance;
          
          bvec3 Mask = bvec3(false);
          bool HitVoxel = false;
          
          float Distance = 0.;
          vec3 ExactFractRayPosition;
          bvec3 Mask1;
          
          for(int i = 0; i < 27; ++i){
            bool IsSolid = IsSolid(RayPosFloor);
            if(IsSolid){
              Distance = length(vec3(Mask) * (SideDistance - DeltaDistance));
              if(Distance > 14.) break;
              ExactFractRayPosition = RayOriginFract + RayDirection * Distance;
              ExactFractRayPosition += vec3(Mask) * vec3(RayDirectionSign) * 1e-4;
              
              SmallRaytraceResult Result = RaytraceSmaller(mod(ExactFractRayPosition * 64., 64.), RayDirection, Mask, RayPosFloor, Distance);
              
              HitVoxel = Result.HitVoxel;
              if(HitVoxel){
                Mask = Result.Mask;
                break;
              }
            }
            Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
            SideDistance = vec3(Mask) * DeltaDistance + SideDistance;
            RayPosFloor = ivec3(vec3(Mask)) * RayDirectionSign + RayPosFloor;
            if(!IsSolid) Mask1 = Mask;
          }
          
          
          return DetailedRaytraceResult(
            HitVoxel,
            Distance,
            RayPosFloor,
            ExactFractRayPosition,
            Mask,
            Mask1
          );
        }
        
        void mainImage(out vec4 fragColor, in vec2 fragCoord){
          vec2 uv = (fragCoord.xy * 2. - iResolution.xy) / iResolution.y;
          uv.x *= -1.;
          vec3 RayOrigin = iPosition;
          vec3 RayDirection = (normalize(vec3(uv, 1. / tan(FOV / 2.))) * RotateX(-iRotation.x) * RotateY(iRotation.y - PI));
          RayDirection += vec3(equal(RayDirection, vec3(0.))) * 1e-3; //When RayDirection is 0 NaNs get created and the perf tanks
          ivec3 RayDirectionSign = ivec3(sign(RayDirection));
          
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
          //Calculate shadows
          
          //float ShadowIntensity = Depth / 40.;//CalculateShadowIntensity(RayOrigin + RayDirection * Depth, iSunPosition * vec3(1., -1., 1.), 0u, Depth);
          //fragColor.xyz *= (1. - iShadowDarkness) + iShadowDarkness * (1. - ShadowIntensity);
        }
        
        
        void main(){
          mainImage(gl_FragColor, vUv * iResolution.xy);
        }
      `
    });

    this.OutputPassMaterial = new THREE.ShaderMaterial({
      "uniforms": {
        ...this.Uniforms,
        iProcessedWorldTexture: {value: this.Renderer.ProcessedWorldTarget.texture},
        iBackgroundTexture: {value: this.Renderer.BackgroundTarget.texture}
      },
      "transparent": false,
      "blending": THREE.NormalBlending,
      "alphaTest": 1.,
      "depthTest": false,
      "depthWrite": false,
      "vertexShader": `
        varying vec2 vUv;
        
        void main(){
          vUv = uv;
          gl_Position = vec4(position, 1.);
        }
      `,
      "fragmentShader": `
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
        
        uniform lowp sampler2D iProcessedWorldTexture;
        uniform lowp sampler2D iBackgroundTexture;
        
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
        
        const float InDegrees = .01745329;
        const float PI = 3.14159;
        
        void main(){
          vec2 uv = (gl_FragCoord.xy * 2. - iResolution.xy) / iResolution.y;
          uv.x *= -1.;
          vec3 RayOrigin = vec3(iPosition.x, iPosition.y, iPosition.z);
          vec3 RayDirection = (normalize(vec3(uv, 1. / tan(FOV / 2.))) * RotateX(-iRotation.x) * RotateY(iRotation.y - PI));
          
          vec4 Colour = texelFetch(iProcessedWorldTexture, ivec2(gl_FragCoord.xy), 0);
          
          bool Combined = false;
          //Fix mesh holes
          if(Colour.a == 0.){
            vec4 ColourP0 = texelFetch(iProcessedWorldTexture, ivec2(gl_FragCoord.xy) + ivec2(0, 1), 0);
            vec4 Colour0P = texelFetch(iProcessedWorldTexture, ivec2(gl_FragCoord.xy) + ivec2(1, 0), 0);
            vec4 ColourM0 = texelFetch(iProcessedWorldTexture, ivec2(gl_FragCoord.xy) - ivec2(0, 1), 0);
            vec4 Colour0M = texelFetch(iProcessedWorldTexture, ivec2(gl_FragCoord.xy) - ivec2(1, 0), 0);
            vec4 CombinedColour = (ColourP0 + Colour0P + ColourM0 + Colour0M) / 4.;
            if(CombinedColour.a >= .5){
              Colour = CombinedColour;
              Combined = true;
            }
          }
          
          if(Colour.a != 1.) Colour = vec4(mix(Colour.xyz, texture(iBackgroundTexture, gl_FragCoord.xy / iResolution).xyz, 1. - Colour.a), 1.);
          
          gl_FragColor = Colour;
        }
      `
    });

    this.SmallTargetMaterial = new THREE.RawShaderMaterial({
      "uniforms": {
        ...this.Uniforms,
        iCloseVoxelsOffset: {value: this.CloseVoxelsOffset},
        iCloseVoxelsTexture: {value: this.CloseVoxelsTexture},
        iRaytracingGridDistance: {value: 1}
      },
      "vertexShader": `#version 300 es
        #define attribute in
        #define varying out
        
        precision highp float;
        precision highp int;
        
        attribute highp vec3 position;
        
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform mat4 modelMatrix;
        uniform mat3 normalMatrix;
        
        void main(){
          gl_Position = vec4(position, 1.);
        }
      `,
      "fragmentShader": `#version 300 es
        
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
          vec3 SideDistance = (sign(RayDirection) * (vec3(RayPosFloor) - RayOrigin) + (sign(RayDirection) * 0.5) + 0.5) * DeltaDistance;
          
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
      `
    });

    const Mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.RaytracedMaterial);
    Mesh.frustumCulled = false;
    this.RaytracedPassScene.add(Mesh);

    const FinalPassMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.FinalPassMaterial);
    FinalPassMesh.frustumCulled = false;
    this.FinalPassScene.add(FinalPassMesh);

    const TestPassMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.TestMaterial);
    TestPassMesh.frustumCulled = false;
    this.TestPassScene.add(TestPassMesh);

    const OutputPassMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.OutputPassMaterial);
    OutputPassMesh.frustumCulled = false;
    this.OutputPassScene.add(OutputPassMesh);

    const SmallPassMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.SmallTargetMaterial);
    SmallPassMesh.frustumCulled = false;
    this.SmallTargetScene.add(SmallPassMesh);



    this.Renderer.Events.AddEventListener("Resize", function ResizeListener(){
      const FOV = Number.parseFloat(this.Renderer.Camera.fov);
      const GridSize = this.Renderer.GetBlockWidthFrom19m(FOV, window.innerHeight * this.Renderer.ImageScale);
      this.SmallTargetMaterial.uniforms.iRaytracingGridDistance.value = GridSize;
      this.FinalPassMaterial.uniforms.iRaytracingGridDistance.value = GridSize;
      this.Renderer.SmallRaytracingTarget.setSize(Math.ceil(window.innerWidth / GridSize * this.Renderer.ImageScale) + 2., Math.ceil(window.innerHeight / GridSize * this.Renderer.ImageScale) + 2.);

      return ResizeListener.bind(this);
    }.bind(this)());

    this.Renderer.Events.AddEventListener("RenderingSmallRaytracedPass", function(){
      this.RaytracedMaterial.uniforms.iIsRenderingSmallTarget.value = true;
      this.RaytracedMaterial.uniforms.iSmallTargetDepth.value = null;
    }.bind(this));

    this.Renderer.Events.AddEventListener("RenderingRaytracedPass", function(){
      this.RaytracedMaterial.uniforms.iIsRenderingSmallTarget.value = false;
      this.RaytracedMaterial.uniforms.iSmallTargetDepth.value = this.Renderer.SmallRaytracingTarget.texture[1];
    }.bind(this));



    /*Application.Main.WorkerLoadingPipelineHandler.Events.AddEventListener("FinishedLoadingBatch", function(Batch){

      console.time();
      for(let Depth = 0; Depth < 8; ++Depth) for(let x64 = 0; x64 < 8; ++x64) for(let y64 = 0; y64 < 8; ++y64) for(let z64 = 0; z64 < 8; ++z64){
        const Scale = 2 ** (Depth - 0);

        const Region64X = x64 + this.World.Data64Offset[3 * Depth + 0];
        const Region64Y = y64 + this.World.Data64Offset[3 * Depth + 1];
        const Region64Z = z64 + this.World.Data64Offset[3 * Depth + 2];

        const Info = [];
        const Info64 = this.GPUInfo64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64];

        if(((Info64 >> 31) & 1) === 1) continue; //###################################
        const Location64 = Info64 & 0x0fffffff;
        const CPULocation64 = this.Data64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64] & 0x0007ffff;
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
          const Exists = ((this.GPUInfo8[(Location64 << 9) | (x8 << 6) | (y8 << 3) | z8] >> 31) & 1) === 0;
          if(Exists){
            const LocalIndex8 = (x8 << 6) | (y8 << 3) | z8;
            const Index8 = (Location64 << 9) | LocalIndex8;
            const Location8 = this.GPUInfo8[Index8] & 0x0fffffff;

            const MinX = (this.GPUBoundingBox1[Index8] >> 15) & 7;
            const MinY = (this.GPUBoundingBox1[Index8] >> 12) & 7;
            const MinZ = (this.GPUBoundingBox1[Index8] >> 9) & 7;
            const MaxX = (this.GPUBoundingBox1[Index8] >> 6) & 7;
            const MaxY = (this.GPUBoundingBox1[Index8] >> 3) & 7;
            const MaxZ = this.GPUBoundingBox1[Index8] & 7;

            if(MaxX < MinX || MaxY < MinY || MaxZ < MinZ) continue;

            //This section optimises the bounding box faces by removing the parts which are occluded by the blocks in front of it.
            PlusX: {
              let NewMinY = MinY;
              let NewMinZ = MinZ;
              let NewMaxY = MaxY;
              let NewMaxZ = MaxZ;

              if(MinX === 0){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
                const x8Search = x8 - 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
                let Info8 = -1;
                if(x8Search >= 0) Info8 = this.Data8[(CPULocation64 << 9) | (x8Search << 6) | (y8 << 3) | z8];
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
                      if(this.VoxelTypes[(Location8 << 9) | (7 << 6) | (y1 << 3) | z1] === 0){ //TODO: make this work for all transparent blocks
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
                (4 << 21) | (MinX << 17) | (NewMinY << 13) | (NewMaxZ << 9) | LocalIndex8,
              );
            }

            PlusY: {
              let NewMinX = MinX;
              let NewMinZ = MinZ;
              let NewMaxX = MaxX;
              let NewMaxZ = MaxZ;

              if(MinY === 0){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
                const y8Search = y8 - 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
                let Info8 = -1;
                if(y8Search >= 0) Info8 = this.Data8[(CPULocation64 << 9) | (x8 << 6) | (y8Search << 3) | z8];
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
                      if(this.VoxelTypes[(Location8 << 9) | (x1 << 6) | (7 << 3) | z1] === 0){ //TODO: make this work for all transparent blocks
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
                (5 << 21) | (NewMinX << 17) | (MinY << 13) | (NewMinZ << 9) | LocalIndex8,
              );
            }

            PlusZ: {
              let NewMinX = MinX;
              let NewMinY = MinY;
              let NewMaxX = MaxX;
              let NewMaxY = MaxY;

              if(MinZ === 0){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
                const z8Search = z8 - 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
                let Info8 = -1;
                if(z8Search >= 0) Info8 = this.Data8[(CPULocation64 << 9) | (x8 << 6) | (y8 << 3) | z8Search];
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
                      if(this.VoxelTypes[(Location8 << 9) | (x1 << 6) | (y1 << 3) | 7] === 0){ //TODO: make this work for all transparent blocks
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
                (6 << 21) | (NewMinX << 17) | (NewMaxY << 13) | (MinZ << 9) | LocalIndex8,
              );
            }

            MinusX: {
              let NewMinY = MinY;
              let NewMinZ = MinZ;
              let NewMaxY = MaxY;
              let NewMaxZ = MaxZ;

              if(MaxX === 7){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
                const x8Search = x8 + 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
                let Info8 = -1;
                if(x8Search <= 7) Info8 = this.Data8[(CPULocation64 << 9) | (x8Search << 6) | (y8 << 3) | z8];
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
                      if(this.VoxelTypes[(Location8 << 9) | (0 << 6) | (y1 << 3) | z1] === 0){ //TODO: make this work for all transparent blocks
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
                (2 << 21) | ((MaxX + 1) << 17) | (NewMinY << 13) | (NewMinZ << 9) | LocalIndex8,
              );
            }

            MinusY: {
              let NewMinX = MinX;
              let NewMinZ = MinZ;
              let NewMaxX = MaxX;
              let NewMaxZ = MaxZ;

              if(MaxY === 7){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
                const y8Search = y8 + 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
                let Info8 = -1;
                if(y8Search <= 7) Info8 = this.Data8[(CPULocation64 << 9) | (x8 << 6) | (y8Search << 3) | z8];
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
                      if(this.VoxelTypes[(Location8 << 9) | (x1 << 6) | (0 << 3) | z1] === 0){ //TODO: make this work for all transparent blocks
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
                (1 << 21) | (NewMaxX << 17) | ((MaxY + 1) << 13) | (NewMinZ << 9) | LocalIndex8,
              );
            }

            MinusZ: {
              let NewMinX = MinX;
              let NewMinY = MinY;
              let NewMaxX = MaxX;
              let NewMaxY = MaxY;

              if(MaxZ === 7){ //Only makes sense to do this when it's touching the edge of the 8-cell (because otherwise it's guaranteed that it'll all be required)
                const z8Search = z8 + 1; //This determines in which Data8 coordinate relative to the current 64 cell the blocks are
                let Info8 = -1;
                if(z8Search <= 7) Info8 = this.Data8[(CPULocation64 << 9) | (x8 << 6) | (y8 << 3) | z8Search];
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
                      if(this.VoxelTypes[(Location8 << 9) | (x1 << 6) | (y1 << 3) | 0] === 0){ //TODO: make this work for all transparent blocks
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
                (0 << 21) | (NewMaxX << 17) | (NewMaxY << 13) | ((MaxZ + 1) << 9) | LocalIndex8,
              );
            }
          }
        }
        console.log(IndexCounter);

        const Geometry = new THREE.BufferGeometry;
        Geometry.setAttribute("info", new THREE.BufferAttribute(new Int32Array(Info), 1));
        //Geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(Position), 3));
        Geometry.setIndex(SharedIndexBuffer);
        Geometry.setDrawRange(0, IndexCounter);
        const Mesh = new THREE.Mesh(Geometry, this.Material);
        Mesh.matrixAutoUpdate = false;
        Mesh.frustumCulled = true;
        //Mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(x1Min + x1HalfLength, y1Min + y1HalfLength, z1Min + z1HalfLength), Math.sqrt(x1HalfLength ** 2. + y1HalfLength ** 2. + z1HalfLength ** 2.));
        Mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(32., 32., 32.), 55.45);

        Meshes.push({"Mesh": Mesh, "X": Region64X, "Y": Region64Y, "Z": Region64Z, "Scale": Scale});

        if(Depth === 0) this.Renderer.NearScene.add(Mesh);
        else{
          this.Renderer.FarScene.add(Mesh);
          if(Math.max(Math.abs(Region64X + .5), Math.abs(Region64Y + .5), Math.abs(Region64Z + .5)) < 2.) Mesh.visible = false;
        }
      }
      console.timeEnd();
      let FrameCounter = 0;
      void function Update(){
        Application.Main.Renderer.RequestAnimationFrame(Update);
        FrameCounter++;
      }();

      for(const {Mesh, X, Y, Z, Scale} of Meshes){
        Mesh.position.set(X * 64. * Scale, Y * 64. * Scale, Z * 64. * Scale);
        Mesh.scale.set(Scale, Scale, Scale);
        Mesh.updateMatrixWorld();
        Mesh.updateMatrix();
      }

      let Start = 0;
      void function Load(){
        window.setTimeout(Load, 1000);
        const OldStart = Start;
        Start = FrameCounter;

        const Position = Application.Main.Renderer.Camera.position;
        const PlayerX = Math.floor(Position.x / 64.);
        const PlayerY = Math.floor(Position.y / 64.);
        const PlayerZ = Math.floor(Position.z / 64.);
        for(const {Mesh, X, Y, Z} of Meshes){
          Mesh.renderOrder = Math.sqrt((PlayerX - X) ** 2 + (PlayerY - Y) ** 2 + (PlayerZ - Z) ** 2);
        }
        console.log(Start - OldStart);
      }();
    }.bind(this));*/

    const Meshes = [];
    const IndexTemplate = new Uint16Array(24576);
    for(let i = 0, Stride = 0; i < 4096; i++){
      IndexTemplate[Stride++] = 4 * i;
      IndexTemplate[Stride++] = 4 * i + 1;
      IndexTemplate[Stride++] = 4 * i + 2;
      IndexTemplate[Stride++] = 4 * i + 2;
      IndexTemplate[Stride++] = 4 * i + 1;
      IndexTemplate[Stride++] = 4 * i + 3;
    }
    const SharedIndexBuffer = new THREE.Uint16BufferAttribute(IndexTemplate, 1);

    Application.Main.WorkerLoadingPipelineHandler.Events.AddEventListener("GenerateBoundingGeometry", function(Event){
      if(Event.Info === null) return;
      const Identifier = Event.Depth + "," + Event.RegionX + "," + Event.RegionY + "," + Event.RegionZ;


      if(Event.Depth === 0){
        const Result = this.Renderer.NearScene.getObjectByName(Identifier);

        if(Result){
          if(Result.userData.Time < Event.Time) this.Renderer.NearScene.remove(Result);
          else return;
        }
      } else{
        const Result = this.Renderer.FarScene.getObjectByName(Identifier);

        if(Result){
          if(Result.userData.Time < Event.Time) this.Renderer.FarScene.remove(Result);
          else return;
        }
      }

      const Scale = 2 ** Event.Depth;
      const Geometry = new THREE.BufferGeometry;
      Geometry.setAttribute("info", new THREE.BufferAttribute(new Int32Array(Event.Info), 1));
      Geometry.setIndex(SharedIndexBuffer);
      Geometry.setDrawRange(0, Event.IndexCount);
      const Mesh = new THREE.Mesh(Geometry, this.Material);
      Mesh.matrixAutoUpdate = false;
      Mesh.frustumCulled = true;
      //Mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(x1Min + x1HalfLength, y1Min + y1HalfLength, z1Min + z1HalfLength), Math.sqrt(x1HalfLength ** 2. + y1HalfLength ** 2. + z1HalfLength ** 2.));
      Mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(32., 32., 32.), 55.45);

      Meshes.push({"Mesh": Mesh, "X": Event.RegionX, "Y": Event.RegionY, "Z": Event.RegionZ, "Scale": Scale});

      if(Event.Depth === 0) this.Renderer.NearScene.add(Mesh);
      else{
        this.Renderer.FarScene.add(Mesh);
        //if(Math.max(Math.abs(Event.RegionX + .5), Math.abs(Event.RegionY + .5), Math.abs(Event.RegionZ + .5)) < 2.) Mesh.visible = false;
      }
      Mesh.name = Identifier;
      Mesh.userData.Time = Event.Time;
      Mesh.userData.RegionX = Event.RegionX;
      Mesh.userData.RegionY = Event.RegionY;
      Mesh.userData.RegionZ = Event.RegionZ;
      Mesh.userData.Depth = Event.Depth;

      Mesh.position.set(Event.RegionX * 64. * Scale, Event.RegionY * 64. * Scale, Event.RegionZ * 64. * Scale);
      Mesh.scale.set(Scale, Scale, Scale);
      Mesh.updateMatrixWorld();
      Mesh.updateMatrix();

      const x64 = Event.RegionX - this.World.Data64Offset[Event.Depth * 3 + 0];
      const y64 = Event.RegionY - this.World.Data64Offset[Event.Depth * 3 + 1];
      const z64 = Event.RegionZ - this.World.Data64Offset[Event.Depth * 3 + 2];
      this.GPUInfo64[(Event.Depth << 9) | (x64 << 6) | (y64 << 3) | z64] |= 1 << 28; //Mark that the region now has a mesh
    }.bind(this));


    const SortFunction = function(Mesh1, Mesh2){
      return Mesh1.userData.Distance - Mesh2.userData.Distance;
    };

    void function Load(){
      window.setTimeout(Load.bind(this), 500);
      const Position = Application.Main.Renderer.Camera.position;
      const PlayerX = Math.floor(Position.x / 64.);
      const PlayerY = Math.floor(Position.y / 64.);
      const PlayerZ = Math.floor(Position.z / 64.);
      for(const Mesh of this.Renderer.NearScene.children){
        const X = Mesh.userData.RegionX;
        const Y = Mesh.userData.RegionY;
        const Z = Mesh.userData.RegionZ;
        const x64 = X - this.World.Data64Offset[0];
        const y64 = Y - this.World.Data64Offset[1];
        const z64 = Z - this.World.Data64Offset[2];
        Mesh.userData.Distance = Math.sqrt((PlayerX - X) ** 2 + (PlayerY - Y) ** 2 + (PlayerZ - Z) ** 2);
        if(x64 < 0 || y64 < 0 || z64 < 0 || x64 > 7 || y64 > 7 || z64 > 7){
          this.Renderer.NearScene.remove(Mesh);
        }
      }
      this.Renderer.NearScene.children.sort(SortFunction);

      for(const Mesh of this.Renderer.FarScene.children){
        const X = Mesh.userData.RegionX;
        const Y = Mesh.userData.RegionY;
        const Z = Mesh.userData.RegionZ;
        const Depth = Mesh.userData.Depth;
        const x64 = X - this.World.Data64Offset[3 * Depth + 0];
        const y64 = Y - this.World.Data64Offset[3 * Depth + 1];
        const z64 = Z - this.World.Data64Offset[3 * Depth + 2];
        const Scale = 2 ** Depth;
        Mesh.userData.Distance = Math.sqrt((PlayerX - X * Scale) ** 2 + (PlayerY - Y * Scale) ** 2 + (PlayerZ - Z * Scale) ** 2);
        if(x64 < 0 || y64 < 0 || z64 < 0 || x64 > 7 || y64 > 7 || z64 > 7){
          this.Renderer.FarScene.remove(Mesh);
        }
        let Counter = 0;
        for(let dx = 0; dx < 2; ++dx) for(let dy = 0; dy < 2; ++dy) for(let dz = 0; dz < 2; ++dz){
          let dx64 = X * 2 + dx - this.World.Data64Offset[3 * (Depth - 1) + 0];
          let dy64 = Y * 2 + dy - this.World.Data64Offset[3 * (Depth - 1) + 1];
          let dz64 = Z * 2 + dz - this.World.Data64Offset[3 * (Depth - 1) + 2];
          if((dx64 & 7) === dx64 && (dy64 & 7) === dy64 && (dz64 & 7) === dz64){
            const Info64 = this.GPUInfo64[(Depth - 1) << 9 | dx64 << 6 | dy64 << 3 | dz64];
            if(((Info64 >> 28) & 3) === 3 || (((Info64 >> 31) & 1) === 1 && ((Info64 >> 29) & 1) === 1)){
              Counter++;
            }
          }
        }
        Mesh.visible = Counter !== 8;
      }
      this.Renderer.FarScene.children.sort(SortFunction);
    }.bind(this)();

    void function Load(){
      window.setTimeout(Load.bind(this), 50);
      for(const Mesh of this.Renderer.FarScene.children){
        const X = Mesh.userData.RegionX;
        const Y = Mesh.userData.RegionY;
        const Z = Mesh.userData.RegionZ;
        const Depth = Mesh.userData.Depth;


        let Counter = 0;
        for(let dx = 0; dx < 2; ++dx) for(let dy = 0; dy < 2; ++dy) for(let dz = 0; dz < 2; ++dz){
          let dx64 = X * 2 + dx - this.World.Data64Offset[3 * (Depth - 1) + 0];
          let dy64 = Y * 2 + dy - this.World.Data64Offset[3 * (Depth - 1) + 1];
          let dz64 = Z * 2 + dz - this.World.Data64Offset[3 * (Depth - 1) + 2];
          if(dx64 >= 0 && dx64 < 7 && dy64 >= 0 && dy64 < 7 && dz64 >= 0 && dz64 < 7){
            const Info64 = this.GPUInfo64[(Depth - 1) << 9 | dx64 << 6 | dy64 << 3 | dz64];
            if(((Info64 >> 28) & 3) === 3 || (((Info64 >> 31) & 1) === 1 && ((Info64 >> 29) & 1) === 1)){
              Counter++;
            }
          }
        }
        Mesh.visible = Counter !== 8;
      }
    }.bind(this)();


    //this.Scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial( {color: 0x00ff00, side: THREE.BackSide} )));

    Application.Main.Renderer.Events.AddEventListener("BeforeRender", this.UpdateUniforms.bind(this));



    void function AnimationFrame(){
      Application.Main.Renderer.RequestAnimationFrame(AnimationFrame.bind(this));

      let CloseVoxelsNeedUpdate = false;

      const CameraPosition = Application.Main.Renderer.Camera.position;
      const NewPosition = new THREE.Vector3(
        (Math.floor(CameraPosition.x) >> 3),
        (Math.floor(CameraPosition.y) >> 3),
        (Math.floor(CameraPosition.z) >> 3)
      );
      if(!NewPosition.equals(this.CloseVoxelsOffset)) CloseVoxelsNeedUpdate = true;

      this.TexData64.needsUpdate = true;
      this.Uniforms.iOffset64.needsUpdate = true;
      this.TexInfo64.needsUpdate = true;
      //this.TexBoundingBox1.needsUpdate = true;

      //TODO: This still causes small lag spikes when updating.
      //Possible fixes: spread out updates, merge nearby segments, etc
      const UpdatedData64 = [];

      for(let Depth = 0, Counter = 0; Depth < 8; ++Depth) for(let x64 = 0; x64 < 8; x64++) for(let y64 = 0; y64 < 8; y64++) for(let z64 = 0; z64 < 8; z64++){
        //const Index64 = (Depth << 9) | (x64 << 6) | (y64 << 3) | z64;
        const Index64 = Counter++; //Essentially the same thing ^^
        //Add to updated list only if it's fully loaded, and it needs an update.
        if(((this.Data64[Index64] >> 19) & 7) === 7 && ((this.GPUInfo64[Index64] >> 30) & 1) === 1) UpdatedData64.push(Index64);
      }

      if(UpdatedData64.length === 0){
        this.Uniforms.iOffset64.needsUpdate = true;
        this.TexInfo64.needsUpdate = true;
        return; //These textures will also be updated for when there was an update a bit further down.
      } else{
        CloseVoxelsNeedUpdate = true;
      }

      if(CloseVoxelsNeedUpdate){
        this.CloseVoxels.fill(255);
        for(let rx8 = -4; rx8 < 4; rx8++) for(let ry8 = -4; ry8 < 4; ry8++) for(let rz8 = -4; rz8 < 4; rz8++){
          const x64 = ((NewPosition.x + rx8) >> 3) - this.World.Data64Offset[0];
          const y64 = ((NewPosition.y + ry8) >> 3) - this.World.Data64Offset[1];
          const z64 = ((NewPosition.z + rz8) >> 3) - this.World.Data64Offset[2];
          const x8 = (NewPosition.x + rx8) & 7;
          const y8 = (NewPosition.y + ry8) & 7;
          const z8 = (NewPosition.z + rz8) & 7;

          const Info64 = this.GPUInfo64[(x64 << 6) | (y64 << 3) | z64];
          if(((Info64 >> 31) & 1) === 1 || ((Info64 >> 29) & 1) === 0) continue;
          const Location64 = Info64 & 0x0fffffff;
          const Info8 = this.GPUInfo8[(Location64 << 9) | (x8 << 6) | (y8 << 3) | z8];
          if(((Info8 >> 31) & 1) === 1) continue;
          const Location8 = Info8 & 0x0fffffff;
          const StartLocation = ((rx8 + 4) << 12) | ((ry8 + 4) << 9) | ((rz8 + 4) << 6);
          for(let i = 0; i < 64; ++i){
            this.CloseVoxels[StartLocation | i] = this.GPUData1[(Location8 << 6) | i];
          }
        }
        this.CloseVoxelsOffset.copy(NewPosition);
        this.CloseVoxelsTexture.needsUpdate = true;
      }

      const UpdatedSegments = new Set;
      for(const Index64 of UpdatedData64){
        const GPUInfo64 = this.GPUInfo64[Index64];
        const CPUInfo64 = this.Data64[Index64];
        if(((GPUInfo64 >> 31) & 1) === 1){ //Is empty
          if(((this.Data64[Index64] >> 19) & 7) === 7) this.GPUInfo64[Index64] |= 1 << 29; //Mark as fully uploaded if it's empty and fully loaded
          continue;
        }
        const Location64 = GPUInfo64 & 0x00000fff;
        const StartIndex8 = Location64 << 9;
        let MissedSegments = false;
        for(let Index8 = StartIndex8; Index8 < StartIndex8 + 512; ++Index8){
          const Info8 = this.GPUInfo8[Index8];
          if((Info8 & 0x80000000) !== 0 || (Info8 & 0x40000000) === 0) continue; //Is either empty or has no changes (no update)
          const SegmentColumn = (Info8 & 0x0003fe00) >> 9;
          if(UpdatedSegments.size < 4 || UpdatedSegments.has(SegmentColumn)){
            UpdatedSegments.add(SegmentColumn); //if this.UpdatedSegments.size < 6
            this.GPUInfo8[Index8] &= ~(1 << 30); //Set update to false
          } else MissedSegments = true;
        }

        if(!MissedSegments){
          this.GPUInfo64[Index64] &= ~(1 << 30); //Toggle update to false
          this.GPUInfo64[Index64] |= 1 << 29; //Mark as fully uploaded
          const GPULocation64 = this.GPUInfo64[Index64] & 0x00000fff;
          //int Pos8XYZ = ((Location64 & 7) << 6) | (mRayPosFloor.x << 3) | mRayPosFloor.y;
          //return texelFetch(iTex8, ivec3(mRayPosFloor.z, Pos8XYZ, Location64 >> 3), 0).r;
          this.Renderer.Renderer.copyTextureToTexture3D(
            new THREE.Box3(new THREE.Vector3(0, (GPULocation64 & 7) << 6, GPULocation64 >> 3), new THREE.Vector3(7, ((GPULocation64 & 7) << 6) | 63, GPULocation64 >> 3)),
            new THREE.Vector3(0, (GPULocation64 & 7) << 6, GPULocation64 >> 3),
            this.TexInfo8,
            this.TexInfo8
          );
          this.Renderer.Renderer.copyTextureToTexture3D(
            new THREE.Box3(new THREE.Vector3(0, (GPULocation64 & 7) << 6, GPULocation64 >> 3), new THREE.Vector3(7, ((GPULocation64 & 7) << 6) | 63, GPULocation64 >> 3)),
            new THREE.Vector3(0, (GPULocation64 & 7) << 6, GPULocation64 >> 3),
            this.TexBoundingBox1,
            this.TexBoundingBox1
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
          this.TexData1,
          this.TexData1
        );

        this.Renderer.Renderer.copyTextureToTexture3D(
          new THREE.Box3(new THREE.Vector3(0, 0, ZOffset), new THREE.Vector3(511, 511, ZOffset)),
          new THREE.Vector3(0, 0, ZOffset),
          this.TexType1,
          this.TexType1
        );
      }

      this.Uniforms.iOffset64.needsUpdate = true;
      this.TexInfo64.needsUpdate = true;
      if(UpdatedSegments.size !== 0) this.TexData8.needsUpdate = true;


    }.bind(this)();
  }
  SetKernelSize(Size){
    this.Uniforms["iUpscalingKernelSize"].value = Size;
    this.Renderer.UpscalingKernelSize = Size;
    this.Renderer.UpdateSize();
  }
  UpdateUniforms(){
    //this.Uniforms["iRenderSize"].value = this.Renderer.ImageScale;
    this.Uniforms["iResolution"].value.set(window.innerWidth * this.Renderer.ImageScale, window.innerHeight * this.Renderer.ImageScale);
    this.Uniforms["iTime"].value = window.performance.now();
    this.Uniforms["iRotation"].value.copy(this.Renderer.Camera.rotation);
    this.Uniforms["iPosition"].value.copy(this.Renderer.Camera.position);
    this.Uniforms["iPosition"].needsUpdate = true;
    this.Uniforms["FOV"].value = Number.parseFloat(this.Renderer.Camera.fov) * Math.PI / 180.;// / this.Renderer.Camera.zoom;
    this.Uniforms["iSunPosition"].value = this.Renderer.BackgroundMaterial.uniforms["iSunPosition"].value;
  }
};