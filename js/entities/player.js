// ============================================================
// BloodRush.io — Player Entity (Diminishing Growth, Mass Decay & Boost Burst)
// ============================================================
import { CONFIG } from "../config.js";

export const PlayerState = {
  SPAWNING:   "SPAWNING",
  ALIVE:      "ALIVE",
  INVINCIBLE: "INVINCIBLE",
  FEEDING:    "FEEDING",
  GROWING:    "GROWING",
  STUNNED:    "STUNNED",
  DYING:      "DYING",
  DEAD:       "DEAD",
};

export class Player {
  constructor(x, y, skinColor = CONFIG.COLORS.PLAYER) {
    this.x     = x;
    this.y     = y;
    this.size  = CONFIG.PLAYER.START_SIZE;
    this.color = skinColor;
    this.glowColor = CONFIG.COLORS.PLAYER_GLOW;
    this.skinId = "cyber_drone";
    this.vfx = "cyber_drone";
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2; // initial heading upwards

    this.state      = PlayerState.SPAWNING;
    this.spawnTimer = CONFIG.PLAYER.SPAWN_PROTECTION;

    // Boost / Stamina & Propulsion burst system
    this.stamina    = CONFIG.PLAYER.STAMINA_MAX;
    this.maxStamina = CONFIG.PLAYER.STAMINA_MAX;
    this.isDashing  = false;
    this.dashTimer  = 0;
    this.boostBurstTimer  = 0;   // 0.24s rear propulsion spray burst
    this.squashStretch    = 1.0; // dynamic recoil spring deformation
    this.turnTilt         = 0;   // bank tilt during sharp turns

    // Power-up slots
    this.powerup      = null;
    this.powerupTimer = 0;
    this.shield       = false;
    this.frenzy       = false;
    this.speedBoost   = 0;

    // Stats
    this.kills        = 0;
    this.score        = 0;
    this.rank         = 1;
    this.survivalTime = 0; // seconds survived this match

    // Visual feedback
    this.growFlash  = 0;
    this.feedFlash  = 0;
    this.deathTimer = 0;
    this.deathAlpha = 1;
    this.pulsePhase = 0;

    // Wing animation
    this.wingAngle = 0;
    this.wingSpeed = 16;
  }

  // ── Speed scaling ──────────────────────────────────────────
  // Small = very fast (310),  Large = quite slow (floor ~70)
  // Uses a stronger logarithmic decay so size genuinely matters.
  get speed() {
    const base         = CONFIG.PLAYER.BASE_SPEED;
    const sizeOverStart = Math.max(0, this.size - CONFIG.PLAYER.START_SIZE);
    const slowdownFactor =
      CONFIG.PLAYER.SPEED_DECAY_RATE *
      Math.min(1.0, Math.log10(1 + sizeOverStart / 18));
    let spd = Math.max(
      CONFIG.PLAYER.MIN_SPEED_FLOOR,
      base * (1 - slowdownFactor),
    );

    if (this.speedBoost > 0)  spd *= 1 + CONFIG.POWERUP.TYPES.SPEED.speedBoost;
    if (this.isDashing)        spd *= CONFIG.PLAYER.DASH_SPEED_MULTIPLIER;
    return spd;
  }

  get proboscisTip() {
    const reach =
      this.size * (this.isDashing ? CONFIG.PLAYER.PIERCE_HITBOX_EXTEND : 1.55);
    return {
      x:     this.x + Math.cos(this.angle) * reach,
      y:     this.y + Math.sin(this.angle) * reach,
      reach: reach,
    };
  }

  // Exact rear abdomen tip position for the blood propulsion spray animation
  get rearAbdomenTip() {
    const rearDist = this.size * 1.5;
    return {
      x: this.x - Math.cos(this.angle) * rearDist,
      y: this.y - Math.sin(this.angle) * rearDist,
    };
  }

  // ── Growth helpers ────────────────────────────────────────
  // Diminishing returns: bigger entities grow less from the same food/kill.
  _effectiveGrowth(baseAmount) {
    return baseAmount / (1 + CONFIG.PLAYER.GROWTH_DIMINISHING_FACTOR * this.size);
  }

