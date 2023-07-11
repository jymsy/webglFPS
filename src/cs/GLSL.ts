import { createProgram } from "../utils/cuon-utils";

// 顶点着色器(计算顶点的位置)
const vshaderSource = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
      uniform mat4 u_MvpMatrix;
      attribute vec2 a_TexCoord;
      uniform bool u_hasTexCoord;
      uniform bool u_Clicked;
      varying vec2 v_TexCoord;
      varying vec4 v_Color;
      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        if (u_hasTexCoord) {
          v_TexCoord = a_TexCoord;
        } else {
          v_TexCoord = vec2(-1.0, -1.0);
        }
        if (u_Clicked) {
          v_Color = vec4(1, 0, 0, 1);
        } else {
          v_Color = a_Color;
        }
      }
  `;

// 片元(像素)着色器(计算出当前绘制图中每个像素的颜色值)
const fshaderSource = `
    precision mediump float;
    varying vec4 v_Color;
    uniform sampler2D u_Sampler;
    varying vec2 v_TexCoord;
    void main() {
      if (v_TexCoord.x >= 0.0) {
        gl_FragColor = texture2D(u_Sampler, v_TexCoord);
      } else {
        gl_FragColor = v_Color;
      }
    }
  `;

class GLSL {
  program: WebGLProgram | null = null;
  u_MvpMatrix: WebGLUniformLocation | null = null;
  u_ModelMatrix: WebGLUniformLocation | null = null;
  u_hasTexCoord: WebGLUniformLocation | null = null;
  u_Clicked: WebGLUniformLocation | null = null;
  u_Sampler: WebGLUniformLocation | null = null;
  a_Position: number = -1;
  a_Color: number = -1;
  a_TexCoord: number = -1;

  init(gl: WebGLRenderingContext) {
    // 初始化着色器
    this.program = createProgram(gl, vshaderSource, fshaderSource);
    // this.program = initShaders(gl, vshaderSource, fshaderSource);
    if (!this.program) {
      console.log("initialize shaders failed");
      return;
    }

    this.u_MvpMatrix = gl.getUniformLocation(this.program, "u_MvpMatrix");
    if (!this.u_MvpMatrix) {
      console.log("Failed to get the storage locations of u_MvpMatrix");
      return;
    }

    this.a_Position = gl.getAttribLocation(this.program, "a_Position");
    if (this.a_Position < 0) {
      console.log("failed to get the storage location of a_Position");
      return -1;
    }

    this.u_hasTexCoord = gl.getUniformLocation(this.program, "u_hasTexCoord");
    if (!this.u_hasTexCoord) {
      console.log("failed to get u_hasTexCoord ");
      return -1;
    }

    this.a_Color = gl.getAttribLocation(this.program, "a_Color");
    if (this.a_Color < 0) {
      console.log("failed to get a_Color ");
      return -1;
    }

    this.u_Clicked = gl.getUniformLocation(this.program, "u_Clicked");

    // 获取u_Sampler的存储位置
    this.u_Sampler = gl.getUniformLocation(this.program, "u_Sampler");
    //  if (!u_Sampler) {
    //    console.log("Failed to get the storage location of u_Sampler");
    //    return false;
    //  }
    this.a_TexCoord = gl.getAttribLocation(this.program, "a_TexCoord");
    // if (a_TexCoord < 0) {
    //   console.log("failed to get the storage location of a_TexCoord");
    //   return -1;
    // }
  }
}

export default new GLSL();
