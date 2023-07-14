import GSSL from "./GLSL";

class Target {
  vertexBuffer: WebGLBuffer | null;
  vertices: Float32Array;
  fsize: number;
  width = 0.2;
  z = -1.99;

  constructor(gl: WebGLRenderingContext, x: number, y: number) {
    this.vertexBuffer = gl.createBuffer();
    if (!this.vertexBuffer) {
      console.log("failed to create buffer");
    }
    this.vertices = this.getVertices(x, y);
    this.fsize = this.vertices.BYTES_PER_ELEMENT;
  }

  getVertices(x: number, y: number) {
    return new Float32Array([
      x,
      y,
      this.z,
      x,
      y - this.width,
      this.z,
      x + this.width,
      y,
      this.z,
      x + this.width,
      y - this.width,
      this.z,
    ])
  }

  tick(gl: WebGLRenderingContext, loadTexture = false) {
    // 绑定缓冲区对象，指明缓冲区对象的用途
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    // 向缓冲区写入数据(不能直接向缓冲区写入数据，只能向目标写入数据)
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    if (loadTexture) {
      // 将缓冲区对象分配给a_Position
      gl.vertexAttribPointer(
        GSSL.a_Position,
        3,
        gl.FLOAT,
        false,
        this.fsize * 5,
        0
      );
    } else {
      gl.vertexAttribPointer(GSSL.a_Position, 3, gl.FLOAT, false, 0, 0);
    }
    // 连接变量与缓冲区对象
    gl.enableVertexAttribArray(GSSL.a_Position);

    gl.vertexAttrib4f(GSSL.a_Color, 1, 1, 1, 1);
    gl.uniform1i(GSSL.u_hasTexCoord, 0);
    if (loadTexture) {
      gl.uniform1i(GSSL.u_hasTexCoord, 1);

      gl.vertexAttribPointer(
        GSSL.a_TexCoord,
        2,
        gl.FLOAT,
        false,
        this.fsize * 5,
        this.fsize * 3
      );
      gl.enableVertexAttribArray(GSSL.a_TexCoord);
    }
    // gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  check(gl: WebGLRenderingContext, x: number, y: number) {
    gl.uniform1i(GSSL.u_Clicked, 1); // red
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.tick(gl);
    const pixels = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.uniform1i(GSSL.u_Clicked, 0);
    return pixels[0] === 255;
  }

  isHit(gl: WebGLRenderingContext , crosshairX: number, crosshairY: number) {
    if (this.check(gl, crosshairX, crosshairY)) {
      const x = Math.random() * ( 1.8 + 2) - 2;
      const y = Math.random() * ( 1 - 0.2) + 0.2;
      this.move(x, y);
    }
  }

  move(x: number, y: number) {
    this.vertices = this.getVertices(x, y);
  }
}

export default Target;
