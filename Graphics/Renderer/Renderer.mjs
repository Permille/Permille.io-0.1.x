import * as THREE from "../../Libraries/Three/Three.js";
import TextureMerger from "../../Libraries/TextureMerger/TextureMerger.mjs";
import Simplex from "../../Simplex.js";
import Listenable from "../../Libraries/Listenable/Listenable.mjs";

import CloudVertexShader from "./Shaders/CloudBackground.vsh";
import CloudFragmentShader from "./Shaders/CloudBackground.fsh";

export default class Renderer{
  static Version = "Alpha 0.1.8.1";
  static Build = 33;
  constructor(){
    this.Events = new Listenable;

    THREE.ShaderChunk.fog_vertex = `
#ifdef USE_FOG

  fogDepth = - length(mvPosition);

#endif
`;
    this.MergedTexture = undefined;

    this.RenderTime = 10;
    this.LastRender = window.performance.now();

    this.ImageScale = 1;
    this.CloudsScale = .5;

    this.Renderer = new THREE.WebGLRenderer({
      "logarithmicDepthBuffer": false,
      "alpha": true,
      "powerPreference": "high-performance"
    });

    this.Renderer.sortObjects = false;
    this.Renderer.autoClear = false;
    this.Renderer.info.autoReset = false;

    //this.Renderer.autoClearDepth = false;
    this.Renderer.domElement.style.position = "absolute";
    document.getElementsByTagName("body")[0].appendChild(this.Renderer.domElement);


    this.Scene = new THREE.Scene;
    this.Scene.background = null;
    this.Scene.matrixAutoUpdate = false;

    this.NearScene = new THREE.Scene;
    this.NearScene.background = null;
    this.NearScene.matrixAutoUpdate = false;
    this.NearScene.autoUpdate = false;

    this.FarScene = new THREE.Scene;
    this.FarScene.background = null;
    this.FarScene.matrixAutoUpdate = false;
    this.FarScene.autoUpdate = false;

    this.RaytracedPassScene = new THREE.Scene;
    this.RaytracedPassScene.background = null;
    this.RaytracedPassScene.matrixAutoUpdate = false;

    this.FinalPassScene = new THREE.Scene;
    this.FinalPassScene.background = null;
    this.FinalPassScene.matrixAutoUpdate = false;

    this.OutputPassScene = new THREE.Scene;
    this.OutputPassScene.background = null;
    this.OutputPassScene.matrixAutoUpdate = false;

    this.TestPassScene = new THREE.Scene;
    this.TestPassScene.background = null;
    this.TestPassScene.matrixAutoUpdate = false;

    this.SmallTargetScene = new THREE.Scene;
    this.SmallTargetScene.background = null;
    this.SmallTargetScene.matrixAutoUpdate = false;

    this.DefaultFOV = 110.;

    this.Camera = new THREE.PerspectiveCamera(this.DefaultFOV, window.innerWidth / window.innerHeight, 2., 49152.);
    this.Camera.rotation.order = "YXZ";

    this.UpscalingKernelSize = 2;

    this.UseShadows = true;



    this.IntermediateTarget = new THREE.WebGLRenderTarget(1000, 1000);

    this.IntermediateTarget.texture.format = THREE.RGIntegerFormat;
    this.IntermediateTarget.texture.type = THREE.UnsignedIntType;
    this.IntermediateTarget.texture.internalFormat = "RG32UI";
    this.IntermediateTarget.texture.minFilter = this.IntermediateTarget.texture.magFilter = THREE.NearestFilter;

    this.IntermediateTarget.generateMipmaps = false;
    this.IntermediateTarget.stencilBuffer = false;

    this.IntermediateTarget.depthBuffer = true;
    this.IntermediateTarget.depthTexture = new THREE.DepthTexture(1000, 1000);
    this.IntermediateTarget.depthTexture.format = THREE.DepthFormat;
    this.IntermediateTarget.depthTexture.type = THREE.UnsignedShortType;
    this.IntermediateTarget.depthTexture.needsUpdate = true;


    //To use a stencil buffer:
    //1. do not use a custom depth texture in the render target (since it won't have the stencil bits)
    //2. the render target has to enable it and the materials need to define the stencil behaviour


    this.ClampDepthRenderTarget = new THREE.WebGLRenderTarget(1000, 1000);
    this.ClampDepthRenderTarget.generateMipmaps = false;
    this.ClampDepthRenderTarget.stencilBuffer = false;

    this.ClampDepthRenderTarget.depthBuffer = true;
    this.ClampDepthRenderTarget.depthTexture = this.IntermediateTarget.depthTexture;



    this.SmallRaytracingTarget = new THREE.WebGLRenderTarget(100, 100);

    this.SmallRaytracingTarget.texture.format = THREE.RedIntegerFormat;
    this.SmallRaytracingTarget.texture.type = THREE.UnsignedByteType;
    this.SmallRaytracingTarget.texture.internalFormat = "R8UI";
    this.SmallRaytracingTarget.texture.minFilter = this.SmallRaytracingTarget.texture.magFilter = THREE.NearestFilter;

    this.SmallRaytracingTarget.generateMipmaps = false;
    this.SmallRaytracingTarget.stencilBuffer = false;
    this.SmallRaytracingTarget.depthBuffer = false;


    this.ProcessedWorldTarget = new THREE.WebGLRenderTarget(1000, 1000);
    this.ProcessedWorldTarget.texture.format = THREE.RGBAFormat;
    this.ProcessedWorldTarget.texture.type = THREE.UnsignedByteType;
    this.ProcessedWorldTarget.texture.internalFormat = "RGBA8";
    this.ProcessedWorldTarget.texture.minFilter = this.ProcessedWorldTarget.texture.magFilter = THREE.NearestFilter;

    this.ProcessedWorldTarget.generateMipmaps = false;
    this.ProcessedWorldTarget.stencilBuffer = false;
    this.ProcessedWorldTarget.depthBuffer = false;

    this.BackgroundTarget = new THREE.WebGLRenderTarget(500, 500);

    this.BackgroundTarget.texture.format = THREE.RGBAFormat;
    this.BackgroundTarget.texture.type = THREE.UnsignedByteType;
    this.BackgroundTarget.texture.internalFormat = "RGBA8";
    this.BackgroundTarget.texture.minFilter = this.BackgroundTarget.texture.magFilter = THREE.LinearFilter;

    this.BackgroundTarget.generateMipmaps = false;
    this.BackgroundTarget.stencilBuffer = false;
    this.BackgroundTarget.depthBuffer = false;


    this.UseScaledTarget = false;

    this.BackgroundScene = new THREE.Scene;

    this.BackgroundCamera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );

