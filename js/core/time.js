// ============================================================
// BloodRush.io — Time Manager
// ============================================================

export class TimeManager {
  constructor() {
    this.deltaTime = 0;
    this.totalTime = 0;
    this.fps = 0;
    this._lastTime = 0;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this.fixedStep = 1 / 60; // 60Hz simulation
    this._accumulator = 0;
  }

  tick(timestamp) {
    const rawDelta = (timestamp - this._lastTime) / 1000;
    this._lastTime = timestamp;

    // Clamp delta to avoid spiral of death on tab-out
    this.deltaTime = Math.min(rawDelta, 0.1);
    this.totalTime += this.deltaTime;
    this._accumulator += this.deltaTime;

    // FPS counter
    this._fpsAccum += this.deltaTime;
    this._fpsFrames++;
    if (this._fpsAccum >= 0.5) {
      this.fps = Math.round(this._fpsFrames / this._fpsAccum);
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }
  }

  consumeFixed() {
    if (this._accumulator >= this.fixedStep) {
      this._accumulator -= this.fixedStep;
      return true;
    }
    return false;
  }

  reset() {
    this._lastTime = performance.now();
    this._accumulator = 0;
    this.totalTime = 0;
    this.deltaTime = 0;
  }
}

export default TimeManager;
