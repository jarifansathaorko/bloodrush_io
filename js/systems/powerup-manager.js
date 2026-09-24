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

    // MAGNET: attract collectibles toward player
    if (player && player.isAlive() && player.powerup === "MAGNET") {
      const pull = CONFIG.POWERUP.TYPES.MAGNET.pullRange;
      const pullSq = pull * pull;
      const speed = 300;
      const px = player.x;
      const py = player.y;

      for (let i = 0, len = this.powerups.length; i < len; i++) {
        const p = this.powerups[i];
        const dx = px - p.x;
        const dy = py - p.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < pullSq && dSq > 1) {
          const d = Math.sqrt(dSq);
          p.x += (dx / d) * speed * dt;
          p.y += (dy / d) * speed * dt;
        }
      }
    }

    // Check player collection
    const checkCollection = player && player.isAlive();
    const px = checkCollection ? player.x : 0;
    const py = checkCollection ? player.y : 0;
    const pSize = checkCollection ? player.size : 0;

    let writeIdx = 0;
    for (let i = 0, len = this.powerups.length; i < len; i++) {
      const p = this.powerups[i];
      const alive = p.update(dt);
      if (!alive || p.collected) continue;

      if (checkCollection && CollisionSystem.overlaps(px, py, pSize, p.x, p.y, p.radius)) {
        p.collected = true;
        player.applyPowerup(p.type);
        if (audioManager) audioManager.playPowerup();
        continue;
      }

      this.powerups[writeIdx++] = p;
    }
    this.powerups.length = writeIdx;
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
