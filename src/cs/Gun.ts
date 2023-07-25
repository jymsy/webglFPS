import { OBJDoc, DrawingInfo } from "./OBJParse";
import Camera from "./Camera";
import { fetchFile } from "../utils";
import { Matrix4, Vector3 } from "../utils/cuon-matrix";
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
  isAiming = false;
  step = 0.002;
  aimEnd = false;
  currentX: number = 0;

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
    this.a_Position = gl.getAttribLocation(this.program, "a_Position");
    this.a_Normal = gl.getAttribLocation(this.program, "a_Normal");
    this.a_Color = gl.getAttribLocation(this.program, "a_Color");
    this.u_MvpMatrix = gl.getUniformLocation(this.program, "u_MvpMatrix");
    this.u_NormalMatrix = gl.getUniformLocation(this.program, "u_NormalMatrix");
    this.u_ModelMatrixLocation = gl.getUniformLocation(
      this.program,
      "u_modelMatrix"
    );

    fetchFile(fileName, this.onReadOBJFile);
  }

  getVector(positionA: Vector3, positionB: Vector3): Vector3 {
    return new Vector3([
      positionB.elements[0] - positionA.elements[0],
      positionB.elements[1] - positionA.elements[1],
      positionB.elements[2] - positionA.elements[2],
    ]);
  }

  distance(positionA: Vector3, positionB: Vector3): number {
    return Math.sqrt(
      Math.pow(positionA.elements[0] - positionB.elements[0], 2) +
        Math.pow(positionA.elements[1] - positionB.elements[1], 2) +
        Math.pow(positionA.elements[2] - positionB.elements[2], 2)
    );
  }

  // load(fileName: string) {
  //   var request = new XMLHttpRequest();

  //   request.onreadystatechange = () => {
  //     if (request.readyState === 4 && request.status !== 404) {
  //       this.onReadOBJFile(request.responseText, fileName);
  //     }
  //   };
  //   request.open("GET", fileName, true);
  //   request.send();
  // }

  onReadOBJFile = (fileString: string, fileName: string) => {
    var objDoc = new OBJDoc(fileName); // Create a OBJDoc object
    var result = objDoc.parse(fileString, 0.05, true); // Parse the file
    if (!result) {
      console.log("OBJ file parsing error.");
      return;
    }
    this.objDoc = objDoc;
  };

  update() {
    let gunPosition = new Vector3([0, 0, 0]);
    const cameraPosition = Camera.position;
    // move gun to the right position
    const front = new Vector3([
      Camera.front.elements[0],
      Camera.front.elements[1],
      Camera.front.elements[2],
    ]).normalize();
    const up = new Vector3([
      Camera.up.elements[0],
      Camera.up.elements[1],
      Camera.up.elements[2],
    ]).normalize();
    const movement = front.scale(0.15);
    gunPosition = cameraPosition.add(movement);
    gunPosition = gunPosition.sub(up.scale(0.2));
    // gunPosition = gunPosition.add(Camera.right.scale(0.02));

    if (this.isAiming) {
      this.currentX += this.step;
      const right = new Vector3([
        Camera.right.elements[0],
        Camera.right.elements[1],
        Camera.right.elements[2],
      ]).normalize();
      const endPosition = gunPosition.sub(right.scale(0.02));
      if (this.aimEnd) {
        gunPosition = endPosition;
      } else {
        const aimVector = this.getVector(gunPosition, endPosition);
        gunPosition = gunPosition.add(
          aimVector.normalize().scale(this.currentX)
        );
        if (this.distance(endPosition, gunPosition) < this.step) {
          gunPosition = endPosition;
          this.aimEnd = true;
        }
      }
    } else if (this.currentX) {
      // mouse up
      this.currentX = 0;
      this.aimEnd = false;
    }

    this.u_ModelMatrix?.setTranslate(
      gunPosition.elements[0],
      gunPosition.elements[1],
      gunPosition.elements[2]
    );

    this.u_ModelMatrix?.rotate(
      -90 - Camera.angleY,
      Camera.up.elements[0],
      Camera.up.elements[1],
      Camera.up.elements[2]
    );
    this.u_ModelMatrix?.rotate(
      Camera.angleX,
      Camera.right.elements[0],
      Camera.right.elements[1],
      Camera.right.elements[2]
    );
  }

  setAiming(aiming: boolean) {
    this.isAiming = aiming;
  }

  tick(gl: WebGLRenderingContext, g_MvpMatrix: Matrix4) {
    if (this.objDoc != null && this.objDoc.isMTLComplete()) {
      // OBJ and all MTLs are available
      this.drawInfo = this.objDoc!.getDrawingInfo();
      this.objDoc = null;
    }
    if (!this.drawInfo) return;

    gl.useProgram(this.program);

    this.update();
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
    gl.uniformMatrix4fv(
      this.u_ModelMatrixLocation,
      false,
      this.u_ModelMatrix!.elements
    );

    this.g_normalMatrix!.setInverseOf(this.u_ModelMatrix!);
    this.g_normalMatrix!.transpose();
    gl.uniformMatrix4fv(
      this.u_NormalMatrix,
      false,
      this.g_normalMatrix!.elements
    );

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      this.drawInfo.indices,
      gl.STATIC_DRAW
    );

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
