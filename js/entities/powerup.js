// ============================================================
// BloodRush.io — Power-up Entity
// ============================================================
import { CONFIG } from "../config.js";

export const PowerupType = {
  SPEED: "SPEED",
  SHIELD: "SHIELD",
  FRENZY: "FRENZY",
  MAGNET: "MAGNET",
};

const TYPES_ARRAY = Object.keys(PowerupType);
let _nextPowerupId = 1;

export class Powerup {
  constructor(x, y, type) {
    this.id = _nextPowerupId++;
    this.x = x;
    this.y = y;
    this.type =
      type || TYPES_ARRAY[Math.floor(Math.random() * TYPES_ARRAY.length)];
    this.cfg = CONFIG.POWERUP.TYPES[this.type];
    this.radius = 14;
    this.collected = false;
    this.age = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.lifetime = CONFIG.POWERUP.DESPAWN_TIME;
  }

  update(dt) {
    this.age += dt;
    this.lifetime -= dt;
    return this.lifetime > 0 && !this.collected;
  }

  get pulse() {
    return 1 + 0.15 * Math.sin(this.age * 4 + this.pulsePhase);
  }

  // Returns type label for drawing
  get label() {
    return this.cfg.symbol || this.type[0];
  }
  get color() {
    return this.cfg.color;
  }
}

export default Powerup;
