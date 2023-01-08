"use strict";

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.

let handlePosition = 0.0;

const texturePoint = { x: 100, y: 400 };

let a = 0;
let c = 1;
let theta = 0;
let b = c / Math.PI;

const deg2rad = (angle) => {
  return (angle * Math.PI) / 180;
};

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices, textures) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);

    this.count = vertices.length / 3;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iNormal);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };
}

// Constructor
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;

  this.iNormal = -1;
  this.iNormalMatrix = -1;

  this.iAmbientColor = -1;
  this.iDiffuseColor = -1;
  this.iSpecularColor = -1;

  this.iShininess = -1;
  this.iLightPosition = -1;
  this.iLightVec = -1;

  this.iTextureCoords = -1;
  this.iTextureU = -1;
  this.iTextureAngle = -1;
  this.iTexturePoint = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
  let translateToPointZero = m4.translation(0, 0, -10);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
  const modelViewInverse = m4.inverse(matAccum1, new Float32Array(16));
  const normalMatrix = m4.transpose(modelViewInverse, new Float32Array(16));

  /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  );
  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

  gl.uniform3fv(shProgram.iLightPosition, lightCoordinates());
  gl.uniform3fv(shProgram.iLightDirection, [1, 0, 0]);
  gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));
  gl.uniform1f(shProgram.iShininess, 1.0);

  gl.uniform3fv(shProgram.iAmbientColor, [0.5, 0, 0.4]);
  gl.uniform3fv(shProgram.iDiffuseColor, [1.3, 1.0, 0.0]);
  gl.uniform3fv(shProgram.iSpecularColor, [1.5, 1.0, 1.0]);
  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

  const angle = document.getElementById("rAngle").value;
  gl.uniform1f(shProgram.iTextureAngle, deg2rad(+angle));

  const u = deg2rad(texturePoint.x);
  const v = deg2rad(texturePoint.y);

  gl.uniform2fv(shProgram.iTexturePoint, [
    (a + (c*((Math.cos(3*v)+3*Math.cos(v)) / 4)) * Math.cos(theta) + (c*((3 * Math.sin(v) - Math.sin(3 * v)) / 4)) * Math.sin(theta)) * Math.cos(u),
    (a + (c*((Math.cos(3*v)+3*Math.cos(v)) / 4)) * Math.cos(theta) + (c*((3 * Math.sin(v) - Math.sin(3 * v)) / 4)) * Math.sin(theta)) * Math.sin(u),
  ]);

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(shProgram.iTextureU, 0);

  surface.Draw();
}

const step = (max, splines = 20) => {
  return max / (splines - 1);
};

function CreateSurfaceData() {
  let vertexList = [];
  let textureList = [];
  let splines = 50;

  let maxU = 10;
  let maxV = 10;
  let stepU = step(maxU, splines);
  let stepV = step(maxV, splines);

  let getU = (u) => {
    return u / maxU;
  };

  let getV = (v) => {
    return v / maxV;
  };

  for (let u = 0; u <= maxU; u += stepU) {
    for (let v = 0; v <= maxV; v += stepV) {
      let x = (a + (c*((Math.cos(3*v)+3*Math.cos(v)) / 4)) * Math.cos(theta) + (c*((3 * Math.sin(v) - Math.sin(3 * v)) / 4)) * Math.sin(theta)) * Math.cos(u);
      let y = (a + (c*((Math.cos(3*v)+3*Math.cos(v)) / 4)) * Math.cos(theta) + (c*((3 * Math.sin(v) - Math.sin(3 * v)) / 4)) * Math.sin(theta)) * Math.sin(u);
      let z = b * u - (c*((Math.cos(3*v)+3*Math.cos(v)) / 4)) * Math.sin(theta) + (c*((3 * Math.sin(v) - Math.sin(3 * v)) / 4)) * Math.cos(theta);
      vertexList.push(
        x, y, z
      );
      textureList.push(getU(u), getV(v));
      vertexList.push(
        (a + (c*((Math.cos(3*v)+3*Math.cos(v)) / 4)) * Math.cos(theta) + (c*((3 * Math.sin(v) - Math.sin(3 * v)) / 4)) * Math.sin(theta)) * Math.cos(u + stepU),
        (a + (c*((Math.cos(3*v)+3*Math.cos(v)) / 4)) * Math.cos(theta) + (c*((3 * Math.sin(v) - Math.sin(3 * v)) / 4)) * Math.sin(theta)) * Math.sin(u + stepU),
        b * (u + stepU) - (c*((Math.cos(3*v)+3*Math.cos(v)) / 4)) * Math.sin(theta) + (c*((3 * Math.sin(v) - Math.sin(3 * v)) / 4)) * Math.cos(theta)
      );
      textureList.push(getU(u + stepU), getV(v + stepV));
    }
  }
  return { vertexList, textureList };
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    "ModelViewProjectionMatrix"
  );
  shProgram.iColor = gl.getUniformLocation(prog, "color");

  shProgram.iNormal = gl.getAttribLocation(prog, "normal");
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, "normalMatrix");

  shProgram.iAmbientColor = gl.getUniformLocation(prog, "ambientColor");
  shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseColor");
  shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularColor");

  shProgram.iShininess = gl.getUniformLocation(prog, "shininess");

  shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
  shProgram.iLightVec = gl.getUniformLocation(prog, "lightVec");

  shProgram.iTextureCoords = gl.getAttribLocation(prog, "textureCoords");
  shProgram.iTextureU = gl.getUniformLocation(prog, "textureU");
  shProgram.iTextureAngle = gl.getUniformLocation(prog, "textureAngle");
  shProgram.iTexturePoint = gl.getUniformLocation(prog, "texturePoint");

  surface = new Model("Surface");
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);

  loadTexture();

  gl.enable(gl.DEPTH_TEST);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL(); // initialize the WebGL graphics context
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " +
      e +
      "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  draw();
}

const reDraw = () => {
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);
  draw();
};

const loadTexture = () => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src =
    "https://www.the3rdsequence.com/texturedb/thumbnail/260/512/red+hot+fire+flames.jpg";

  image.addEventListener("load", () => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    draw();
  });
};

const pressW = () => {
  texturePoint.y += 0.5;
  reDraw();
};

const pressS = () => {
  texturePoint.y -= 0.5;
  reDraw();
};

const pressA = () => {
  texturePoint.x -= 0.5;
  reDraw();
};

const pressD = () => {
  texturePoint.x += 0.5;
  reDraw();
};

const left = () => {
  handlePosition -= 0.07;
  reDraw();
};

const right = () => {
  handlePosition += 0.07;
  reDraw();
};

const lightCoordinates = () => {
  let coord = Math.sin(handlePosition) * 1.2;
  return [coord, -2, coord * coord];
};

window.addEventListener("keydown", function (event) {
  switch (event.code) {
    case "ArrowLeft":
      left();
      break;
    case "ArrowRight":
      right();
      break;
    case "KeyW":
      pressW();
      break;
    case "KeyS":
      pressS();
      break;
    case "KeyD":
      pressD();
      break;
    case "KeyA":
      pressA();
      break;
    default:
      return;
  }
});