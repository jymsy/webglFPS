import { Vector3, Matrix4 } from "../utils/cuon-matrix";

class Camera {
  factor = 20;
  step = 0.015;
  worldUp = new Vector3([0, 1, 0]);
  position = new Vector3([0, 0.5, 0]);
  front = new Vector3([0, 0, -1]);
  up = new Vector3([0, 1, 0]);
  right = new Vector3([1, 0, 0]);
  angleY = 0;
  angleX = 0;
  goFoward = false;
  goBack = false;
  goRight = false;
  goLeft = false;
  jumping = false;
  speedY = 0; // Y方向速度
  g = -0.005; // 重力加速度

  updateCameraVector() {
    const xRadian = (Math.PI * this.angleX) / 180; //转为弧度制
    const yRadian = (Math.PI * (90 - this.angleY)) / 180;
    const x = Math.cos(xRadian) * Math.cos(yRadian);
    const y = Math.sin(xRadian);
    const z = -Math.sin(yRadian) * Math.cos(xRadian);
  
    this.front = new Vector3([x, y, z]).normalize();
    this.right = this.front.cross(this.worldUp);
    this.up = this.right.cross(this.front);
  };

  handleMouseMove = (x: number, y: number) => {
    const dx = x / this.factor;
    const dy = y / this.factor;
  
    this.angleY = this.angleY + dx;
    this.angleX = this.angleX - dy;
  
    if (this.angleX > 80) this.angleX = 80;
    if (this.angleX < -80) {
      this.angleX = -80;
    }
    this.updateCameraVector();
  };

  handleKeyDown = (key: string) => {
    switch (key) {
      case "w":
        this.goFoward = true;
        this.goBack = false;
        break;
      case "s":
        this.goBack = true;
        this.goFoward = false;
        break;
      case "a":
        this.goLeft = true;
        this.goRight = false;
        break;
      case "d":
        this.goRight = true;
        this.goLeft = false;
        break;
      case " ":
        if (!this.jumping) {
          this.speedY = 0.05;
          this.jumping = true;
        }
        break;
      default:
        break;
    }
  };

  handleKeyUp = (key: string) => {
    switch (key) {
      case "w":
        this.goFoward = false;
        break;
      case "s":
        this.goBack = false;
        break;
      case "a":
        this.goLeft = false;
        break;
      case "d":
        this.goRight = false;
        break;
      default:
        break;
    }
  };

  boundingPosition = () => {
    if (this.position.elements[2] <= -1.9) {
      this.position.elements[2] = -1.9;
    }
    if (this.position.elements[2] >= 1.9) {
      this.position.elements[2] = 1.9;
    }
    if (this.position.elements[0] <= -1.9) {
      this.position.elements[0] = -1.9;
    }
    if (this.position.elements[0] >= 1.9) {
      this.position.elements[0] = 1.9;
    }
  };

  getViewMatrix = () => {
    if (this.goFoward || this.goBack || this.goLeft || this.goRight) {
      if (this.goFoward) {
        const movement = this.front.scale(this.step);
        movement.elements[1] = 0;
        this.position = this.position.add(movement);
      } else if (this.goBack) {
        const movement = this.front.scale(this.step);
        movement.elements[1] = 0;
        this.position = this.position.sub(movement);
      }
      if (this.goLeft) {
        const movement = this.right.scale(this.step);
        movement.elements[1] = 0;
        this.position = this.position.sub(movement);
      } else if (this.goRight) {
        const movement = this.right.scale(this.step);
        movement.elements[1] = 0;
        this.position = this.position.add(movement);
      }
      this.boundingPosition();
    }
  
    // handle jump
    if (this.jumping) {
      if (this.position.elements[1] > 0.7) {
        this.position.elements[1] = 0.7;
        this.speedY = 0;
      } else if (this.position.elements[1] < 0.5) {
        this.position.elements[1] = 0.5;
        this.speedY = 0;
        this.jumping = false;
      } else {
        this.position.elements[1] += this.speedY;
        this.speedY += this.g;
      }
    }
  
    return new Matrix4().setLookAt(
      this.position.elements[0],
      this.position.elements[1],
      this.position.elements[2],
      this.position.elements[0] + this.front.elements[0],
      this.position.elements[1] + this.front.elements[1],
      this.position.elements[2] + this.front.elements[2],
      this.up.elements[0],
      this.up.elements[1],
      this.up.elements[2]
    );
  };
}

export default new Camera();
