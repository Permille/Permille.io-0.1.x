varying vec2 vUv;
varying vec4 vPosition;

void main() {
  vUv = uv;
  vPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  gl_Position = vPosition;
}