
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

    this.Data1 = new Uint16Array(64*2048*256); //64 MB
    // (it's actually supposed to be 1024*2048*64 to be full-size, but that including types would probably start wasting storage).
    // it's unlikely that the entire buffer will be used anyway, and I can always add functionality to expand it if and when required.

    this.Tex1 = new THREE.DataTexture3D(this.Data1, 64, 2048, 256);
    this.Tex1.internalFormat = "R16UI";
    this.Tex1.format = THREE.RedIntegerFormat;
    this.Tex1.type = THREE.UnsignedShortType;
    this.Tex1.minFilter = this.Tex1.magFilter = THREE.NearestFilter;
    this.Tex1.unpackAlignment = 1;


    this.VoxelTypes = new Uint16Array(512*2048*256); //512 MB

    this.VoxelTypesTex = new THREE.DataTexture3D(this.VoxelTypes, 512, 2048, 256);
    this.VoxelTypesTex.internalFormat = "R16UI";
    this.VoxelTypesTex.format = THREE.RedIntegerFormat;
    this.VoxelTypesTex.type = THREE.UnsignedShortType;
    this.VoxelTypesTex.minFilter = this.VoxelTypesTex.magFilter = THREE.NearestFilter;
    this.VoxelTypesTex.unpackAlignment = 1;


    this.Data8 = new Uint32Array(512 * 512); //1 MB

    this.Tex8 = new THREE.DataTexture3D(this.Data8, 1, 512, 512);
    this.Tex8.internalFormat = "R32UI";
    this.Tex8.format = THREE.RedIntegerFormat;
    this.Tex8.type = THREE.UnsignedIntType;
    this.Tex8.minFilter = this.Tex8.magFilter = THREE.NearestFilter;
    this.Tex8.unpackAlignment = 1;


    this.Data64 = new Uint16Array(8*8*8*8); //8 kB (8*8*8, and 8 LODs)

    this.Tex64 = new THREE.DataTexture3D(this.Data64, 8, 8, 8*8);
    this.Tex64.internalFormat = "R16UI";
    this.Tex64.format = THREE.RedIntegerFormat;
    this.Tex64.type = THREE.UnsignedShortType;
    this.Tex64.minFilter = this.Tex64.magFilter = THREE.NearestFilter;
    this.Tex64.unpackAlignment = 1;

    const SeededRandom = function(){
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
                  this.Data1[Index1] |= 0b00 << (z1 * 2); //Subdivide (for roughness thing)
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
    }

    console.log(this.Data64);
    console.log(this.Data8);
    console.log(this.Data1);

    this.Material = new THREE.ShaderMaterial({
      "uniforms": {
        iResolution: {value: new THREE.Vector2(1920, 1080)},
        iTime: {value: 0},
        iMouse: {value: new THREE.Vector2(0, 0)},
        iRotation: {value: new THREE.Vector3(0, 0, 0)},
        iPosition: {value: new THREE.Vector3(0, 0, 0)},
        iScalingFactor: {value: 0},
        iTex1: {value: this.Tex1},
        iTex8: {value: this.Tex8},
        iTex64: {value: this.Tex64},
        iVoxelTypesTex: {value: this.VoxelTypesTex},
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
        const int MAX_DETAIL = 2;
        const int MIN_DETAIL = -1;
        
        const float SCALE = 8.; //Only works for powers of 2
        const int POWER = int(log2(SCALE));
        
        float Random(vec4 v){
          return fract(1223.34 * tan(dot(v,vec4(181.11, 132.52, 171.29, 188.42)))); 
        }
        
        int GetLocation64(vec3 RayPosFloor){
          ivec3 mRayPosFloor = ivec3(RayPosFloor) >> 6; //Divides by 64. (gets location within 64, don't need to mod because this is the texture size)
          return int(texelFetch(iTex64, mRayPosFloor, 0).r);
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
        int GetRoughnessMap(vec3 RayPosFloor){
          return Random(vec4(RayPosFloor, 0.)) > .75 ? 0 : 2;
        }
        
        void mainImage(out vec4 fragColor, in vec2 fragCoord){
          vec2 uv = (fragCoord.xy * 2. - iResolution.xy) / iResolution.y;
          vec3 RayOrigin = iPosition;
          vec3 RayDirection = normalize(vec3(uv, .8)) * RotateX(iRotation.x) * RotateY(iRotation.y);
          vec3 RayDirectionSign = sign(RayDirection);
          
          vec3 Mask = vec3(0.);
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
          
          for(int i = 0; i < 400 && Distance < MAX_DISTANCE && !HitVoxel; ++i){
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
                Location64 = GetLocation64(TrueRayPosFloor);
                VoxelState = Location64 >> 15; //Get whether it exists
                break;
              }
              case 1:{
                uint Result = GetLocation8(Location64, TrueRayPosFloor);
                VoxelState = int(Result >> 31);
                Location8 = int(Result & 0x7fffffffu);
                break;
              }
              case 0:{
                int VoxelColour;
                VoxelState = GetType1(Location8, TrueRayPosFloor, VoxelColour);
                Colour = normalize(vec3(VoxelColour >> 11, (VoxelColour >> 5) & 32, VoxelColour & 32) + 1.);
                break;
              }
              case -1:{
                VoxelState = GetRoughnessMap(TrueRayPosFloor);
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
          //vec3 Colour = normalize(vec3(sin(fLevel) * .5 + .5, cos(fLevel * 1.7) * .5 + .5, sin(fLevel + 1.) * .5 + .5));
          fragColor = vec4(Colour * length(Mask * vec3(.9, 1., .8)), 1.);
        }
        
        void main(){
          mainImage(gl_FragColor, vUv * iResolution.xy);
        }
      `
    });

    const Mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.Material);
    Mesh.frustumCulled = false;
    this.Scene.add(Mesh);

    void function AnimationFrame(){
      window.requestAnimationFrame(AnimationFrame.bind(this));
      this.UpdateUniforms();
    }.bind(this)();

    this.World.Events.AddEventListener("SetVirtualRegion", function(Event){
      this.AddRegion(Event.Region);
    }.bind(this));
  }
  UpdateUniforms(){
    this.Material.uniforms["iResolution"].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.Material.uniforms["iTime"].value = window.performance.now();
    this.Material.uniforms["iRotation"].value = new THREE.Vector3(-this.Renderer.Camera.rotation.x, -this.Renderer.Camera.rotation.y, this.Renderer.Camera.rotation.z);
    this.Material.uniforms["iPosition"].value = new THREE.Vector3(this.Renderer.Camera.position.x, this.Renderer.Camera.position.y, -this.Renderer.Camera.position.z);
  }
  AddRegion(Region){
    this.Statistics.RD = window.performance.now();
    /*const RegionX = Region.RegionX;
    const RegionY = Region.RegionY;
    const RegionZ = Region.RegionZ;
    const RegionData = Region.RegionData;

    const Geometry = new THREE.BoxGeometry(32, 64, 32);

    const Cube = new THREE.Mesh(Geometry, this.Material);
    Cube.position.x = RegionX * 32;
    Cube.position.y = RegionY * 64;
    Cube.position.z = RegionZ * 32;

    this.Scene.add(Cube);*/
  }
};