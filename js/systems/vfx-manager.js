// ============================================================
// BloodRush.io — VFX & Particle Manager
// ============================================================
import { CONFIG } from "../config.js";

// Object Pool for Particles
class ParticlePool {
  constructor(maxSize) {
    this.pool = [];
    this.active = [];
    for (let i = 0; i < maxSize; i++) {
      this.pool.push({
        active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        color: "#fff", size: 1, type: "default",
        data: {} // Custom data
      });
    }
  }

  emit(x, y, vx, vy, life, color, size, type = "default", data = {}) {
    if (this.pool.length > 0) {
      const p = this.pool.pop();
      p.active = true;
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.maxLife = life;
      p.color = color; p.size = size; p.type = type;
      p.data = data;
      this.active.push(p);
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.pool.push(p);
        this.active.splice(i, 1);
      } else {
        // Basic physics
        if (p.type === "void_pull") {
          // Void Mosquito pulls particles inward
          const dx = p.data.targetX - p.x;
          const dy = p.data.targetY - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          p.vx += (dx / dist) * 800 * dt;
          p.vy += (dy / dist) * 800 * dt;
        } else {
          // Standard damping
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.95;
          p.vy *= 0.95;
        }
      }
    }
  }
}

export class VFXManager {
  constructor() {
    this.particles = new ParticlePool(2000);
    this.globalTime = 0;
  }

  update(dt, entities) {
    this.globalTime += dt;
    this.particles.update(dt);

    for (const e of entities) {
      if (!e.alive && !e.deathTimer) continue;
      this._updateEntityVFX(dt, e);
    }
  }

  _updateEntityVFX(dt, e) {
    // Initialize persistent VFX state if missing
    if (!e.vfxState) {
      e.vfxState = {
        history: [], // For Phantom Vector ghosting
        drones: [],  // For The Hive
        diamonds: [], // For Blood God
        timer: 0
      };

      // Init Hive Drones
      if (e.vfx === "the_hive") {
        for (let i = 0; i < 5; i++) {
          e.vfxState.drones.push({ angle: (i / 5) * Math.PI * 2, radius: e.size * 1.5, x: e.x, y: e.y });
        }
      }
      
      // Init Blood God Diamonds
      if (e.vfx === "blood_god") {
        for (let i = 0; i < 4; i++) {
          e.vfxState.diamonds.push({ angle: (i / 4) * Math.PI * 2, offset: Math.random() * Math.PI });
        }
      }
    }

    e.vfxState.timer += dt;
    const vfx = e.vfx;
    const isMoving = Math.hypot(e.vx || 0, e.vy || 0) > 20;

    // ── Update History (Ghosting) ──
    if (vfx === "phantom_vector" || vfx === "digital_wraith") {
      e.vfxState.history.unshift({ x: e.x, y: e.y, angle: e.angle, size: e.size });
      if (e.vfxState.history.length > 10) e.vfxState.history.pop();
    }

    // ── Update Sub-Entities (The Hive) ──
    if (vfx === "the_hive") {
      const speedScale = e.isDashing ? 0.3 : 1.0;
      e.vfxState.drones.forEach((drone, idx) => {
        drone.angle += dt * 3 * (idx % 2 === 0 ? 1 : -1);
        const targetX = e.x + Math.cos(drone.angle) * (e.size * 1.5);
        const targetY = e.y + Math.sin(drone.angle) * (e.size * 1.5);
        // Lag behind when dashing
        drone.x += (targetX - drone.x) * speedScale;
        drone.y += (targetY - drone.y) * speedScale;
      });
    }

    // ── Emit Idle/Movement Particles ──
    if (isMoving && Math.random() < 0.3) {
      this._emitTrail(e);
    }
    
    // Void Mosquito continuous inward glitch
    if (vfx === "void_mosquito" && Math.random() < 0.2) {
      const angle = Math.random() * Math.PI * 2;
      const dist = e.size * 2 + Math.random() * e.size * 2;
      this.particles.emit(
        e.x + Math.cos(angle) * dist,
        e.y + Math.sin(angle) * dist,
        0, 0, 0.4, "#E040FB", 2, "void_pull", { targetX: e.x, targetY: e.y }
      );
    }
  }

