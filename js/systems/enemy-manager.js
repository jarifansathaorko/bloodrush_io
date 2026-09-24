// ============================================================
// BloodRush.io — Enemy Manager (Safe Spawn, Spawn Protection & Kill Sound Cooldown)
// ============================================================
import { CONFIG } from "../config.js";
import { Enemy, AIPersonality } from "../entities/enemy.js";

function rng(min, max) {
  return min + Math.random() * (max - min);
}

const PERSONALITIES = [
  AIPersonality.WANDERER,
  AIPersonality.WANDERER,
  AIPersonality.HUNTER,
  AIPersonality.HUNTER,
  AIPersonality.HUNTER,
  AIPersonality.COWARD,
  AIPersonality.COWARD,
  AIPersonality.OPPORTUNIST,
  AIPersonality.AGGRESSOR,
  AIPersonality.AGGRESSOR,
];

export class EnemyManager {
  constructor(foodManager = null) {
    this.enemies     = [];
    this.foodMgr     = foodManager;
    this._respawnQueue = [];
    this.totalKilledByPlayer = 0;

    // ── Kill sound anti-spam ──────────────────────────────
    this._lastKillSoundTime = 0;
    this._killSoundCount    = 0;   // kills in rapid succession
    this._killSoundWindow   = 0;   // accumulator for multi-kill window
  }

  setFoodManager(foodManager) {
    this.foodMgr = foodManager;
  }

  reset() {
    this.enemies       = [];
    this._respawnQueue = [];
    this.totalKilledByPlayer  = 0;
    this._lastKillSoundTime   = 0;
    this._killSoundCount      = 0;
    this._killSoundWindow     = 0;
    this._initialSpawn();
  }

  _initialSpawn() {
    const count = CONFIG.ENEMY.INITIAL_COUNT;
    for (let i = 0; i < count; i++) {
      this._spawnOne(this._randomSize(1), this._randomPersonality(), undefined, undefined, this._randomSkin());
    }
  }

  _randomSize(phase) {
    switch (phase) {
      case 1: return Math.random() < 0.78 ? rng(6, 12) : rng(12, 18);
      case 2:
        if (Math.random() < 0.45) return rng(8, 15);
        if (Math.random() < 0.85) return rng(16, 30);
        return rng(30, 45);
      case 3:
        if (Math.random() < 0.3) return rng(12, 25);
        if (Math.random() < 0.7) return rng(25, 55);
        return rng(55, 90);
      case 4:
        if (Math.random() < 0.25) return rng(20, 40);
        if (Math.random() < 0.6)  return rng(40, 85);
        return rng(85, 140);
      case 5:
      default:
        if (Math.random() < 0.2)  return rng(30, 60);
        if (Math.random() < 0.55) return rng(60, 120);
        return rng(120, 220);
    }
  }

  _randomPersonality() {
    return PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  }

  _randomSkin() {
    const w = CONFIG.AI_SKIN_WEIGHTS;
    const r = Math.random();
    let tier = "default";
    
    if (r < w.tier4) tier = "tier4";
    else if (r < w.tier4 + w.tier3) tier = "tier3";
    else if (r < w.tier4 + w.tier3 + w.tier2) tier = "tier2";
    else if (r < w.tier4 + w.tier3 + w.tier2 + w.tier1) tier = "tier1";
    
    let skinChoices = [];
    if (tier === "default") {
      skinChoices = CONFIG.SKINS.filter(s => !s.rarity || s.rarity === "DEFAULT");
    } else if (tier === "tier1") {
      skinChoices = CONFIG.SKINS.filter(s => s.cost === 1000);
    } else if (tier === "tier2") {
      skinChoices = CONFIG.SKINS.filter(s => s.cost === 10000);
    } else if (tier === "tier3") {
      skinChoices = CONFIG.SKINS.filter(s => s.cost === 50000);
    } else if (tier === "tier4") {
      skinChoices = CONFIG.SKINS.filter(s => s.cost === 100000);
    }

    if (skinChoices.length > 0) {
      const chosen = skinChoices[Math.floor(Math.random() * skinChoices.length)];
      return chosen.id;
    }
    return "cyber_drone";
  }