    this.SimplexData = new Float32Array(16 * 4 * 16);
    for(let x = 0, i = 0; x < 16; ++x) for(let y = 0; y < 4; ++y) for(let z = 0; z < 16; ++z, ++i){
      this.SimplexData[i] = Simplex.simplex3(x / 3., y / 3., z / 3.);
    }
    this.SimplexTexture = new THREE.DataTexture3D(this.SimplexData, 16, 4, 16);
    this.SimplexTexture.format = THREE.RedFormat;
    this.SimplexTexture.type = THREE.FloatType;
    this.SimplexTexture.wrapS = THREE.RepeatWrapping; //x
    this.SimplexTexture.wrapT = THREE.RepeatWrapping; //y
    this.SimplexTexture.wrapR = THREE.RepeatWrapping; //z
    this.SimplexTexture.minFilter = this.SimplexTexture.magFilter = THREE.LinearFilter;
    this.SimplexTexture.unpackAlignment = 1;
    this.SimplexTexture.needsUpdate = true;




    this.BackgroundMaterial = new THREE.ShaderMaterial({
      "side": THREE.DoubleSide,
      uniforms:{
        iResolution: {value: new THREE.Vector2(640, 360)},
        iGlobalTime: {value: 0},
        iMouse: {value: new THREE.Vector2(0, 0)},
        iMouseFirst: {value: new THREE.Vector2(0, 0)},
        iRotation: {value: new THREE.Vector3(0., 0., 0.)},
        iPosition: {value: new THREE.Vector3(0., 0., 0.)},
        FOV: {value: .9},
        iSimplexTexture: {value: this.SimplexTexture},
        iSunPosition: {value: new THREE.Vector3(0., -0.707, .707)},
        iCloudCoverage: {value: .75},
        iRequiredPixels: {value: this.IntermediateTarget.texture}
      },
      vertexShader: CloudVertexShader,
      fragmentShader: CloudFragmentShader
    });

