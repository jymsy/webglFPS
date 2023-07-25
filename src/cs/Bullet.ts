import { Matrix4, Vector3 } from "../utils/cuon-matrix";
import GSSL from "./GLSL";
import Camera from "./Camera";

class Bullet {
  vertices = new Float32Array();
  fsize = 0;
  vertexBuffer: WebGLBuffer | null;
  step = 0.1;
  fired = false;
  front = new Vector3();
  startPosition = new Vector3();
  endPosition = new Vector3();

  constructor(gl: WebGLRenderingContext) {
    this.vertexBuffer = gl.createBuffer();
    if (!this.vertexBuffer) {
      console.log("failed to create buffer");
    }
    
  }

  fire() {
    this.front = Camera.front;
    const cameraPosition = Camera.position;
    const movement = this.front.scale(0.01);
    let startPosition = cameraPosition.add(movement);
    startPosition = startPosition.sub(Camera.up.scale(0.005));
    this.startPosition = startPosition.add(Camera.right.scale(0.005));
    this.endPosition = this.startPosition.add(this.front.scale(0.2));
    this.setVertices([...this.startPosition.toArray(), ...this.endPosition.toArray()]);
    this.fired = true;
  }

  setVertices(vertex: number[]) {
    this.vertices = new Float32Array(vertex);
    this.fsize = this.vertices.BYTES_PER_ELEMENT;
  }

  moveForward() {
    if (this.endPosition.elements.find((pos) => {
      return pos > 2 || pos < -2;
    }) !== undefined) {
      this.fired = false;
      return;
    }
    const movement = this.front.scale(this.step);
    this.startPosition = this.startPosition.add(movement);
    this.endPosition = this.endPosition.add(movement);
    this.setVertices([...this.startPosition.toArray(), ...this.endPosition.toArray()]);
  }

  tick(gl: WebGLRenderingContext) {
    if (!this.fired) {
      return;
    }
    // 绑定缓冲区对象，指明缓冲区对象的用途
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    // 向缓冲区写入数据(不能直接向缓冲区写入数据，只能向目标写入数据)
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    gl.vertexAttribPointer(
      GSSL.a_Position,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    // 连接变量与缓冲区对象
    gl.enableVertexAttribArray(GSSL.a_Position);

    gl.vertexAttrib4f(GSSL.a_Color, 1, 1, 1, 1);
    gl.uniform1i(GSSL.u_fragType, 0.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // gl.uniformMatrix4fv(GSSL.u_MvpMatrix, false, g_MvpMatrix.elements);
    gl.drawArrays(gl.LINES, 0, 2);
    this.moveForward();
  }
}

export default Bullet;
