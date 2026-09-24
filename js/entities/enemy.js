// ============================================================
// BloodRush.io — Enemy Entity (Boost Energy, Spawn Protection & Diminishing Growth)
// ============================================================
import { CONFIG } from "../config.js";

export const AIState = {
  IDLE:         "IDLE",
  SEARCH:       "SEARCH",
  CHASE:        "CHASE",
  ATTACK:       "ATTACK",
  BOOST_ATTACK: "BOOST_ATTACK",
  BOOST_ESCAPE: "BOOST_ESCAPE",
  FEED:         "FEED",
  GROW:         "GROW",
  FLEE:         "FLEE",
  HIDE:         "HIDE",
  WANDER:       "WANDER",
  JOUST:        "JOUST",
  RECOVER:      "RECOVER",
};

export const AIPersonality = {
  WANDERER:    "WANDERER",
  HUNTER:      "HUNTER",
  COWARD:      "COWARD",
  OPPORTUNIST: "OPPORTUNIST",
  AGGRESSOR:   "AGGRESSOR",
};

const ENEMY_PALETTES = [
  { hue: 145, color: "#4CAF50", glow: "#81C784" }, // Emerald Toxic
  { hue: 200, color: "#03A9F4", glow: "#4FC3F7" }, // Cyan Breeze
  { hue: 280, color: "#9C27B0", glow: "#BA68C8" }, // Amethyst
  { hue:  45, color: "#FF9800", glow: "#FFB74D" }, // Amber Wasp
  { hue: 330, color: "#E91E63", glow: "#F06292" }, // Ruby Dart
  { hue: 175, color: "#009688", glow: "#4DB6AC" }, // Teal Stinger
  { hue: 260, color: "#673AB7", glow: "#9575CD" }, // Royal Shadow
  { hue:  60, color: "#CDDC39", glow: "#DCE775" }, // Lime Glow
  { hue:  15, color: "#FF5722", glow: "#FF8A65" }, // Fire Ant
  { hue: 350, color: "#C2185B", glow: "#F48FB1" }, // Velvet Stinger
];
let _enemyColorIdx = 0;

export class Enemy {
  constructor(x, y, size, personality, skinId = "default") {
    this.id          = Math.random().toString(36).substr(2, 9);
    this.x           = x;
    this.y           = y;
    this.size        = size;
    this.personality = personality;

    this.vx    = 0;
    this.vy    = 0;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = this._calcSpeed();

    this.skinId = skinId;
    const skinConfig = CONFIG.SKINS.find(s => s.id === skinId);
    if (skinConfig && skinId !== "default") {
      this.color = skinConfig.color;
      this.glowColor = skinConfig.glowColor;
      this.vfx = skinConfig.vfx;
    } else {
      const pal      = ENEMY_PALETTES[_enemyColorIdx++ % ENEMY_PALETTES.length];
      this.color     = pal.color;
      this.glowColor = pal.glow;
      this.vfx = null;
    }

    this.name = CONFIG.ENEMY.NAMES[
      Math.floor(Math.random() * CONFIG.ENEMY.NAMES.length)
    ];

    this.aiState     = AIState.WANDER;
    this.target      = null;
    this.targetX     = x;
    this.targetY     = y;
    this.wanderTimer = 0;
    this.stateTimer  = 0;
    this.feedTimer   = 0;
    this.reactionTimer  = 0;
    this.activeThreat   = null;

    // ── Boost Energy System (replaces simple cooldown) ────
    // AI uses an energy bar, recharged by collecting food.
    // Boost won't fire unless energy is above the minimum threshold.
    this.boostEnergy    = CONFIG.AI_BOOST.ENERGY_START;
    this.boostCooldown  = 0.5 + Math.random() * 1.5; // initial stagger
    this.isDashing      = false;
    this.dashTimer      = 0;
    this.boostBurstTimer = 0;
    this.squashStretch  = 1.0;
    this.turnTilt       = 0;

    // ── Spawn protection ──────────────────────────────────
    this.spawnProtection = CONFIG.SPAWN.PROTECTION_DURATION;

    this.alive      = true;
    this.deathTimer = 0;
    this.deathAlpha = 1;

    this.wingAngle   = Math.random() * Math.PI * 2;
    this.wingSpeed   = 11 + Math.random() * 6;
    this.pulsePhase  = Math.random() * Math.PI * 2;

    this.growFlash = 0;
    this.kills     = 0;
    this._aiTickOffset = Math.floor(Math.random() * 8);

    // Track survival time (for scoring / reference)
    this.survivalTime = 0;
  }

