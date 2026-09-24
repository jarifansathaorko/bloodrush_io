// ============================================================
// BloodRush.io — Input Manager (Keyboard, Mouse, Touch + Dash)
// ============================================================

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false, rightDown: false };
    this.joystick = {
      active: false,
      dx: 0,
      dy: 0,
      startX: 0,
      startY: 0,
      touchId: null,
    };
    this.direction = { x: 0, y: 0 }; // normalized [-1,1] direction vector
    this.aimAngle = 0; // heading angle in radians
    this.dashTriggered = false;
    this.touchDashActive = false;
    this._useMouseSteering = false;

    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();
    this._bindTouchDashButton();
  }

  _bindKeyboard() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
          "ShiftLeft",
          "ShiftRight",
        ].includes(e.code)
      ) {
        e.preventDefault();
      }
      if (
        e.code === "Space" ||
        e.code === "ShiftLeft" ||
        e.code === "ShiftRight" ||
        e.code === "KeyJ" ||
        e.code === "KeyK"
      ) {
        this.dashTriggered = true;
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
  }

  _bindMouse() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mouse.y =
        (e.clientY - rect.top) * (this.canvas.height / rect.height);
    });

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.mouse.down = true;
      } else if (e.button === 2) {
        this.mouse.rightDown = true;
        this.dashTriggered = true;
      }
    });

    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });

    // Prevent context menu so right-click dash works smoothly
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  _bindTouch() {
    // Virtual joystick on touch
    const onStart = (e) => {
      for (const t of e.changedTouches) {
        // Only attach joystick if touch is on left half of screen
        if (
          t.clientX < window.innerWidth * 0.6 &&
          this.joystick.touchId === null
        ) {
          this.joystick.active = true;
          this.joystick.startX = t.clientX;
          this.joystick.startY = t.clientY;
          this.joystick.touchId = t.identifier;
          this.joystick.dx = 0;
          this.joystick.dy = 0;
        }
      }
    };

    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joystick.touchId) {
          const dx = t.clientX - this.joystick.startX;
          const dy = t.clientY - this.joystick.startY;
          const maxR = 60;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            this.joystick.dx = len > maxR ? dx / len : dx / maxR;
            this.joystick.dy = len > maxR ? dy / len : dy / maxR;
          }
        }
      }
    };

    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joystick.touchId) {
          this.joystick.active = false;
          this.joystick.dx = 0;
          this.joystick.dy = 0;
          this.joystick.touchId = null;
        }
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
  }

  _bindTouchDashButton() {
    const dashBtn = document.getElementById("btn-touch-dash");
    if (dashBtn) {
      dashBtn.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dashTriggered = true;
          this.touchDashActive = true;
        },
        { passive: false },
      );

      dashBtn.addEventListener(
        "touchend",
        (e) => {
          this.touchDashActive = false;
        },
        { passive: true },
      );

      dashBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.dashTriggered = true;
      });
    }
  }

  update(playerScreenX, playerScreenY) {
    // Keyboard direction
    let kx = 0,
      ky = 0;
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) ky -= 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) ky += 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) kx -= 1;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) kx += 1;

    if (kx !== 0 || ky !== 0) {
      const len = Math.hypot(kx, ky);
      this.direction.x = kx / len;
      this.direction.y = ky / len;
      this.aimAngle = Math.atan2(ky, kx);
    } else if (this.joystick.active) {
      this.direction.x = this.joystick.dx;
      this.direction.y = this.joystick.dy;
      if (Math.hypot(this.joystick.dx, this.joystick.dy) > 0.1) {
        this.aimAngle = Math.atan2(this.joystick.dy, this.joystick.dx);
      }
    } else if (this._useMouseSteering || this.mouse.down) {
      const dx = this.mouse.x - playerScreenX;
      const dy = this.mouse.y - playerScreenY;
      const len = Math.hypot(dx, dy);
      if (len > 15) {
        this.direction.x = dx / len;
        this.direction.y = dy / len;
        this.aimAngle = Math.atan2(dy, dx);
      } else {
        this.direction.x = 0;
        this.direction.y = 0;
      }
    } else {
      this.direction.x = 0;
      this.direction.y = 0;
    }
  }

  consumeDash() {
    const d = this.dashTriggered;
    this.dashTriggered = false;
    return d;
  }

  isKey(code) {
    return !!this.keys[code];
  }
  isMoving() {
    return this.direction.x !== 0 || this.direction.y !== 0;
  }

  getJoystickState() {
    return this.joystick;
  }
}

export default InputManager;
