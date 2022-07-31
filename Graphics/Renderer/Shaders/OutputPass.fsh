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