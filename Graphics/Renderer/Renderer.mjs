import * as THREE from "../../Libraries/Three/Three.js";
import Raycast from "../../Libraries/Raycast/Raycast.mjs";
import TextureMerger from "../../Libraries/TextureMerger/TextureMerger.mjs";
import Simplex from "../../Simplex.js";
import Listenable from "../../Libraries/Listenable/Listenable.mjs";

const CloudVertexShader = `
  varying vec2 vUv;
  varying vec4 vPosition;
  
  void main() {
      vUv = uv;
      vPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      gl_Position = vPosition;
  }
`;
const CloudFragmentShader = `
  #include <common>
  
  precision mediump float;
  varying vec2 vUv;
  varying vec4 vPosition;
  
  uniform vec2 iResolution;
  uniform float iGlobalTime;
  uniform vec2 iMouse;
  uniform vec3 iRotation;
  uniform vec3 iPosition;
  uniform vec3 iTopRightRay;
  uniform vec3 iBottomLeftRay;
  uniform vec3 iTopLeftRay;
  uniform vec3 iBottomRightRay;
  uniform float iScalingFactor;
  uniform mediump sampler3D iSimplexTexture;
  uniform vec3 iSunPosition;
  uniform float iCloudCoverage;
  
  // Shader adapted from https://www.shadertoy.com/view/Xttcz2
  // MANY thanks to valentingalea!!! https://github.com/valentingalea/shaderbox
  //
  // Volumetric Clouds Experiment
  //
  // A mashup of ideas from different sources:
  // * Magnus Wrenninge - Production Volume Rendering 
  //   http://magnuswrenninge.com/productionvolumerendering
  // * Andrew Schneider - The Real-time Volumetric Cloudscapes of Horizon: Zero Dawn
  //   http://advances.realtimerendering.com/s2015/The%20Real-time%20Volumetric%20Cloudscapes%20of%20Horizon%20-%20Zero%20Dawn%20-%20ARTR.pdf
  // * Scratchapixel - Simulating the Colors of the Sky
  //   https://www.scratchapixel.com/lessons/procedural-generation-virtual-worlds/simulating-sky
  // * Ian McEwan, Ashima Arts - Array and textureless GLSL 2D/3D/4D simplex 
  //   https://github.com/ashima/webgl-noise
  // * and of course lots of iteration and tweaking
  //   https://github.com/valentingalea/shaderbox
  //  
  
  struct hit_t {
    float t;
    int material_id;
    vec3 normal;
    vec3 origin;
  };
  #define max_dist 1e8
  const hit_t no_hit = hit_t(float(max_dist + 1e1), -1, vec3(0., 0., 0.), vec3(0., 0., 0.));
  
  // ----------------------------------------------------------------------------
  // Various 3D utilities functions
  // ----------------------------------------------------------------------------
  const mat3 mat3_ident = mat3(1, 0, 0, 0, 1, 0, 0, 0, 1);
  
  
  mat2 rotate_2d(const in float angle_degrees){
    float angle = radians(angle_degrees);
    float _sin = sin(angle);
    float _cos = cos(angle);
    return mat2(_cos, -_sin, _sin, _cos);
  }
  
  mat3 rotate_around_z(const in float angle_degrees){
    float angle = radians(angle_degrees);
    float _sin = sin(angle);
    float _cos = cos(angle);
    return mat3(_cos, -_sin, 0, _sin, _cos, 0, 0, 0, 1);
  }
  
  mat3 rotate_around_y(const in float angle_degrees){
    float angle = radians(angle_degrees);
    float _sin = sin(angle);
    float _cos = cos(angle);
    return mat3(_cos, 0, _sin, 0, 1, 0, -_sin, 0, _cos);
  }
  
  mat3 rotate_around_x(const in float angle_degrees){
    float angle = radians(angle_degrees);
    float _sin = sin(angle);
    float _cos = cos(angle);
    return mat3(1, 0, 0, 0, _cos, -_sin, 0, _sin, _cos);
  }
  
  // http://http.developer.nvidia.com/GPUGems3/gpugems3_ch24.html
  vec3 linear_to_srgb(const in vec3 color){
    const float p = 1. / 2.2;
    return vec3(pow(color.r, p), pow(color.g, p), pow(color.b, p));
  }
  vec3 srgb_to_linear(const in vec3 color){
    const float p = 2.2;
    return vec3(pow(color.r, p), pow(color.g, p), pow(color.b, p));
  }
  
  struct volume_sampler_t {
    vec3 origin; // start of ray
    vec3 pos; // current pos of acccumulation ray
    float height;
  
    float coeff_absorb;
    float T; // transmitance
  
    vec3 C; // color
    float alpha;
  };
  
  volume_sampler_t begin_volume(const in vec3 origin, const in float coeff_absorb){
    return volume_sampler_t(origin, origin, 0., coeff_absorb, 1., vec3(0., 0., 0.), 0.);
  }
  
  float illuminate_volume(inout volume_sampler_t vol, const in vec3 V, const in vec3 L);
  
  void integrate_volume(inout volume_sampler_t vol, const in vec3 V, const in vec3 L, const in float density, const in float dt){
    // change in transmittance (follows Beer-Lambert law)
    float T_i = exp(-vol.coeff_absorb * density * dt);
    // Update accumulated transmittance
    vol.T *= T_i;
    // integrate output radiance (here essentially color)
    vol.C += vol.T * illuminate_volume(vol, V, L) * density * dt;
    // accumulate opacity
    vol.alpha += (1. - T_i) * (1. - vol.alpha);
  }
  
  
  #define cld_march_steps (100)
  #define cld_coverage (1. - iCloudCoverage)
  #define cld_thick (200.)
  #define cld_absorb_coeff (1.)
  #define cld_wind_dir vec3(0, 0, -iGlobalTime * .02)
  #define cld_sun_dir vec3(-iSunPosition.x, -iSunPosition.y, iSunPosition.z)
  float coverage_map;
  
  float hash(const in float n){
    return fract(sin(n)*1151.4422132);
  }
  
  float noise(vec3 v){
    return texture(iSimplexTexture, vec3(v.x / 16., v.y / 4., v.z / 16.)).r;
  }
  
  // ----------------------------------------------------------------------------
  // Fractional Brownian Motion
  // depends on custom basis function
  // ----------------------------------------------------------------------------
  
  #define DECL_FBM_FUNC(_name, _octaves, _basis) float _name(const in vec3 pos, const in float lacunarity, const in float init_gain, const in float gain) { vec3 p = pos; float H = init_gain; float t = 0.; for (int i = 0; i < _octaves; i++) { t += _basis * H; p *= lacunarity; H *= gain; } return t; }
  
  DECL_FBM_FUNC(fbm, 4, noise(p))
  DECL_FBM_FUNC(fbm_clouds, 5, abs(noise(p)))
  
  vec3 render_sky_color(const in vec3 eye_dir){
    const vec3 sun_color = vec3(1., .7, .55);
    float sun_amount = max(dot(eye_dir, cld_sun_dir), 0.);
  
    vec3 sky = mix(vec3(.0, .1, .4), vec3(.3, .6, .8), 1.0 - eye_dir.y);
    sky += sun_color * min(pow(sun_amount, 1500.0) * 5.0, 1.0);
    sky += sun_color * min(pow(sun_amount, 10.0) * .6, 1.0);
  
    return sky;
  }
  
  float density_func(const in vec3 pos, const in float h){
    vec3 p = pos * .001 + cld_wind_dir;
    float dens = fbm_clouds(p * 2.032, 2.6434, .5, .5);
    
    dens *= smoothstep (cld_coverage, cld_coverage + .035, dens);
  
    return dens;
  }
  
  float illuminate_volume(inout volume_sampler_t cloud, const in vec3 V, const in vec3 L){
    return exp(cloud.height) / 2.;
  }
  
  vec4 render_clouds(vec3 origin, vec3 direction){
    const int steps = cld_march_steps;
    const float march_step = 1. * cld_thick / float(steps);
  
    vec3 projection = direction / direction.y;
    vec3 iter = projection * march_step;
  
    float cutoff = dot(direction, vec3(0, 1, 0));
  
    volume_sampler_t cloud = begin_volume(
      origin + projection * 300.,
      cld_absorb_coeff);
  
    for (int i = 0; i < steps; i++) {
      cloud.height = (cloud.pos.y - cloud.origin.y) / cld_thick;
      float dens = density_func(cloud.pos, cloud.height);
  
      integrate_volume(
        cloud,
        direction, cld_sun_dir,
        dens, march_step);
  
      cloud.pos += iter;
  
      if (cloud.alpha > .99) break;
    }
  
    return vec4(cloud.C, cloud.alpha * smoothstep(.0, .2, cutoff));
  }
  
  vec3 render(vec3 origin, vec3 direction){
    vec3 sky = render_sky_color(direction);
    if (dot(direction, vec3(0, 1, 0)) < 0.05) return sky;
  
    vec4 cld = render_clouds(origin, direction);
    vec3 col = mix(sky, cld.rgb, cld.a);
  
    return col;
  }
  
  vec3 RotateX(vec3 v, float a){
    mat3 RotationMatrix = mat3(1., 0.,     0.,
                               0., cos(a),-sin(a),
                               0., sin(a), cos(a));
    return v * RotationMatrix;
  }
  vec3 RotateY(vec3 v, float a){
    mat3 RotationMatrix = mat3(cos(a), 0., sin(a),
                               0.,     1., 0.,
                              -sin(a), 0., cos(a));
    return v * RotationMatrix;
  }
  
  void MainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv.x *= iResolution.x / iResolution.y;
    
    //https://discourse.threejs.org/t/getting-screen-coords-in-shadermaterial-shaders/23783/2
    vec2 ScreenCoords = vPosition.xy;
    ScreenCoords.x *= iResolution.x / iResolution.y;
    ScreenCoords /= vPosition.w;
    ScreenCoords.xy *= iScalingFactor;
    
    vec3 EyeProjection = vec3(ScreenCoords, 1.);
    
    vec3 RayDirection = normalize(RotateY(RotateX(EyeProjection, iRotation.x), iRotation.y));
    
    vec3 CurrentPosition = iPosition;
    
    vec3 Vector = vec3(0., 1., 0.);
    
    CurrentPosition.y = 0.;
  
    fragColor = vec4(linear_to_srgb(render(CurrentPosition, RayDirection)), 1);
    
    return;
  }
  
  void main(){
    MainImage(gl_FragColor, vUv * iResolution.xy);
  }
`;

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

    this.BackgroundRenderer = new THREE.WebGLRenderer({
      "logarithmicDepthBuffer": false,
      "alpha": true,
      "powerPreference": "high-performance"
    });
    this.BackgroundRenderer.autoClear = false;
    this.BackgroundRenderer.domElement.style.position = "absolute";
    document.getElementsByTagName("body")[0].appendChild(this.BackgroundRenderer.domElement);


    this.Renderer = new THREE.WebGLRenderer({"logarithmicDepthBuffer": false, alpha: true });
    this.Renderer.autoClear = false;
    //this.Renderer.autoClearDepth = false;
    this.Renderer.domElement.style.position = "absolute";
    document.getElementsByTagName("body")[0].appendChild(this.Renderer.domElement);


    this.Scene = new THREE.Scene;
    this.Scene.background = null;//new THREE.Color("#7fffff");
    //this.Scene.fog = new THREE.FogExp2(0x7fffff, 0.00013);
    this.Scene.matrixAutoUpdate = false;

    this.Camera = new THREE.PerspectiveCamera(110, window.innerWidth / window.innerHeight, 0.0625, 16384);
    this.Camera.rotation.order = "YXZ";

    this.ScaledTarget = new THREE.WebGLRenderTarget(Math.ceil(window.innerWidth / 5.), Math.ceil(window.innerHeight / 5.));
    this.ScaledTarget.texture.format = THREE.RGBAFormat;
    this.ScaledTarget.texture.type = THREE.UnsignedByteType;
    this.ScaledTarget.texture.internalFormat = "RGBA8";
    this.ScaledTarget.texture.minFilter = this.ScaledTarget.texture.magFilter = THREE.NearestFilter;
    this.ScaledTarget.generateMipmaps = false;
    this.ScaledTarget.stencilBuffer = false;

    /*this.ScaledTarget.depthBuffer = true;
    this.ScaledTarget.depthTexture = new THREE.DepthTexture(Math.ceil(window.innerWidth / 3.), Math.ceil(window.innerHeight / 3.));
    this.ScaledTarget.depthTexture.format = THREE.DepthFormat;
    this.ScaledTarget.depthTexture.type = THREE.UnsignedShortType;
    this.ScaledTarget.depthTexture.needsUpdate = true;*/

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

    this.BackgroundMaterial = new THREE.ShaderMaterial({
      "side": THREE.DoubleSide,
      uniforms:{
        iResolution: {value: new THREE.Vector2(640, 360)},
        iGlobalTime: {value: 0},
        iMouse: {value: new THREE.Vector2(0, 0)},
        iRotation: {value: new THREE.Vector3(0., 0., 0.)},
        iPosition: {value: new THREE.Vector3(0., 0., 0.)},
        iTopRightRay: {value: new THREE.Vector3(0., 0., 0.)},
        iBottomLeftRay: {value: new THREE.Vector3(0., 0., 0.)},
        iTopLeftRay: {value: new THREE.Vector3(0., 0., 0.)},
        iBottomRightRay: {value: new THREE.Vector3(0., 0., 0.)},
        iScalingFactor: {value: 0.},
        iSimplexTexture: {value: this.SimplexTexture},
        iSunPosition: {value: new THREE.Vector3(0., 0., 1.)},
        iCloudCoverage: {value: .75}
      },
      vertexShader: CloudVertexShader,
      fragmentShader: CloudFragmentShader
    });

    //this.BackgroundMaterial.uniforms["iSimplexTexture"].value = this.SimplexTexture;

    void function UpdateMouse(){
      window.requestAnimationFrame(UpdateMouse.bind(this));
      this.BackgroundMaterial.uniforms.iMouse.value = new THREE.Vector2(this.Camera.rotation.y * Math.PI * 50,this.Camera.rotation.x * Math.PI * 50);
      this.BackgroundMaterial.uniforms.iRotation.value = new THREE.Vector3(-this.Camera.rotation.x, -this.Camera.rotation.y, this.Camera.rotation.z);
      this.BackgroundMaterial.uniforms.iPosition.value = new THREE.Vector3(this.Camera.position.x, this.Camera.position.y, -this.Camera.position.z);
      this.BackgroundMaterial.uniforms.iGlobalTime.value = window.performance.now() / 1000.;

      //https://gamedev.stackexchange.com/a/55248
      const Copy = function(Vector){
        return new THREE.Vector3().copy(Vector);
      };
      //const Position = Copy(this.Camera.position);
      const Position = new THREE.Vector3(0., 0., 0.);
      const SinX = Math.sin(0.);//this.Camera.rotation.x);
      const SinY = Math.sin(0.);//this.Camera.rotation.y);
      const CosX = Math.cos(0.);//this.Camera.rotation.x);
      const CosY = Math.cos(0.);//this.Camera.rotation.y);
      const View = new THREE.Vector3(-SinY * CosX, SinX, -CosY * CosX);
      const Up = new THREE.Vector3(0., 1., 0.);
      const Right = new THREE.Vector3(1., 0., 0.);
      const Distance1 = 1.;
      const FOV = (this.Camera.fov | 0) * Math.PI / 180. / this.Camera.zoom;
      const Aspect = window.innerWidth / window.innerHeight;

      const Height1 = 2. * Math.tan(FOV / 2.) * Distance1;
      const Width1 = Height1 * Aspect;

      const Center1 = Copy(Position).add(Copy(View).multiplyScalar(Distance1));

      const TopRight1 = Copy(Center1).add(Copy(Up).multiplyScalar(Height1 / 2.)).add(Copy(Right).multiplyScalar(Width1 / 2.));

      this.BackgroundMaterial.uniforms.iScalingFactor.value = TopRight1.y;

    }.bind(this)();

    const Mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 1, 1), this.BackgroundMaterial);

    this.BackgroundScene.add(Mesh);

    this.UsingShader = false;

    let Loaded = false;
    this.Events.AddEventListener("TextureLoad", function(){
      Loaded = true;
    }.bind(this));
    void function Load(){
      window.requestAnimationFrame(Load.bind(this));
      if(Loaded) this.Render();
    }.bind(this)();

    /*this.Scene.onBeforeRender = function(){
      this.RenderTime = window.performance.now() - this.LastRender;
      this.LastRender = window.performance.now();
    }.bind(this);*/
    /*this.Scene.onAfterRender = function(){
      console.log(window.performance.now());
      this.RenderTime = window.performance.now() - this.LastRender;
    }.bind(this);*/

    window.addEventListener("resize", function(){
      this.UpdateSize();
    }.bind(this));
    this.UpdateSize();

    this.Events.FireEventListeners("InitEnd");
  }
  UpdateSize(){
    this.Renderer.setSize(window.innerWidth * this.ImageScale, window.innerHeight * this.ImageScale);
    this.BackgroundRenderer.setSize(window.innerWidth * this.CloudsScale, window.innerHeight * this.CloudsScale);
    //this.Composer.setSize(window.innerWidth * this.ImageScale, window.innerHeight * this.ImageScale);
    this.Renderer.domElement.style.width = window.innerWidth + "px";
    this.Renderer.domElement.style.height = window.innerHeight + "px";
    this.BackgroundRenderer.domElement.style.width = window.innerWidth + "px";
    this.BackgroundRenderer.domElement.style.height = window.innerHeight + "px";

    this.BackgroundMaterial.uniforms.iResolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);

    this.Camera.aspect = window.innerWidth / window.innerHeight;
    this.Camera.updateProjectionMatrix();
    this.Camera.rotation.order = "YXZ"; //?
  }
  Render(){
    this.RenderTime = window.performance.now() - this.LastRender;
    this.LastRender = window.performance.now();

    this.BackgroundRenderer.clear();
    //this.BackgroundRenderer.render(this.BackgroundScene, this.BackgroundCamera);

    this.Renderer.setRenderTarget(this.ScaledTarget);
    this.Renderer.clear();
    this.Events.FireEventListeners("RenderingScaledTarget");
    this.Renderer.render(this.Scene, this.Camera);

    //return;
    this.Renderer.setRenderTarget(null);
    this.Renderer.clear();
    this.Events.FireEventListeners("RenderingCanvas");
    this.Renderer.render(this.Scene, this.Camera);
  }

  Raycast(World = Application.Main.World){
    let SinX = Math.sin(this.Camera.rotation.x);
    let SinY = Math.sin(this.Camera.rotation.y);
    let CosX = Math.cos(this.Camera.rotation.x);
    let CosY = Math.cos(this.Camera.rotation.y);

    let Direction = [
      -SinY * CosX,
      SinX,
      -CosY * CosX
    ];
    let Origin = [
      this.Camera.position.x,
      this.Camera.position.y,
      this.Camera.position.z
    ];
    let Result = Raycast(Origin, Direction, 512, function(X, Y, Z, Face){
      if(World.GetBlock(X, Y, Z) !== 0) return true;
      return false;
    }.bind(this));
    return Result?.Distance || 512;
  }

  InitialiseTextures(MainBlockRegistry){
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
