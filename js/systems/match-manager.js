// ============================================================
// BloodRush.io — Match Manager (5-Minute / 300s Match Lifecycle)
// ============================================================
import { CONFIG } from "../config.js";
import { MatchState } from "../core/state-machine.js";

export class MatchManager {
  constructor() {
    this.state = MatchState.LOADING;
    this.timeLeft = CONFIG.MATCH.DURATION; // 300 seconds
    this.phase = 1; // 1 to 5
    this.countdown = CONFIG.MATCH.COUNTDOWN;

    // Arena shrink in Phase 4 & 5
    this.arenaCenter = {
      x: CONFIG.ARENA.WIDTH / 2,
      y: CONFIG.ARENA.HEIGHT / 2,
    };
    this.arenaRadius = 0; // 0 = full map active
    this.maxRadius = Math.min(CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT) / 2;

    this.matchId = null;
    this.startTime = null;
  }

  startMatch() {
    this.timeLeft = CONFIG.MATCH.DURATION;
    this.countdown = CONFIG.MATCH.COUNTDOWN;
    this.phase = 1;
    this.arenaRadius = 0;
    this.state = MatchState.COUNTDOWN;
    this.matchId = "match_" + Date.now();
    this.startTime = Date.now();
  }

  update(dt) {
    if (this.state === MatchState.COUNTDOWN) {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.countdown = 0;
        this.state = MatchState.PLAYING;
      }
      return;
    }

    if (this.state !== MatchState.PLAYING) return;

    this.timeLeft -= dt;
    if (this.timeLeft < 0) this.timeLeft = 0;

    // 5-Phase Progression across 300 seconds (5:00)
    const elapsed = CONFIG.MATCH.DURATION - this.timeLeft;
    if (elapsed < CONFIG.MATCH.PHASE_1_END)
      this.phase = 1; // 0:00 - 1:00: Dawn Exploration
    else if (elapsed < CONFIG.MATCH.PHASE_2_END)
      this.phase = 2; // 1:00 - 2:15: Garden Swarm
    else if (elapsed < CONFIG.MATCH.PHASE_3_END)
      this.phase = 3; // 2:15 - 3:30: Predator Escalation
    else if (elapsed < CONFIG.MATCH.PHASE_4_END)
      this.phase = 4; // 3:30 - 4:15: Danger Zone Shrink
    else this.phase = 5; // 4:15 - 5:00: Blood Rush Finale

    // Arena shrink in Phase 4 & 5
    if (this.phase >= 4) {
      if (this.arenaRadius === 0) {
        this.arenaRadius = this.maxRadius;
      }
      this.arenaRadius = Math.max(
        CONFIG.ARENA.SHRINK_MIN_RADIUS,
        this.arenaRadius - CONFIG.ARENA.SHRINK_RATE * dt,
      );
    }
  }

  get elapsed() {
    return CONFIG.MATCH.DURATION - this.timeLeft;
  }

  isPlaying() {
    return this.state === MatchState.PLAYING;
  }
  isOver() {
    return this.timeLeft <= 0;
  }

  pause() {
    if (this.state === MatchState.PLAYING) this.state = MatchState.PAUSED;
  }
  resume() {
    if (this.state === MatchState.PAUSED) this.state = MatchState.PLAYING;
  }

  formatTime() {
    const t = Math.ceil(this.timeLeft);
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  getPhaseName() {
    switch (this.phase) {
      case 1:
        return "DAWN HUNT";
      case 2:
        return "SWARM";
      case 3:
        return "PREDATORS";
      case 4:
        return "ZONE CLOSING";
      case 5:
        return "BLOOD RUSH";
      default:
        return "SURVIVAL";
    }
  }

  getArenaBounds() {
    return {
      center: this.arenaCenter,
      radius: this.arenaRadius > 0 ? this.arenaRadius : this.maxRadius,
      shrinking: this.arenaRadius > 0,
    };
  }
}

export default MatchManager;