  // Called when entity uses dash
  emitDash(e) {
    const vfx = e.vfx;
    const rearX = e.x - Math.cos(e.angle) * e.size;
    const rearY = e.y - Math.sin(e.angle) * e.size;
    const oppAngle = e.angle + Math.PI;

    const count = 10 + Math.random() * 5;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.8;
      const speed = 200 + Math.random() * 300;
      
      let color = "#fff";
      let type = "default";
      let life = 0.3 + Math.random() * 0.2;
      let size = e.size * 0.2;

      switch (vfx) {
        case "cyber_drone":
          color = Math.random() < 0.4 ? "#00E5FF" : "#84FFFF";
          size = e.size * 0.25;
          break;
        case "blood_reactor":
          color = Math.random() < 0.5 ? "#FF3D00" : "#FF9100";
          size = e.size * 0.4; // Heavy magma flame
          break;
        case "cyber_hornet":
          color = "#D50000"; // Red thruster
          type = "square";
          size = e.size * 0.25;
          break;
        case "neon_drifter":
          color = "#00E5FF";
          break;
        case "bloodbyte":
          color = "#FF1744";
          type = "square"; // pixelated
          break;
        default:
          color = e.color || "#D50000";
      }

      this.particles.emit(
        rearX + (Math.random() - 0.5) * e.size * 0.5,
        rearY + (Math.random() - 0.5) * e.size * 0.5,
        Math.cos(oppAngle + spread) * speed,
        Math.sin(oppAngle + spread) * speed,
        life, color, size, type
      );
    }
  }

  _emitTrail(e) {
    const vfx = e.vfx;
    if (vfx === "cyber_drone" || vfx === "neon_drifter") {
      this.particles.emit(
        e.x, e.y, (Math.random()-0.5)*20, (Math.random()-0.5)*20,
        0.4, "#00E5FF", e.size * 0.1
      );
    } else if (vfx === "bloodbyte") {
      this.particles.emit(
        e.x, e.y, (Math.random()-0.5)*20, (Math.random()-0.5)*20,
        0.5, "#00E5FF", e.size * 0.1
      );
    } else if (vfx === "bloodbyte") {
      this.particles.emit(
        e.x + (Math.random()-0.5)*e.size, e.y + (Math.random()-0.5)*e.size,
        0, 0, 0.4, "#FF1744", e.size * 0.15, "square"
      );
    }
  }

  // ── Render Underneath Entity (Trails, Auras, Bottom Particles) ──
  renderBelow(ctx, e, camera, dt) {
    if (!e.vfxState) return;
    const vfx = e.vfx;

    // Blood God Crimson Aura
    if (vfx === "blood_god") {
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.1 * Math.sin(this.globalTime * 3);
      ctx.fillStyle = "#D50000";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Phantom Vector Ghosting (3 Frames behind)
    if (vfx === "phantom_vector" && e.vfxState.history.length > 6) {
      const frames = [2, 4, 6];
      frames.forEach((fIdx, i) => {
        const hist = e.vfxState.history[fIdx];
        if (hist) {
          ctx.save();
          ctx.globalAlpha = 0.3 - i * 0.1;
          ctx.translate(hist.x, hist.y);
          ctx.rotate(hist.angle + Math.PI/2);
          ctx.fillStyle = "#304FFE";
          ctx.beginPath();
          ctx.arc(0, 0, hist.size * 1.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }
  }

  // ── Render Global Particles ──
  renderParticles(ctx, camera) {
    for (const p of this.particles.active) {
      // Basic camera culling
      if (camera) {
        const halfW = (camera.canvasWidth / camera.zoom) / 2;
        const halfH = (camera.canvasHeight / camera.zoom) / 2;
        if (p.x < camera.x - halfW - p.size || p.x > camera.x + halfW + p.size ||
            p.y < camera.y - halfH - p.size || p.y > camera.y + halfH + p.size) {
          continue;
        }
      }

      ctx.save();
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      ctx.translate(p.x, p.y);
      if (p.type === "square") {
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.5 + 0.5 * alpha), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── Render Above Entity (Lightning, Overlays, The Hive Drones) ──
  renderAbove(ctx, e, camera, dt) {
    if (!e.vfxState) return;
    const vfx = e.vfx;

    // Overclock Lightning Arcs
    if (vfx === "overclock") {
      ctx.save();
      ctx.strokeStyle = "#84FFFF";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      if (Math.random() < 0.4) {
        const angle = Math.random() * Math.PI * 2;
        const dist = e.size * (1 + Math.random());
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        // Jagged line
        ctx.lineTo(e.x + Math.cos(angle + 0.5)*dist*0.5, e.y + Math.sin(angle + 0.5)*dist*0.5);
        ctx.lineTo(e.x + Math.cos(angle)*dist, e.y + Math.sin(angle)*dist);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Blood God Diamonds
    if (vfx === "blood_god") {
      ctx.save();
      ctx.fillStyle = "#FF1744";
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 1;
      e.vfxState.diamonds.forEach((dia, idx) => {
        const a = dia.angle + this.globalTime * 1.5;
        const dx = e.x + Math.cos(a) * (e.size * 1.4);
        const dy = e.y + Math.sin(a) * (e.size * 1.4);
        ctx.translate(dx, dy);
        ctx.rotate(this.globalTime * 3);
        ctx.beginPath();
        ctx.moveTo(0, -e.size*0.2);
        ctx.lineTo(e.size*0.15, 0);
        ctx.lineTo(0, e.size*0.2);
        ctx.lineTo(-e.size*0.15, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.rotate(-this.globalTime * 3);
        ctx.translate(-dx, -dy);
      });
      ctx.restore();
    }

    // The Hive Drones (Persistent Sub-entities)
    if (vfx === "the_hive") {
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.strokeStyle = "#00E5FF";
      ctx.lineWidth = 2;
      e.vfxState.drones.forEach(drone => {
        ctx.translate(drone.x, drone.y);
        ctx.beginPath();
        ctx.arc(0, 0, e.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Cyan core
        ctx.fillStyle = "#00E5FF";
        ctx.beginPath();
        ctx.arc(0, 0, e.size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.translate(-drone.x, -drone.y);
      });
      ctx.restore();
    }
  }
}

export default VFXManager;
