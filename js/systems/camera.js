// ============================================================
// BloodRush.io — Camera Manager
// ============================================================
import { CONFIG } from "../config.js";

export class CameraManager {
  constructor(canvasWidth, canvasHeight) {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this._targetX = 0;
    this._targetY = 0;
    this._targetZoom = 1;
    this.smoothing = 6; // higher = snappier
  }

  resize(w, h) {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  follow(player) {
    this._targetX = player.x;
    this._targetY = player.y;
    // Zoom out slightly as player grows (allowing much smaller minimum zoom for huge sizes)
    const sizeFactor = Math.max(1, player.size / CONFIG.PLAYER.START_SIZE);
    this._targetZoom = Math.max(0.35, 1.0 / Math.pow(sizeFactor, 0.4));
  }

  update(dt) {
    const s = Math.min(1, this.smoothing * dt);
    this.x += (this._targetX - this.x) * s;
    this.y += (this._targetY - this.y) * s;
    this.zoom += (this._targetZoom - this.zoom) * s;
  }

  // Apply transform to canvas context
  apply(ctx) {
    ctx.save();
    ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  restore(ctx) {
    ctx.restore();
  }

  // Convert world coords → screen coords (for HUD elements)
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.canvasWidth / 2,
      y: (wy - this.y) * this.zoom + this.canvasHeight / 2,
    };
  }

  // Convert screen coords → world coords (for input)
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.canvasWidth / 2) / this.zoom + this.x,
      y: (sy - this.canvasHeight / 2) / this.zoom + this.y,
    };
  }

  // Is a world-space circle visible on screen?
  isVisible(wx, wy, r) {
    const sx = (wx - this.x) * this.zoom + this.canvasWidth / 2;
    const sy = (wy - this.y) * this.zoom + this.canvasHeight / 2;
    const sr = r * this.zoom;
    return (
      sx + sr > -20 &&
      sx - sr < this.canvasWidth + 20 &&
      sy + sr > -20 &&
      sy - sr < this.canvasHeight + 20
    );
  }
}

export default CameraManager;
