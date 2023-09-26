import { loadImages } from "../utils";
class Texture {
  textures: Array<string>;

  constructor(textures: Array<string>) {
    this.textures = textures;
  }

  async load(gl: WebGLRenderingContext, callback: () => void) {
    const images = await loadImages(this.textures);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // 对纹理图像y轴反转

    images.forEach((image, index) => {
      const texture = gl.createTexture(); // 创建纹理对象
      if (!texture) {
        console.log("Failed to create the texture object");
        return false;
      }

      // 开启纹理单元
      gl.activeTexture(gl.TEXTURE0 + index);
      // 向target绑定纹理对象
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // 配置纹理参数
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      // 配置纹理图像
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    });

    callback();
  }
}

export default Texture;