  canEat(other) {
    return this.size >= other.size * CONFIG.PLAYER.EAT_THRESHOLD;
  }

  eat(other) {
    // Growth = 20% of victim's size (adjustable via CONFIG.PLAYER.KILL_GROWTH_PERCENT)
    const baseGrow = other.size * CONFIG.PLAYER.KILL_GROWTH_PERCENT;
    const growAmount = this._effectiveGrowth(baseGrow);
    const multiplier = this.frenzy
      ? 1 + CONFIG.POWERUP.TYPES.FRENZY.growthBoost
      : 1;

    const targetSize = this.size + growAmount * multiplier;
    if (targetSize > CONFIG.PLAYER.MAX_SIZE) {
      const overflow = targetSize - Math.max(this.size, CONFIG.PLAYER.MAX_SIZE);
      this.score += Math.floor(overflow * 50);
    }

    this.size = Math.min(targetSize, CONFIG.PLAYER.MAX_SIZE);
    this.kills++;
    this.score += Math.floor(other.size * 18);
    this.growFlash = 0.45;
    this.feedFlash = 0.35;

    // Killing restores boost energy (food + kill both recharge)
    this.stamina = Math.min(
      this.maxStamina,
      this.stamina + CONFIG.PLAYER.STAMINA_KILL_RECHARGE,
    );
  }

  feedOnFood(value, isNectar = false) {
    const multiplier  = this.frenzy ? 1.6 : 1.0;
    const effectiveV  = this._effectiveGrowth(value * multiplier);
    const targetSize  = this.size + effectiveV;

    if (targetSize > CONFIG.PLAYER.MAX_SIZE) {
      const overflow = targetSize - Math.max(this.size, CONFIG.PLAYER.MAX_SIZE);
      this.score += Math.floor(overflow * 25);
    }

    this.size = Math.min(targetSize, CONFIG.PLAYER.MAX_SIZE);
    this.score += Math.floor(value * 10);
    this.growFlash = 0.12;

    // Blood/nectar recharges boost — the primary recharge mechanic
    const staminaGain = isNectar
      ? CONFIG.PLAYER.STAMINA_NECTAR_RECHARGE
      : CONFIG.PLAYER.STAMINA_FOOD_RECHARGE;
    this.stamina = Math.min(this.maxStamina, this.stamina + staminaGain);
  }

  tryDash(audioManager) {
    if (
      this.stamina >= CONFIG.PLAYER.DASH_STAMINA_COST &&
      !this.isDashing &&
      this.isAlive()
    ) {
      this.isDashing      = true;
      this.dashTimer      = CONFIG.PLAYER.DASH_DURATION;
      this.boostBurstTimer = CONFIG.PLAYER.BOOST_BURST_DURATION;
      this.stamina       -= CONFIG.PLAYER.DASH_STAMINA_COST;
      this.squashStretch  = 1.25;
      if (audioManager) audioManager.playBoost();
      return true;
    }
    return false;
  }

  applyPowerup(type) {
    const types = CONFIG.POWERUP.TYPES;
    this.powerup      = type;
    this.powerupTimer = types[type]?.duration || 0;

    switch (type) {
      case "SPEED":  this.speedBoost = 1;   break;
      case "SHIELD": this.shield = true;    break;
      case "FRENZY": this.frenzy = true;    break;
      case "MAGNET": break;
    }
  }

