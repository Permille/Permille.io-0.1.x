precision mediump float;
varying vec2 vUv;
varying vec4 vPosition;

uniform vec2 iResolution;
uniform float iGlobalTime;
uniform vec2 iMouse;
uniform vec2 iMouseFirst;
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
  //if(length(gl_FragCoord.xy - iMouse) < 2.) return vec3(1., 0., 0.);
  //if(length(gl_FragCoord.xy - iMouseFirst) < 2.) return vec3(0., 0., 1.);
  //return vec3(1.);

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
  if(dot(direction, vec3(0, 1, 0)) < 0.05) return sky;
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