    let FramesSinceMouseEvent = 0;
    let LastMouseMovement = 0;



    let Loaded = false;
    this.Events.AddEventListener("TextureLoad", function(){
      Loaded = true;
    }.bind(this));



    //This helps reduce the input lag, but it drops a frame whenever the mouse stops moving...

    let PointerLockChange = 2;
    document.addEventListener("pointerlockchange", function(){
      console.log("hi");
      PointerLockChange = 2;
    });

    void function Load(){
      window.requestAnimationFrame(Load.bind(this));
      if(PointerLockChange < 0 || FramesSinceMouseEvent-- < 0){
        PointerLockChange--;
        if(Loaded) this.Render();
      }
    }.bind(this)();

    document.addEventListener("mousemove", function(Event){
      FramesSinceMouseEvent = 1;
      LastMouseMovement = window.performance.now();
      this.Events.FireEventListeners("MouseMove", Event);
      if(PointerLockChange >= 0 && Loaded) this.Render();
    }.bind(this));



    window.requestAnimationFrame(function(){
      void function UpdateSunPosition(){ //TODO: this and the entire the cloud shader should be in a different place!
        Application.Main.Renderer.RequestPreAnimationFrame(UpdateSunPosition.bind(this));
        const Time = window.performance.now() + 195000.;
        this.BackgroundMaterial.uniforms.iSunPosition.value = new THREE.Vector3(Math.cos(Time / 100000.), -0.4 + Math.sin(Time / 100000.) * .2, Math.sin(Time / 100000.)).normalize();
      }.bind(this)();

      //this.BackgroundMaterial.uniforms["iSimplexTexture"].value = this.SimplexTexture;

      void function UpdateMouse(){
        Application.Main.Renderer.RequestPreAnimationFrame(UpdateMouse.bind(this));
        this.BackgroundMaterial.uniforms.iRotation.value.copy(this.Camera.rotation);
        this.BackgroundMaterial.uniforms.iPosition.value.copy(this.Camera.position);
        this.BackgroundMaterial.uniforms.iGlobalTime.value = window.performance.now() / 1000.;
        this.BackgroundMaterial.uniforms.FOV.value = Number.parseFloat(this.Camera.fov) * Math.PI / 180.;
      }.bind(this)();
    }.bind(this));