  update(dt, direction, tryDashInput, audioManager) {
    // Track survival time while alive
    if (this.isAlive()) this.survivalTime += dt;

    // Wing animation
    const activeWingSpeed = this.isDashing ? this.wingSpeed * 2.5 : this.wingSpeed;
    this.wingAngle += dt * activeWingSpeed;
    this.pulsePhase += dt * 3;

    // Decay squash/stretch spring back to normal
    this.squashStretch += (1.0 - this.squashStretch) * Math.min(1, 12 * dt);

    if (this.state === PlayerState.SPAWNING) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) this.state = PlayerState.ALIVE;
    }

    if (this.state === PlayerState.DYING) {
      this.deathTimer += dt;
      this.deathAlpha  = Math.max(0, 1 - this.deathTimer / 0.8);
      if (this.deathTimer >= 0.8) this.state = PlayerState.DEAD;
      return;
    }

    if (this.state === PlayerState.DEAD) return;

    // Dash input
    if (tryDashInput) {
      this.tryDash(audioManager);
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      // Passive stamina recharge (slow — food is the main source)
      this.stamina = Math.min(
        this.maxStamina,
        this.stamina + CONFIG.PLAYER.STAMINA_RECHARGE_RATE * dt,
      );
    }

    if (this.boostBurstTimer > 0) {
      this.boostBurstTimer -= dt;
    }

    // Power-up timers
    if (this.powerup && this.powerupTimer > 0) {
      this.powerupTimer -= dt;
      if (this.powerupTimer <= 0) {
        this._expirePowerup();
      }
    }

    // ── Mass decay for very large players ─────────────────
    // Larger entities slowly lose mass — prevents runaway domination.
    if (this.size > CONFIG.PLAYER.MASS_DECAY_START && !this.frenzy) {
      const excess    = this.size - CONFIG.PLAYER.MASS_DECAY_START;
      const decayRate = CONFIG.PLAYER.MASS_DECAY_BASE_RATE
        + excess * CONFIG.PLAYER.MASS_DECAY_SCALE;
      this.size = Math.max(
        CONFIG.PLAYER.MASS_DECAY_START,
        this.size - decayRate * dt,
      );
    }

    // Fluid movement with snappy acceleration
    if (direction.x !== 0 || direction.y !== 0) {
      const targetVx  = direction.x * this.speed;
      const targetVy  = direction.y * this.speed;
      const accelRate = this.isDashing ? 28 : 18;

      this.vx += (targetVx - this.vx) * Math.min(1, accelRate * dt);
      this.vy += (targetVy - this.vy) * Math.min(1, accelRate * dt);

      // Smooth heading rotation
      const targetAngle = Math.atan2(direction.y, direction.x);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff >  Math.PI) diff -= Math.PI * 2;

      this.turnTilt = diff * 0.4;
      this.angle   += diff * Math.min(1, 16 * dt);
    } else {
      this.vx      *= 0.86;
      this.vy      *= 0.86;
      this.turnTilt *= 0.8;
      if (Math.abs(this.vx) < 1) this.vx = 0;
      if (Math.abs(this.vy) < 1) this.vy = 0;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Clamp to arena bounds
    const arena = CONFIG.ARENA;
    this.x = Math.max(this.size, Math.min(arena.WIDTH  - this.size, this.x));
    this.y = Math.max(this.size, Math.min(arena.HEIGHT - this.size, this.y));

    // Visual timers
    if (this.growFlash > 0) this.growFlash -= dt;
    if (this.feedFlash > 0) this.feedFlash -= dt;
  }

  _expirePowerup() {
    switch (this.powerup) {
      case "SPEED":  this.speedBoost = 0; break;
      case "SHIELD": this.shield     = false; break;
      case "FRENZY": this.frenzy     = false; break;
    }
    this.powerup      = null;
    this.powerupTimer = 0;
  }

  takeDamage() {
    if (
      this.state === PlayerState.SPAWNING ||
      this.state === PlayerState.INVINCIBLE
    ) return false;
    if (this.shield) {
      this.shield = false;
      if (this.powerup === "SHIELD") this._expirePowerup();
      return false;
    }
    this.state = PlayerState.DYING;
    return true;
  }

  isAlive() {
    return (
      this.state !== PlayerState.DYING &&
      this.state !== PlayerState.DEAD
    );
  }

  isInvincible() {
    return (
      this.state === PlayerState.SPAWNING ||
      this.state === PlayerState.INVINCIBLE
    );
  }
}

export default Player;
