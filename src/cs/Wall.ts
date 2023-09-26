import GLSL from "./GLSL";

class Wall {
  vertices: Float32Array;
  fsize;
  vertexBuffer: WebGLBuffer | null;

  constructor(gl: WebGLRenderingContext, vertex: number[]) {
    this.vertexBuffer = gl.createBuffer();
    if (!this.vertexBuffer) {
      console.log("failed to create buffer");
    }
    this.vertices = new Float32Array(vertex);
    this.fsize = this.vertices.BYTES_PER_ELEMENT;
  }

  tick(gl: WebGLRenderingContext) {
    // 绑定缓冲区对象，指明缓冲区对象的用途
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    // 向缓冲区写入数据(不能直接向缓冲区写入数据，只能向目标写入数据)
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    // 将缓冲区对象分配给a_Position
    gl.vertexAttribPointer(
      GLSL.a_Position,
      3,
      gl.FLOAT,
      false,
      this.fsize * 5,
      0
    );
    // 连接变量与缓冲区对象
    gl.enableVertexAttribArray(GLSL.a_Position);

    gl.uniform1i(GLSL.u_fragType, 1);

    gl.vertexAttribPointer(
      GLSL.a_TexCoord,
      2,
      gl.FLOAT,
      false,
      this.fsize * 5,
      this.fsize * 3
    );
    gl.enableVertexAttribArray(GLSL.a_TexCoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

export default Wall;
