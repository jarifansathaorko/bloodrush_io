// ============================================================
// BloodRush.io — Main Menu Base Player Entity Hero Animation
// Displays the actual in-game player character with authentic
// geometry, wing flapping, hovering bob, and play transition.
// ============================================================
import { CONFIG } from "../config.js";
import { SKIN_DRAWERS } from "../systems/skin-drawers.js";

export class MosquitoHero {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [renderer] Optional renderer instance
   * @param {object} [game] Optional game instance for save data
   */
  constructor(canvas, renderer = null, game = null) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext("2d");
    this.renderer = renderer;
    this.game     = game;

    // Animation accumulator (seconds)
    this._t = 0;

    // Mouse tracking for subtle interactive lean
    this._mouseX = null;
    this._mouseY = null;
    this._mouseLeanX = 0;
    this._mouseLeanY = 0;

    // Wing flap angle
    this._wingAngle = 0;

    // Play button fly-away transition
    this._isTransitioning = false;
    this._transitionT     = 0;
    this._transitionDone  = false;
    this._onComplete      = null;

    // Entity size on the hero canvas
    this.baseRadius = 46;
  }

  /**
   * Update cursor position relative to hero canvas
   */
  onMouseMove(canvasX, canvasY) {
    this._mouseX = canvasX;
    this._mouseY = canvasY;
  }

  /**
   * Trigger fly-away surge when PLAY NOW is clicked
   */
  triggerPlayTransition(onComplete) {
    if (this._isTransitioning) return;
    this._isTransitioning = true;
    this._transitionT     = 0;
    this._transitionDone  = false;
    this._onComplete      = onComplete || null;
  }

  /**
   * Main draw call executed every frame
   */
  draw(dt) {
    const canvas = this.canvas;
    const ctx    = this.ctx;
    if (!ctx) return;

    const safeDt = Math.min(dt || 0.016, 0.05);
    this._t += safeDt;
    const t = this._t;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // ── Mouse Proximity / Lean ──────────────────────────────
    let targetLeanX = 0;
    let targetLeanY = 0;
    if (this._mouseX !== null && this._mouseY !== null) {
      const cx = W / 2;
      const cy = H / 2;
      const dx = this._mouseX - cx;
      const dy = this._mouseY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 5) {
        // Subtle tilt towards cursor
        targetLeanX = Math.max(-0.25, Math.min(0.25, (dx / (W / 2)) * 0.22));
        targetLeanY = Math.max(-0.15, Math.min(0.15, (dy / (H / 2)) * 0.12));
      }
    }
    this._mouseLeanX += (targetLeanX - this._mouseLeanX) * safeDt * 6;
    this._mouseLeanY += (targetLeanY - this._mouseLeanY) * safeDt * 6;

    // ── Hover Bobbing & Wing Flap ────────────────────────────
    // Smooth natural floating hover (double sine harmonic)
    const hoverY = Math.sin(t * 2.4) * 6.5 + Math.sin(t * 1.2 + 0.5) * 2.0;
    const hoverTilt = Math.sin(t * 1.6) * 0.04 + this._mouseLeanX;

    // Rapid mosquito wing flapping (buzz frequency)
    const flapFreq = this._isTransitioning ? 65 : 28;
    this._wingAngle += safeDt * flapFreq;

    // ── Play Transition Dynamics ────────────────────────────
    let transitionY = 0;
    let transitionAlpha = 1.0;
    let scaleBoost = 1.0;

    if (this._isTransitioning) {
      this._transitionT += safeDt;
      const tT = this._transitionT;

      if (tT < 0.15) {
        // Slight recoil backwards/anticipation
        const p = tT / 0.15;
        transitionY = Math.sin(p * Math.PI) * 12;
        scaleBoost  = 1.0 - p * 0.08;
      } else {
        // Accelerate forward/upward into the arena!
        const flyT = (tT - 0.15) / 0.35; // 0 -> 1
        const ease = flyT * flyT;        // quadratic acceleration
        transitionY = -ease * (H * 1.15);
        scaleBoost  = 1.0 + ease * 0.4;
        transitionAlpha = Math.max(0, 1.0 - flyT * 1.3);
      }

      if (!this._transitionDone && tT >= 0.5) {
        this._transitionDone = true;
        if (this._onComplete) {
          this._onComplete();
        }
      }
    }

    const posX = W / 2;
    const posY = H / 2 + 10 + hoverY + transitionY;

    // ── Draw Ground Shadow ──────────────────────────────────
    if (transitionAlpha > 0.1) {
      ctx.save();
      const shadowH = Math.max(0.2, 1 - (hoverY + 10) / 40);
      const sAlpha = 0.32 * shadowH * transitionAlpha;
      ctx.translate(posX, H / 2 + 82);
      ctx.scale(1, 0.28);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 48 * shadowH);
      grad.addColorStop(0, `rgba(232, 69, 10, ${sAlpha})`);
      grad.addColorStop(0.5, `rgba(180, 20, 10, ${sAlpha * 0.5})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 48 * shadowH, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Draw Player Entity ──────────────────────────────────
    ctx.save();
    ctx.globalAlpha = transitionAlpha;
    ctx.translate(posX, posY);
    ctx.rotate(hoverTilt);
    ctx.scale(scaleBoost, scaleBoost);

    // Check if player has an equipped skin
    const skinId = (this.game && this.game.save && this.game.save.data && this.game.save.data.equippedSkin)
      ? this.game.save.data.equippedSkin
      : "cyber_drone";

    if (this.renderer) {
      const skinDef = CONFIG.SKINS.find((s) => s.id === skinId) || CONFIG.SKINS[0];
      this.renderer._drawEntity(
        ctx,
        0,
        0,
        this.baseRadius,
        -Math.PI / 2,
        skinDef.color || CONFIG.COLORS.PLAYER,
        skinDef.glowColor || CONFIG.COLORS.PLAYER_GLOW,
        this._wingAngle,
        {
          skinId: skinId,
          isDashing: this._isTransitioning,
          boostBurstTimer: this._isTransitioning ? 0.3 : 0,
          squashStretch: this._isTransitioning ? 1.3 : 1.0,
          growFlash: 0,
          name: "",
          isPlayer: false,
        }
      );
    } else {
      const bespokeDrawer = (skinId !== "default") ? SKIN_DRAWERS[skinId] : null;
      if (bespokeDrawer) {
        // Use equipped skin drawer with -Math.PI / 2 heading (facing upward)
        bespokeDrawer(
          ctx,
          0,
          0,
          this.baseRadius,
          -Math.PI / 2,
          this._wingAngle,
          t,
          {
            skinId: skinId,
            isDashing: this._isTransitioning,
            squashStretch: this._isTransitioning ? 1.3 : 1.0,
            growFlash: 0,
          }
        );
      } else {
        // Draw standard base player entity
        this._drawBasePlayerMosquito(ctx, 0, 0, this.baseRadius, this._wingAngle, t);
      }
    }

    ctx.restore();
  }

  /**
   * Draws the authentic base player mosquito entity (identical to in-game vector model)
   */
  _drawBasePlayerMosquito(ctx, x, y, r, wingAngle, t) {
    ctx.save();
    ctx.translate(x, y);

    // In-game orientation: -Math.PI / 2 facing upward, vector model adds Math.PI / 2
    // Net rotation = 0 (pointing straight up)
    const isDashing = this._isTransitioning;
    const sq = isDashing ? 1.25 : 1.0;
    ctx.scale(1 / Math.sqrt(sq), sq);

    // ── 1. Articulated Legs (6 sleek cyber-legs) ─────────────
    ctx.strokeStyle = "rgba(18, 24, 38, 0.95)";
    ctx.lineWidth = Math.max(2.2, r * 0.08);
    ctx.lineCap = "round";
    ctx.lineJoin = "miter";

    const legs = [
      // Front legs
      { sx: -r * 0.3,  sy: -r * 0.2, jx: -r * 1.1, jy: -r * 0.6, tx: -r * 1.4, ty: -r * 1.1 },
      { sx:  r * 0.3,  sy: -r * 0.2, jx:  r * 1.1, jy: -r * 0.6, tx:  r * 1.4, ty: -r * 1.1 },
      // Mid legs
      { sx: -r * 0.35, sy:  r * 0.2, jx: -r * 1.3, jy:  r * 0.1, tx: -r * 1.7, ty:  r * 0.4 },
      { sx:  r * 0.35, sy:  r * 0.2, jx:  r * 1.3, jy:  r * 0.1, tx:  r * 1.7, ty:  r * 0.4 },
      // Back legs
      { sx: -r * 0.25, sy:  r * 0.6, jx: -r * 1.0, jy:  r * 1.0, tx: -r * 1.3, ty:  r * 1.6 },
      { sx:  r * 0.25, sy:  r * 0.6, jx:  r * 1.0, jy:  r * 1.0, tx:  r * 1.3, ty:  r * 1.6 },
    ];

    for (const leg of legs) {
      ctx.beginPath();
      ctx.moveTo(leg.sx, leg.sy);
      ctx.lineTo(leg.jx, leg.jy);
      ctx.lineTo(leg.tx, leg.ty);
      ctx.stroke();
    }

    // ── 2. Abdomen (Futuristic Kite-shaped with Blood Reservoir) ──
    // Outer ambient crimson glow
    ctx.strokeStyle = "rgba(255, 23, 68, 0.35)";
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, r * 0.3);
    ctx.lineTo(r * 0.62, r * 0.85);
    ctx.lineTo(0, r * 1.85);
    ctx.lineTo(-r * 0.62, r * 0.85);
    ctx.closePath();
    ctx.stroke();

    // Abdomen body fill
    const abGrad = ctx.createLinearGradient(0, r * 0.3, 0, r * 1.85);
    abGrad.addColorStop(0, "#FF3D00");
    abGrad.addColorStop(0.5, "#D50000");
    abGrad.addColorStop(1, "#8A0000");

    ctx.fillStyle = abGrad;
    ctx.strokeStyle = "#161B26";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.3);
    ctx.lineTo(r * 0.62, r * 0.85);
    ctx.lineTo(0, r * 1.85);
    ctx.lineTo(-r * 0.62, r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner blood pulse highlight
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.5);
    ctx.fillStyle = `rgba(255, 138, 101, ${0.4 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.95, r * 0.22, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── 3. Thorax (Hexagonal Dark Exoskeleton) ───────────────
    const thGrad = ctx.createLinearGradient(-r * 0.5, 0, r * 0.5, 0);
    thGrad.addColorStop(0, "#1E2530");
    thGrad.addColorStop(0.5, "#2C3545");
    thGrad.addColorStop(1, "#1E2530");

    ctx.fillStyle = thGrad;
    ctx.strokeStyle = "#0E121A";
    ctx.lineWidth = 2;
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

    // ── 4. Geometric Wings (Cyan Translucent with Veins) ──────
    const flap = Math.sin(wingAngle) * (isDashing ? 0.65 : 0.32);

    for (const side of [-1, 1]) {
      ctx.save();
      // Attach at upper thorax
      ctx.translate(side * r * 0.4, 0);
      ctx.rotate(side * (0.85 + flap));

      // Translucent cyan wing body
      ctx.fillStyle = "rgba(0, 229, 255, 0.22)";
      ctx.strokeStyle = "rgba(0, 229, 255, 0.85)";
      ctx.lineWidth = 1.6;

      // Sharp wing polygon
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * r * 1.6, -r * 1.25);
      ctx.lineTo(side * r * 0.42, -r * 2.3);
      ctx.lineTo(-side * r * 0.22, -r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing veins (inner geometric grid)
      ctx.strokeStyle = "rgba(0, 229, 255, 0.55)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(side * r * 0.42, -r * 2.05);
      ctx.moveTo(side * r * 0.2, -r * 1.0);
      ctx.lineTo(side * r * 1.25, -r * 1.15);
      ctx.stroke();

      ctx.restore();
    }

    // ── 5. Angular Head & White Neon Eyes ────────────────────
    ctx.fillStyle = "#11151C";
    ctx.strokeStyle = "#0E121A";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.lineTo(r * 0.42, -r * 0.4);
    ctx.lineTo(-r * 0.42, -r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Neon Eyes (sharp triangular predator glow)
    ctx.fillStyle = "#FFFFFF";
    for (const side of [-1, 1]) {
      // Soft eye glow
      ctx.fillStyle = "rgba(0, 229, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(side * r * 0.25, -r * 0.6, r * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Core eye triangle
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(side * r * 0.14, -r * 0.52);
      ctx.lineTo(side * r * 0.36, -r * 0.76);
      ctx.lineTo(side * r * 0.36, -r * 0.46);
      ctx.closePath();
      ctx.fill();
    }

    // ── 6. Glowing Proboscis (Laser Needle) ───────────────────
    const probLength = r * (isDashing ? 2.2 : 1.45);

    // Outer proboscis laser glow
    ctx.strokeStyle = "rgba(0, 229, 255, 0.45)";
    ctx.lineWidth = Math.max(3.0, r * 0.1) + 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.lineTo(0, -r * 0.95 - probLength);
    ctx.stroke();

    // Crisp inner white beam
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = Math.max(2.0, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.lineTo(0, -r * 0.95 - probLength);
    ctx.stroke();

    // Laser tip flare
    ctx.fillStyle = "#00E5FF";
    ctx.beginPath();
    ctx.arc(0, -r * 0.95 - probLength, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export default MosquitoHero;
