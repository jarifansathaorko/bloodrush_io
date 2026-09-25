// ============================================================
// BloodRush.io — AI Manager (Smart Boost Decisions & Difficulty Scaling)
// ============================================================
import { CONFIG } from "../config.js";
import { AIState, AIPersonality } from "../entities/enemy.js";
import { CollisionSystem } from "./collision.js";

function rng(min, max) {
  return min + Math.random() * (max - min);
}

export class AIManager {
  constructor(environment, foodManager) {
    this.env      = environment;
    this.foodMgr  = foodManager;
    this.W        = CONFIG.ARENA.WIDTH;
    this.H        = CONFIG.ARENA.HEIGHT;
    this.frameCount = 0;
    this._elapsed = 0; // match elapsed time for difficulty scaling
  }

  setFoodManager(foodManager) {
    this.foodMgr = foodManager;
  }

  // ── Main update — called each game frame ──────────────────
  // elapsed: total seconds of match elapsed (for difficulty scaling)
  update(dt, enemies, player, arenaRadius, arenaCenter, elapsed = 0) {
    this.frameCount++;
    this._elapsed = elapsed;

    const pX = player ? player.x : this.W / 2;
    const pY = player ? player.y : this.H / 2;

    // Determine which enemies are designated player-hunters this frame.
    // A stable fraction (PLAYER_TARGET_FRACTION) will preferentially target
    // the real player when they are large enough to be prey.
    const targetFraction = CONFIG.ENEMY.PLAYER_TARGET_FRACTION || 0.30;

    for (let idx = 0; idx < enemies.length; idx++) {
      const enemy = enemies[idx];
      if (!enemy.alive) continue;

      // Flag the enemy as a "player hunter" based on its spawn index parity
      // This is deterministic and stable (doesn't flip every frame)
      enemy._targetsPlayer = (idx % Math.round(1 / targetFraction)) === 0;

      // Performance optimization: nearby entities = full AI every frame,
      // distant entities = every 4th frame on staggered offsets.
      const distToPlayer = Math.hypot(enemy.x - pX, enemy.y - pY);
      const shouldTickFullAI =
        distToPlayer < 1600 ||
        (this.frameCount + enemy._aiTickOffset) % 4 === 0;

      if (shouldTickFullAI) {
        this._tickEnemy(dt, enemy, enemies, player, arenaRadius, arenaCenter);
      }
    }
  }

