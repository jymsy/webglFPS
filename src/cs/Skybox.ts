import { fetchFile, loadImages } from "../utils";
import { OBJDoc, DrawingInfo } from "./OBJParse";
import { Matrix4, Vector3 } from "../utils/cuon-matrix";
import GLSL from "./GLSL";

class SkyBox {
  objDoc: OBJDoc | null = null;
  vertexBuffer: WebGLBuffer | null;
  indexBuffer: WebGLBuffer | null;
  drawInfo: DrawingInfo | null = null;

  constructor(gl: WebGLRenderingContext) {
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
  }

  async init(gl: WebGLRenderingContext, fileName: string) {
    const images = await loadImages([
      "../images/skybox/right.jpg",
      "../images/skybox/left.jpg",
      "../images/skybox/up.jpg",
      "../images/skybox/down.jpg",
      "../images/skybox/back.jpg",
      "../images/skybox/front.jpg",
    ]);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

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

    fetchFile(fileName, this.onReadOBJFile);
  }

  onReadOBJFile(fileString: string, fileName: string) {
    var objDoc = new OBJDoc(fileName); // Create a OBJDoc object
    var result = objDoc.parse(fileString, 3, true); // Parse the file
    if (!result) {
      console.log("OBJ file parsing error.");
      return;
    }
    this.objDoc = objDoc;
  }

  tick(gl: WebGLRenderingContext, g_MvpMatrix: Matrix4) {
    if (this.objDoc != null && this.objDoc.isMTLComplete()) {
      // OBJ and all MTLs are available
      this.drawInfo = this.objDoc!.getDrawingInfo();
      this.objDoc = null;
    }
    if (!this.drawInfo) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.drawInfo.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(GLSL.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(GLSL.a_Position);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      this.drawInfo.indices,
      gl.STATIC_DRAW
    );

    // gl.uniform1i(GLSL.u_hasTexCoord, 0);
    // gl.uniform1i(GLSL.u_hasTexCoordCube, 1);

    gl.drawElements(
      gl.TRIANGLES,
      this.drawInfo.indices.length,
      gl.UNSIGNED_SHORT,
      0
    );
  }
}

export default SkyBox;
