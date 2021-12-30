import * as THREE from "../../Libraries/Three/Three.js";
export default class Raymarcher{
  constructor(World, Renderer){
    return;
    this.World = World;
    this.Renderer = Renderer;
    this.Scene = this.Renderer.Scene;
    this.Statistics = {
      "RD": 0,
      "VD": 0
    };

    this.Data1 = new Uint8Array(32*2048*2048); //128 MB

    this.Tex1 = new THREE.DataTexture3D(this.Data1, 32, 2048, 2048);
    this.Tex1.internalFormat = "R8UI";
    this.Tex1.format = THREE.RedIntegerFormat;
    this.Tex1.type = THREE.UnsignedByteType;
    this.Tex1.minFilter = this.Tex1.magFilter = THREE.NearestFilter;
    this.Tex1.unpackAlignment = 1;


    this.Data8 = new Uint8Array(262144); //512 kB

    this.Tex8 = new THREE.DataTexture(this.Data8, 128, 2048);
    this.Tex8.internalFormat = "R8UI";
    this.Tex8.format = THREE.RedIntegerFormat;
    this.Tex8.type = THREE.UnsignedByteType;
    this.Tex8.minFilter = this.Tex8.magFilter = THREE.NearestFilter;
    this.Tex8.unpackAlignment = 1;


    this.Data64 = new Uint16Array(8*8*8*8); //8 kB (8*8*8, and 8 LODs)

    this.Tex64 = new THREE.DataTexture3D(this.Data64, 8, 8, 8 * 8);
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

    for(let x64 = 0, Counter64 = 0; x64 < 8; x64++) for(let y64 = 0; y64 < 8; y64++) for(let z64 = 0; z64 < 8; z64++){
      const Index64 = x64 * 64 + y64 * 8 + z64;
      if(SeededRandom() < .1) { //64 exists
        this.Data64[Index64] = 0b0000000000000000 | (Counter64 & 0x1ff);
        for(let x8 = 0; x8 < 8; x8++) for(let y8 = 0; y8 < 8; y8++){
          const Index8 = Counter64 * 64 + x8 * 8 + y8;
          for(let z8 = 0; z8 < 8; z8++){ //All 8s are defined
            if(SeededRandom() < .5){ //8 exists
              this.Data8[Index8] |= 0 << z8; //Basically a no-op, this is just to show that 0s mark existence
              for(let x1 = 0; x1 < 8; x1++) for(let y1 = 0; y1 < 8; y1++){
                const Index1 = (Index8 * 8 + z8) * 64 + (x1 * 8 + y1);
                for(let z1 = 0; z1 < 8; z1++){
                  //Finally
                  if(SeededRandom() < .5){
                    this.Data1[Index1] |= 1 << z1; //Set solid block
                  }
                }
              }
            } else{ //8 doesn't exist
              this.Data8[Index8] |= 1 << z8;
            }
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
        FOV: 110
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
        uniform lowp usampler3D iTex1;
        uniform lowp usampler2D iTex8;
        uniform mediump usampler3D iTex64;
        
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
        
        /*ivec3 LastWorldSpaceLocation8 = ivec3(-2147483648);
        ivec3 LastDataSpaceLocation8 = ivec3(-2147483648);
        ivec3 LastWorldSpaceLocation64 = ivec3(-2147483648);
        ivec3 LastDataSpaceLocation64 = ivec3(-2147483648);*/
        
        float Expression(vec3 pos){
          float x = float(pos.x);
          float y = float(pos.y);
          float z = float(pos.z);
          
          return float(int(x) ^ int(y * z)) - 5.;
        }
        
        bool map(ivec3 pos){
          //pos >>= 1;
          //return length(mod(pos,18.0)-9.0) - 9.5 > 0.;
          
          //For when I implement chunk logic:
          //return (texelFetch(iMarchingTexture, ivec3(0, pos.y & 0x07, pos.z & 0x07), 0).r & (1u << (pos.x & 0x07))) != 0u;
          
          /*ivec3 pos64 = pos;
          uint location64 = texelFetch(iTex64, pos64, 0).r;
          ivec3 pos8 = location64 * 64u;
          return location64 != 32768u;*/
          
          
          return (texelFetch(iTex1, ivec3(pos.x >> 3, pos.y, pos.z), 0).r & (1u << (pos.x & 0x07))) != 0u;
          
          /*float x = float(pos.x);
          float y = float(pos.y);
          float z = float(pos.z);
          float CurrentSign = sign(Expression(vec3(x, y, z)));
          
          return sign(Expression(vec3(x + 1., y, z))) != CurrentSign ||
                 sign(Expression(vec3(x, y + 1., z))) != CurrentSign ||
                 sign(Expression(vec3(x, y, z + 1.))) != CurrentSign;*/
          /*if(pos.z < 0) return false;
          int x = int(pos.x);
          int y = int(pos.y);
          int z = int(pos.z);
          int r = (x+y)^(y+z)^(z+x);
          bool b = (abs(r*r*r/(y+x+int(iTime/50.))) & 16383) < 1000;
          return b;*/
        }
        
        /*void mainImage(out vec4 fragColor, in vec2 fragCoord){
          vec2 screenPos = (fragCoord.xy / iResolution.xy) * 2. - 1.;
          vec3 rayPos = iPosition;
          vec3 cameraDir = vec3(0., 0., 0.6);
          vec3 planeU = vec3(1., 0., 0.);
          vec3 planeV = vec3(0., 1., 0.) * iResolution.y / iResolution.x;
          vec3 rayDir = cameraDir + screenPos.x * planeU + screenPos.y * planeV;
          mat3 rot = RotateX(iRotation.x) * RotateY(iRotation.y);
          rayDir *= rot;
          
          ivec3 mapPos = ivec3(floor(rayPos));
          ivec3 startPos = mapPos;
          vec3 deltaDist = abs(vec3(length(rayDir)) / rayDir);
          ivec3 rayStep = ivec3(sign(rayDir));
          vec3 sideDist = (sign(rayDir) * (vec3(mapPos) - rayPos) + (sign(rayDir) * .5) + .5) * deltaDist;
          bvec3 mask;
          for(int i = 0; i < 200; ++i){
            if(map(mapPos)) break;
            mask = lessThanEqual(sideDist.xyz, min(sideDist.yzx, sideDist.zxy));
            sideDist += vec3(mask) * deltaDist;
            mapPos += ivec3(vec3(mask)) * rayStep;
          }
          vec3 color = sin(float(mapPos.z)+vec3(0,2,4)) * 0.5 + 0.5;
          if(mask.x) color *= .9;
          if(mask.y) color *= 1.;
          if(mask.z) color *= .8;
          fragColor = vec4(color, 1.);
        }*/
        
        void mainImage(out vec4 fragColor, in vec2 fragCoord){
          vec2 ScreenCoords = vPosition.xy;
          ScreenCoords.x *= iResolution.x / iResolution.y;
          ScreenCoords /= vPosition.w;
          //ScreenCoords.xy *= iScalingFactor;
          
          vec3 EyeProjection = vec3(ScreenCoords, 1.);
          
          vec3 RayDirection = normalize(EyeProjection * RotateX(iRotation.x) * RotateY(iRotation.y));
          
          vec2 res = iResolution.xy;
          
          vec3 cam = iPosition;
          vec3 FractPos = fract(cam);
          vec3 FloorPos = floor(cam);
          vec3 ray = normalize(vec3(fragCoord*2.0 - res, res.y));
          ray = normalize(ray * RotateX(iRotation.x) * RotateY(iRotation.y));
          ivec3 cell = ivec3(0);
          
          bvec3 NearSide = bvec3(false);
          vec3 leng;
          
          for(int i = 0; i < 800; i++){
            vec3 dist = fract(-FractPos * sign(ray)) + 2.5e-7;
            leng = dist / abs(ray);
            //vec3 near = min(leng.xxx, min(leng.yyy, leng.zzz));
            vec3 near = min(leng.xyz, min(leng.yzx, leng.zxy));
            
            FractPos += ray * near;
            cell = ivec3((ceil(FractPos) + FloorPos));
            if(map(cell)) break;
            
            //Correct FractPos:
            vec3 Floor = floor(FractPos * 2.) / 2.;
            FloorPos += Floor;
            FractPos -= Floor;
          }
          NearSide = lessThan(leng.xyz, min(leng.yzx, leng.zxy));
      
          //Rainbow color based off the voxel cell position.
          vec3 color = sin(float(cell.z)+vec3(0,2,4)) * 0.5 + 0.5;
          //Square for gamma encoding.
          color *= color;
          
          //Compute cheap ambient occlusion from the SDF.
          //Fade out to black using the distance.
          float fog = 1.;//min(1.0, exp(1.0 - length(FloorPos + FractPos - cam)/15.0));
          
          //Output final color with ao and fog (sqrt for gamma correction).
          if(NearSide.x) fragColor = vec4(sqrt(color * fog) * 0.9, 1.);
          else if(NearSide.y) fragColor = vec4(sqrt(color * fog) * 1.0, 1.);
          else if(NearSide.z) fragColor = vec4(sqrt(color * fog) * 0.8, 1.);
        }
        void main(){
          //if(vmvPosition.y > 6.) gl_FragColor = vec4(0., 0., 1., 1.);
          mainImage(gl_FragColor, vUv * iResolution.xy);
        }
      `
    });

    const Mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.Material);
    Mesh.frustumCulled = false;
    //this.Scene.add(Mesh);

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