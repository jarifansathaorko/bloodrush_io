// ============================================================
// BloodRush.io — Power-up Manager
// ============================================================
import { CONFIG } from "../config.js";
import { Powerup, PowerupType } from "../entities/powerup.js";
import { CollisionSystem } from "./collision.js";

function rng(min, max) {
  return min + Math.random() * (max - min);
}

export class PowerupManager {
  constructor() {
    this.powerups = [];
    this._spawnTimer = rng(3, 8);
  }

  reset() {
    this.powerups = [];
    this._spawnTimer = rng(3, 8);
  }

  update(dt, player, audioManager) {
    this._spawnTimer -= dt;
    if (
      this._spawnTimer <= 0 &&
      this.powerups.length < CONFIG.POWERUP.MAX_COUNT
    ) {
      this._spawn();
      this._spawnTimer = CONFIG.POWERUP.SPAWN_INTERVAL + rng(-2, 2);
    }

    // Update existing powerups
    this.powerups = this.powerups.filter((p) => p.update(dt));

    // MAGNET: attract collectibles toward player
    if (player && player.isAlive() && player.powerup === "MAGNET") {
      const pull = CONFIG.POWERUP.TYPES.MAGNET.pullRange;
      const speed = 300;
      for (const p of this.powerups) {
        const d = CollisionSystem.distance(player.x, player.y, p.x, p.y);
        if (d < pull && d > 1) {
          p.x += ((player.x - p.x) / d) * speed * dt;
          p.y += ((player.y - p.y) / d) * speed * dt;
        }
      }
    }

    // Check player collection
    if (player && player.isAlive()) {
      const collected = [];
      for (const p of this.powerups) {
        if (
          CollisionSystem.overlaps(
            player.x,
            player.y,
            player.size,
            p.x,
            p.y,
            p.radius,
          )
        ) {
          player.applyPowerup(p.type);
          if (audioManager) audioManager.playPowerup();
          collected.push(p);
        }
      }
      this.powerups = this.powerups.filter((p) => !collected.includes(p));
    }
  }

  _spawn() {
    const margin = 200;
    const x = rng(margin, CONFIG.ARENA.WIDTH - margin);
    const y = rng(margin, CONFIG.ARENA.HEIGHT - margin);
    const types = Object.keys(PowerupType);
    const type = types[Math.floor(Math.random() * types.length)];
    this.powerups.push(new Powerup(x, y, type));
  }
}

export default PowerupManager;
