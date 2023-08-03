import { fetchFile, loadImages } from "../utils";
import { OBJDoc, DrawingInfo } from "./OBJParse";
import { Matrix4, Vector3 } from "../utils/cuon-matrix";
import GLSL from "./GLSL";

const vertices = new Float32Array([
  4.0,
  4.0,
  4.0,
  -4.0,
  4.0,
  4.0,
  -4.0,
  -4.0,
  4.0,
  4.0,
  -4.0,
  4.0, // v0-v1-v2-v3 front
  4.0,
  4.0,
  4.0,
  4.0,
  -4.0,
  4.0,
  4.0,
  -4.0,
  -4.0,
  4.0,
  4.0,
  -4.0, // v0-v3-v4-v5 right
  4.0,
  4.0,
  4.0,
  4.0,
  4.0,
  -4.0,
  -4.0,
  4.0,
  -4.0,
  -4.0,
  4.0,
  4.0, // v0-v5-v6-v1 up
  -4.0,
  4.0,
  4.0,
  -4.0,
  4.0,
  -4.0,
  -4.0,
  -4.0,
  -4.0,
  -4.0,
  -4.0,
  4.0, // v1-v6-v7-v2 left
  -4.0,
  -4.0,
  -4.0,
  4.0,
  -4.0,
  -4.0,
  4.0,
  -4.0,
  4.0,
  -4.0,
  -4.0,
  4.0, // v7-v4-v3-v2 down
  4.0,
  -4.0,
  -4.0,
  -4.0,
  -4.0,
  -4.0,
  -4.0,
  4.0,
  -4.0,
  4.0,
  4.0,
  -4.0, // v4-v7-v6-v5 back
]);

const indices = new Uint8Array([
  // Indices of the vertices
  0,
  1,
  2,
  0,
  2,
  3, // front
  4,
  5,
  6,
  4,
  6,
  7, // right
  8,
  9,
  10,
  8,
  10,
  11, // up
  12,
  13,
  14,
  12,
  14,
  15, // left
  16,
  17,
  18,
  16,
  18,
  19, // down
  20,
  21,
  22,
  20,
  22,
  23, // back
]);

class SkyBox {
  objDoc: OBJDoc | null = null;
  vertexBuffer: WebGLBuffer | null;
  indexBuffer: WebGLBuffer | null;
  drawInfo: DrawingInfo | null = null;
  texture: WebGLTexture | null = null;

  constructor(gl: WebGLRenderingContext) {
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
    this.texture = gl.createTexture();
  }

  async init(gl: WebGLRenderingContext) {
    const images = await loadImages([
      "../images/skybox/right.jpg",
      "../images/skybox/left.jpg",
      "../images/skybox/up.jpg",
      "../images/skybox/down.jpg",
      "../images/skybox/back.jpg",
      "../images/skybox/front.jpg",
    ]);

    gl.activeTexture(gl.TEXTURE0 + 2);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    images.forEach((img, index) => {
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_POSITIVE_X + index,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        img
      );
    });
  }

  tick(gl: WebGLRenderingContext) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(GLSL.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(GLSL.a_Position);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.uniform1i(GLSL.u_fragType, 2);
    gl.uniform1i(GLSL.skybox, 2);

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
  }
}

export default SkyBox;
