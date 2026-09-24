// ============================================================
// BloodRush.io — Food Manager (Boost Recharge via Food Collection)
// ============================================================
import { CONFIG } from "../config.js";
import { Food, FoodType } from "../entities/food.js";
import { CollisionSystem } from "./collision.js";

function rng(min, max) {
  return min + Math.random() * (max - min);
}

export class FoodManager {
  constructor(environment) {
    this.env  = environment;
    this.foods = [];
    this._spawnTimer = 0;
    this.init();
  }

  init() {
    this.foods = [];
    const count = CONFIG.FOOD.INITIAL_COUNT;
    for (let i = 0; i < count; i++) {
      this._spawnRandomFood();
    }
  }

  reset() {
    this.init();
  }

  _spawnRandomFood() {
    const margin = 140;
    const x = rng(margin, CONFIG.ARENA.WIDTH  - margin);
    const y = rng(margin, CONFIG.ARENA.HEIGHT - margin);

    // Higher nectar probability near the northern rose garden region
    let isNectar = Math.random() < 0.38;
    if (this.env && y < CONFIG.ARENA.HEIGHT * 0.4) {
      isNectar = Math.random() < 0.65;
    }

    const type = isNectar ? FoodType.NECTAR : FoodType.BLOOD;
    this.foods.push(new Food(x, y, type));
  }

  spawnCorpseBurst(
    x,
    y,
    count = CONFIG.FOOD.CORPSE_BURST_COUNT,
    sizeBonus = 1,
  ) {
    for (
      let i = 0;
      i < count && this.foods.length < CONFIG.FOOD.MAX_COUNT + 80;
      i++
    ) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = rng(12, 55);
      const fx    = x + Math.cos(angle) * dist;
      const fy    = y + Math.sin(angle) * dist;
      const f     = new Food(
        fx,
        fy,
        FoodType.BLOOD,
        CONFIG.FOOD.SIZE_GAIN_BLOOD * 1.6 * sizeBonus,
      );
      f.vx = Math.cos(angle) * rng(90, 240);
      f.vy = Math.sin(angle) * rng(90, 240);
      this.foods.push(f);
    }
  }

  update(dt, player, enemies, audioManager) {
    // Continuous passive food respawn
    this._spawnTimer += dt;
    if (this._spawnTimer >= CONFIG.FOOD.SPAWN_INTERVAL) {
      this._spawnTimer = 0;
      if (this.foods.length < CONFIG.FOOD.MAX_COUNT) {
        this._spawnRandomFood();
      }
    }

    // ── Player collects food ──────────────────────────────
    if (player && player.isAlive()) {
      const magnetRadius =
        player.powerup === "MAGNET"
          ? CONFIG.FOOD.MAGNET_POWERUP_RADIUS
          : CONFIG.FOOD.MAGNET_PULL_RADIUS + player.size * 0.9;
      const magnetSpeed = 440;

      for (const food of this.foods) {
        if (food.collected) continue;
        const d = CollisionSystem.distance(player.x, player.y, food.x, food.y);

        // Magnetic pull
        if (d < magnetRadius && d > 2) {
          const pullFactor = 1 - d / magnetRadius;
          food.x += ((player.x - food.x) / d) * magnetSpeed * pullFactor * dt;
          food.y += ((player.y - food.y) / d) * magnetSpeed * pullFactor * dt;
        }

        // Eat detection — pass isNectar so feedOnFood can give correct boost recharge
        if (d < player.size + food.radius * 1.3) {
          food.collected = true;
          const isNectar = !food.isBlood;
          player.feedOnFood(food.value, isNectar);

          // Quiet food pickup chime (low probability to avoid constant noise)
          if (audioManager && Math.random() < 0.12) {
            audioManager.playFoodCollect();
          }
        }
      }
    }

    // ── Enemies graze on food ─────────────────────────────
    if (enemies) {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const eatRadius = enemy.size + 6;
        for (const food of this.foods) {
          if (food.collected) continue;
          const d = CollisionSystem.distance(enemy.x, enemy.y, food.x, food.y);
          if (d < eatRadius) {
            food.collected = true;
            const isNectar = !food.isBlood;
            // Enemies get 85% of the food value, but full boost recharge
            enemy.feedOnFood(food.value * 0.85, isNectar);
          }
        }
      }
    }

    this.foods = this.foods.filter((f) => f.update(dt) && !f.collected);
  }

  getNearbyFood(x, y, maxDistance = 280) {
    let nearest = null;
    let minDist = maxDistance;
    for (const food of this.foods) {
      if (food.collected) continue;
      const d = CollisionSystem.distance(x, y, food.x, food.y);
      if (d < minDist) {
        minDist  = d;
        nearest  = food;
      }
    }
    return nearest;
  }
}

export default FoodManager;
