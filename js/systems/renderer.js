// ============================================================
// BloodRush.io — Renderer (Vector Mosquitoes, Blood Propulsion & Radar)
// ============================================================
import { CONFIG } from "../config.js";
import { PlayerState } from "../entities/player.js";
import { SKIN_DRAWERS } from "./skin-drawers.js";

export class Renderer {
  constructor(canvas, assetLoader = null, vfxManager = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.assetLoader = assetLoader;
    this.vfxManager = vfxManager;
    this.particles = [];
    this.bloodPropulsionParticles = []; // rear blood spray drips
    this.floatingTexts = [];
    this._rankNotifTimer = 0;
    this._rankNotifText = "";
    this.globalTime = 0;
    this.radarSweepAngle = 0;

    // ── Performance: Offscreen Environment Cache ──────────
    this._envCanvas = null;
    this._envCtx = null;
    this._envDirty = true;       // flag to force re-render of static env
    this._envLastCamX = -Infinity;
    this._envLastCamY = -Infinity;
    this._envLastZoom = -1;
    this._envCachePadding = 400;  // px beyond viewport to cache

    // ── Performance: Skin lookup cache ────────────────────
    this._skinCache = new Map();
    for (const skin of CONFIG.SKINS) {
      this._skinCache.set(skin.id, skin);
    }

    // ── Performance: Pre-allocated entity sort buffer ─────
    this._entitySortBuf = [];
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  showRankNotif(text) {
    this._rankNotifText = text;
    this._rankNotifTimer = 2.5;
  }

  addFloatingText(x, y, text, color = "#FFFFFF", size = 18) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      size,
      vy: -55,
      life: 1.0,
      maxLife: 1.0,
    });
    if (this.floatingTexts.length > CONFIG.RENDER.FLOATING_TEXT_MAX) {
      this.floatingTexts.shift();
    }
  }

  // ── Spawn Rear Blood Propulsion Spray (Player & Enemies) ───
  spawnBloodPropulsion(entity) {
    const rear = entity.rearAbdomenTip;
    const oppAngle = entity.angle + Math.PI; // opposite to heading
    const count = 3 + Math.floor(Math.random() * 3);

    for (
      let i = 0;
      i < count &&
      this.bloodPropulsionParticles.length <
        CONFIG.RENDER.BLOOD_BURST_PARTICLE_MAX;
      i++
    ) {
      const spread = (Math.random() - 0.5) * 0.75;
      const angle = oppAngle + spread;
      const speed = 180 + Math.random() * 260;
      const size = entity.size * (0.16 + Math.random() * 0.18);

      this.bloodPropulsionParticles.push({
        x: rear.x + (Math.random() - 0.5) * entity.size * 0.4,
        y: rear.y + (Math.random() - 0.5) * entity.size * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.max(3, size),
        initialR: Math.max(3, size),
        life: 0.18 + Math.random() * 0.14,
        maxLife: 0.18 + Math.random() * 0.14,
        color:
          Math.random() < 0.6
            ? CONFIG.COLORS.BLOOD_BURST
            : CONFIG.COLORS.BLOOD_SPRAY,
      });
    }
  }

  // ── Main Render Loop ─────────────────────────────────────
  render(
    dt,
    camera,
    env,
    player,
    enemies,
    powerups,
    foodManager,
    matchManager,
    uiState,
  ) {
    const ctx = this.ctx;
    const W = this.canvas.width,
      H = this.canvas.height;
    this.globalTime += dt;
    this.radarSweepAngle += dt * CONFIG.RADAR.SWEEP_SPEED;

    ctx.clearRect(0, 0, W, H);

    // ── World Space ─────────────────────────────────────────
    camera.apply(ctx);

    this._drawBackground(ctx, env, camera);
    this._drawEnvironment(ctx, env, camera);
    this._drawShrinkBoundary(ctx, matchManager);
    this._drawFoods(ctx, foodManager, camera);
    this._drawPowerups(ctx, powerups, camera);
    this._drawBloodPropulsion(ctx, dt);
    
    // Draw global VFX particles
    if (this.vfxManager) {
      this.vfxManager.renderParticles(ctx, camera);
    }
    
    this._drawEntities(ctx, dt, player, enemies, camera); // pass camera for entity culling
    this._drawParticles(ctx, dt);
    this._drawFloatingTexts(ctx, dt);

    camera.restore(ctx);

    // ── Screen Space HUD (Proximity Radar) ──────────────────
    if (uiState === "gameplay") {
      this._drawProximityRadar(
        ctx,
        W,
        H,
        player,
        enemies,
        powerups,
        matchManager,
      );
    }

    if (this._rankNotifTimer > 0) {
      this._rankNotifTimer -= dt;
      this._drawRankNotif(ctx, W, H);
    }
  }

  // ── Helper: Culling ───────────────────────────────────────
  _isVisible(x, y, radius, camera) {
    if (!camera) return true;
    const padding = radius + 200;
    const halfW = (camera.canvasWidth / camera.zoom) / 2;
    const halfH = (camera.canvasHeight / camera.zoom) / 2;
    return (
      x + padding > camera.x - halfW &&
      x - padding < camera.x + halfW &&
      y + padding > camera.y - halfH &&
      y - padding < camera.y + halfH
    );
  }

  // ── Cyber Arena Background & Circuits ────────────────────
  _drawBackground(ctx, env, camera) {
    const W = CONFIG.ARENA.WIDTH, H = CONFIG.ARENA.HEIGHT;

    // Outer cyber void background
    ctx.fillStyle = CONFIG.COLORS.ARENA_BG;
    ctx.fillRect(0, 0, W, H);

    // Subtle Hex or Grid overlay
    ctx.strokeStyle = "rgba(15, 22, 38, 0.4)";
    ctx.lineWidth = 2;
    // We won't draw a full 8000x8000 grid for performance, we just rely on gridNodes

    // Circuit pathways across 8000x8000 world
    if (env && env.circuits) {
      for (const p of env.circuits) {
        // Broad phase culling for lines
        if (camera) {
          const minX = Math.min(p.startX, p.endX);
          const maxX = Math.max(p.startX, p.endX);
          const minY = Math.min(p.startY, p.endY);
          const maxY = Math.max(p.startY, p.endY);
          const halfW = (camera.canvasWidth / camera.zoom) / 2;
          const halfH = (camera.canvasHeight / camera.zoom) / 2;
          if (maxX < camera.x - halfW || minX > camera.x + halfW ||
              maxY < camera.y - halfH || minY > camera.y + halfH) {
            continue;
          }
        }
        ctx.save();
        ctx.strokeStyle = CONFIG.COLORS.PATH_GRAVEL;
        ctx.lineWidth = p.width;
        ctx.beginPath();
        ctx.moveTo(p.startX, p.startY);
        ctx.lineTo(p.endX, p.endY);
        ctx.stroke();
        
        // Inner glowing core (simulated glow without shadow)
        ctx.strokeStyle = "rgba(255, 23, 68, 0.15)";
        ctx.lineWidth = p.width * 0.4;
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 23, 68, 0.4)";
        ctx.lineWidth = p.width * 0.15;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── Environment Objects (Grid Nodes, Zappers, Shards, Pools) ────────
  _drawEnvironment(ctx, env, camera) {
    if (!env) return;

    // Grid Nodes
    ctx.fillStyle = "rgba(255, 23, 68, 0.15)";
    for (const n of env.gridNodes) {
      if (!this._isVisible(n.x, n.y, n.size, camera)) continue;
      const pulse = Math.sin(this.globalTime * 1.5 + n.pulseOffset);
      const r = n.size + pulse * 1.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r > 0 ? r : 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Plasma Pools
    for (const p of env.plasmaPools) {
      if (!this._isVisible(p.x, p.y, Math.max(p.rx, p.ry), camera)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = 0.4;

      // Simulated glow
      ctx.fillStyle = "rgba(213, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx * 1.15, p.ry * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = CONFIG.COLORS.PUDDLE;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      const rip = (this.globalTime * 1.4 + p.rippleOffset) % 3;
      const ripScale = rip / 3;
      ctx.globalAlpha = (1 - ripScale) * 0.6;
      ctx.strokeStyle = CONFIG.COLORS.PUDDLE_BORDER;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx * ripScale, p.ry * ripScale, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Obsidian Shards
    for (const s of env.shards) {
      if (!this._isVisible(s.x, s.y, s.r, camera)) continue;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x + 8, s.points[0].y + 12);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x + 8, s.points[i].y + 12);
      ctx.fill();

      // Base shape
      ctx.fillStyle = CONFIG.COLORS.ROCK;
      ctx.strokeStyle = CONFIG.COLORS.ARENA_BORDER;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Highlight geometry
      ctx.fillStyle = CONFIG.COLORS.ROCK_HIGHLIGHT;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s.points[0].x, s.points[0].y);
      ctx.lineTo(s.points[1].x, s.points[1].y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Neon Zappers
    for (const z of env.zappers) {
      if (!this._isVisible(z.x, z.y, z.r, camera)) continue;
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(this.globalTime + z.pulseOffset);

      // Simulated glow via larger transparent polygon
      ctx.fillStyle = z.color;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      for (let i = 0; i < z.sides; i++) {
        const angle = (i / z.sides) * Math.PI * 2;
        const px = Math.cos(angle) * (z.r * 1.3);
        const py = Math.sin(angle) * (z.r * 1.3);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 4;
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      
      ctx.beginPath();
      for (let i = 0; i < z.sides; i++) {
        const angle = (i / z.sides) * Math.PI * 2;
        const px = Math.cos(angle) * z.r;
        const py = Math.sin(angle) * z.r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Core
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(0, 0, z.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Arena Danger Boundary ────────────────────────────────
  _drawShrinkBoundary(ctx, matchManager) {
    if (!matchManager) return;
    const bounds = matchManager.getArenaBounds();
    if (!bounds.shrinking) return;

    ctx.save();
    ctx.fillStyle = "rgba(239, 83, 80, 0.14)";
    ctx.fillRect(0, 0, CONFIG.ARENA.WIDTH, CONFIG.ARENA.HEIGHT);

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(bounds.center.x, bounds.center.y, bounds.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.strokeStyle = CONFIG.COLORS.BOUNDARY;
    ctx.lineWidth = 5 + 2 * Math.sin(this.globalTime * 4);
    ctx.beginPath();
    ctx.arc(bounds.center.x, bounds.center.y, bounds.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Food Items ────────────────────────────────────────────
  _drawFoods(ctx, foodManager, camera) {
    if (!foodManager) return;

    for (const food of foodManager.foods) {
      if (food.collected) continue;
      if (!this._isVisible(food.x, food.y, food.radius, camera)) continue;
      const r = food.radius * food.pulse;
      ctx.save();
      ctx.translate(food.x, food.y);
      ctx.rotate(this.globalTime * 2);

      if (food.isBlood) {
        // Simulated glow
        ctx.fillStyle = "rgba(255, 23, 68, 0.25)";
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.4);
        ctx.lineTo(r * 1.4, 0);
        ctx.lineTo(0, r * 1.4);
        ctx.lineTo(-r * 1.4, 0);
        ctx.closePath();
        ctx.fill();

        // Rich Blood Cells (Red Diamond)
        ctx.fillStyle = CONFIG.COLORS.BLOOD_DROP;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.4);
        ctx.lineTo(r * 0.4, 0);
        ctx.lineTo(0, r * 0.4);
        ctx.lineTo(-r * 0.4, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        // Simulated glow
        ctx.fillStyle = "rgba(0, 229, 255, 0.25)";
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          ctx.lineTo(Math.cos(angle) * r * 1.6, Math.sin(angle) * r * 1.6);
        }
        ctx.closePath();
        ctx.fill();

        // Plasma Cores (Cyan Hexagon)
        ctx.fillStyle = CONFIG.COLORS.NECTAR_DROP;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          ctx.lineTo(Math.cos(angle) * r * 1.2, Math.sin(angle) * r * 1.2);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ── Power-ups ─────────────────────────────────────────────
  _drawPowerups(ctx, powerups, camera) {
    if (!powerups) return;
    for (const p of powerups) {
      if (p.collected) continue;
      const r = 24;
      if (!this._isVisible(p.x, p.y, r * 1.5, camera)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(this.globalTime * 3) * 0.2);

      // Simulated glow
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Base geometric frame
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      if (p.label === "⚡") {
        ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0);
      } else if (p.label === "🛡") {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
      } else {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const dist = i % 2 === 0 ? r : r * 0.6;
          ctx.lineTo(Math.cos(a) * dist, Math.sin(a) * dist);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${Math.floor(r * 1.1)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, 0, 1);
      ctx.restore();
    }
  }

  // ── Rear Blood Propulsion Burst Particles ────────────────
  _drawBloodPropulsion(ctx, dt) {
    // Swap-remove dead blood particles in-place
    const arr = this.bloodPropulsionParticles;
    let writeIdx = 0;
    for (let i = 0, len = arr.length; i < len; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;
      p.vy *= 0.9;

      const progress = 1 - p.life / p.maxLife;
      const alpha = p.life / p.maxLife;
      const currentR = p.initialR * (1 + progress * 0.6);

      ctx.globalAlpha = alpha;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FF8A80";
      ctx.beginPath();
      ctx.arc(
        p.x - currentR * 0.3,
        p.y - currentR * 0.3,
        currentR * 0.35,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      arr[writeIdx++] = p;
    }
    arr.length = writeIdx;
    ctx.globalAlpha = 1;
  }

  // ── Entities (Mosquito Characters) ───────────────────────
  _drawEntities(ctx, dt, player, enemies, camera) {
    if (!enemies) return;

    // Reuse pre-allocated buffer to avoid alloc per frame
    const buf = this._entitySortBuf;
    buf.length = 0;
    for (let i = 0, len = enemies.length; i < len; i++) {
      const e = enemies[i];
      if ((e.alive || e.deathTimer < 0.8) && this._isVisible(e.x, e.y, e.size * 2.5, camera)) {
        buf.push(e);
      }
    }
    // In-place sort on reusable buffer
    buf.sort((a, b) => a.size - b.size);

    const playerAlive = player && player.isAlive();
    const pSize = playerAlive ? player.size : 0;
    const pDashing = playerAlive ? player.isDashing : false;

    for (let i = 0, len = buf.length; i < len; i++) {
      const e = buf[i];
      ctx.globalAlpha = e.alive ? 1 : e.deathAlpha;

      let auraType = null;
      if (playerAlive && e.alive) {
        if (pSize >= e.size * 1.02 || (pDashing && pSize >= e.size * 0.88)) {
          auraType = "prey";
        } else if (e.size >= pSize * 1.02 || (e.isDashing && e.size >= pSize * 0.88)) {
          auraType = "threat";
        } else {
          auraType = "equal";
        }
      }

      this._drawEntity(
        ctx,
        e.x,
        e.y,
        e.size,
        e.angle,
        e.color,
        e.glowColor,
        e.wingAngle,
        {
          growFlash: e.growFlash,
          name: e.name,
          isPlayer: false,
          auraType: auraType,
          isDashing: e.isDashing,
          boostBurstTimer: e.boostBurstTimer,
          squashStretch: e.squashStretch || 1.0,
          turnTilt: e.turnTilt || 0,
          skinId: e.skinId,
          vfx: e.vfx,
          vfxState: e.vfxState
        },
      );
    }
    ctx.globalAlpha = 1;

    // Draw Player
    if (player && player.state !== PlayerState.DEAD) {
      ctx.globalAlpha =
        player.state === PlayerState.DYING ? player.deathAlpha : 1;

      if (player.state === PlayerState.SPAWNING) {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.globalTime * 15);
      }

      this._drawEntity(
        ctx,
        player.x,
        player.y,
        player.size,
        player.angle,
        player.color,
        player.glowColor,
        player.wingAngle,
        {
          isPlayer: true,
          name: player.name || "You",
          shield: player.shield,
          frenzy: player.frenzy,
          speedBoost: player.speedBoost > 0,
          growFlash: player.growFlash,
          isDashing: player.isDashing,
          boostBurstTimer: player.boostBurstTimer,
          squashStretch: player.squashStretch,
          turnTilt: player.turnTilt,
          stamina: player.stamina,
          maxStamina: player.maxStamina,
          skinId: player.skinId || "cyber_drone",
          vfx: player.vfx,
          vfxState: player.vfxState
        },
      );
      ctx.globalAlpha = 1;
    }
  }

  // ── Dispatcher for Entity Rendering ─────────────────────────
  _drawEntity(ctx, x, y, size, angle, color, glowColor, wingAngle, opts = {}) {
    // 1. Draw Underneath (Auras, Trails)
    if (this.vfxManager) {
      const e = { x, y, size, angle, vfx: opts.vfx, vfxState: opts.vfxState };
      this.vfxManager.renderBelow(ctx, e, null, 0);
    }

    const skinId = opts.skinId || "cyber_drone";

    // 2. Draw Core Entity
    // Priority: bespoke animated drawer → image sprite → default vector
    const bespokeDraw = SKIN_DRAWERS[skinId];
    if (bespokeDraw) {
      // Pass globalTime so animations work
      bespokeDraw(ctx, x, y, size, angle, wingAngle, this.globalTime, opts);
    } else {
      let img = null;
      if (this.assetLoader) img = this.assetLoader.getImage(skinId);
      if (img) {
        this._drawImageEntity(ctx, x, y, size, angle, img, wingAngle, opts);
      } else {
        this._drawVectorMosquito(ctx, x, y, size, angle, color, glowColor, wingAngle, opts);
      }
    }

    // 3. Draw Above (Lightning, The Hive Drones, HUD)
    if (this.vfxManager) {
      const e = { x, y, size, angle, vfx: opts.vfx, vfxState: opts.vfxState };
      this.vfxManager.renderAbove(ctx, e, null, 0);
    }

    // 4. HUD drawn on top for bespoke skins (vector drawers don't self-call HUD)
    if (bespokeDraw) {
      this._drawEntityHUD(ctx, x, y, size, opts);
    }
  }

  // ── Image Sprite Rendering ──────────────────────────────────
  _drawImageEntity(ctx, x, y, size, angle, img, wingAngle, opts = {}) {
    ctx.save();
    ctx.translate(x, y);

    // Auras / Indicators
    const r = size;
    if (opts.shield) {
      ctx.strokeStyle = "#4FC3F7";
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(this.globalTime * 6);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (opts.frenzy) {
      ctx.strokeStyle = "#FF5722";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Rotate context to entity heading
    ctx.rotate(angle + Math.PI / 2);

    // Apply Squash & Stretch along flight axis
    const sq = opts.squashStretch || 1.0;
    ctx.scale(1 / Math.sqrt(sq), sq);

    // Drop Shadow
    ctx.fillStyle = `rgba(0,0,0,${CONFIG.RENDER.SHADOW_ALPHA || 0.15})`;
    ctx.beginPath();
    ctx.arc(r * 0.2, r * 0.3, r, 0, Math.PI * 2);
    ctx.fill();

    const skinDef = this._skinCache.get(opts.skinId || "cyber_drone");
    const isSpriteSheet = skinDef && skinDef.spriteSheet;

    if (isSpriteSheet) {
      // Clean source-over for transparent PNG sprite sheets
      ctx.globalCompositeOperation = "source-over";

      const cfg = skinDef.spriteSheet;
      const cols = cfg.cols || 4;
      const rows = cfg.rows || 3;
      const frameW = cfg.frameWidth || (img.width / cols);
      const frameH = cfg.frameHeight || (img.height / rows);

      let frame = 0;
      const isBoosting = opts.isDashing || (opts.boostBurstTimer && opts.boostBurstTimer > 0);

      if (isBoosting) {
        // Fast thruster boost surge animation (Frames 8 to 11 with blazing cyan plume)
        const boostFrames = cfg.boostFrames || [8, 9, 10, 11, 10, 9];
        const boostFps = 22;
        const bIdx = Math.floor((this.globalTime * boostFps) % boostFrames.length);
        frame = boostFrames[bIdx];
      } else {
        // Normal flight wing flapping loop
        // Map wingAngle (or globalTime) to ping-pong flap [0, 1, 2, 3, 2, 1]
        const flightFrames = cfg.flightFrames || [0, 1, 2, 3, 2, 1];
        const wAngle = (typeof wingAngle === "number") ? wingAngle : (this.globalTime * 16);
        const normAngle = ((wAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const fIdx = Math.floor((normAngle / (Math.PI * 2)) * flightFrames.length) % flightFrames.length;
        frame = flightFrames[fIdx];
      }

      const col = frame % cols;
      const row = Math.floor(frame / cols);
      const sx = col * frameW;
      const sy = row * frameH;

      // Draw sprite centered on hitbox
      const drawSize = size * 2.6;
      ctx.drawImage(img, sx, sy, frameW, frameH, -drawSize / 2, -drawSize / 2, drawSize, drawSize);

      // Hit/grow flash effect
      if (opts.growFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = `rgba(0, 229, 255, ${Math.min(0.5, opts.growFlash * 2.5)})`;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else {
      // Legacy single static images with dark background
      ctx.globalCompositeOperation = "lighter";
      const drawSize = size * 2.5; 
      ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.globalCompositeOperation = "source-over"; // restore
    }

    ctx.restore();

    this._drawEntityHUD(ctx, x, y, size, opts);
  }

  // ── Vector Mosquito Character (Squash & Stretch Recoil) ───
  _drawVectorMosquito(
    ctx,
    x,
    y,
    size,
    angle,
    color,
    glowColor,
    wingAngle,
    opts = {},
  ) {
    ctx.save();
    ctx.translate(x, y);

    const r = size;

    // ── Target Auras & Indicators ────────────────────────────
    // (Removed FOV debug visuals)

    if (opts.shield) {
      ctx.strokeStyle = "#4FC3F7";
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(this.globalTime * 6);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (opts.frenzy) {
      ctx.strokeStyle = "#FF5722";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Rotate context to entity heading with Squash & Stretch
    ctx.rotate(angle + Math.PI / 2);

    // Apply Squash & Stretch along flight axis
    const sq = opts.squashStretch || 1.0;
    ctx.scale(1 / Math.sqrt(sq), sq);

    // ── Drop Shadow ──────────────────────────────────────────
    ctx.fillStyle = `rgba(0,0,0,${CONFIG.RENDER.SHADOW_ALPHA})`;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.2);
    ctx.lineTo(r * 0.8, 0);
    ctx.lineTo(0, r * 1.5);
    ctx.lineTo(-r * 0.8, 0);
    ctx.closePath();
    ctx.fill();

    // ── Angular Legs ─────────────────────────
    ctx.strokeStyle = "rgba(20, 25, 35, 0.9)";
    ctx.lineWidth = Math.max(2.0, r * 0.1);
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";

    const legs = [
      // Front
      { sx: -r*0.3, sy: -r*0.2, jx: -r*1.1, jy: -r*0.6, tx: -r*1.4, ty: -r*1.1 },
      { sx: r*0.3, sy: -r*0.2, jx: r*1.1, jy: -r*0.6, tx: r*1.4, ty: -r*1.1 },
      // Mid
      { sx: -r*0.35, sy: r*0.2, jx: -r*1.3, jy: r*0.1, tx: -r*1.8, ty: r*0.4 },
      { sx: r*0.35, sy: r*0.2, jx: r*1.3, jy: r*0.1, tx: r*1.8, ty: r*0.4 },
      // Back
      { sx: -r*0.25, sy: r*0.6, jx: -r*1.0, jy: r*1.0, tx: -r*1.3, ty: r*1.6 },
      { sx: r*0.25, sy: r*0.6, jx: r*1.0, jy: r*1.0, tx: r*1.3, ty: r*1.6 },
    ];

    for (const leg of legs) {
      ctx.beginPath();
      ctx.moveTo(leg.sx, leg.sy);
      ctx.lineTo(leg.jx, leg.jy);
      ctx.lineTo(leg.tx, leg.ty);
      ctx.stroke();
    }

    // ── Angular Abdomen & Thorax ──────────────────────────────
    // Simulated outer glow via stroke
    ctx.strokeStyle = opts.growFlash > 0 ? "rgba(255,255,255,0.4)" : "rgba(255,23,68,0.2)";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, r * 0.3);
    ctx.lineTo(r * 0.6, r * 0.8);
    ctx.lineTo(0, r * 1.8);
    ctx.lineTo(-r * 0.6, r * 0.8);
    ctx.closePath();
    ctx.stroke();
    
    // Abdomen (Kite shape)
    ctx.fillStyle = opts.growFlash > 0 ? "#FFFFFF" : color;
    ctx.strokeStyle = "#1A1A1A";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.3); // Top connects to thorax
    ctx.lineTo(r * 0.6, r * 0.8);
    ctx.lineTo(0, r * 1.8); // Tip
    ctx.lineTo(-r * 0.6, r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Thorax (Hexagon)
    ctx.fillStyle = "#1E2530";
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.4);
    ctx.lineTo(r * 0.5, -r * 0.1);
    ctx.lineTo(r * 0.5, r * 0.4);
    ctx.lineTo(0, r * 0.6);
    ctx.lineTo(-r * 0.5, r * 0.4);
    ctx.lineTo(-r * 0.5, -r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // ── Geometric Wings ─────────────────────────
    const flapAngle = Math.sin(wingAngle) * (opts.isDashing ? 0.6 : 0.25);
    const tilt = opts.turnTilt || 0;

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * r * 0.4, 0);
      ctx.rotate(side * (0.8 + flapAngle) + (side === 1 ? tilt : -tilt));

      ctx.fillStyle = "rgba(0, 229, 255, 0.2)"; // Cyan translucent
      ctx.strokeStyle = "rgba(0, 229, 255, 0.8)";
      ctx.lineWidth = 1.5;

      // Sharp wing polygon
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * r * 1.5, -r * 1.2);
      ctx.lineTo(side * r * 0.4, -r * 2.2);
      ctx.lineTo(-side * r * 0.2, -r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Wing veins (inner geometric lines)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * r * 0.4, -r * 2.0);
      ctx.moveTo(side * r * 0.2, -r * 1.0);
      ctx.lineTo(side * r * 1.2, -r * 1.1);
      ctx.stroke();
      
      ctx.restore();
    }

    // ── Angular Head & Proboscis ─────────────────────────────────
    ctx.fillStyle = "#11151C";
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9); // Snout base
    ctx.lineTo(r * 0.4, -r * 0.4);
    ctx.lineTo(-r * 0.4, -r * 0.4);
    ctx.closePath();
    ctx.fill();

    // Neon Eyes (Triangles)
    ctx.fillStyle = "#FFFFFF";
    // Optional fake glow behind eyes
    ctx.globalAlpha = 0.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * r * 0.25, -r * 0.6, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.15, -r * 0.5);
      ctx.lineTo(side * r * 0.35, -r * 0.75);
      ctx.lineTo(side * r * 0.35, -r * 0.45);
      ctx.closePath();
      ctx.fill();
    }

    // Glowing Proboscis (Laser needle)
    const probLength = r * (opts.isDashing ? CONFIG.PLAYER.PIERCE_HITBOX_EXTEND : 1.4);
    
    // Fake glow for proboscis
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = Math.max(2.0, r * 0.12) + 4;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, -r * 0.9 - probLength);
    ctx.stroke();

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = Math.max(2.0, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, -r * 0.9 - probLength);
    ctx.stroke();

    ctx.restore();
    
    this._drawEntityHUD(ctx, x, y, size, opts);
  }

  _drawEntityHUD(ctx, x, y, size, opts) {
    ctx.save();
    ctx.translate(x, y);
    const r = size;
    
    // HUD logic extracted from vector drawing
    if (opts.auraType) {
      if (opts.auraType === "prey") {
        ctx.fillStyle = "rgba(118, 255, 3, 0.4)";
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.5);
        ctx.lineTo(r * 0.4, -r * 2.0);
        ctx.lineTo(-r * 0.4, -r * 2.0);
        ctx.closePath();
        ctx.fill();
      } else if (opts.auraType === "threat") {
        ctx.fillStyle = "rgba(255, 23, 68, 0.6)";
        ctx.font = `bold ${Math.max(14, r * 0.6)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", 0, -r * 2.0);
      }
    }

    if (opts.isPlayer) {
      const pColor = CONFIG.COLORS.PLAYER;
      ctx.fillStyle = opts.name === "You" ? pColor : "#E2E8F0";
      ctx.font = "bold 14px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(opts.name, 0, r * 1.5 + 16);

      if (opts.stamina !== undefined) {
        const sw = 40;
        const sh = 5;
        const sx = -sw / 2;
        const sy = r * 1.5 + 24;

        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(sx, sy, sw, sh);

        const fillRatio = Math.min(1, Math.max(0, opts.stamina / opts.maxStamina));
        ctx.fillStyle = fillRatio >= (30 / 100) ? pColor : "#90A4AE";
        ctx.fillRect(sx, sy, sw * fillRatio, sh);
      }
    } else {
      ctx.fillStyle = "rgba(226, 232, 240, 0.6)";
      ctx.font = "11px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(opts.name || "", 0, r * 1.5 + 12);
    }
    ctx.restore();
  }

  // ── Particle System ───────────────────────────────────────
  spawnParticles(x, y, color, count = 8, speedBoost = 1) {
    for (
      let i = 0;
      i < count && this.particles.length < CONFIG.RENDER.PARTICLE_MAX;
      i++
    ) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (70 + Math.random() * 140) * speedBoost;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2.5 + Math.random() * 4.5,
        life: 0.45 + Math.random() * 0.4,
        maxLife: 0.45 + Math.random() * 0.4,
        color,
      });
    }
  }

  _drawParticles(ctx, dt) {
    // Swap-remove dead particles in-place to avoid array rebuild
    const arr = this.particles;
    let writeIdx = 0;
    for (let i = 0, len = arr.length; i < len; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.93;
      p.vy *= 0.93;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
      ctx.fill();
      arr[writeIdx++] = p;
    }
    arr.length = writeIdx;
    ctx.globalAlpha = 1;
  }

  // ── Floating Combat Popups ────────────────────────────────
  _drawFloatingTexts(ctx, dt) {
    // Swap-remove dead texts in-place to avoid array rebuild
    const arr = this.floatingTexts;
    let writeIdx = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0, len = arr.length; i < len; i++) {
      const ft = arr[i];
      ft.life -= dt;
      if (ft.life <= 0) continue;
      ft.y += ft.vy * dt;
      ft.vy *= 0.94;
      const alpha = Math.min(1, ft.life / 0.3);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `900 ${ft.size}px Outfit, sans-serif`;
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.lineWidth = 3.5;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      arr[writeIdx++] = ft;
    }
    arr.length = writeIdx;
    ctx.globalAlpha = 1;
  }

  // ── Proximity Radar (Local Proximity Scanner) ─────────────
  _drawProximityRadar(ctx, W, H, player, enemies, powerups, matchManager) {
    if (!player || !player.isAlive()) return;

    const R_SIZE = CONFIG.RADAR.SIZE;
    const PAD = CONFIG.RENDER.MINIMAP_PADDING;
    const rx = W - R_SIZE - PAD;
    const ry = H - R_SIZE - PAD - 60;
    const cx = rx + R_SIZE / 2;
    const cy = ry + R_SIZE / 2;
    const radarRange = CONFIG.RADAR.DETECTION_RADIUS;

    ctx.save();

    // Radar circular clipping mask
    ctx.beginPath();
    ctx.arc(cx, cy, R_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Radar Glassmorphic background
    ctx.fillStyle = "rgba(235, 244, 232, 0.94)";
    ctx.fillRect(rx, ry, R_SIZE, R_SIZE);

    // Range guide rings
    ctx.strokeStyle = "rgba(116, 168, 105, 0.32)";
    ctx.lineWidth = 1.2;
    for (const frac of [0.35, 0.7, 0.98]) {
      ctx.beginPath();
      ctx.arc(cx, cy, (R_SIZE / 2) * frac, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Compass cross lines
    ctx.strokeStyle = "rgba(116, 168, 105, 0.20)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, ry);
    ctx.lineTo(cx, ry + R_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rx, cy);
    ctx.lineTo(rx + R_SIZE, cy);
    ctx.stroke();

    // Rotating Radar Scanner Beam
    const sweepAngle = this.radarSweepAngle;
    const beamGrd = ctx.createRadialGradient(cx, cy, 5, cx, cy, R_SIZE / 2);
    beamGrd.addColorStop(0, "rgba(116, 168, 105, 0.45)");
    beamGrd.addColorStop(1, "rgba(116, 168, 105, 0.05)");

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R_SIZE / 2, sweepAngle - 0.45, sweepAngle);
    ctx.closePath();
    ctx.fillStyle = beamGrd;
    ctx.fill();
    ctx.restore();

    const toRadar = (wx, wy) => {
      const dx = wx - player.x;
      const dy = wy - player.y;
      const rDist = (R_SIZE / 2) * (Math.hypot(dx, dy) / radarRange);
      const angle = Math.atan2(dy, dx);
      return {
        x: cx + Math.cos(angle) * rDist,
        y: cy + Math.sin(angle) * rDist,
        dist: Math.hypot(dx, dy),
        angle: angle,
      };
    };

    // Draw Nearby Powerups on Radar
    if (powerups) {
      for (const p of powerups) {
        const rp = toRadar(p.x, p.y);
        if (rp.dist < radarRange) {
          ctx.fillStyle = "#FFD700";
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Nearby Mosquitoes
    for (const e of enemies) {
      if (!e.alive) continue;
      const rp = toRadar(e.x, e.y);

      if (rp.dist < radarRange) {
        const isPrey =
          player.size >= e.size * 1.02 ||
          (player.isDashing && player.size >= e.size * 0.88);
        const isThreat =
          e.size >= player.size * 1.02 ||
          (e.isDashing && e.size >= player.size * 0.88);
        const blipColor = isPrey ? "#00E676" : isThreat ? "#FF1744" : "#FFD600";
        const blipRadius = isPrey
          ? Math.max(2.8, (e.size / 14) * 3.2)
          : Math.max(3.8, (e.size / 25) * 4.5);

        const pulse =
          1 +
          0.3 *
            Math.sin(
              this.globalTime * CONFIG.RADAR.PULSE_FREQUENCY +
                e.id.charCodeAt(0),
            );
        ctx.fillStyle = isPrey
          ? "rgba(0, 230, 118, 0.35)"
          : isThreat
            ? "rgba(255, 23, 68, 0.45)"
            : "rgba(255, 214, 0, 0.35)";
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, blipRadius * 1.6 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = blipColor;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, blipRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (
        CONFIG.RADAR.SHOW_EDGE_WARNINGS &&
        rp.dist < CONFIG.RADAR.EDGE_WARNING_DIST &&
        e.size > player.size * 1.3
      ) {
        const edgeX = cx + Math.cos(rp.angle) * (R_SIZE / 2 - 8);
        const edgeY = cy + Math.sin(rp.angle) * (R_SIZE / 2 - 8);

        ctx.save();
        ctx.translate(edgeX, edgeY);
        ctx.rotate(rp.angle);
        ctx.fillStyle = "#FF1744";
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, -4);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Player Icon at center of radar
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.angle + Math.PI / 2);

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(0, 2, 3.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(0, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, -9);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(-5, -1, 4, 1.8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, -1, 4, 1.8, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore(); // Restore clipping

    ctx.strokeStyle = "rgba(116, 168, 105, 0.85)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R_SIZE / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(46, 56, 45, 0.85)";
    ctx.font = "bold 9px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PROXIMITY RADAR", cx, ry - 5);
  }

  // ── Rank Notification Overlay ─────────────────────────────
  _drawRankNotif(ctx, W, H) {
    const alpha = Math.min(1, this._rankNotifTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = CONFIG.COLORS.RANK_GOLD;
    ctx.font = "900 28px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.strokeText(this._rankNotifText, W / 2, H * 0.22);
    ctx.fillText(this._rankNotifText, W / 2, H * 0.22);
    ctx.restore();
  }
}

export default Renderer;
