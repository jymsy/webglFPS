import { OBJDoc, DrawingInfo } from "./OBJParse";
import Camera from "./Camera";
import { Matrix4 } from "../utils/cuon-matrix";
import { createProgram } from "../utils/cuon-utils";

const vshaderSource = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    attribute vec4 a_Normal;
      uniform mat4 u_MvpMatrix;
      uniform mat4 u_modelMatrix;
      uniform mat4 u_NormalMatrix;
      varying vec4 v_Color;
      void main() {
        vec3 lightDirection = vec3(-0.35, 0.35, 0.87);
        gl_Position = u_MvpMatrix * u_modelMatrix * a_Position;
        vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
        float nDotL = max(dot(normal, lightDirection), 0.0);
        v_Color = vec4(a_Color.rgb * nDotL, a_Color.a);
      }
  `;

// 片元(像素)着色器(计算出当前绘制图中每个像素的颜色值)
const fshaderSource = `
    precision mediump float;
    varying vec4 v_Color;
    void main() {
      gl_FragColor = v_Color;
    }
  `;

class Gun {
  objDoc: OBJDoc | null = null;
  drawInfo: DrawingInfo | null = null;
  vertexBuffer: WebGLBuffer | null;
  indexBuffer: WebGLBuffer | null;
  colorBuffer: WebGLBuffer | null;
  normalBuffer: WebGLBuffer | null;
  u_ModelMatrix: Matrix4 | null = null;
  g_normalMatrix: Matrix4 | null = null;
  program: WebGLProgram | null;
  u_MvpMatrix: WebGLUniformLocation | null = null;
  u_NormalMatrix: WebGLUniformLocation | null = null;
  u_ModelMatrixLocation: WebGLUniformLocation | null = null;
  a_Position: number = -1;
  a_Color: number = -1;
  a_Normal: number = -1;

  constructor(gl: WebGLRenderingContext, fileName: string) {
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
    this.colorBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.u_ModelMatrix = new Matrix4();
    this.g_normalMatrix = new Matrix4();
    this.program = createProgram(gl, vshaderSource, fshaderSource);
    if (!this.program) {
      return;
    }
    this.a_Position = gl.getAttribLocation(this.program, 'a_Position');
    this.a_Normal = gl.getAttribLocation(this.program, 'a_Normal');
    this.a_Color = gl.getAttribLocation(this.program, 'a_Color');
    this.u_MvpMatrix = gl.getUniformLocation(this.program, 'u_MvpMatrix');
    this.u_NormalMatrix = gl.getUniformLocation(this.program, 'u_NormalMatrix');
    this.u_ModelMatrixLocation = gl.getUniformLocation(this.program, 'u_modelMatrix');

    this.load(fileName);
  }

  load(fileName: string) {
    var request = new XMLHttpRequest();

    request.onreadystatechange = () => {
      if (request.readyState === 4 && request.status !== 404) {
        this.onReadOBJFile(request.responseText, fileName);
      }
    };
    request.open("GET", fileName, true);
    request.send();
  }

  onReadOBJFile(fileString: string, fileName: string) {
    var objDoc = new OBJDoc(fileName); // Create a OBJDoc object
    var result = objDoc.parse(fileString, 0.05, true); // Parse the file
    if (!result) {
      console.log("OBJ file parsing error.");
      return;
    }
    this.objDoc = objDoc;
  }

  update() {
    const cameraPosition = Camera.position;
    // move gun to the right position
    const movement = Camera.front.scale(0.1);
    let startPosition = cameraPosition.add(movement);
    startPosition = startPosition.sub(Camera.up.scale(0.2));
    startPosition = startPosition.add(Camera.right.scale(0.03));

    this.u_ModelMatrix?.setTranslate(
      startPosition.elements[0],
      startPosition.elements[1],
      startPosition.elements[2]
    );
    this.u_ModelMatrix?.rotate(
      -90 - Camera.angleY,
      Camera.up.elements[0],
      Camera.up.elements[1],
      Camera.up.elements[2]
    );
    console.log(Camera.position.elements[0], Camera.position.elements[1], Camera.position.elements[2]);
    this.u_ModelMatrix?.rotate(
      Camera.angleX,
      Camera.right.elements[0],
      Camera.right.elements[1],
      Camera.right.elements[2]
    );
  }

  tick(gl: WebGLRenderingContext, g_MvpMatrix: Matrix4) {
    gl.useProgram(this.program);
    if (this.objDoc != null && this.objDoc.isMTLComplete()) {
      // OBJ and all MTLs are available
      this.drawInfo = this.objDoc!.getDrawingInfo();
      this.objDoc = null;
    }
    if (!this.drawInfo) return;

    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.drawInfo.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(this.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.drawInfo.colors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(this.a_Color, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_Color);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.drawInfo.normals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(this.a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.a_Normal);

    gl.uniformMatrix4fv(this.u_MvpMatrix, false, g_MvpMatrix.elements);
    gl.uniformMatrix4fv(this.u_ModelMatrixLocation, false, this.u_ModelMatrix!.elements);

    this.g_normalMatrix!.setInverseOf(this.u_ModelMatrix!);
    this.g_normalMatrix!.transpose();
  gl.uniformMatrix4fv(this.u_NormalMatrix, false, this.g_normalMatrix!.elements);

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      this.drawInfo.indices,
      gl.STATIC_DRAW
    );

    this.update();

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // Draw
    gl.drawElements(
      gl.TRIANGLES,
      this.drawInfo.indices.length,
      gl.UNSIGNED_SHORT,
      0
    );
  }
}

export default Gun;
