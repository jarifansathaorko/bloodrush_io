// ============================================================
// BloodRush.io — Food Entity (Blood Droplets & Nectar Orbs)
// ============================================================
import { CONFIG } from "../config.js";

export const FoodType = {
  BLOOD: "BLOOD",
  NECTAR: "NECTAR",
};

export class Food {
  constructor(x, y, type = FoodType.BLOOD, value = null) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.x = x;
    this.y = y;
    this.type = type;
    this.isBlood = type === FoodType.BLOOD;
    this.radius = this.isBlood
      ? CONFIG.FOOD.BLOOD_DROP_SIZE
      : CONFIG.FOOD.NECTAR_DROP_SIZE;
    this.value =
      value !== null
        ? value
        : this.isBlood
          ? CONFIG.FOOD.SIZE_GAIN_BLOOD
          : CONFIG.FOOD.SIZE_GAIN_NECTAR;
    this.color = this.isBlood
      ? CONFIG.COLORS.BLOOD_DROP
      : CONFIG.COLORS.NECTAR_DROP;

    this.sparklePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 2 + Math.random() * 2;
    this.vx = (Math.random() - 0.5) * 40;
    this.vy = (Math.random() - 0.5) * 40;
    this.age = 0;
    this.collected = false;
  }

  update(dt) {
    this.age += dt;
    this.sparklePhase += dt * this.pulseSpeed;

    // Damp initial burst velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.92;
    this.vy *= 0.92;

    return !this.collected;
  }

  get pulse() {
    return 1 + 0.18 * Math.sin(this.sparklePhase);
  }
}

export default Food;
