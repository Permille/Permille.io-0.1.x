import * as THREE from "../../Libraries/Three/Three.js";
import Raycast from "../../Libraries/Raycast/Raycast.mjs";
import TextureMerger from "../../Libraries/TextureMerger/TextureMerger.mjs";
import Simplex from "../../Simplex.js";
import Listenable from "../../Libraries/Listenable/Listenable.mjs";
import { WebGLProperties } from '../../Libraries/Three/renderers/webgl/WebGLProperties.js';

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
  uniform float FOV;
  uniform mediump sampler3D iSimplexTexture;
  uniform vec3 iSunPosition;
  uniform float iCloudCoverage;
  uniform highp usampler2D iRequiredPixels;
  
  // Shader adapted from https://www.shadertoy.com/view/Xttcz2
  // MANY thanks to valentingalea!!! https://github.com/valentingalea/shaderbox
  /*
  MIT License

  Copyright (c) 2017 Valentin Galea
  
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
  
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  */
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
  
  // ----------------------------------------------------------------------------
  // Various 3D utilities functions
  // ----------------------------------------------------------------------------
  
  
  // http://http.developer.nvidia.com/GPUGems3/gpugems3_ch24.html
  vec3 linear_to_srgb(const in vec3 color){
    const float p = 1. / 2.2;
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
    return texture(iSimplexTexture, vec3(v.x / 8., v.y / 2., v.z / 8.)).r;
    //return mod(hash(fract(length(floor(v) / 8.))), .25) + .1;//texture(iSimplexTexture, vec3(v.x / 8., v.y / 2., v.z / 8.)).r + texture(iSimplexTexture, vec3(v.x / 32., v.y / 8., v.z / 32.)).r;
  }
  
  // ----------------------------------------------------------------------------
  // Fractional Brownian Motion
  // depends on custom basis function
  // ----------------------------------------------------------------------------
  
  //#define DECL_FBM_FUNC(_name, _octaves, _basis) float _name(const in vec3 pos, const in float lacunarity, const in float init_gain, const in float gain) { vec3 p = pos; float H = init_gain; float t = 0.; for (int i = 0; i < _octaves; i++) { t += _basis * H; p *= lacunarity; H *= gain; } return t; }
  //DECL_FBM_FUNC(fbm_clouds, 5, abs(noise(p)))
  
  float fbm_clouds_2(const in vec3 pos, const in float lacunarity, const in float init_gain, const in float gain) {
    vec3 p = pos;
    float H = init_gain;
    float t = 0.;
    for (int i = 0; i < 5; i++) {
      t += abs(noise(p)) * H;
      p *= lacunarity;
      H *= gain;
    }
    return t;
  }
  float Falloffs[6] = float[6](1., .5, .25, .125, .0625, .03125);
  float Lacunarities[5] = float[5](1., 3.2323999404907227, 10.448409080505371, 33.7734375, 109.16925811767578);
  /*
    const a = new Float32Array([1., 3.2324, 0., 0., 0.]);
    for(let i = 2; i < 5; ++i){
        a[i] = a[i - 1] * a[1];
    }
  */
  float Components[5] = float[5](0., 0., 0., 0., 0.);
  int Indices[16] = int[16](4, 3, 4, 2, 4, 3, 4, 1, 4, 3, 4, 2, 4, 3, 4, 0);
  float CurrentDensity = 0.;
  
  float fbm_clouds(const in vec3 pos) {
    vec3 p = pos;
    float t = 0.;
    for (int i = 0; i < 5; i++) {
      t += abs(noise(p * Lacunarities[i])) * Falloffs[i + 1];
    }
    return t;
  }
  
  float density_func(const in vec3 pos, const in float h, int Iteration){
    vec3 p = pos * .001 + cld_wind_dir;
    //float dens = fbm_clouds(p * 2.032, 2.6434, .5, .5);
    //float dens = fbm_clouds(p);
    
    /*{
      int Index = Indices[Iteration & 15];//Iteration % 5;
      float NewContribution = abs(noise(p * Lacunarities[Index])) * Falloffs[Index + 1];
      CurrentDensity = CurrentDensity - Components[Index] + NewContribution;
      Components[Index] = NewContribution;
    }*/
    float CurrentDensity = 0.;
    for(int i = 0; i < 5; ++i){
      CurrentDensity += abs(noise(p * Lacunarities[i])) * Falloffs[i + 1];
    }
  
    return CurrentDensity * smoothstep (cld_coverage, cld_coverage + .035, CurrentDensity);
  }
  
  
  vec3 render_sky_color(const in vec3 eye_dir){
    const vec3 sun_color = vec3(1., .7, .55);
    float sun_amount = max(dot(eye_dir, cld_sun_dir), 0.);
  
    vec3 sky = mix(vec3(.0, .1, .4), vec3(.3, .6, .8), 1.0 - eye_dir.y);
    sky += sun_color * min(pow(sun_amount, 1500.0) * 5.0, 1.0);
    sky += sun_color * min(pow(sun_amount, 10.0) * .6, 1.0);
  
    return sky;
  }
  
  
  
  float illuminate_volume(inout volume_sampler_t cloud, const in vec3 V, const in vec3 L){
    return exp(cloud.height) / 2.;
  }
  
  vec4 render_clouds(vec3 origin, vec3 direction){
    const int steps = cld_march_steps;
    const float march_step = 1. * cld_thick / float(steps);
  
    vec3 projection = direction / direction.y;
    vec3 iter = /*march_step * direction;*/projection * march_step;
  
    float cutoff = dot(direction, vec3(0, 1, 0));
  
    volume_sampler_t cloud = begin_volume(
      origin + projection * 250.,
      cld_absorb_coeff);
    
    /*for(int i = 0; i < 5; ++i){
      float Contribution = abs(noise(cloud.pos * Lacunarities[i])) * Falloffs[i + 1];
      Components[i] = Contribution;
      CurrentDensity += Contribution;
    }*/
    
    for (int i = 0; i < steps; i++) {
      cloud.height = (cloud.pos.y - cloud.origin.y) / cld_thick;
      float dens = density_func(cloud.pos, cloud.height, i);
      
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
    if(texture(iRequiredPixels, gl_FragCoord.xy / iResolution.xy).x != 0u) return sky;
  
    vec4 cld = render_clouds(origin, direction);
    vec3 col = mix(sky, cld.rgb, cld.a);
  
    return col;
  }
  
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
  
  void MainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = (fragCoord.xy * 2. - iResolution.xy) / iResolution.y;
    vec3 RayOrigin = iPosition;
    vec3 RayDirection = normalize(vec3(uv, 1. / tan(FOV / 2.))) * RotateX(-iRotation.x) * RotateY(-iRotation.y);
  
    fragColor = vec4(linear_to_srgb(render(RayOrigin, RayDirection)), 1);
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

    this.FarScene = new THREE.Scene;
    this.FarScene.background = null;
    this.FarScene.matrixAutoUpdate = false;

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


    /*this.FirstPassTarget = new THREE.WebGLRenderTarget(1000, 1000);
    this.FirstPassTarget.texture.format = THREE.RGBAFormat;
    this.FirstPassTarget.texture.type = THREE.UnsignedByteType;
    this.FirstPassTarget.texture.internalFormat = "RGBA8";
    this.FirstPassTarget.texture.minFilter = this.FirstPassTarget.texture.magFilter = THREE.NearestFilter;
    this.FirstPassTarget.generateMipmaps = false;
    this.FirstPassTarget.stencilBuffer = false;

    this.FirstPassTarget.depthBuffer = true;
    this.FirstPassTarget.depthTexture = new THREE.DepthTexture(1000, 1000);
    this.FirstPassTarget.depthTexture.format = THREE.DepthFormat;
    this.FirstPassTarget.depthTexture.type = THREE.UnsignedShortType;
    this.FirstPassTarget.depthTexture.needsUpdate = true;*/


    /*this.RaytracedPassTarget = new THREE.WebGLMultipleRenderTargets(1000, 1000, 2);
    this.NearMeshPassTarget = new THREE.WebGLMultipleRenderTargets(1000, 1000, 2);
    this.FarMeshPassTarget = new THREE.WebGLMultipleRenderTargets(1000, 1000, 2);
    for(const Target of [this.RaytracedPassTarget, this.NearMeshPassTarget, this.FarMeshPassTarget]){
      Target.texture[0].format = THREE.RGBAFormat;
      Target.texture[0].type = THREE.UnsignedByteType;
      Target.texture[0].internalFormat = "RGBA8";
      Target.texture[0].minFilter = Target.texture[0].magFilter = THREE.NearestFilter;
      debugger;
      Target.texture[1].format = THREE.RedFormat;
      Target.texture[1].type = THREE.FloatType;
      Target.texture[1].internalFormat = "R32F";
      Target.texture[1].minFilter = Target.texture[1].magFilter = THREE.NearestFilter;

      Target.generateMipmaps = false;
      Target.stencilBuffer = true;

      Target.depthBuffer = true;
      Target.depthTexture = new THREE.DepthTexture(1000, 1000);
      Target.depthTexture.format = THREE.DepthFormat;
      Target.depthTexture.type = THREE.UnsignedShortType;
      Target.depthTexture.needsUpdate = true;
    }*/


    this.IntermediateTarget = new THREE.WebGLRenderTarget(1000, 1000);

    this.IntermediateTarget.texture.format = THREE.RGIntegerFormat;
    this.IntermediateTarget.texture.type = THREE.UnsignedIntType;
    this.IntermediateTarget.texture.internalFormat = "RG32UI";
    this.IntermediateTarget.texture.minFilter = this.IntermediateTarget.texture.magFilter = THREE.NearestFilter;

    //this.IntermediateTarget.texture[2].format = THREE.RedFormat;
    //this.IntermediateTarget.texture[2].type = THREE.FloatType;
    //this.IntermediateTarget.texture[2].internalFormat = "R32F";
    //this.IntermediateTarget.texture[2].minFilter = this.IntermediateTarget.texture[2].magFilter = THREE.NearestFilter;
//
    //this.IntermediateTarget.texture[3].format = THREE.RedFormat;
    //this.IntermediateTarget.texture[3].type = THREE.FloatType;
    //this.IntermediateTarget.texture[3].internalFormat = "R32F";
    //this.IntermediateTarget.texture[3].minFilter = this.IntermediateTarget.texture[3].magFilter = THREE.NearestFilter;

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
    window.requestAnimationFrame(function(){
      void function UpdateSunPosition(){ //TODO: this and the entire the cloud shader should be in a different place!
        Application.Main.Renderer.RequestPreAnimationFrame(UpdateSunPosition.bind(this));
        const Time = window.performance.now() + 195000.;
        this.BackgroundMaterial.uniforms.iSunPosition.value = new THREE.Vector3(Math.cos(Time / 100000.), -0.4 + Math.sin(Time / 100000.) * .2, Math.sin(Time / 100000.)).normalize();
      }.bind(this)();

      //this.BackgroundMaterial.uniforms["iSimplexTexture"].value = this.SimplexTexture;

      void function UpdateMouse(){
        Application.Main.Renderer.RequestPreAnimationFrame(UpdateMouse.bind(this));
        this.BackgroundMaterial.uniforms.iMouse.value.set(this.Camera.rotation.y * Math.PI * 50,this.Camera.rotation.x * Math.PI * 50);
        this.BackgroundMaterial.uniforms.iRotation.value.copy(this.Camera.rotation);
        this.BackgroundMaterial.uniforms.iPosition.value.copy(this.Camera.position);
        this.BackgroundMaterial.uniforms.iGlobalTime.value = window.performance.now() / 1000.;
        this.BackgroundMaterial.uniforms.FOV.value = Number.parseFloat(this.Camera.fov) * Math.PI / 180.;
      }.bind(this)();
    }.bind(this));

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

    //this.Events.FireEventListeners("RenderingRaytracedPass");
    //this.Renderer.render(this.RaytracedPassScene, this.Camera);

    //this.Renderer.clear(false, true, false);

    this.Events.FireEventListeners("RenderingNearMeshPass");
    this.Camera.near = 1.5;
    this.Camera.far = 384.;
    this.Camera.updateProjectionMatrix();
    //Application.Main.Raymarcher.Material.stencilRef = 253;

    this.Renderer.render(this.NearScene, this.Camera);

    //this.Renderer.clear(false, true, false);

    this.Renderer.setRenderTarget(this.ClampDepthRenderTarget);
    this.Renderer.render(this.TestPassScene, this.Camera);
    this.Renderer.setRenderTarget(this.IntermediateTarget);

    this.Events.FireEventListeners("RenderingFarMeshPass");
    this.Camera.near = 48.;
    this.Camera.far = 49152.;
    this.Camera.updateProjectionMatrix();
    //Application.Main.Raymarcher.Material.stencilRef = 252;

    this.Renderer.render(this.FarScene, this.Camera);
    //gl.disable(gl.STENCIL_TEST);

    //this.Renderer.setRenderTarget(null);
    //this.Renderer.render(this.BackgroundScene, this.BackgroundCamera);

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


    /*
    this.Renderer.setRenderTarget(null);
    this.Renderer.clear();
    this.Events.FireEventListeners("RenderingCorrectionPass");
    */
    this.Events.FireEventListeners("AfterRender");
  }
  RequestAnimationFrame(Listener){
    this.Events.AddEventListener("AfterRender", Listener, {"Once": true});
  }
  RequestPreAnimationFrame(Listener){
    this.Events.AddEventListener("BeforeRender", Listener, {"Once": true});
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
