// ============================================================
// BloodRush.io — Collision System (Spatial Grid)
// ============================================================
import { CONFIG } from "../config.js";

export class CollisionSystem {
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this._grid = new Map();
  }

  _key(cx, cy) {
    return cx + "," + cy;
  }

  _cellFor(x, y) {
    return {
      cx: Math.floor(x / this.cellSize),
      cy: Math.floor(y / this.cellSize),
    };
  }

  clear() {
    this._grid.clear();
  }

  insert(entity) {
    const r = entity.size || entity.radius || 10;
    const x0 = Math.floor((entity.x - r) / this.cellSize);
    const x1 = Math.floor((entity.x + r) / this.cellSize);
    const y0 = Math.floor((entity.y - r) / this.cellSize);
    const y1 = Math.floor((entity.y + r) / this.cellSize);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = this._key(cx, cy);
        if (!this._grid.has(k)) this._grid.set(k, []);
        this._grid.get(k).push(entity);
      }
    }
  }

  query(x, y, radius) {
    const x0 = Math.floor((x - radius) / this.cellSize);
    const x1 = Math.floor((x + radius) / this.cellSize);
    const y0 = Math.floor((y - radius) / this.cellSize);
    const y1 = Math.floor((y + radius) / this.cellSize);
    const seen = new Set();
    const results = [];
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const bucket = this._grid.get(this._key(cx, cy));
        if (!bucket) continue;
        for (const e of bucket) {
          if (!seen.has(e)) {
            seen.add(e);
            results.push(e);
          }
        }
      }
    }
    return results;
  }

  // Precise circle-circle overlap test
  static overlaps(ax, ay, ar, bx, by, br) {
    const dx = ax - bx,
      dy = ay - by;
    return dx * dx + dy * dy < (ar + br) * (ar + br);
  }

  static distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }
}

export default CollisionSystem;
