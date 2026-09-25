// ============================================================
// BloodRush.io — Collision System (Optimized Spatial Grid)
// ============================================================
import { CONFIG } from "../config.js";

export class CollisionSystem {
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this._grid = new Map();
    this._queryId = 1;
    this._reusableResults = [];
  }

  _key(cx, cy) {
    // Fast numeric key without string allocation
    return (cx + 1000) * 10000 + (cy + 1000);
  }

  _cellFor(x, y) {
    return {
      cx: Math.floor(x / this.cellSize),
      cy: Math.floor(y / this.cellSize),
    };
  }

  clear() {
    for (const bucket of this._grid.values()) {
      bucket.length = 0;
    }
  }

  insert(entity) {
    const r = entity.size || entity.radius || 10;
    const invCell = 1 / this.cellSize;
    const x0 = Math.floor((entity.x - r) * invCell);
    const x1 = Math.floor((entity.x + r) * invCell);
    const y0 = Math.floor((entity.y - r) * invCell);
    const y1 = Math.floor((entity.y + r) * invCell);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = (cx + 1000) * 10000 + (cy + 1000);
        let bucket = this._grid.get(k);
        if (!bucket) {
          bucket = [];
          this._grid.set(k, bucket);
        }
        bucket.push(entity);
      }
    }
  }

  query(x, y, radius, outResults = null) {
    const invCell = 1 / this.cellSize;
    const x0 = Math.floor((x - radius) * invCell);
    const x1 = Math.floor((x + radius) * invCell);
    const y0 = Math.floor((y - radius) * invCell);
    const y1 = Math.floor((y + radius) * invCell);

    // Increment query epoch ID (wrap at 2^30 to stay positive integer)
    this._queryId = (this._queryId + 1) & 0x3fffffff;
    const qId = this._queryId;

    const results = outResults || this._reusableResults;
    results.length = 0;

    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = (cx + 1000) * 10000 + (cy + 1000);
        const bucket = this._grid.get(k);
        if (!bucket) continue;
        for (let i = 0, len = bucket.length; i < len; i++) {
          const e = bucket[i];
          if (e._lastQueryId !== qId) {
            e._lastQueryId = qId;
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
    const rSum = ar + br;
    return dx * dx + dy * dy < rSum * rSum;
  }

  // Fast Euclidean distance avoiding slow Math.hypot
  static distance(ax, ay, bx, by) {
    const dx = ax - bx,
      dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Squared distance avoiding Math.sqrt
  static distanceSq(ax, ay, bx, by) {
    const dx = ax - bx,
      dy = ay - by;
    return dx * dx + dy * dy;
  }
}

export default CollisionSystem;