  // ── Safe spawn: avoid areas near large entities ────────────
  _spawnOne(size, personality, playerX, playerY, skinId = "default") {
    const margin      = 200;
    const maxAttempts = CONFIG.SPAWN.MAX_ATTEMPTS;
    const minDistLarge = CONFIG.SPAWN.MIN_DISTANCE_FROM_LARGE;
    const largeSizeThresh = CONFIG.SPAWN.LARGE_ENTITY_SIZE;

    let bestX       = -1;
    let bestY       = -1;
    let bestDanger  = Infinity; // lower is safer

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = rng(margin, CONFIG.ARENA.WIDTH  - margin);
      const y = rng(margin, CONFIG.ARENA.HEIGHT - margin);

      let danger = 0;
      let isSafe = true;

      // Check distance from player
      if (playerX !== undefined && playerY !== undefined) {
        const dPlayer = Math.hypot(x - playerX, y - playerY);
        if (dPlayer < 450) {
          danger += (450 - dPlayer) * 3;
          if (dPlayer < 200) isSafe = false;
        }
      }

      // Check distance from all large entities
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (e.size < largeSizeThresh) continue;
        const d = Math.hypot(x - e.x, y - e.y);
        if (d < minDistLarge) {
          // Scale danger by how big the entity is
          danger += (minDistLarge - d) * (e.size / largeSizeThresh);
          if (d < minDistLarge * 0.4 && e.size > largeSizeThresh * 1.5) {
            isSafe = false;
          }
        }
      }

      if (isSafe && danger < bestDanger) {
        bestDanger = danger;
        bestX = x;
        bestY = y;
      }

