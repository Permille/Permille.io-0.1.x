import * as THREE from "../../Libraries/Three/Three.js";

export default class Raymarcher{
  constructor(World, Renderer){
    this.World = World;
    this.Renderer = Renderer;
    this.Scene = this.Renderer.Scene;
    this.RaytracedPassScene = this.Renderer.RaytracedPassScene;
    this.FinalPassScene = this.Renderer.FinalPassScene;
    this.TestPassScene = this.Renderer.TestPassScene;
    this.OutputPassScene = this.Renderer.OutputPassScene;
    this.SmallTargetScene = this.Renderer.SmallTargetScene;

    this.MaxUpdatingSegments = 3;

    this.Data1 = this.World.Data1;
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




    this.CloseVoxelsOffset = new THREE.Vector3(0., 0., 0.);

    this.Uniforms = {
      iResolution: {value: new THREE.Vector2(1920, 1080)},
      iTime: {value: 0},
      iRotation: {value: new THREE.Vector3(0., 0., 0.)},
      iPosition: {value: new THREE.Vector3(0., 0., 0.)},
      iTexType1: {value: this.TexType1},
      iTexInfo8: {value: this.TexInfo8},
      iTexInfo64: {value: this.TexInfo64},
      iTexData1: {value: this.TexData1},
      iTexData8: {value: this.TexData8},
      iTexData64: {value: this.TexData64},
      iTexBoundingBox1: {value: this.TexBoundingBox1},
      iOffset64: {value: this.World.Data64Offset, "type": "iv"},
      iUpscalingKernelSize: {value: 2},
      iSunPosition: {value: new THREE.Vector3(0., 0., 0.)},
      FOV: {value: 110.},
      iShadowExponent: {value: 0.85},
      iShadowMultiplier: {value: 2.4},
      iShadowDarkness: {value: 0.5},
      iFogFactor: {value: 0.00002}
    };

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
      "uniforms": {
        ...this.Uniforms
      },
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
        uniform float iUpscalingKernelSize;
        uniform vec3 iSunPosition;
        uniform float iShadowExponent;
        uniform float iShadowMultiplier;
        uniform float iShadowDarkness;
        uniform float iFogFactor;
        
        
        ivec3 SampleLocation = ivec3(0);
        bool IsEmpty1(inout uvec3 RayPosFloor){
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
          
          vec3 DeltaDistance = abs(1. / RayDirection);
          ivec3 IntRayDirectionSign = ivec3(RayDirection.x > 0. ? 1 : -1, RayDirection.y > 0. ? 1 : -1, RayDirection.z > 0. ? 1 : -1);
          uvec3 RayDirectionSign = uvec3(IntRayDirectionSign);
          uvec3 RayPosFloor = uvec3(floor(RayOrigin));
          vec3 SideDistance = (vec3(IntRayDirectionSign) * (vec3(RayPosFloor) - RayOrigin) + (vec3(IntRayDirectionSign) * 0.5) + 0.5) * DeltaDistance;
          bvec3 Mask;
          bool HitVoxel = false;
          
          uvec3 MinBound = uvec3((vBound >> 15u) & 7u, (vBound >> 12u) & 7u, (vBound >> 9u) & 7u);
          uvec3 MaxBound = uvec3((vBound >> 6u) & 7u, (vBound >> 3u) & 7u, vBound & 7u);
          uvec3 BoundSize = MaxBound - MinBound;
          for(int i = 0; i < 25; ++i){
            if(any(greaterThan(RayPosFloor - MinBound, BoundSize))) discard;
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
          
          if(!any(Mask)){
            switch(abs(vSide)){
              case 1: Mask.x = true; break;
              case 2: Mask.y = true; break;
              case 3: Mask.z = true; break;
            }
          }
          
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
          bvec3 Mask;
          bool HitVoxel;
        };
        
        SmallRaytraceResult RaytraceSmaller(vec3 RayOrigin, vec3 RayDirection, bvec3 Mask, ivec3 Coordinate, float Distance, ivec3 RayDirectionSign, vec3 DeltaDistance){
          uvec3 RayPosFloor = uvec3(floor(RayOrigin));
          
          vec3 SideDistance = (vec3(RayDirectionSign) * (.5 - fract(RayOrigin)) + .5) * DeltaDistance;
          vec3 vMask;
          
          for(int i = 0; i < 200; ++i){
            if(any(greaterThan(RayPosFloor, uvec3(63)))) return SmallRaytraceResult(Mask, false);
            if(GetRoughnessMap2(ivec3(RayPosFloor), 1, Distance, Coordinate)){
              return SmallRaytraceResult(Mask, true);
            }
            Mask = lessThanEqual(SideDistance.xyz, min(SideDistance.yzx, SideDistance.zxy));
            vMask = vec3(Mask);
            SideDistance = (vMask * DeltaDistance) + SideDistance;
            RayPosFloor = uvec3(ivec3(vMask) * RayDirectionSign) + RayPosFloor;
          }
          return SmallRaytraceResult(Mask, false);
        }
        
        DetailedRaytraceResult RaytraceClose(vec3 RayOrigin, vec3 RayDirection){
          ivec3 RayDirectionSign = ivec3(RayDirection.x > 0. ? 1 : -1, RayDirection.y > 0. ? 1 : -1, RayDirection.z > 0. ? 1 : -1);
          ivec3 RayPosFloor = ivec3(floor(RayOrigin));
          vec3 RayOriginFract = mod(RayOrigin, 64.); //This is so it doesn't lose too much precision (it usually would at 2048)
          
          vec3 DeltaDistance = abs(1. / RayDirection);
          vec3 SideDistance = (vec3(RayDirectionSign) * (.5 - fract(RayOrigin)) + .5) * DeltaDistance;
          
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
              
              SmallRaytraceResult Result = RaytraceSmaller(mod(ExactFractRayPosition * 64., 64.), RayDirection, Mask, RayPosFloor, Distance, RayDirectionSign, DeltaDistance);
              
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
        uniform float iUpscalingKernelSize;
        uniform vec3 iSunPosition;
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
      `
    });

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

      this.Uniforms.iOffset64.needsUpdate = true;
      this.TexInfo64.needsUpdate = true;

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
          if(UpdatedSegments.size < this.MaxUpdatingSegments || UpdatedSegments.has(SegmentColumn)){
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

      //I'm not even using this in the shader?
      //if(UpdatedSegments.size !== 0) this.TexData8.needsUpdate = true;
    }.bind(this)();
  }
  SetKernelSize(Size){
    this.Uniforms["iUpscalingKernelSize"].value = Size;
    this.Renderer.UpscalingKernelSize = Size;
    this.Renderer.UpdateSize();
  }
  UpdateUniforms(){
    this.Uniforms["iResolution"].value.set(window.innerWidth * this.Renderer.ImageScale, window.innerHeight * this.Renderer.ImageScale);
    this.Uniforms["iTime"].value = window.performance.now();
    this.Uniforms["iRotation"].value.copy(this.Renderer.Camera.rotation);
    this.Uniforms["iPosition"].value.copy(this.Renderer.Camera.position);
    this.Uniforms["iPosition"].needsUpdate = true;
    this.Uniforms["FOV"].value = Number.parseFloat(this.Renderer.Camera.fov) * Math.PI / 180.;// / this.Renderer.Camera.zoom;
    this.Uniforms["iSunPosition"].value = this.Renderer.BackgroundMaterial.uniforms["iSunPosition"].value;
  }
};