  // ── Per-enemy AI tick ─────────────────────────────────────
  _tickEnemy(dt, e, enemies, player, arenaRadius, arenaCenter) {
    e.stateTimer -= dt;

    // ── Boundary avoidance ────────────────────────────────
    const dCenter = Math.hypot(e.x - arenaCenter.x, e.y - arenaCenter.y);
    if (arenaRadius > 0 && dCenter > arenaRadius * 0.88) {
      const inwardAngle = Math.atan2(arenaCenter.y - e.y, arenaCenter.x - e.x);
      e.targetX = arenaCenter.x + Math.cos(inwardAngle) * (arenaRadius * 0.55);
      e.targetY = arenaCenter.y + Math.sin(inwardAngle) * (arenaRadius * 0.55);
      return;
    }

    // ── Difficulty scaling ────────────────────────────────
    // Vision and aggression increase as the match progresses.
    const diffMult  = this._difficultyMultiplier();
    const vision    = CONFIG.ENEMY.VISION_RANGE * diffMult;

    // ── Sensory scan ──────────────────────────────────────
    let closestPrey     = null, closestPreyDist     = Infinity;
    let closestThreat   = null, closestThreatDist   = Infinity;
    let closestEqual    = null, closestEqualDist     = Infinity;

    // Check player
    if (player && player.isAlive() && !player.isInvincible()) {
      const pDist = CollisionSystem.distance(e.x, e.y, player.x, player.y);
      if (pDist < vision && this._canSenseEntity(e, player, pDist)) {
        if (e.size >= player.size * CONFIG.ENEMY.CHASE_THRESHOLD) {
          closestPrey     = player;
          closestPreyDist = pDist;
        } else if (player.size >= e.size * CONFIG.ENEMY.FLEE_THRESHOLD) {
          closestThreat     = player;
          closestThreatDist = pDist;
        } else {
          closestEqual     = player;
          closestEqualDist = pDist;
        }
      }
    }

    // Check nearby AI mosquitoes
    for (const o of enemies) {
      if (o === e || !o.alive) continue;
      const d = CollisionSystem.distance(e.x, e.y, o.x, o.y);
      if (d < vision && this._canSenseEntity(e, o, d)) {
        if (e.size >= o.size * CONFIG.ENEMY.CHASE_THRESHOLD && d < closestPreyDist) {
          closestPrey     = o;
          closestPreyDist = d;
        } else if (o.size >= e.size * CONFIG.ENEMY.FLEE_THRESHOLD && d < closestThreatDist) {
          closestThreat     = o;
          closestThreatDist = d;
        } else if (d < closestEqualDist) {
          closestEqual     = o;
          closestEqualDist = d;
        }
      }
    }

    // ── Threat reaction delay ─────────────────────────────
    if (closestThreat) {
      if (e.activeThreat !== closestThreat) {
        e.activeThreat  = closestThreat;
        e.reactionTimer = rng(
          CONFIG.ENEMY.REACTION_DELAY_MIN,
          CONFIG.ENEMY.REACTION_DELAY_MAX / diffMult, // faster reactions at higher difficulty
        );
      }
    } else {
      e.activeThreat = null;
    }

    if (closestThreat && e.reactionTimer > 0 && closestThreatDist > 90) {
      return;
    }

    // ── Smart Boost Decisions ─────────────────────────────
    this._evaluateBoost(e, closestPrey, closestThreat, closestPreyDist, closestThreatDist);

    // ── Personality-driven decisions ──────────────────────
    // Priority: Force-target player if this is a designated player-hunter
    if (e._targetsPlayer && closestPrey === player) {
        this._chase(e, player);
        return;
    }

    switch (e.personality) {
      case AIPersonality.WANDERER:
        this._aiWanderer(dt, e, closestPrey, closestThreat, closestEqual,
          closestPreyDist, closestThreatDist, closestEqualDist);
        break;
      case AIPersonality.HUNTER:
        this._aiHunter(dt, e, closestPrey, closestThreat, closestEqual,
          closestPreyDist, closestThreatDist, closestEqualDist);
        break;
      case AIPersonality.COWARD:
        this._aiCoward(dt, e, closestPrey, closestThreat, closestPreyDist, closestThreatDist);
        break;
      case AIPersonality.OPPORTUNIST:
        this._aiOpportunist(dt, e, closestPrey, closestThreat,
          closestPreyDist, closestThreatDist, enemies);
        break;
      case AIPersonality.AGGRESSOR:
        this._aiAggressor(dt, e, closestPrey, closestThreat, closestEqual,
          closestPreyDist, closestThreatDist, closestEqualDist);
        break;
      default:
        this._feedOrWander(dt, e);
    }
  }

  // ── Difficulty multiplier (scales 1.0 → 2.0 over match) ──
  _difficultyMultiplier() {
    // Increases from 1.0 at start to 2.0 at 180s+ survival (much harder)
    const t = Math.min(this._elapsed, 180);
    return 1.0 + (t / 180) * 1.0;
  }

  // ── Smart boost evaluation ────────────────────────────────
  // Called before personality logic. Decides whether to use boost
  // for offense or defense based on situation and energy level.
  _evaluateBoost(e, prey, threat, preyDist, threatDist) {
    const hasEnoughForEscape  = e.boostEnergy >= CONFIG.AI_BOOST.MIN_ENERGY_TO_USE;
    const hasEnoughForAttack  = e.boostEnergy >= e._boostThreshold();

    // ── Defensive boost: flee from close threat ───────────
    if (threat && threatDist < 220 && hasEnoughForEscape) {
      // Only cowards and cautious AI use escape boost proactively;
      // aggressors wait longer before retreating.
      const fleeDistance = e.personality === AIPersonality.AGGRESSOR ? 120
        : e.personality === AIPersonality.COWARD ? 280 : 200;

      if (threatDist < fleeDistance) {
        e.tryEscapeBoost();
        return; // Don't also try attack boost
      }
    }

    // ── Offensive boost: chase/attack prey ───────────────
    if (prey && preyDist < 400 && preyDist > 25 && hasEnoughForAttack) {
      // Only commit to attack boost if we have a clear size advantage
      // and energy to spare for escape afterwards
      const sizeAdvantage = e.size / prey.size;
      if (sizeAdvantage >= 1.05) {
        // Hunter and Aggressor boost more readily
        const boostProb =
          e.personality === AIPersonality.HUNTER   ? 0.88 :
          e.personality === AIPersonality.AGGRESSOR ? 0.95 :
          e.personality === AIPersonality.OPPORTUNIST ? 0.70 :
          e.personality === AIPersonality.COWARD   ? 0.25 :
          0.55; // WANDERER

        if (Math.random() < boostProb) {
          e.tryDash();
        }
      }
    }
  }

