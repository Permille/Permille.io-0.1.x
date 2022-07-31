#version 300 es
precision highp float;
precision highp int;

uniform highp usampler2D iCopy;

//layout(location = 0) out vec4 outFragColor;
//layout(location = 1) out float outHighPrecisionDepth;

void main(){
  //outFragColor = vec4(0., 1., 0., 1.);
  //outHighPrecisionDepth = 0.;
  gl_FragDepth = texelFetch(iCopy, ivec2(gl_FragCoord.xy), 0).r == 0u ? 1. : 0.;
}