    const Mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.BackgroundMaterial);

    this.BackgroundScene.add(Mesh);

    this.UsingShader = false;


    /*void function Load(){
      window.requestAnimationFrame(Load.bind(this));
      if(Loaded) this.Render();
    }.bind(this)();*/

    window.addEventListener("resize", function(){
      this.UpdateSize();
    }.bind(this));
    this.UpdateSize();

    this.Events.FireEventListeners("InitEnd");
  }
  GetBlockWidthFrom19m(FOV, Height){
    return Math.floor((2818./FOV - FOV/11.5) * Height / 950.);
  }
  UpdateSize(){
    this.Events.FireEventListeners("Resize");
    this.Renderer.setSize(window.innerWidth * this.ImageScale, window.innerHeight * this.ImageScale);
    this.IntermediateTarget.setSize(window.innerWidth * this.ImageScale, window.innerHeight * this.ImageScale);
    this.ClampDepthRenderTarget.setSize(window.innerWidth * this.ImageScale, window.innerHeight * this.ImageScale);
    this.ProcessedWorldTarget.setSize(window.innerWidth * this.ImageScale, window.innerHeight * this.ImageScale);
    this.BackgroundTarget.setSize(Math.ceil(window.innerWidth * this.CloudsScale), Math.ceil(window.innerHeight * this.CloudsScale));

    this.Renderer.domElement.style.width = window.innerWidth + "px";
    this.Renderer.domElement.style.height = window.innerHeight + "px";

    this.BackgroundMaterial.uniforms.iResolution.value = new THREE.Vector2(window.innerWidth * this.CloudsScale, window.innerHeight * this.CloudsScale);

    this.Camera.aspect = window.innerWidth / window.innerHeight;
    this.Camera.updateProjectionMatrix();
    this.Camera.rotation.order = "YXZ"; //?
  }
  Render(){
    let RenderTime = window.performance.now() - this.LastRender;
    this.RenderTime = RenderTime;
    this.LastRender = window.performance.now();

    this.Events.FireEventListeners("BeforeRender");

    this.Renderer.info.reset();


    const gl = this.Renderer.getContext();

    this.Renderer.setRenderTarget(this.IntermediateTarget);
    this.Renderer.clear(false, true, true);
    gl.clearBufferuiv(gl.COLOR, 0, new Uint32Array([0, 0, 0, 0])); //I have to clear the colour buffer manually

    this.Events.FireEventListeners("RenderingNearMeshPass");
    this.Camera.near = 1.5;
    this.Camera.far = 384.;
    this.Camera.updateProjectionMatrix();

    this.Renderer.render(this.NearScene, this.Camera);

    this.Renderer.setRenderTarget(this.ClampDepthRenderTarget);
    this.Renderer.render(this.TestPassScene, this.Camera);
    this.Renderer.setRenderTarget(this.IntermediateTarget);

    this.Events.FireEventListeners("RenderingFarMeshPass");
    this.Camera.near = 48.;
    this.Camera.far = 49152.;
    this.Camera.updateProjectionMatrix();

    this.Renderer.render(this.FarScene, this.Camera);


    this.Renderer.setRenderTarget(this.SmallRaytracingTarget);
    this.Renderer.render(this.SmallTargetScene, this.Camera);

    this.Renderer.setRenderTarget(this.ProcessedWorldTarget);
    this.Renderer.clear();
    this.Events.FireEventListeners("RenderingFinalPass");
    this.Renderer.render(this.FinalPassScene, this.Camera);

    this.Renderer.setRenderTarget(this.BackgroundTarget);
    this.Renderer.clear();
    this.Events.FireEventListeners("RenderingBackgroundTarget");
    this.Renderer.render(this.BackgroundScene, this.BackgroundCamera);

    this.Renderer.setRenderTarget(null);
    this.Renderer.clear();
    this.Renderer.render(this.OutputPassScene, this.Camera);

    this.Events.FireEventListeners("AfterRender");
  }
  RequestAnimationFrame(Listener){
    this.Events.AddEventListener("AfterRender", Listener, {"Once": true});
  }
  RequestPreAnimationFrame(Listener){
    this.Events.AddEventListener("BeforeRender", Listener, {"Once": true});
  }

  InitialiseTextures(MainBlockRegistry){
    this.Events.FireEventListeners("TextureLoad");
    return;
    this.TextureLoader = new THREE.TextureLoader;
    let Textures = {};
    let BlockIDMapping = MainBlockRegistry.BlockIDMapping;

    let LoadCount = 0;
    let TextureCount = Object.keys(BlockIDMapping).length;

    let LoadedTexture = function(){
      if(++LoadCount === TextureCount){
        this.MergeTextures(Textures);
      }
    }.bind(this);

    for(const ID in BlockIDMapping){
      const Block = BlockIDMapping[ID];
      const Location = __ScriptPath__ + (Block.Properties.Texture ? "/Mods/" + Block.Properties.Texture : "/Textures/NoTexture.png");
      const Texture = this.TextureLoader.load(Location, function(){
        LoadedTexture();
      }.bind(this), undefined, function(Error){
        console.log(Error);
        Textures[ID] = this.TextureLoader.load(__ScriptPath__ + "/Textures/NotFound.png", function(){
          LoadedTexture();
        }.bind(this), undefined, function(Error){
          console.error("Backup texture not found.");
        }.bind(this));
      }.bind(this));
      Textures[ID] = Texture;
    }
  }
  MergeTextures(Textures){
    console.log(Textures);
    let MergedTexture = new TextureMerger(Textures);
    MergedTexture.mergedTexture.magFilter = THREE.NearestFilter;
    MergedTexture.mergedTexture.minFilter = THREE.NearestFilter;
    MergedTexture.mergedTexture.wrapS = THREE.RepeatWrapping;
    MergedTexture.mergedTexture.wrapT = THREE.RepeatWrapping;
    MergedTexture.mergedTexture.repeat.set(1, 1);
    this.MergedTexture = MergedTexture;
    console.log("Texture atlas:");
    console.log(this.MergedTexture.mergedTexture.image.toDataURL());
    this.Events.FireEventListeners("TextureLoad");
  }
}