  _canSenseEntity(observer, target, dist) {
    const angleToTarget = Math.atan2(
      target.y - observer.y,
      target.x - observer.x,
    );
    let angleDiff = Math.abs(angleToTarget - observer.angle);
    while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
    if (angleDiff > 2.2 && dist > 110) return false;
    return true;
  }

  // ── Personality Tactics ────────────────────────────────────

  _aiWanderer(dt, e, prey, threat, equal, preyDist, threatDist, equalDist) {
    if (threat && threatDist < 180) {
      this._flee(e, threat);
    } else if (prey && preyDist < 180) {
      this._chase(e, prey);
    } else if (equal && equalDist < 130 && Math.random() < 0.5) {
      this._joust(e, equal);
    } else {
      this._feedOrWander(dt, e);
    }
  }

  _aiHunter(dt, e, prey, threat, equal, preyDist, threatDist, equalDist) {
    // Hunters pursue aggressively but still flee overwhelming threats
    if (threat && threatDist < 130) {
      this._flee(e, threat);
    } else if (prey) {
      // Hunters lead their target for interception
      this._chaseWithLead(e, prey, 0.4);
    } else if (equal && equalDist < 180) {
      this._joust(e, equal);
    } else {
      this._feedOrWander(dt, e);
    }
  }

  _aiCoward(dt, e, prey, threat, preyDist, threatDist) {
    if (threat && threatDist < 300) {
      this._flee(e, threat);
      // Seek nearest bush as cover
      const bush = this._nearestBush(e);
      if (bush && Math.hypot(e.x - bush.x, e.y - bush.y) < 600) {
        e.targetX = bush.x;
        e.targetY = bush.y;
      }
    } else if (prey && preyDist < 120) {
      this._chase(e, prey);
    } else {
      this._feedOrWander(dt, e);
    }
  }

  _aiOpportunist(dt, e, prey, threat, preyDist, threatDist, allEnemies) {
    if (threat && threatDist < 160) {
      this._flee(e, threat);
      return;
    }

    // Seek the smallest target in range
    let smallest     = null;
    let smallestDist = Infinity;
    for (const o of allEnemies) {
      if (o === e || !o.alive) continue;
      const d = CollisionSystem.distance(e.x, e.y, o.x, o.y);
      if (d < 300 && e.size >= o.size * 1.05 && d < smallestDist) {
        smallest     = o;
        smallestDist = d;
      }
    }

    if (smallest) {
      this._chase(e, smallest);
    } else if (prey) {
      this._chase(e, prey);
    } else {
      this._feedOrWander(dt, e);
    }
  }

  _aiAggressor(dt, e, prey, threat, equal, preyDist, threatDist, equalDist) {
    // Aggressors only flee when truly overwhelmed (much larger threat, very close)
    const reallyBigThreat = threat && threat.size > e.size * 1.4 && threatDist < 100;
    if (reallyBigThreat) {
      this._flee(e, threat);
    } else if (prey) {
      this._chaseWithLead(e, prey, 0.35);
    } else if (equal) {
      this._joust(e, equal);
    } else {
      this._feedOrWander(dt, e);
    }
  }

  // ── Motion Primitives ──────────────────────────────────────

  _chase(e, target) {
    e.aiState = AIState.CHASE;
    e.targetX = target.x + (target.vx || 0) * 0.2;
    e.targetY = target.y + (target.vy || 0) * 0.2;
  }

