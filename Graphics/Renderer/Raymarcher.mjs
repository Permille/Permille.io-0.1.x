import * as THREE from "../../Libraries/Three/Three.js";

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

    this.UpdateBuffer = 1;

    this.VoxelTypesTex = [];
    this.Tex1 = [];
    this.Tex8 = [];
    for(let i = 0; i < 2; ++i) { //Generating double texutre buffers for VoxelTypesTex, Tex1 and Tex8. Tex64 will stay as a single buffer.
      const VoxelTypesTex = new THREE.DataTexture3D(this.VoxelTypes, 512, 2048, 256);
      VoxelTypesTex.internalFormat = "R16UI";
      VoxelTypesTex.format = THREE.RedIntegerFormat;
      VoxelTypesTex.type = THREE.UnsignedShortType;
      VoxelTypesTex.minFilter = VoxelTypesTex.magFilter = THREE.NearestFilter;
      VoxelTypesTex.unpackAlignment = 1;
      VoxelTypesTex.needsUpdate = true;
      this.VoxelTypesTex.push(VoxelTypesTex);


      const Tex1 = new THREE.DataTexture3D(this.Data1, 64, 2048, 256);
      Tex1.internalFormat = "R16UI";
      Tex1.format = THREE.RedIntegerFormat;
      Tex1.type = THREE.UnsignedShortType;
      Tex1.minFilter = Tex1.magFilter = THREE.NearestFilter;
      Tex1.unpackAlignment = 1;
      Tex1.needsUpdate = true;
      this.Tex1.push(Tex1);


      const Tex8 = new THREE.DataTexture3D(this.Data8, 1, 512, 512);
      Tex8.internalFormat = "R32UI";
      Tex8.format = THREE.RedIntegerFormat;
      Tex8.type = THREE.UnsignedIntType;
      Tex8.minFilter = Tex8.magFilter = THREE.NearestFilter;
      Tex8.unpackAlignment = 1;
      Tex8.needsUpdate = true;
      this.Tex8.push(Tex8);
    }

    this.Tex64 = new THREE.DataTexture3D(this.Data64, 8, 8, 8*8);
    this.Tex64.internalFormat = "R16UI";
    this.Tex64.format = THREE.RedIntegerFormat;
    this.Tex64.type = THREE.UnsignedShortType;
    this.Tex64.minFilter = this.Tex64.magFilter = THREE.NearestFilter;
    this.Tex64.unpackAlignment = 1;
    this.Tex64.needsUpdate = true;

    /*const SeededRandom = function(){
      let Seed = 0x1511426a;
      return function(){
        Seed = ((Seed >>> 16) ^ Seed) * 0x045d9f3b;
        Seed = ((Seed >>> 16) ^ Seed) * 0x045d9f3b;
        Seed = (Seed >>> 16) ^ Seed;
        return Seed / 0xffffffff + .5;
      };
    }();

    for(let x64 = 0, Counter64 = 0, Counter8 = 0; x64 < 8; x64++) for(let y64 = 0; y64 < 8; y64++) for(let z64 = 0; z64 < 8; z64++){
      const Index64 = x64 * 64 + y64 * 8 + z64;
      if(SeededRandom() < .25) { //64 exists
        this.Data64[Index64] = Counter64;
        for(let x8 = 0; x8 < 8; x8++) for(let y8 = 0; y8 < 8; y8++) for(let z8 = 0; z8 < 8; z8++){
          const Index8 = (Counter64 << 9) | (x8 << 6) | (y8 << 3) | z8;
          if(SeededRandom() < .6){ //8 exists
            this.Data8[Index8] = Counter8;
            for(let x1 = 0; x1 < 8; x1++) for(let y1 = 0; y1 < 8; y1++){
              const Index1 = (Counter8 << 6) | (x1 << 3) | y1;
              for(let z1 = 0; z1 < 8; z1++){
                const FullIndex1 = (Index1 << 3) | z1;
                //Finally
                if(SeededRandom() < .5){ //1 exists
                  this.Data1[Index1] |= 0b00 << (z1 * 2); //Set subdivide (for roughness thing)
                  this.VoxelTypes[FullIndex1] = (SeededRandom() * 65536) | 0;
                } else this.Data1[Index1] |= 0b01 << (z1 * 2); //Set empty
              }
            }
            Counter8++;
          } else{ //8 doesn't exist
            this.Data8[Index8] |= 1 << 31;
          }
        }
        Counter64++; //Increment only if data in 8 was written to save space.
      } else{ //64 doesn't exist
        this.Data64[Index64] = 0b1000000000000000; //Doesn't exist.
      }
    }*/

    this.Material = new THREE.ShaderMaterial({
      "uniforms": {
        iResolution: {value: new THREE.Vector2(1920, 1080)},
        iTime: {value: 0},
        iMouse: {value: new THREE.Vector2(0, 0)},
        iRotation: {value: new THREE.Vector3(0, 0, 0)},
        iPosition: {value: new THREE.Vector3(0, 0, 0)},
        iScalingFactor: {value: 0},
        iVoxelTypesTex: {value: this.VoxelTypesTex[0]},
        iTex1: {value: this.Tex1[0]},
        iTex8: {value: this.Tex8[0]},
        iTex64: {value: this.Tex64},
        FOV: {value: 110}
      },
      "transparent": true,
      "alphaTest": 0.5,
      "depthTest": false,
      "depthWrite": false,
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
        uniform mediump usampler3D iTex1;
        uniform highp usampler3D iTex8;
        uniform mediump usampler3D iTex64;
        uniform mediump usampler3D iVoxelTypesTex;
        
        
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
        const float MAX_DISTANCE = 1250.;
        const float MAX_ROUGHNESS_DISTANCE = 50.;
        const int MAX_DETAIL = 2;
        const int MIN_DETAIL = -2;
        
        const float SCALE = 8.; //Only works for powers of 2
        const int POWER = int(log2(SCALE));
        
        float Random(vec4 v){
          return fract(1223.34 * sin(dot(v,vec4(181.11, 132.52, 171.29, 188.42))));
        }
        
        float manhattan(vec3 a, vec3 b){
          return dot(abs(a - b), vec3(1.));
        }
        
        int GetLocation64(vec3 RayPosFloor){
          ivec3 mRayPosFloor = ivec3(RayPosFloor) >> 6; //Divides by 64. (gets location within 64, don't need to mod because this is the texture size)
          return int(texelFetch(iTex64, mRayPosFloor.zyx, 0).r);
        }
        uint GetLocation8(int Location64, vec3 RayPosFloor){
          ivec3 mRayPosFloor = (ivec3(RayPosFloor) >> 3) & 7; //Gets location within 8
          int Pos8XYZ = (mRayPosFloor.x << 6) | (mRayPosFloor.y << 3) | mRayPosFloor.z;
          return texelFetch(iTex8, ivec3(0, Pos8XYZ, Location64), 0).r;
        }
        int GetType1(int Location8, vec3 RayPosFloor, out int Colour){
          //return 2;//int(Random(vec4(RayPosFloor, 0.)) * 3.);
          ivec3 mRayPosFloor = ivec3(RayPosFloor) & 7; //Gets location within 1
          int Pos1XY = (mRayPosFloor.x << 3) | mRayPosFloor.y;
          
          //First set colour (it is passed by reference)
          Colour = int(texelFetch(iVoxelTypesTex, ivec3((Pos1XY << 3) | mRayPosFloor.z, Location8 & 2047, Location8 >> 11), 0).r);
          return int((texelFetch(iTex1, ivec3(Pos1XY, Location8 & 2047, Location8 >> 11), 0).r >> (mRayPosFloor.z * 2)) & 3u);
        }
        int GetRoughnessMap_122(vec3 RayPosFloor, int Type, int Level, vec3 Mask1, vec3 RayOrigin){
          if(Level > -2) return 0;
          bvec3 RayPosSides = greaterThan(abs(fract(RayPosFloor) - .5), vec3(7. / 16.));
          if(all(not(RayPosSides))) return 2;
          vec3 RayPosScaled = floor(RayPosFloor * 16.) / 16.;
          if(RayPosSides.x) RayPosFloor.yz = RayPosScaled.yz;
          if(RayPosSides.y) RayPosFloor.xz = RayPosScaled.xz;
          if(RayPosSides.z) RayPosFloor.xy = RayPosScaled.xy;
          float ComponentSum = dot(vec3(RayPosSides), vec3(1.));
          float Depth = 16. - abs(length(vec3(RayPosSides) * abs(fract(RayPosFloor) - .5))) * 32.;
          return Random(vec4(RayPosFloor * vec3(not(RayPosSides)), 0.)) < Depth ? 0 : 2;
        }
        int GetRoughnessMap(vec3 RayPosFloor, int Type, int Level, vec3 Mask1, vec3 RayOrigin){
          //return 2;
          //if(Type != 8) return 2;
          if(Level > -2) return 0;
          bvec3 bMask1 = bvec3(Mask1);
          bvec3 RayPosSides = greaterThanEqual(abs((fract(RayPosFloor) - .4995)), vec3(7./16.));
          if(all(not(RayPosSides))) return 2; //This is in the middle
          
          vec3 RayPosScaled = floor(RayPosFloor * 16.) / 16.;
          
          if(RayPosSides.x){
            vec3 RayPosModified = RayPosFloor;
            RayPosModified.yz = RayPosScaled.yz;
            float RandomNum = Random(vec4(floor(RayPosModified) + RayPosModified * vec3(not(RayPosSides)), 0.));
            float Depth = abs((fract(RayPosModified) - .499)).x * 16. - 7.;
            if(RandomNum < Depth) return 0;
          }
          if(RayPosSides.y){
            vec3 RayPosModified = RayPosFloor;
            RayPosModified.xz = RayPosScaled.xz;
            float RandomNum = Random(vec4(floor(RayPosModified) + RayPosModified * vec3(not(RayPosSides)), 0.));
            float Depth = abs((fract(RayPosModified) - .499)).y * 16. - 7.;
            if(RandomNum < Depth) return 0;
          }
          if(RayPosSides.z){
            vec3 RayPosModified = RayPosFloor;
            RayPosModified.xy = RayPosScaled.xy;
            float RandomNum = Random(vec4(floor(RayPosModified) + RayPosModified * vec3(not(RayPosSides)), 0.));
            float Depth = abs((fract(RayPosModified) - .499)).z * 16. - 7.;
            if(RandomNum < Depth) return 0;
          }
          return 2;
          
          //float Depth = 16. - abs(length(vec3(RayPosSides) * fract(RayPosFloor)) - .492) * 32.;
          //float Depth = (abs((fract(RayPosFloor) - .499)) * 16. - 7.).y;
          //if(all(lessThan(vec3(RandomNum), Depth))) return 2;
          //return 0;
          //float Depth = length(abs(vec3(RayPosSides) * (fract(RayPosFloor) - .499))) * 16. - 7.;
          //return RandomNum < Depth ? 0 : 2;
          //return /* sin(iTime / 1000.) / 2. + .5*/ < Depth ? 0 : 2;
          
          //return Random(vec4(RayPosFloor, 0.)) + length(abs(fract(RayPosFloor) - .5)) > .75 ? 0 : 2;
          
        }
        
        int GetRoughnessMap_(vec3 RayPosFloor, int Type, int Level, vec3 Mask1, vec3 RayOrigin){
          //if(Type != 8) return 2;
          if(Level > -2) return 0;
          bvec3 RayPosSides = bvec3(Mask1);
          if(all(not(RayPosSides))) return 2; //Camera is probably in the middle of a block
          vec3 RayPosScaled = floor(RayPosFloor * 16.) / 16.;
          if(RayPosSides.x) RayPosFloor.yz = RayPosScaled.yz;
          else if(RayPosSides.y) RayPosFloor.xz = RayPosScaled.xz;
          else if(RayPosSides.z) RayPosFloor.xy = RayPosScaled.xy;
          //float Depth = 16. - abs(length(vec3(RayPosSides) * fract(RayPosFloor)) - .492) * 32.;
          float Depth = length(abs(vec3(RayPosSides) * (fract(RayPosFloor) - .48))) * 16. - 7.; //or *8.-3., *4.-1.
          float Unloading = max((length(RayOrigin - floor(RayPosFloor)) - 8.) / MAX_ROUGHNESS_DISTANCE, 0.);
          return Random(vec4(RayPosFloor * vec3(not(RayPosSides)), 0.)) + Unloading < Depth ? 0 : 2;
        }
        
        void mainImage(out vec4 fragColor, in vec2 fragCoord){
          vec2 uv = (fragCoord.xy * 2. - iResolution.xy) / iResolution.y;
          vec3 RayOrigin = iPosition;
          vec3 RayDirection = normalize(vec3(uv, .8)) * RotateX(iRotation.x) * RotateY(iRotation.y);
          vec3 RayDirectionSign = sign(RayDirection);
          
          vec3 Mask = vec3(0.);
          vec3 Mask1 = vec3(0.);
          bool ExitLevel = false;
          int Level = MAX_DETAIL;
          float Size = pow(SCALE, float(MAX_DETAIL));
          float Distance = 0.;
          bool HitVoxel = false;
          
          vec3 RayOriginOffset = floor(RayOrigin / Size) * Size;
          RayOrigin -= RayOriginOffset;
          
          vec3 RayPosFloor = floor(RayOrigin / Size) * Size; //Voxel coordinate
          vec3 RayPosFract = RayOrigin - RayPosFloor; //Sub-voxel coordinate                   
          vec3 LastRayPosFloor = RayPosFloor;
          vec3 Correction = 1./max(abs(RayDirection), 1e-4);
          
          int Location64 = 0;
          int Location8 = 0;
          
          vec3 Colour = vec3(0.);
          int VoxelType = 0;
          
          vec3 s = vec3(0.);
          
          for(int i = 0; i < 400 && Distance < MAX_DISTANCE && !HitVoxel; ++i){
            //s.r++;
            while(ExitLevel){
              Level++;
              Size *= SCALE;
              vec3 NewRayPosFloor = floor(RayPosFloor/Size) * Size;
              RayPosFract += RayPosFloor - NewRayPosFloor;
              RayPosFloor = NewRayPosFloor;
              ExitLevel = Level < MAX_DETAIL && floor(RayPosFloor/Size/SCALE) != floor(LastRayPosFloor/Size/SCALE); //This is for when we go up by multiple levels at once (e.g. 2->0)
            }
            
            vec3 TrueRayPosFloor = RayPosFloor + RayOriginOffset;
            
            int VoxelState;
            switch(Level){
              case 2:{ //64
                int Result = GetLocation64(TrueRayPosFloor);
                Location64 = Result & 0x01ff;
                VoxelState = Result >> 15; //Get whether it exists
                break;
              }
              case 1:{
                uint Result = GetLocation8(Location64, TrueRayPosFloor);
                VoxelState = int(Result >> 31);
                Location8 = int(Result & 0x3fffffffu);
                break;
              }
              case 0:{
                VoxelState = GetType1(Location8, TrueRayPosFloor, VoxelType);
                //Colour = normalize(vec3(VoxelColour >> 11, (VoxelColour >> 5) & 32, VoxelColour & 32) + vec3(0.45, 0., 0.95));
                switch(VoxelType){
                  case 1:{
                    Colour = vec3(.1, .8, .2);
                    break;
                  }
                  case 2:{
                    Colour = vec3(.4, .4, .4);
                    break;
                  }
                  case 3:{
                    Colour = vec3(.2, .2, .2);
                    break;
                  }
                  case 8:{
                    Colour = vec3(.1, .6, .25);
                    break;
                  }
                  case 9:{
                    Colour = vec3(.5, .2, .05);
                    break;
                  }
                }
                break;
              }
              case -1:
              case -2:{
                VoxelState = GetRoughnessMap(TrueRayPosFloor, VoxelType, Level, Mask1, RayOrigin + RayOriginOffset);
                break;
              }
            }
            
            switch(VoxelState){ //Get random voxel at proper scale (Size)
              case 0:{ //Subdivide
                if(Level > MIN_DETAIL){
                  Level--;
                  for(int j = 0; j < POWER; ++j){ //Not sure how to unroll this loop without weird artefacts...
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
                
                ExitLevel = Level < MAX_DETAIL && floor(RayPosFloor/Size/SCALE) != floor(LastRayPosFloor/Size/SCALE); //Check if the edge of the level has been reached
                break;
              }
              case 2: HitVoxel = true;
            }
          }
          
          float fLevel = float(Level) + 4.;
          Colour *= Random(vec4(floor((RayPosFloor + RayOriginOffset) * 16.) / 16., 0.)) * .2 + 1.;
          //Colour *= normalize(vec3(sin(fLevel) * .5 + .5, cos(fLevel * 1.7) * .5 + .5, sin(fLevel + 1.) * .5 + .5));
          fragColor = vec4(s / 50. + Colour * length(Mask * vec3(.75, 1., .5)), 1.);
        }
        
        void main(){
          mainImage(gl_FragColor, vUv * iResolution.xy);
        }
      `
    });

    const Mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.Material);
    Mesh.frustumCulled = false;
    this.Scene.add(Mesh);

    this.TransferBuffers = false;
    Application.Main.WorkerLoadingPipelineHandler.Events.AddEventListener("FinishedLoadingBatch", function(Batch){
      this.TransferBuffers = true;
    }.bind(this));

    let Iteration = 0;
    const Step = 3;

    void function AnimationFrame(){
      window.requestAnimationFrame(AnimationFrame.bind(this));
      this.UpdateUniforms();

      if(Iteration === 0 && !this.TransferBuffers) return;
      this.TransferBuffers = false;

      this.Renderer.Renderer.copyTextureToTexture3D(
        new THREE.Box3(new THREE.Vector3(0, 0, Iteration * 2), new THREE.Vector3(0, 511, (Iteration + Step) * 2 + 1)),
        new THREE.Vector3(0, 0, Iteration * 2),
        this.Tex8[this.UpdateBuffer],
        this.Tex8[this.UpdateBuffer]
      );

      this.Renderer.Renderer.copyTextureToTexture3D(
        new THREE.Box3(new THREE.Vector3(0, 0, Iteration), new THREE.Vector3(63, 2047, Iteration + Step)),
        new THREE.Vector3(0, 0, Iteration),
        this.Tex1[this.UpdateBuffer],
        this.Tex1[this.UpdateBuffer]
      );

      this.Renderer.Renderer.copyTextureToTexture3D(
        new THREE.Box3(new THREE.Vector3(0, 0, Iteration), new THREE.Vector3(511, 2047, Iteration + Step)),
        new THREE.Vector3(0, 0, Iteration),
        this.VoxelTypesTex[this.UpdateBuffer],
        this.VoxelTypesTex[this.UpdateBuffer]
      );

      Iteration = (Iteration + Step + 1) & 255;

      if(Iteration === 0){ //Transfer completed, swap buffers:
        console.log("Swapped buffers!");
        this.Tex64.needsUpdate = true;
        this.Material.uniforms.iVoxelTypesTex.value = this.VoxelTypesTex[this.UpdateBuffer];
        this.Material.uniforms.iTex8.value = this.Tex8[this.UpdateBuffer];
        this.Material.uniforms.iTex1.value = this.Tex1[this.UpdateBuffer];

        this.UpdateBuffer = (this.UpdateBuffer + 1) & 1;

        //Notify generation threads that they can continue because the data has been transferred to the gpu

        Application.Main.WorkerLoadingPipeline.postMessage({
          "Request": "FinishedGPUDataTransfer"
        });
      }

    }.bind(this)();
  }
  UpdateUniforms(){
    this.Material.uniforms["iResolution"].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.Material.uniforms["iTime"].value = window.performance.now();
    this.Material.uniforms["iRotation"].value = new THREE.Vector3(this.Renderer.Camera.rotation.x, this.Renderer.Camera.rotation.y, this.Renderer.Camera.rotation.z);
    this.Material.uniforms["iPosition"].value = new THREE.Vector3(this.Renderer.Camera.position.x, this.Renderer.Camera.position.y, this.Renderer.Camera.position.z);
  }
};