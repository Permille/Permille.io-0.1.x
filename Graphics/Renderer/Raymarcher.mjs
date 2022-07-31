import * as THREE from "../../Libraries/Three/Three.js";


import TerrainBoundingBoxVertex from "./Shaders/TerrainBoundingBox.vsh";
import TerrainBoundingBoxFragment from "./Shaders/TerrainBoundingBox.fsh";
import FinalPassVertex from "./Shaders/FinalPass.vsh";
import FinalPassFragment from "./Shaders/FinalPass.fsh";
import OutputPassVertex from "./Shaders/OutputPass.vsh";
import OutputPassFragment from "./Shaders/OutputPass.fsh";
import SmallTargetVertex from "./Shaders/SmallTarget.vsh";
import SmallTargetFragment from "./Shaders/SmallTarget.fsh";
import TestMaterialVertex from "./Shaders/TestMaterial.vsh";
import TestMaterialFragment from "./Shaders/TestMaterial.fsh";

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




    this.Type1Copy = new Uint16Array(512 * 512);
    this.TexType1Copy = new THREE.DataTexture3D(this.Type1Copy, 512, 512, 1);
    this.TexType1Copy.internalFormat = "R16UI";
    this.TexType1Copy.format = THREE.RedIntegerFormat;
    this.TexType1Copy.type = THREE.UnsignedShortType;
    this.TexType1Copy.minFilter = this.TexType1Copy.magFilter = THREE.NearestFilter;
    this.TexType1Copy.unpackAlignment = 1;
    this.TexType1Copy.needsUpdate = true;

    this.Data1Copy = new Uint8Array(64 * 512);
    this.TexData1Copy = new THREE.DataTexture3D(this.Data1Copy, 64, 512, 1);
    this.TexData1Copy.internalFormat = "R8UI";
    this.TexData1Copy.format = THREE.RedIntegerFormat;
    this.TexData1Copy.type = THREE.UnsignedByteType;
    this.TexData1Copy.minFilter = this.TexData1Copy.magFilter = THREE.NearestFilter;
    this.TexData1Copy.unpackAlignment = 1;
    this.TexData1Copy.needsUpdate = true;

    this.BoundingBox1Copy = new Uint32Array(8 * 64);
    this.TexBoundingBox1Copy = new THREE.DataTexture3D(this.BoundingBox1Copy, 8, 64, 1);
    this.TexBoundingBox1Copy.internalFormat = "R32UI";
    this.TexBoundingBox1Copy.format = THREE.RedIntegerFormat;
    this.TexBoundingBox1Copy.type = THREE.UnsignedIntType;
    this.TexBoundingBox1Copy.minFilter = this.TexBoundingBox1Copy.magFilter = THREE.NearestFilter;
    this.TexBoundingBox1Copy.unpackAlignment = 1;
    this.TexBoundingBox1Copy.needsUpdate = true;

    this.Info8Copy = new Uint32Array(8 * 64);
    this.TexInfo8Copy = new THREE.DataTexture3D(this.Info8Copy, 8, 64, 1);
    this.TexInfo8Copy.internalFormat = "R32UI";
    this.TexInfo8Copy.format = THREE.RedIntegerFormat;
    this.TexInfo8Copy.type = THREE.UnsignedIntType;
    this.TexInfo8Copy.minFilter = this.TexInfo8Copy.magFilter = THREE.NearestFilter;
    this.TexInfo8Copy.unpackAlignment = 1;
    this.TexInfo8Copy.needsUpdate = true;




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
      iOffset64: {value: this.World.Data64Offset},
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
      "vertexShader": TestMaterialVertex,
      "fragmentShader": TestMaterialFragment
    });

    this.Material = new THREE.RawShaderMaterial({
      "uniforms": {
        ...this.Uniforms
      },
      "vertexShader": TerrainBoundingBoxVertex,
      "fragmentShader": TerrainBoundingBoxFragment
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
      "vertexShader": FinalPassVertex,
      "fragmentShader": FinalPassFragment
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
      "vertexShader": OutputPassVertex,
      "fragmentShader": OutputPassFragment
    });

    this.SmallTargetMaterial = new THREE.RawShaderMaterial({
      "uniforms": {
        ...this.Uniforms,
        iCloseVoxelsOffset: {value: this.CloseVoxelsOffset},
        iCloseVoxelsTexture: {value: this.CloseVoxelsTexture},
        iRaytracingGridDistance: {value: 1}
      },
      "vertexShader": SmallTargetVertex,
      "fragmentShader": SmallTargetFragment
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
        const FoundMesh = this.Renderer.NearScene.getObjectByName(Identifier);

        if(FoundMesh){
          if(FoundMesh.userData.Time < Event.Time){
            this.Renderer.NearScene.remove(FoundMesh);
            FoundMesh.geometry.dispose();
          }
          else return;
        }
      } else{
        const FoundMesh = this.Renderer.FarScene.getObjectByName(Identifier);

        if(FoundMesh){
          if(FoundMesh.userData.Time < Event.Time){
            this.Renderer.FarScene.remove(FoundMesh);
            FoundMesh.geometry.dispose();
          }
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

      if(Event.Depth === 0) this.Renderer.NearScene.add(Mesh);//, this.Renderer.NearScene.updateMatrix();//, this.Renderer.NearScene.updateMatrixWorld(true);
      else this.Renderer.FarScene.add(Mesh);//, this.Renderer.FarScene.updateMatrix();//, this.Renderer.FarScene.updateMatrixWorld(true);


      Mesh.name = Identifier;
      Mesh.userData.Time = Event.Time;
      Mesh.userData.RegionX = Event.RegionX;
      Mesh.userData.RegionY = Event.RegionY;
      Mesh.userData.RegionZ = Event.RegionZ;
      Mesh.userData.Depth = Event.Depth;

      Mesh.position.set(Event.RegionX * 64. * Scale, Event.RegionY * 64. * Scale, Event.RegionZ * 64. * Scale);
      Mesh.scale.set(Scale, Scale, Scale);
      Mesh.updateMatrix(true);
      Mesh.updateMatrixWorld(true);

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
          Mesh.geometry.dispose();
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
          Mesh.geometry.dispose();
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

    const UpdatedData64 = new Set;

    void function AnimationFrame(){
      Application.Main.Renderer.RequestPreAnimationFrame(AnimationFrame.bind(this));
      //window.setTimeout(AnimationFrame.bind(this), 200);

      let CloseVoxelsNeedUpdate = false;

      const CameraPosition = Application.Main.Renderer.Camera.position;
      const NewPosition = new THREE.Vector3(
        (Math.floor(CameraPosition.x) >> 3),
        (Math.floor(CameraPosition.y) >> 3),
        (Math.floor(CameraPosition.z) >> 3)
      );
      if(!NewPosition.equals(this.CloseVoxelsOffset)) CloseVoxelsNeedUpdate = true;

      this.Uniforms.iOffset64.value.needsUpdate = true;
      this.TexInfo64.needsUpdate = true;

      //TODO: This still causes small lag spikes when updating.
      //Possible fixes: spread out updates, merge nearby segments, etc

      for(let Depth = 0, Counter = 0; Depth < 8; ++Depth) for(let x64 = 0; x64 < 8; x64++) for(let y64 = 0; y64 < 8; y64++) for(let z64 = 0; z64 < 8; z64++){
        //const Index64 = (Depth << 9) | (x64 << 6) | (y64 << 3) | z64;
        const Index64 = Counter++; //Essentially the same thing ^^
        //Add to updated list only if it's fully loaded, and it needs an update.
        if(((this.Data64[Index64] >> 19) & 7) === 7 && ((this.GPUInfo64[Index64] >> 30) & 1) === 1 && ((this.GPUInfo64[Index64] >> 31) & 1) !== 1) UpdatedData64.add(Index64);
      }

      if(UpdatedData64.size !== 0){
        CloseVoxelsNeedUpdate = true;
      }
      ///tp -1431 13 -830
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

      if(UpdatedData64.size === 0) return;


      const UpdatedSegments = new Set;
      let Count = 0;

      for(const Index64 of UpdatedData64){
        if(Count > 1) break;
        UpdatedData64.delete(Index64);
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
          Count++;
          this.GPUInfo64[Index64] &= ~(1 << 30); //Toggle update to false
          this.GPUInfo64[Index64] |= 1 << 29; //Mark as fully uploaded
          const GPULocation64 = this.GPUInfo64[Index64] & 0x00000fff;
          //int Pos8XYZ = ((Location64 & 7) << 6) | (mRayPosFloor.x << 3) | mRayPosFloor.y;
          //return texelFetch(iTex8, ivec3(mRayPosFloor.z, Pos8XYZ, Location64 >> 3), 0).r;

          for(let i = 0; i < 512; ++i){
            this.BoundingBox1Copy[i] = this.GPUBoundingBox1[GPULocation64 << 9 | i];
            this.Info8Copy[i] = this.GPUInfo8[GPULocation64 << 9 | i];
          }

          this.Renderer.Renderer.copyTextureToTexture3D(
            new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(7, 63, 0)),
            new THREE.Vector3(0, (GPULocation64 & 7) << 6, GPULocation64 >> 3),
            this.TexInfo8Copy,
            this.TexInfo8
          );
          this.Renderer.Renderer.copyTextureToTexture3D(
            new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(7, 63, 0)),
            new THREE.Vector3(0, (GPULocation64 & 7) << 6, GPULocation64 >> 3),
            this.TexBoundingBox1Copy,
            this.TexBoundingBox1
          );
        }
        //The if is there because if the size is greater than 10, most likely only part of the Data64 has been updated (due to segment distribution)
      }

      for(const SegmentLocation of UpdatedSegments){ //This is not sending individual segments, but entire columns
        //const YOffset = (SegmentLocation & 31) << 4;
        const ZOffset = SegmentLocation;// >> 5;

        for(let i = 0; i < (1 << 15); ++i){
          this.Data1Copy[i] = this.GPUData1[SegmentLocation << 15 | i];
        }
        for(let i = 0; i < (1 << 18); ++i){
          this.Type1Copy[i] = this.GPUType1[SegmentLocation << 18 | i];
        }

        this.Renderer.Renderer.copyTextureToTexture3D(
          new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(63, 511, 0)),
          new THREE.Vector3(0, 0, ZOffset),
          this.TexData1Copy,
          this.TexData1
        );

        this.Renderer.Renderer.copyTextureToTexture3D(
          new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(511, 511, 0)),
          new THREE.Vector3(0, 0, ZOffset),
          this.TexType1Copy,
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