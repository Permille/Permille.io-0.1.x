#version 300 es
#define attribute in
#define varying out

precision highp float;
precision highp int;

attribute highp vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat3 normalMatrix;

void main(){
  gl_Position = vec4(position, 1.);
}