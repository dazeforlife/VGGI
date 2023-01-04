const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif

#define GLSLIFY 1

varying vec4 color;

void main() {
    gl_FragColor = color;
}`;