  _calcSpeed() {
    const base          = CONFIG.PLAYER.BASE_SPEED * 0.88;
    const sizeOverStart = Math.max(0, this.size - CONFIG.PLAYER.START_SIZE);
    const slowdownFactor =
      CONFIG.PLAYER.SPEED_DECAY_RATE *
      Math.min(1.0, Math.log10(1 + sizeOverStart / 18));
    let spd = Math.max(
      CONFIG.PLAYER.MIN_SPEED_FLOOR * 0.88,
      base * (1 - slowdownFactor),
    );
    if (this.isDashing) spd *= CONFIG.PLAYER.DASH_SPEED_MULTIPLIER;
    return spd;
  }

  // ── Growth helpers ────────────────────────────────────────
  _effectiveGrowth(baseAmount) {
    return baseAmount / (1 + CONFIG.PLAYER.GROWTH_DIMINISHING_FACTOR * this.size);
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

  get rearAbdomenTip() {
    const rearDist = this.size * 1.45;
    return {
      x: this.x - Math.cos(this.angle) * rearDist,
      y: this.y - Math.sin(this.angle) * rearDist,
    };
  }

  canEat(other) {
    if (this.isDashing) return this.size >= other.size * 0.88;
    return this.size >= other.size * CONFIG.PLAYER.EAT_THRESHOLD;
  }

  // ── Boost threshold per personality ──────────────────────
  _boostThreshold() {
    const ab = CONFIG.AI_BOOST;
    switch (this.personality) {
      case AIPersonality.AGGRESSOR:   return ab.AGGRESSOR_THRESHOLD  * ab.ENERGY_MAX;
      case AIPersonality.HUNTER:      return ab.HUNTER_THRESHOLD     * ab.ENERGY_MAX;
      case AIPersonality.OPPORTUNIST: return ab.OPPORTUNIST_THRESHOLD* ab.ENERGY_MAX;
      case AIPersonality.COWARD:      return ab.COWARD_THRESHOLD     * ab.ENERGY_MAX;
      default:                        return ab.WANDERER_THRESHOLD   * ab.ENERGY_MAX;
    }
  }

  tryDash(audioManager = null) {
    const ab = CONFIG.AI_BOOST;
    if (
      this.boostCooldown <= 0 &&
      !this.isDashing &&
      this.alive &&
      this.boostEnergy >= ab.MIN_ENERGY_TO_USE
    ) {
      this.isDashing       = true;
      this.dashTimer       = CONFIG.PLAYER.DASH_DURATION * 1.05;
      this.boostBurstTimer = CONFIG.PLAYER.BOOST_BURST_DURATION;
      this.boostCooldown   = ab.COOLDOWN_AFTER_USE;
      this.boostEnergy    -= ab.COST;
      this.squashStretch   = 1.25;
      this.aiState         = AIState.BOOST_ATTACK;
      return true;
    }
    return false;
  }

  tryEscapeBoost() {
    const ab = CONFIG.AI_BOOST;
    // Cowards boost for escape at lower threshold
    const escapeThresh = this.personality === AIPersonality.COWARD
      ? ab.MIN_ENERGY_TO_USE
      : Math.floor(ab.MIN_ENERGY_TO_USE * 1.3);

    if (
      this.boostCooldown <= 0 &&
      !this.isDashing &&
      this.alive &&
      this.boostEnergy >= escapeThresh
    ) {
      this.isDashing       = true;
      this.dashTimer       = CONFIG.PLAYER.DASH_DURATION * 1.1;
      this.boostBurstTimer = CONFIG.PLAYER.BOOST_BURST_DURATION;
      this.boostCooldown   = ab.COOLDOWN_AFTER_USE;
      this.boostEnergy    -= ab.COST;
      this.squashStretch   = 1.25;
      this.aiState         = AIState.BOOST_ESCAPE;
      return true;
    }
    return false;
  }

  eat(other) {
    // Growth = 20% of victim's size (adjustable via CONFIG.PLAYER.KILL_GROWTH_PERCENT)
    const baseGrow   = other.size * CONFIG.PLAYER.KILL_GROWTH_PERCENT;
    const growAmount = this._effectiveGrowth(baseGrow);
    this.size        = Math.min(this.size + growAmount, CONFIG.PLAYER.MAX_SIZE);
    this.speed       = this._calcSpeed();
    this.kills++;
    this.growFlash   = 0.35;
    // Kills recharge boost energy
    this.boostEnergy = Math.min(
      CONFIG.AI_BOOST.ENERGY_MAX,
      this.boostEnergy + CONFIG.AI_BOOST.KILL_RECHARGE,
    );
  }

  feedOnFood(value, isNectar = false) {
    const effectiveV = this._effectiveGrowth(value);
    this.size        = Math.min(this.size + effectiveV, CONFIG.PLAYER.MAX_SIZE);
    this.speed       = this._calcSpeed();
    this.growFlash   = 0.12;
    // Food recharges boost energy — this is the primary AI recharge mechanic
    const gain = isNectar
      ? CONFIG.AI_BOOST.NECTAR_RECHARGE
      : CONFIG.AI_BOOST.FOOD_RECHARGE;
    this.boostEnergy = Math.min(CONFIG.AI_BOOST.ENERGY_MAX, this.boostEnergy + gain);
  }

  update(dt) {
    // Tick down spawn protection
    if (this.spawnProtection > 0) {
      this.spawnProtection -= dt;
      if (this.spawnProtection < 0) this.spawnProtection = 0;
    }

    if (!this.alive) {
      this.deathTimer += dt;
      this.deathAlpha  = Math.max(0, 1 - this.deathTimer / 0.6);
      return;
    }

    this.survivalTime += dt;

    const activeWingSpeed = this.isDashing ? this.wingSpeed * 2.2 : this.wingSpeed;
    this.wingAngle  += dt * activeWingSpeed;
    this.pulsePhase += dt * 2.5;
    this.stateTimer -= dt;
    if (this.growFlash    > 0) this.growFlash    -= dt;
    if (this.reactionTimer > 0) this.reactionTimer -= dt;
    if (this.boostCooldown > 0) this.boostCooldown -= dt;

    // Decay squash/stretch spring
    this.squashStretch += (1.0 - this.squashStretch) * Math.min(1, 12 * dt);

    // Dash timer
    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        // Revert to normal AI state after boost
        if (this.aiState === AIState.BOOST_ATTACK || this.aiState === AIState.BOOST_ESCAPE) {
          this.aiState = AIState.WANDER;
        }
      }
    }
    if (this.boostBurstTimer > 0) {
      this.boostBurstTimer -= dt;
    }