  // Lead the target: predict where they'll be
  _chaseWithLead(e, target, leadFactor) {
    e.aiState = AIState.CHASE;
    const speed = Math.hypot(target.vx || 0, target.vy || 0);
    const dist  = Math.hypot(e.x - target.x, e.y - target.y);
    const timeToReach = dist / Math.max(e.speed, 1);
    e.targetX = target.x + (target.vx || 0) * timeToReach * leadFactor;
    e.targetY = target.y + (target.vy || 0) * timeToReach * leadFactor;
  }

  _joust(e, target) {
    e.aiState = AIState.JOUST;
    const angleTo    = Math.atan2(target.y - e.y, target.x - e.x);
    const flankAngle = angleTo + Math.sin(this.frameCount * 0.05) * 0.7;
    e.targetX = target.x - Math.cos(flankAngle) * 90;
    e.targetY = target.y - Math.sin(flankAngle) * 90;

    // Boost attack when in range and energy allows
    if (
      e.boostCooldown <= 0 &&
      Math.hypot(target.x - e.x, target.y - e.y) < 150 &&
      e.boostEnergy >= e._boostThreshold()
    ) {
      e.tryDash();
    }
  }

  _flee(e, threat) {
    e.aiState = AIState.FLEE;
    const dx = e.x - threat.x;
    const dy = e.y - threat.y;
    const len = Math.hypot(dx, dy) || 1;

    // Wobble the escape direction slightly to be less predictable
    const wobbleAngle =
      Math.sin(this.frameCount * 0.15 + e.id.charCodeAt(0)) * 0.45;
    const fx =
      (dx / len) * Math.cos(wobbleAngle) - (dy / len) * Math.sin(wobbleAngle);
    const fy =
      (dx / len) * Math.sin(wobbleAngle) + (dy / len) * Math.cos(wobbleAngle);

    const dist = 350;
    e.targetX  = Math.max(
      e.size + 80,
      Math.min(CONFIG.ARENA.WIDTH  - e.size - 80, e.x + fx * dist),
    );
    e.targetY  = Math.max(
      e.size + 80,
      Math.min(CONFIG.ARENA.HEIGHT - e.size - 80, e.y + fy * dist),
    );
  }

  _feedOrWander(dt, e) {
    // Higher probability of seeking food at lower difficulty (early game)
    const foodSeekProb = 0.55 + (1 - this._difficultyMultiplier() / 1.5) * 0.2;

    if (this.foodMgr && Math.random() < foodSeekProb) {
      // Larger search radius for hunters/aggressors
      const searchR = e.personality === AIPersonality.HUNTER ||
                      e.personality === AIPersonality.AGGRESSOR ? 340 : 260;
      const food = this.foodMgr.getNearbyFood(e.x, e.y, searchR);
      if (food) {
        e.aiState = AIState.FEED;
        e.targetX = food.x;
        e.targetY = food.y;
        return;
      }
    }
    this._wander(dt, e);
  }

  _wander(dt, e) {
    e.aiState     = AIState.WANDER;
    e.wanderTimer -= dt;

    if (
      e.wanderTimer <= 0 ||
      Math.hypot(e.x - e.targetX, e.y - e.targetY) < 45
    ) {
      e.wanderTimer = rng(2.0, 5.0);

      // 35% chance to roam to a completely new area
      if (Math.random() < 0.35) {
        const margin = 250;
        e.targetX = rng(margin, CONFIG.ARENA.WIDTH  - margin);
        e.targetY = rng(margin, CONFIG.ARENA.HEIGHT - margin);
      } else {
        // Ensure the new wander target is at least 200px away to prevent spin
        const minDist = 200;
        let nx, ny, attempts = 0;
        do {
          const spread = 500;
          nx = Math.max(160, Math.min(CONFIG.ARENA.WIDTH  - 160, e.x + rng(-spread, spread)));
          ny = Math.max(160, Math.min(CONFIG.ARENA.HEIGHT - 160, e.y + rng(-spread, spread)));
          attempts++;
        } while (Math.hypot(nx - e.x, ny - e.y) < minDist && attempts < 8);
        e.targetX = nx;
        e.targetY = ny;
      }
    }
  }

  _nearestBush(e) {
    // Use obsidian shards as cover (bushes no longer exist in the environment)
    if (!this.env || !this.env.shards) return null;
    let best = null, bestDist = Infinity;
    for (const b of this.env.shards) {
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < bestDist) {
        best     = b;
        bestDist = d;
      }
    }
    return best;
  }
}

export default AIManager;
