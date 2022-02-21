import * as THREE from "../../Libraries/Three/Three.js";
import Simplex from "../../Simplex.js";

export default class Raymarcher{
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
        iRenderSize: {value: 1.},
        iIsFirstPass: {value: true},
        iUpscalingKernelSize: {value: 4.},
        iSimplexTexture: {value: this.SimplexTexture},
        FOV: {value: 110}
      },
      "transparent": true,
      "blending": THREE.NoBlending,
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
        uniform ivec3 iOffset64[8];
        uniform bool iIsFirstPass;
        uniform float iUpscalingKernelSize;
        uniform float iRenderSize;
        
        
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
        const float MAX_ROUGHNESS_DISTANCE = 30.;
        const int MAX_DETAIL = 2;
        const int MIN_DETAIL = -2;
        
        const float Log16385 = log(16385.);
        
        float EncodeLogarithmicDepth(float Depth){
          return log(Depth + 1.) / Log16385;
        }
        
        float DecodeLogarithmicDepth(float Depth){
          return exp(Depth * Log16385) - 1.;
        }
        
        float Random(vec4 v){
          return fract(1223.34 * sin(dot(v,vec4(18.111, 13.252, 17.129, 18.842))));
        }
        float Random(vec3 v){
          //return sin(iTime / 2000.) / 2. + .5;
          return fract(1223.34 * sin(dot(v,vec3(18.111, 13.252, 17.129))));
        }
        
        int GetLocation64(vec3 RayPosFloor, uint Depth){
          ivec3 mRayPosFloor = ivec3(RayPosFloor) >> (6u + Depth); //Divides by 64 (times the LOD level). (gets location within 64, don't need to mod because this is the texture size)
          ivec3 Position = mRayPosFloor.zyx - iOffset64[Depth].zyx;
          if(Position.x < 0 || Position.y < 0 || Position.z < 0 || Position.x > 7 || Position.y > 7 || Position.z > 7) return -1;
          Position.z += int(Depth) * 8; //Select correct LOD level
          return int(texelFetch(iTex64, Position, 0).r);
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
          if((Location64 & 0x8000) != 0) return 49151;
          uint Location8 = GetLocation8(Location64 & 0x0fff, RayPosFloor);
          if((Location8 & 0x80000000u) != 0u) return 49151;
          int Colour;
          GetType1(int(Location8 & 0x3fffffffu), RayPosFloor, Colour);
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
          float Unloading = max((Distance - 25.) / MAX_ROUGHNESS_DISTANCE, 0.);
          
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
        
        vec4 Raytrace(vec3 RayOrigin, vec3 RayDirection, float Distance, uint Depth, int Steps){
          float Factor = float(1 << Depth);
          
          vec3 TrueRayOrigin = RayOrigin;
          vec3 RayDirectionSign = sign(RayDirection);
          vec3 Mask = vec3(0.);
          vec3 Mask1 = vec3(0.);
          bool ExitLevel = false;
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
          
          int Max = iIsFirstPass ? 400 : 420;//Improves framerate substantially (280 -> 360)
          for(int i = 0; i < Max && Distance < MAX_DISTANCE && !HitVoxel && Depth < 8u; ++i){
            //s.x++;
            if(NextLODLevel || i > int(Depth) * 40 + 120 && Depth < 7u){
              NextLODLevel = false;
              Depth++;
              Factor = float(1 << Depth);
              
              RayOrigin = RayPosFloor + RayPosFract + RayOriginOffset;
              TrueRayOrigin = RayOrigin;
              
              ExitLevel = false;
              Level = MAX_DETAIL;
              Size = pow(8., float(Level)) * Factor;
              HitVoxel = false;
              
              RayOriginOffset = floor(RayOrigin / Size) * Size;
              RayOrigin -= RayOriginOffset;
              
              RayPosFloor = floor(RayOrigin / Size) * Size; //Voxel coordinate
              RayPosFract = RayOrigin - RayPosFloor; //Sub-voxel coordinate                   
              LastRayPosFloor = RayPosFloor;
            }
            while(ExitLevel){
              Level++;
              for(int i = 0; i < 3; ++i){
                Size *= 2.;
                vec3 NewRayPosFloor = floor(RayPosFloor/Size) * Size;
                RayPosFract += RayPosFloor - NewRayPosFloor;
                RayPosFloor = NewRayPosFloor;
              }
              ExitLevel = Level < MAX_DETAIL && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.); //This is for when we go up by multiple levels at once (e.g. 2->0)
            }
            
            vec3 TrueRayPosFloor = RayPosFloor + RayOriginOffset;
            
            int VoxelState;
            switch(Level){
              case -1:
              case -2:{
                VoxelState = Depth == 0u ? GetRoughnessMap(TrueRayPosFloor, VoxelType, Level, Distance) : 2;
                break;
              }
              case 0:{
                //Colour = vec3(1.);
                VoxelState = GetType1(Location8, TrueRayPosFloor / Factor, VoxelType);//GetType1Test(TrueRayPosFloor, VoxelType);//
                //Colour = normalize(vec3(VoxelColour >> 11, (VoxelColour >> 5) & 32, VoxelColour & 32) + vec3(0.45, 0., 0.95));
                if(VoxelState == 0) switch(VoxelType){
                  case 1:{
                    Colour = vec4(.1, .8, .2, 1.);//vec3(.133, .335, .898);//
                    break;
                  }
                  case 2:{
                    Colour = vec4(.4, .4, .4, 1.);
                    break;
                  }
                  case 3:{
                    Colour = vec4(.2, .2, .2, 1.);
                    break;
                  }
                  case 4:{
                    Colour = vec4(.133, .60, .62, 1.);
                    break;
                  }
                  case 8:{
                    Colour = vec4(.1, .6, .25, 1.);
                    break;
                  }
                  case 9:{
                    Colour = vec4(.5, .2, .05, 1.);
                    break;
                  }
                }
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
            }
            
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
                if(Level >= 0) Mask1 = Mask;
                float NearestVoxelDistance = dot(Hit, Mask);
                Distance += NearestVoxelDistance;
                vec3 Step = Mask * RayDirectionSign * Size;
                
                RayPosFract += RayDirection * NearestVoxelDistance - Step;
                
                LastRayPosFloor = RayPosFloor;
                RayPosFloor += Step;
                
                ExitLevel = Level < MAX_DETAIL && floor(RayPosFloor/Size/8.) != floor(LastRayPosFloor/Size/8.); //Check if the edge of the level has been reached
                break;
              }
              case 2: HitVoxel = true;
            }
          }
          if(HitVoxel){
            Colour.xyz *= 1. - Random(vec4(floor((RayPosFloor + RayOriginOffset) * 16.) / 16., 0.)) * .15;
            Colour.xyz *= length(Mask * vec3(.75, 1., .5));
          }
          else Colour = vec4(0.25, .25, .25, 0.);
          
          if(true || iIsFirstPass){
            gl_FragDepth = EncodeLogarithmicDepth(Distance);
          }
          return Colour + vec4(s / 200., 0.);
        }
        
        void mainImage(out vec4 fragColor, in vec2 fragCoord){
          vec2 uv = (fragCoord.xy * 2. - iResolution.xy) / iResolution.y;
          vec3 RayOrigin = iPosition;
          vec3 RayDirection = normalize(vec3(uv, .8)) * RotateX(iRotation.x) * RotateY(iRotation.y);
          vec4 Colour;
          float Distance = 0.;
          
          if(!iIsFirstPass){
            ivec2 ScaledCoordinates = ivec2((fragCoord.xy + 0.) / iUpscalingKernelSize * iRenderSize);
            Colour = texelFetch(iColour, ScaledCoordinates, 0).rgba; //Backup colour in case nothing is hit
            float Depth = DecodeLogarithmicDepth(texelFetch(iDepth, ScaledCoordinates, 0).r);//intBitsToFloat((Converted.x << 24) | (Converted.y << 16) | (Converted.z << 8) | Converted.w);
            
            vec3 NewOffset = RayOrigin + Depth * RayDirection * .8;
            /*for(int i = 0; i < 10 && Depth > 0.; ++i){
              Depth = Depth / 1.02 - .25 * float(2 * i + 1);
              NewOffset = RayOrigin + max(0., Depth) * RayDirection;
              //if(GetMaskDirectly(NewOffset) == 1) break;
            }*/
            Distance = length(RayOrigin - NewOffset);
            RayOrigin = NewOffset;
          }
          
          Colour = Raytrace(RayOrigin, RayDirection, Distance, 0u, 0);
          if(Colour.a == 0.) discard;
          fragColor = Colour;
          
          /*if(iIsFirstPass){
            gl_FragDepth = EncodeLogarithmicDepth(Distance);
          }*/
        }
        
        void main(){
          mainImage(gl_FragColor, vUv * iResolution.xy);
        }
      `
    });

    this.Renderer.Events.AddEventListener("RenderingScaledTarget", function(){
      this.Material.uniforms.iColour.value = this.DummyColourTexture;
      this.Material.uniforms.iDepth.value = this.DummyDepthTexture;
      this.Material.uniforms.iIsFirstPass.value = true;
    }.bind(this));
    this.Renderer.Events.AddEventListener("RenderingCanvas", function(){
      this.Material.uniforms.iColour.value = this.Renderer.ScaledTarget.texture;
      this.Material.uniforms.iDepth.value = this.Renderer.ScaledTarget.depthTexture;

      this.Material.uniforms.iIsFirstPass.value = !this.Renderer.UseScaledTarget; //Is first pass if upscaling is disabled.
    }.bind(this));

    const Mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.Material);
    Mesh.frustumCulled = false;
    this.Scene.add(Mesh);

    Application.Main.Renderer.Events.AddEventListener("BeforeRender", this.UpdateUniforms.bind(this));

    void function AnimationFrame(){
      (window.requestIdleCallback ?? window.requestAnimationFrame)(AnimationFrame.bind(this), {"timeout": 400});
      this.Material.uniforms.iOffset64.needsUpdate = true;
      this.Tex64.needsUpdate = true;

      //TODO: This still causes small lag spikes when updating.
      //Possible fixes: spread out updates, merge nearby segments, etc
      const UpdatedData64 = [];
      for(let Depth = 0; Depth < 8; ++Depth) for(let x64 = 0; x64 < 8; x64++) for(let y64 = 0; y64 < 8; y64++) for(let z64 = 0; z64 < 8; z64++){
        const Index64 = (Depth << 9) | (x64 << 6) | (y64 << 3) | z64;
        if(((this.GPUData64[Index64] >> 14) & 1) === 1) UpdatedData64.push(Index64);
      }

      if(UpdatedData64.length === 0) return;

      const UpdatedSegments = new Set;
      for(const Index64 of UpdatedData64){
        const Info64 = this.GPUData64[Index64];
        if((Info64 & 0x8000) !== 0) continue; //Just in case
        const Location64 = Info64 & 0x0fff;
        const StartIndex8 = Location64 << 9;
        for(let Index8 = StartIndex8; Index8 < StartIndex8 + 512; ++Index8){
          const Info8 = this.GPUData8[Index8];
          if((Info8 & 0x80000000) !== 0 || (Info8 & 0x40000000) === 0) continue; //Is either empty or has no changes
          const SegmentColumn = (Info8 & 0x0003ffff) >> 9;
          if(UpdatedSegments.size < 10 || UpdatedSegments.has(SegmentColumn)){
            UpdatedSegments.add(SegmentColumn); //if this.UpdatedSegments.size < 10
            this.GPUData8[Index8] &= ~(1 << 30); //Set update to false
          }
        }
        if(UpdatedSegments.size < 10) this.GPUData64[Index64] &= ~(1 << 14); //Toggle update to false
        //The if is there because if the size is greater than 10, most likely only part of the Data64 has been updated (due to segment distribution)
      }

      this.Tex8.needsUpdate = true; //This might be too much effort to selectively update (and also has weird artefacts)


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
  }
};