import { fetchFile } from "../utils";
import { OBJDoc, DrawingInfo } from "./OBJParse";

class SkyBox {
  objDoc: OBJDoc | null = null;
  vertexBuffer: WebGLBuffer | null;
  indexBuffer: WebGLBuffer | null;

  constructor(gl: WebGLRenderingContext, fileName: string) {
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

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
}