      // Found a perfectly safe spot — use it immediately
      if (isSafe && danger === 0) break;
    }

    // Fall back to best found position if nothing was perfectly safe
    const spawnX = bestX >= 0 ? bestX : rng(margin, CONFIG.ARENA.WIDTH  - margin);
    const spawnY = bestY >= 0 ? bestY : rng(margin, CONFIG.ARENA.HEIGHT - margin);

    this.enemies.push(new Enemy(spawnX, spawnY, size, personality, skinId));
  }

  update(dt, matchPhase, player, audioManager) {
    for (const enemy of this.enemies) {
      enemy.update(dt);
    }

    // Decay kill sound window timer
    if (this._killSoundWindow > 0) {
      this._killSoundWindow -= dt;
      if (this._killSoundWindow <= 0) {
        this._killSoundCount = 0;
        this._killSoundWindow = 0;
      }
    }

    // Remove dead enemies whose death animation completed
    const toRemove = this.enemies.filter((e) => !e.alive && e.deathTimer > 0.8);
    for (const e of toRemove) {
      this._respawnQueue.push({
        timer:       CONFIG.ENEMY.RESPAWN_DELAY + rng(0, 2),
        size:        this._randomSize(matchPhase),
        personality: this._randomPersonality(),
        skinId:      this._randomSkin(),
        playerX:     player?.x,
        playerY:     player?.y,
      });
    }
    this.enemies = this.enemies.filter((e) => e.alive || e.deathTimer <= 0.8);

    // Process respawn queue
    this._respawnQueue = this._respawnQueue.filter((r) => {
      r.timer -= dt;
      if (r.timer <= 0 && this.enemies.length < CONFIG.ENEMY.MAX_COUNT) {
        this._spawnOne(r.size, r.personality, r.playerX, r.playerY, r.skinId);
        return false;
      }
      return true;
    });

    // Enemy-vs-enemy eating & combat
    this._processEnemyEating(audioManager);
  }

  // ── Kill sound anti-spam helper ────────────────────────────
  _playKillSound(audioManager, isCrit) {
    if (!audioManager) return;
    const now      = performance.now() / 1000;
    const cooldown = CONFIG.AUDIO.KILL_SOUND_COOLDOWN;
    const window_  = CONFIG.AUDIO.KILL_MULTI_WINDOW;

    const timeSinceLast = now - this._lastKillSoundTime;

    if (timeSinceLast < cooldown) {
      // Sound suppressed — too soon
      return;
    }

    // Track rapid kills
    if (timeSinceLast < window_) {
      this._killSoundCount++;
    } else {
      this._killSoundCount = 1;
    }
    this._killSoundWindow = window_;
    this._lastKillSoundTime = now;

    // Multi-kill audio: lighter sounds for rapid kills
    if (this._killSoundCount === 1) {
      if (isCrit) audioManager.playCrit();
      else        audioManager.playFeed();
      // Growth chime with slight delay
      setTimeout(() => audioManager.playGrowth(), 120);
    } else if (this._killSoundCount <= 3) {
      // Lighter variation for second/third kill
      audioManager.playMultiKill(this._killSoundCount);
    }
    // Suppress beyond 3 rapid kills to prevent spam
  }

  _processEnemyEating(audioManager) {
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (!b.alive) continue;

        // Skip if either has spawn protection
        if (a.spawnProtection > 0 || b.spawnProtection > 0) continue;

        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < a.size + b.size) {
          const aCanEatB = a.canEat(b) || (a.isDashing && a.size >= b.size * 0.88);
          const bCanEatA = b.canEat(a) || (b.isDashing && b.size >= a.size * 0.88);

          if (aCanEatB && (!bCanEatA || a.size >= b.size)) {
            a.eat(b);
            b.die();
            if (this.foodMgr) this.foodMgr.spawnCorpseBurst(b.x, b.y, 8, b.size / 15);
            if (audioManager) audioManager.playEnemyDeath();
          } else if (bCanEatA) {
            b.eat(a);
            a.die();
            if (this.foodMgr) this.foodMgr.spawnCorpseBurst(a.x, a.y, 8, a.size / 15);
            if (audioManager) audioManager.playEnemyDeath();
          }
        }
      }
    }
  }

  // ── Universal Combat: Player vs Enemy ─────────────────────
  processPlayerEating(player, audioManager, onKillFeedback = null) {
    if (!player || !player.isAlive()) return false;
    let ate = false;
    const pTip = player.proboscisTip;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      // Spawn-protected enemies cannot be eaten
      if (enemy.spawnProtection > 0) continue;

      const centerDist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      const tipDist    = Math.hypot(pTip.x  - enemy.x, pTip.y  - enemy.y);

      const isBodyHit = centerDist < player.size + enemy.size;
      const isTipHit  = tipDist    < enemy.size * 1.35;

      if (isBodyHit || isTipHit) {
        const canKill =
          player.size >= enemy.size * 1.02 ||
          (player.isDashing && player.size >= enemy.size * 0.88);

        if (canKill) {
          const wasDash = player.isDashing;
          player.eat(enemy);
          enemy.die();
          this.totalKilledByPlayer++;

          if (this.foodMgr) {
            this.foodMgr.spawnCorpseBurst(enemy.x, enemy.y, 10, enemy.size / 10);
          }

          // Anti-spam kill sound
          this._playKillSound(audioManager, wasDash);

          if (onKillFeedback) {
            onKillFeedback(enemy, wasDash);
          }

          ate = true;
        }
      }
    }
    return ate;
  }

  // ── Universal Combat: Enemy vs Player ─────────────────────
  processEnemyEatingPlayer(player, audioManager, onDamageFeedback = null) {
    if (!player || !player.isAlive() || player.isInvincible()) return false;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      const centerDist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      const eTip       = enemy.proboscisTip;
      const tipDist    = Math.hypot(eTip.x - player.x, eTip.y - player.y);

      const isBodyHit = centerDist < enemy.size + player.size;
      const isTipHit  = tipDist    < player.size * 1.35;

      if (isBodyHit || isTipHit) {
        const enemyCanKill =
          enemy.size >= player.size * 1.02 ||
          (enemy.isDashing && enemy.size >= player.size * 0.88);

        if (enemyCanKill) {
          const killed = player.takeDamage();
          if (killed) {
            if (this.foodMgr) {
              this.foodMgr.spawnCorpseBurst(player.x, player.y, 16, player.size / 10);
            }
            if (audioManager) audioManager.playDeath();
            if (onDamageFeedback) onDamageFeedback(enemy, "fatal");
          } else {
            if (audioManager) audioManager.playShieldHit();
            if (onDamageFeedback) onDamageFeedback(enemy, "shield");
          }
          return killed;
        }
      }
    }
    return false;
  }

  getRankings(player, username = "You") {
    const list = this.enemies
      .filter((e) => e.alive)
      .map((e) => ({
        name:     e.name,
        size:     e.size,
        color:    e.color,
        isPlayer: false,
      }));
    if (player && player.isAlive()) {
      list.push({
        name:     username || "You",
        size:     player.size,
        color:    player.color,
        isPlayer: true,
      });
    }
    list.sort((a, b) => b.size - a.size);
    return list;
  }

  getPlayerRank(player, username = "You") {
    const rankings = this.getRankings(player, username);
    const idx = rankings.findIndex((r) => r.isPlayer);
    return idx >= 0 ? idx + 1 : rankings.length + 1;
  }
}

export default EnemyManager;