    // ── Mass decay for large enemies ──────────────────────
    if (this.size > CONFIG.PLAYER.MASS_DECAY_START) {
      const excess    = this.size - CONFIG.PLAYER.MASS_DECAY_START;
      const decayRate = CONFIG.PLAYER.MASS_DECAY_BASE_RATE
        + excess * CONFIG.PLAYER.MASS_DECAY_SCALE;
      this.size  = Math.max(
        CONFIG.PLAYER.MASS_DECAY_START,
        this.size - decayRate * dt,
      );
      this.speed = this._calcSpeed();
    }

    // Move toward targetX/Y
    const dx   = this.targetX - this.x;
    const dy   = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      let spd = this.speed;
      if (this.aiState === AIState.FLEE && !this.isDashing) {
        spd *= CONFIG.ENEMY.FLEE_SPEED_FACTOR;
      }

      const targetVx = (dx / dist) * spd;
      const targetVy = (dy / dist) * spd;
      const accel    = this.isDashing ? 22 : 14;

      this.vx += (targetVx - this.vx) * Math.min(1, accel * dt);
      this.vy += (targetVy - this.vy) * Math.min(1, accel * dt);

      if (Math.hypot(this.vx, this.vy) > 5.0) {
        const targetAngle = Math.atan2(this.vy, this.vx);
        let diff = targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        this.turnTilt = diff * 0.35;
        this.angle   += diff * Math.min(1, 12 * dt);
      } else {
        this.turnTilt *= 0.8;
      }
    } else {
      this.vx      *= 0.82;
      this.vy      *= 0.82;
      this.turnTilt *= 0.8;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Clamp to arena bounds
    const arena = CONFIG.ARENA;
    this.x = Math.max(this.size, Math.min(arena.WIDTH  - this.size, this.x));
    this.y = Math.max(this.size, Math.min(arena.HEIGHT - this.size, this.y));

    // ── Anti-spin fix: if we're barely moving and too close to target ──
    // This prevents the spinning-in-place bug where targetX/Y == x/y
    const spd = Math.hypot(this.vx, this.vy);
    const tDist = Math.hypot(this.targetX - this.x, this.targetY - this.y);
    if (spd < 2 && tDist < 20 && this.aiState === AIState.WANDER) {
      // Pick a new wander target far enough away to break the spin
      const angle = Math.random() * Math.PI * 2;
      const spread = 300 + Math.random() * 300;
      this.targetX = Math.max(160, Math.min(arena.WIDTH  - 160, this.x + Math.cos(angle) * spread));
      this.targetY = Math.max(160, Math.min(arena.HEIGHT - 160, this.y + Math.sin(angle) * spread));
      this.wanderTimer = 2 + Math.random() * 2;
    }
  }

  die() {
    this.alive      = false;
    this.deathTimer = 0;
    this.deathAlpha = 1;
  }
}

export default Enemy;
