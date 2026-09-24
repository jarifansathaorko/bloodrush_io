// ============================================================
// BloodRush.io — Environment Manager (Expanded 8000x8000 Cyber-Grid)
// ============================================================
import { CONFIG } from "../config.js";

function rng(min, max) {
  return min + Math.random() * (max - min);
}

export class EnvironmentManager {
  constructor(seed) {
    this.seed = seed || Date.now();
    this.W = CONFIG.ARENA.WIDTH;
    this.H = CONFIG.ARENA.HEIGHT;
    this.center = { x: this.W / 2, y: this.H / 2 };

    this.gridNodes = [];
    this.zappers = [];
    this.shards = [];
    this.plasmaPools = [];
    this.circuits = [];

    this._generate();
  }

  _generate() {
    const W = this.W, H = this.H;
    const margin = 120;

    // ── Main Circuit Pathways ─────────
    this.circuits.push({ startX: 0, startY: H/2, endX: W, endY: H/2, width: 80 });
    this.circuits.push({ startX: W/2, startY: 0, endX: W/2, endY: H, width: 80 });
    
    // Diagonal circuit traces
    this.circuits.push({
      startX: W * 0.2, startY: H * 0.2, endX: W * 0.8, endY: H * 0.8, width: 40, isDiag: true
    });
    this.circuits.push({
      startX: W * 0.8, startY: H * 0.2, endX: W * 0.2, endY: H * 0.8, width: 40, isDiag: true
    });

    // ── Grid Nodes (Background detail) ──
    for (let i = 0; i < 400; i++) {
      this.gridNodes.push({
        x: rng(0, W),
        y: rng(0, H),
        size: rng(3, 8),
        pulseOffset: Math.random() * Math.PI * 2
      });
    }

    // ── Neon Zappers (Scattered Hazards) ──
    for (let i = 0; i < 80; i++) {
      this.zappers.push({
        x: rng(margin, W - margin),
        y: rng(margin, H - margin),
        r: rng(20, 35),
        color: Math.random() > 0.5 ? CONFIG.COLORS.FLOWER_2 : CONFIG.COLORS.FLOWER_3,
        pulseOffset: Math.random() * Math.PI * 2,
        sides: Math.floor(rng(3, 6)) // Triangle, Square, Pentagon
      });
    }

    // ── Obsidian Shards (Line of sight blockers/cover) ──
    for (let i = 0; i < 150; i++) {
      const sides = Math.floor(rng(4, 8));
      const r = rng(40, 120);
      const shard = {
        x: rng(margin, W - margin),
        y: rng(margin, H - margin),
        r: r,
        rotation: rng(0, Math.PI),
        points: []
      };
      
      // Generate jagged poly
      for(let s=0; s<sides; s++) {
        const angle = (s/sides) * Math.PI * 2;
        const dist = r * rng(0.6, 1.0);
        shard.points.push({ x: Math.cos(angle)*dist, y: Math.sin(angle)*dist });
      }
      this.shards.push(shard);
    }

    // ── Plasma Pools (Slow zones / aesthetic) ──
    for (let i = 0; i < 40; i++) {
      this.plasmaPools.push({
        x: rng(W * 0.1, W * 0.9),
        y: rng(H * 0.1, H * 0.9),
        rx: rng(80, 200),
        ry: rng(50, 120),
        rotation: rng(0, Math.PI),
        rippleOffset: Math.random() * Math.PI * 2
      });
    }
  }
}
