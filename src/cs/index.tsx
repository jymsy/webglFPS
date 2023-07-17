import { useEffect } from "react";
import { getWebGLContext } from "../utils/cuon-utils";
import { Matrix4 } from "../utils/cuon-matrix";
import Camera from "./Camera";
import renderFPS from "./Fps";
import Target from "./Target";
import GLSL from "./GLSL";
import Wall from "./Wall";
import Bullet from "./Bullet";
import Gun from "./Gun";
import "./style.css";

export default function App() {
  const textures = {
    wall: "../images/wall.jpg",
    ground: "../images/ground.jpg",
  };

  const images: { [key: string]: HTMLImageElement } = {};
  const g_MvpMatrix = new Matrix4();
  const frontVertex = [
    -2, 1, -2, 0, 1, -2, 0, -2, 0, 0, 2, 1, -2, 4, 1, 2, 0, -2, 4, 0,
  ];
  const leftVertex = [
    -2, 1, 2, 0, 1, -2, 0, 2, 0, 0, -2, 1, -2, 4, 1, -2, 0, -2, 4, 0,
  ];
  const floorVertex = [
    -2, 0, -2, 0, 4, -2, 0, 2, 0, 0, 2, 0, -2, 4, 4, 2, 0, 2, 4, 0,
  ];
  const rightVertex = [
    2, 1, -2, 0, 1, 2, 0, -2, 0, 0, 2, 1, 2, 4, 1, 2, 0, 2, 4, 0,
  ];
  const backVertex = [
    -2, 1, 2, 0, 1, -2, 0, 2, 0, 0, 2, 1, 2, 4, 1, 2, 0, 2, 4, 0,
  ];

  const initEventHandlers = (
    canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
    target: Target,
    // bullet: Bullet,
    gun: Gun
  ) => {
    canvas.onmousemove = (ev) => {
      if (document.pointerLockElement) {
        Camera.handleMouseMove(ev.movementX, ev.movementY);
      }
    };

    canvas.addEventListener("click", () => {
      canvas.requestPointerLock();
    });

    canvas.addEventListener("mousedown", (ev: MouseEvent) => {
      // left mouse button
      if (ev.button === 0) {
        if (document.pointerLockElement) {
          gl.useProgram(GLSL.program);
          target.isHit(gl, canvas.width / 2, canvas.height / 2);
          // bullet.fire();
        }
      } else if (ev.button === 2 && document.pointerLockElement) {
        gun.setAiming(true);
      }
    });

    canvas.addEventListener("mouseup", (ev: MouseEvent) => {
      // right mouse button up
      if (ev.button === 2 && document.pointerLockElement) {
        gun.setAiming(false);
      }
    });

    document.addEventListener("keydown", (ev) => {
      if (document.pointerLockElement) {
        Camera.handleKeyDown(ev.key);
      }
    });

    document.addEventListener("keyup", (ev) => {
      if (document.pointerLockElement) {
        Camera.handleKeyUp(ev.key);
      }
    });
  };

  const loadTexture = (
    gl: WebGLRenderingContext,
    texture: WebGLTexture,
    image: HTMLImageElement,
    index: number
  ) => {
    // 开启纹理单元
    gl.activeTexture(gl.TEXTURE0 + index);
    // 向target绑定纹理对象
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 配置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // 配置纹理图像
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  };

  const initTextures = (gl: WebGLRenderingContext) => {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // 对纹理图像y轴反转
    Object.keys(images).forEach((key, index) => {
      const texture = gl.createTexture(); // 创建纹理对象
      if (!texture) {
        console.log("Failed to create the texture object");
        return false;
      }

      loadTexture(gl, texture, images[key], index);
    });
  };

  const loadTextures = (callback: () => void) => {
    let imagesNums = Object.keys(textures).length;

    const onImageLoad = () => {
      --imagesNums;
      // 如果所有图像都加载完成就调用回调函数
      if (imagesNums == 0) {
        callback();
      }
    };
    Object.keys(textures).forEach((name) => {
      const image = new Image();
      image.src = textures[name as keyof typeof textures];
      image.onload = onImageLoad;
      images[name] = image;
    });
  };

  function main() {
    const fps = document.querySelector("#fps");
    const canvas = document.querySelector("#glcanvas") as HTMLCanvasElement;
    // 初始化 WebGL 上下文
    // canvas.getContext("webgl")
    const gl = getWebGLContext(canvas);

    // 确认 WebGL 支持性
    if (!gl) {
      alert("无法初始化 WebGL，你的浏览器、操作系统或硬件等可能不支持 WebGL。");
      return;
    }

    GLSL.init(gl);

    const frontWall = new Wall(gl, frontVertex);
    const backWall = new Wall(gl, backVertex);
    const leftWall = new Wall(gl, leftVertex);
    const rightWall = new Wall(gl, rightVertex);
    const floor = new Wall(gl, floorVertex);
    const target = new Target(gl, 0.5, 0.4);
    // const bullet = new Bullet(gl);
    const gun = new Gun(gl, "gun.obj");

    initEventHandlers(canvas, gl, target, gun);

    const viewProjMatrix = new Matrix4();
    const finalMatrix = new Matrix4();
    viewProjMatrix.setPerspective(
      50.0,
      canvas.width / canvas.height,
      0.05,
      10.0
    );

    // 使用完全不透明的黑色清除所有图像，背景色会驻存在webgl系统中，
    // 下次调用clearColor方法前不会改变。
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    loadTextures(() => {
      initTextures(gl);
      const tick = (time: number) => {
        gl.useProgram(GLSL.program);
        renderFPS(time, fps!);
        const viewMatrix = Camera.getViewMatrix();
        finalMatrix.set(viewProjMatrix)?.concat(viewMatrix);
        g_MvpMatrix.set(finalMatrix);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(GLSL.u_MvpMatrix, false, g_MvpMatrix.elements);

        // 将0号纹理传递给着色器
        gl.uniform1i(GLSL.u_Sampler, 0);
        frontWall.tick(gl, true);
        leftWall.tick(gl, true);
        rightWall.tick(gl, true);
        backWall.tick(gl, true);
        gl.uniform1i(GLSL.u_Sampler, 1);
        floor.tick(gl, true);

        target.tick(gl);

        // bullet.tick(gl);
        gun.tick(gl, g_MvpMatrix);

        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  useEffect(() => {
    main();
  }, []);

  return (
    <>
      <div className="aim" />
      <div id="fps" />
      <canvas
        id="glcanvas"
        width="1200"
        height="800"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        你的浏览器似乎不支持或者禁用了 HTML5 <code>&lt;canvas&gt;</code> 元素。
      </canvas>
    </>
  );
}
