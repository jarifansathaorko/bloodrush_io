// ============================================================
// BloodRush.io — Bespoke Skin Drawers
// Each function is a fully-animated canvas vector drawing
// that replaces the image-based fallback for premium skins.
// All functions share the same signature as _drawVectorMosquito.
// ============================================================

/**
 * Shared helper: draw a glowing line stroke.
 * Simulates canvas shadow blur without using ctx.shadow (perf).
 */
function glowStroke(ctx, color, width, alpha = 0.4) {
  ctx.strokeStyle = color.replace(')', `, ${alpha})`).replace('rgb(', 'rgba(').replace('#', 'rgba(') + (color.startsWith('#') ? ','+alpha+')' : '');
  ctx.lineWidth = width * 3;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// Helper for hex color → rgba  
function hexRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Shared base geometry helpers ─────────────────────────────
function drawAngularLegs(ctx, r, legColor) {
  ctx.strokeStyle = legColor || 'rgba(20,25,35,0.9)';
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.lineCap = 'square';
  const legs = [
    { sx:-r*.3, sy:-r*.2, jx:-r*1.1, jy:-r*.6, tx:-r*1.4, ty:-r*1.1 },
    { sx: r*.3, sy:-r*.2, jx: r*1.1, jy:-r*.6, tx: r*1.4, ty:-r*1.1 },
    { sx:-r*.35,sy: r*.2, jx:-r*1.3, jy: r*.1,  tx:-r*1.8, ty: r*.4  },
    { sx: r*.35,sy: r*.2, jx: r*1.3, jy: r*.1,  tx: r*1.8, ty: r*.4  },
    { sx:-r*.25,sy: r*.6, jx:-r*1.0, jy: r*1.0, tx:-r*1.3, ty: r*1.6 },
    { sx: r*.25,sy: r*.6, jx: r*1.0, jy: r*1.0, tx: r*1.3, ty: r*1.6 },
  ];
  for (const l of legs) {
    ctx.beginPath();
    ctx.moveTo(l.sx,l.sy); ctx.lineTo(l.jx,l.jy); ctx.lineTo(l.tx,l.ty);
    ctx.stroke();
  }
}

function drawProboscis(ctx, r, isDashing, pierceExtend, color) {
  const probLength = r * (isDashing ? (pierceExtend || 2.2) : 1.4);
  // Glow
  ctx.strokeStyle = hexRgba(color, 0.3);
  ctx.lineWidth = Math.max(2, r*0.12) + 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0,-r*.9); ctx.lineTo(0,-r*.9-probLength); ctx.stroke();
  // Core
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, r*0.1);
  ctx.beginPath(); ctx.moveTo(0,-r*.9); ctx.lineTo(0,-r*.9-probLength); ctx.stroke();
}

// ─────────────────────────────────────────────────────────────
// 1. NEON DRIFTER — Cyan speed demon.
//    Sleek swept-back wings, racing stripes, cyan jet afterburner.
// ─────────────────────────────────────────────────────────────
export function drawNeonDrifter(ctx, x, y, size, angle, wingAngle, globalTime, opts) {
  ctx.save();
  ctx.translate(x, y);
  const r = size;

  if (opts.shield) { ctx.strokeStyle='#4FC3F7'; ctx.lineWidth=3.5; ctx.globalAlpha=0.8+0.2*Math.sin(globalTime*6); ctx.beginPath(); ctx.arc(0,0,r*1.55,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }
  if (opts.frenzy) { ctx.strokeStyle='#FF5722'; ctx.lineWidth=3; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.arc(0,0,r*1.7,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }

  ctx.rotate(angle + Math.PI / 2);
  const sq = opts.squashStretch || 1.0;
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Speed aura ring
  ctx.strokeStyle = 'rgba(0,229,255,0.15)';
  ctx.lineWidth = r * 0.8;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, Math.PI*2); ctx.stroke();

  // Legs — thin cyan metallic
  drawAngularLegs(ctx, r, 'rgba(0,200,255,0.6)');

  // Abdomen — flat aerodynamic teardrop
  ctx.fillStyle = '#002633';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, r*0.3);
  ctx.bezierCurveTo(r*0.5, r*0.5, r*0.4, r*1.6, 0, r*1.9);
  ctx.bezierCurveTo(-r*0.4, r*1.6, -r*0.5, r*0.5, 0, r*0.3);
  ctx.fill(); ctx.stroke();

  // Racing stripes on abdomen
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(0,229,255,${0.5 - i*0.15})`;
    ctx.lineWidth = Math.max(1, r*0.06);
    ctx.beginPath();
    ctx.moveTo(-r*0.3+i*r*0.3, r*0.6+i*r*0.2);
    ctx.lineTo(-r*0.3+i*r*0.3, r*1.2+i*r*0.2);
    ctx.stroke();
  }

  // Thorax — sleek hexagon
  ctx.fillStyle = '#001A26';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0,-r*.5); ctx.lineTo(r*.55,-r*.15); ctx.lineTo(r*.55,r*.4);
  ctx.lineTo(0,r*.6); ctx.lineTo(-r*.55,r*.4); ctx.lineTo(-r*.55,-r*.15); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Wings — swept-back scimitar shape
  const flapAngle = Math.sin(wingAngle) * (opts.isDashing ? 0.5 : 0.2);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side*r*0.45, -r*0.1);
    ctx.rotate(side * (0.5 + flapAngle));
    // Main wing
    ctx.fillStyle = 'rgba(0,229,255,0.12)';
    ctx.strokeStyle = 'rgba(0,229,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(side*r*2.2, -r*0.4);
    ctx.lineTo(side*r*1.8, -r*2.0);
    ctx.lineTo(side*r*0.3, -r*1.0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Secondary blade wing
    ctx.fillStyle = 'rgba(0,229,255,0.07)';
    ctx.strokeStyle = 'rgba(0,180,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(side*r*1.5, r*0.3);
    ctx.lineTo(side*r*2.0, -r*0.3);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // Head
  ctx.fillStyle = '#001A26';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0,-r*1.0); ctx.lineTo(r*0.45,-r*0.5); ctx.lineTo(-r*0.45,-r*0.5); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Eyes — two cyan slits
  ctx.fillStyle = '#00E5FF';
  for (const side of [-1,1]) {
    ctx.save();
    ctx.translate(side*r*0.22, -r*0.65);
    ctx.scale(1, 2);
    ctx.beginPath(); ctx.arc(0,0,r*0.1,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Afterburner glow at the tail
  const pulse = 0.8 + 0.2*Math.sin(globalTime * 18);
  ctx.fillStyle = `rgba(0,229,255,${pulse * 0.7})`;
  ctx.beginPath(); ctx.arc(0, r*1.95, r*0.18, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${pulse * 0.5})`;
  ctx.beginPath(); ctx.arc(0, r*1.95, r*0.08, 0, Math.PI*2); ctx.fill();

  drawProboscis(ctx, r, opts.isDashing, 2.2, '#00E5FF');
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 2. BLOODBYTE — Red digital hacker.
//    Pixelated body segments, binary glyph eyes, data-stream wings.
// ─────────────────────────────────────────────────────────────
export function drawBloodbyte(ctx, x, y, size, angle, wingAngle, globalTime, opts) {
  ctx.save();
  ctx.translate(x, y);
  const r = size;

  if (opts.shield) { ctx.strokeStyle='#4FC3F7'; ctx.lineWidth=3.5; ctx.globalAlpha=0.8+0.2*Math.sin(globalTime*6); ctx.beginPath(); ctx.arc(0,0,r*1.55,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1; }

  ctx.rotate(angle + Math.PI / 2);
  const sq = opts.squashStretch || 1.0;
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Legs — dark red
  drawAngularLegs(ctx, r, 'rgba(200,0,30,0.7)');

  // Abdomen — segmented blocks (pixelated)
  const segments = [
    { y0: r*0.3, y1: r*0.7,  w: r*0.5 },
    { y0: r*0.7, y1: r*1.05, w: r*0.42 },
    { y0: r*1.05,y1: r*1.35, w: r*0.32 },
    { y0: r*1.35,y1: r*1.65, w: r*0.2 },
    { y0: r*1.65,y1: r*1.85, w: r*0.1 },
  ];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const shade = i % 2 === 0 ? '#2A0000' : '#1A0000';
    ctx.fillStyle = shade;
    ctx.strokeStyle = '#FF1744';
    ctx.lineWidth = 1;
    ctx.fillRect(-s.w, s.y0, s.w*2, s.y1-s.y0);
    ctx.strokeRect(-s.w, s.y0, s.w*2, s.y1-s.y0);
  }

  // Scan-line effect on abdomen
  const scanOffset = (globalTime * 60) % (r * 1.5);
  ctx.strokeStyle = 'rgba(255,23,68,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r*0.5, r*0.3+scanOffset);
  ctx.lineTo( r*0.5, r*0.3+scanOffset);
  ctx.stroke();

  // Thorax — chunky rect
  ctx.fillStyle = '#1A0000';
  ctx.strokeStyle = '#FF1744';
  ctx.lineWidth = 2;
  ctx.fillRect(-r*0.5, -r*0.5, r, r);
  ctx.strokeRect(-r*0.5, -r*0.5, r, r);
  // Cross-hatch
  ctx.strokeStyle = 'rgba(255,23,68,0.3)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-r*0.5,-r*0.5); ctx.lineTo(r*0.5,r*0.5);
  ctx.moveTo(r*0.5,-r*0.5);  ctx.lineTo(-r*0.5,r*0.5);
  ctx.stroke();

  // Wings — data-stream: thin jagged lines
  const flapAngle = Math.sin(wingAngle) * (opts.isDashing ? 0.6 : 0.28);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side*r*0.45, 0);
    ctx.rotate(side*(0.8 + flapAngle));
    // Wing body
    ctx.fillStyle = 'rgba(255,23,68,0.08)';
    ctx.strokeStyle = 'rgba(255,23,68,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(side*r*1.6, -r*0.5);
    ctx.lineTo(side*r*1.2, -r*2.0);
    ctx.lineTo(side*r*0.1, -r*1.0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Binary bits scattered on wing
    ctx.fillStyle = `rgba(255,23,68,${0.6+0.4*Math.sin(globalTime*10+side*3)})`;
    ctx.font = `${r*0.2}px monospace`;
    ctx.fillText(Math.sin(globalTime*7+side)>0?'1':'0', side*r*0.8, -r*0.8);
    ctx.fillText(Math.sin(globalTime*5+side*2)>0?'0':'1', side*r*0.5, -r*1.4);
    ctx.restore();
  }

  // Head — square
  ctx.fillStyle = '#2A0000';
  ctx.strokeStyle = '#FF1744';
  ctx.lineWidth = 2;
  ctx.fillRect(-r*0.45, -r*1.05, r*0.9, r*0.55);
  ctx.strokeRect(-r*0.45, -r*1.05, r*0.9, r*0.55);

  // Eyes — blinking red squares
  const blink = Math.sin(globalTime * 4);
  const eyeH = blink > 0.92 ? r*0.03 : r*0.15;
  ctx.fillStyle = '#FF1744';
  for (const side of [-1,1]) {
    ctx.fillRect(side*r*0.1, -r*0.88, r*0.15, eyeH);
  }

  drawProboscis(ctx, r, opts.isDashing, 2.2, '#FF1744');
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 3. PHANTOM VECTOR — Deep blue ghost.
//    Semi-transparent, multiple overlapping translucent layers,
//    ghostly trailing wings.
// ─────────────────────────────────────────────────────────────
export function drawPhantomVector(ctx, x, y, size, angle, wingAngle, globalTime, opts) {
  ctx.save();
  ctx.translate(x, y);
  const r = size;

  ctx.rotate(angle + Math.PI / 2);
  const sq = opts.squashStretch || 1.0;
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Ghost pulse aura
  const pulse = 0.5 + 0.5 * Math.sin(globalTime * 3);
  ctx.strokeStyle = `rgba(48,79,254,${pulse * 0.4})`;
  ctx.lineWidth = r * 0.6;
  ctx.beginPath(); ctx.arc(0, r*0.6, r*1.2, 0, Math.PI*2); ctx.stroke();

  // Legs — ghostly blue
  drawAngularLegs(ctx, r, 'rgba(83,109,254,0.5)');

  // Abdomen — semi-transparent layered diamond
  for (let i = 2; i >= 0; i--) {
    ctx.globalAlpha = 0.3 - i * 0.08;
    ctx.fillStyle = '#304FFE';
    ctx.beginPath();
    ctx.moveTo(0, r*(0.3 - i*0.05));
    ctx.lineTo(r*(0.55 + i*0.05), r*0.85);
    ctx.lineTo(0, r*(1.9 + i*0.1));
    ctx.lineTo(-r*(0.55 + i*0.05), r*0.85);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#536DFE';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0,r*.3); ctx.lineTo(r*.55,r*.85); ctx.lineTo(0,r*1.9); ctx.lineTo(-r*.55,r*.85); ctx.closePath();
  ctx.stroke();

  // Thorax
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#1A237E';
  ctx.strokeStyle = '#536DFE';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0,-r*.4); ctx.lineTo(r*.5,-r*.1); ctx.lineTo(r*.5,r*.4);
  ctx.lineTo(0,r*.6); ctx.lineTo(-r*.5,r*.4); ctx.lineTo(-r*.5,-r*.1); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 1;

  // Wings — multiple ghost layers
  const flapAngle = Math.sin(wingAngle) * 0.3;
  for (const side of [-1, 1]) {
    for (let ghost = 2; ghost >= 0; ghost--) {
      const ghostFlapDelay = ghost * 0.4;
      const ghostFlap = Math.sin(wingAngle - ghostFlapDelay) * 0.3;
      ctx.save();
      ctx.translate(side*r*0.4, 0);
      ctx.rotate(side*(0.7 + ghostFlap));
      ctx.globalAlpha = 0.25 - ghost * 0.07;
      ctx.fillStyle = '#304FFE';
      ctx.strokeStyle = '#536DFE';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(side*r*1.6, -r*1.1);
      ctx.lineTo(side*r*0.5, -r*2.4);
      ctx.lineTo(-side*r*0.1, -r*0.8);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(side*r*0.4, 0);
    ctx.rotate(side*(0.7 + flapAngle));
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(48,79,254,0.15)';
    ctx.strokeStyle = 'rgba(83,109,254,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(side*r*1.6, -r*1.1);
    ctx.lineTo(side*r*0.5, -r*2.4);
    ctx.lineTo(-side*r*0.1, -r*0.8);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // Head
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#1A237E';
  ctx.strokeStyle = '#536DFE';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0,-r*.95); ctx.lineTo(r*.45,-r*.45); ctx.lineTo(-r*.45,-r*.45); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Eyes — purple glow dots
  ctx.fillStyle = '#7986CB';
  ctx.globalAlpha = 0.8 + 0.2*Math.sin(globalTime*5);
  for (const side of [-1,1]) {
    ctx.beginPath(); ctx.arc(side*r*0.22, -r*0.62, r*0.12, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawProboscis(ctx, r, opts.isDashing, 2.2, '#536DFE');
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 4. OVERCLOCK — Electric white/cyan speed beast.
//    Crackling lightning across the body, jagged shard wings,
//    electric arc proboscis.
// ─────────────────────────────────────────────────────────────
export function drawOverclock(ctx, x, y, size, angle, wingAngle, globalTime, opts) {
  ctx.save();
  ctx.translate(x, y);
  const r = size;

  ctx.rotate(angle + Math.PI / 2);
  const sq = opts.squashStretch || 1.0;
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Electric field
  const arcT = globalTime * 20;
  ctx.strokeStyle = 'rgba(0,229,255,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const a = (arcT + i * Math.PI/2) % (Math.PI*2);
    ctx.beginPath();
    ctx.arc(0, r*0.6, r*1.4, a, a + 0.6);
    ctx.stroke();
  }

  drawAngularLegs(ctx, r, 'rgba(200,240,255,0.7)');

  // Abdomen — cracked/shattered look
  ctx.fillStyle = '#0D1B2A';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, r*0.3);
  ctx.lineTo(r*0.5, r*0.6);
  ctx.lineTo(r*0.6, r*1.1);
  ctx.lineTo(r*0.3, r*1.5);
  ctx.lineTo(0, r*1.85);
  ctx.lineTo(-r*0.3, r*1.5);
  ctx.lineTo(-r*0.6, r*1.1);
  ctx.lineTo(-r*0.5, r*0.6);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Lightning bolt on abdomen
  const lBolt = Math.sin(globalTime * 25) > 0.3;
  if (lBolt) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1, r*0.07);
    ctx.beginPath();
    ctx.moveTo(r*0.1, r*0.5);
    ctx.lineTo(-r*0.15, r*0.85);
    ctx.lineTo(r*0.1, r*0.9);
    ctx.lineTo(-r*0.1, r*1.3);
    ctx.stroke();
  }

  // Thorax
  ctx.fillStyle = '#081420';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0,-r*.4); ctx.lineTo(r*.6,-r*.1); ctx.lineTo(r*.5,r*.4);
  ctx.lineTo(0,r*.6); ctx.lineTo(-r*.5,r*.4); ctx.lineTo(-r*.6,-r*.1); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Wings — shard/crystal shapes
  const flapAngle = Math.sin(wingAngle) * (opts.isDashing ? 0.7 : 0.3);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side*r*0.5, -r*0.1);
    ctx.rotate(side*(0.6 + flapAngle));
    // Primary shard
    ctx.fillStyle = 'rgba(0,229,255,0.1)';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(side*r*1.8, -r*0.2);
    ctx.lineTo(side*r*2.0, -r*1.5);
    ctx.lineTo(side*r*0.8, -r*2.2);
    ctx.lineTo(0, -r*0.6);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Mini shard
    ctx.fillStyle = 'rgba(0,229,255,0.15)';
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(side*r*0.5, -r*0.3);
    ctx.lineTo(side*r*1.2, -r*0.5);
    ctx.lineTo(side*r*0.8, -r*1.2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Electric sparks on wing tips
    if (Math.sin(globalTime*30 + side*4) > 0.6) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(side*r*1.8, -r*1.4, r*0.08, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // Head
  ctx.fillStyle = '#0D1B2A';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0,-r*.95); ctx.lineTo(r*.45,-r*.5); ctx.lineTo(r*.2,-r*.4);
  ctx.lineTo(-r*.2,-r*.4); ctx.lineTo(-r*.45,-r*.5); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Eyes — electric white
  const eyePulse = 0.7 + 0.3*Math.sin(globalTime*20);
  ctx.fillStyle = `rgba(255,255,255,${eyePulse})`;
  for (const side of [-1,1]) {
    ctx.beginPath(); ctx.arc(side*r*0.22, -r*0.65, r*0.13, 0, Math.PI*2); ctx.fill();
  }

  // Electric proboscis
  const ePulse = Math.sin(globalTime*15);
  const probColor = ePulse > 0 ? '#FFFFFF' : '#00E5FF';
  drawProboscis(ctx, r, opts.isDashing, 2.2, probColor);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 5. BLOOD REACTOR — Nuclear orange/gold.
//    Radioactive segmented body, rotating energy core,
//    4 heavy mechanical wings.
// ─────────────────────────────────────────────────────────────
export function drawBloodReactor(ctx, x, y, size, angle, wingAngle, globalTime, opts) {
  ctx.save();
  ctx.translate(x, y);
  const r = size;

  ctx.rotate(angle + Math.PI / 2);
  const sq = opts.squashStretch || 1.0;
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Radiation glow
  const radPulse = 0.3 + 0.2*Math.sin(globalTime*4);
  ctx.fillStyle = `rgba(255,145,0,${radPulse})`;
  ctx.beginPath(); ctx.arc(0, r*0.8, r*1.5, 0, Math.PI*2); ctx.fill();

  drawAngularLegs(ctx, r, 'rgba(180,100,0,0.8)');

  // Abdomen — segmented with glowing joints
  const segs = [
    [r*0.5, r*0.3, r*0.7],[r*0.42, r*0.7, r*1.05],[r*0.33, r*1.05, r*1.35],[r*0.22, r*1.35, r*1.65],[r*0.12, r*1.65, r*1.85]
  ];
  for (let i = 0; i < segs.length; i++) {
    const [w, y0, y1] = segs[i];
    ctx.fillStyle = i%2===0 ? '#1A0A00' : '#2A1000';
    ctx.strokeStyle = '#FF9100';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,y0); ctx.lineTo(w,y0+(y1-y0)*0.5); ctx.lineTo(0,y1); ctx.lineTo(-w,y0+(y1-y0)*0.5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Glow at joints
    ctx.fillStyle = `rgba(255,200,0,${0.4+0.3*Math.sin(globalTime*6+i)})`;
    ctx.beginPath(); ctx.arc(0, y0, r*0.1, 0, Math.PI*2); ctx.fill();
  }

  // Thorax — reactor core housing
  ctx.fillStyle = '#1A0A00';
  ctx.strokeStyle = '#FF9100';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r*0.55, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Rotating inner core
  ctx.save();
  ctx.rotate(globalTime * 3);
  ctx.strokeStyle = '#FFD740';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*r*0.2, Math.sin(a)*r*0.2);
    ctx.lineTo(Math.cos(a)*r*0.5, Math.sin(a)*r*0.5);
    ctx.stroke();
  }
  ctx.fillStyle = '#FF9100';
  ctx.beginPath(); ctx.arc(0,0,r*0.2,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Wings — 4 heavy mechanical wings
  const flapAngle = Math.sin(wingAngle) * (opts.isDashing ? 0.5 : 0.18);
  const wingPairs = [[-r*0.1, 0.5], [r*0.3, 0.8]];
  for (const side of [-1, 1]) {
    for (let wi = 0; wi < 2; wi++) {
      const [yOffset, rotBase] = wingPairs[wi];
      ctx.save();
      ctx.translate(side*r*0.45, yOffset);
      ctx.rotate(side*(rotBase + flapAngle*(wi===0?1:-0.5)));
      ctx.fillStyle = 'rgba(255,145,0,0.12)';
      ctx.strokeStyle = `rgba(255,145,0,${0.7+wi*0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(side*r*1.4, -r*(0.5+wi*0.3));
      ctx.lineTo(side*r*1.2, -r*(1.5+wi*0.4));
      ctx.lineTo(side*r*0.3, -r*(0.8+wi*0.2));
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Reactor vein
      ctx.strokeStyle = '#FFD740';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0,0); ctx.lineTo(side*r*1.0, -r*(1.0+wi*0.3)); ctx.stroke();
      ctx.restore();
    }
  }

  // Head
  ctx.fillStyle = '#1A0A00';
  ctx.strokeStyle = '#FF9100';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0,-r*.9); ctx.lineTo(r*.5,-r*.4); ctx.lineTo(r*.2,-r*.1);
  ctx.lineTo(-r*.2,-r*.1); ctx.lineTo(-r*.5,-r*.4); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Eyes — orange reactor glow
  ctx.fillStyle = '#FFD740';
  ctx.globalAlpha = 0.7 + 0.3*Math.sin(globalTime*8);
  for (const side of [-1,1]) {
    ctx.beginPath(); ctx.arc(side*r*0.23, -r*0.58, r*0.14, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawProboscis(ctx, r, opts.isDashing, 2.2, '#FFD740');
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 6. VOID MOSQUITO — Purple/dark void entity.
//    Dark angular body, void-tentacle wings that writhe,
//    pulsing void aura, all-consuming darkness.
// ─────────────────────────────────────────────────────────────
export function drawVoidMosquito(ctx, x, y, size, angle, wingAngle, globalTime, opts) {
  ctx.save();
  ctx.translate(x, y);
  const r = size;

  ctx.rotate(angle + Math.PI / 2);
  const sq = opts.squashStretch || 1.0;
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Void vortex aura
  for (let i = 3; i >= 0; i--) {
    const voidPulse = 0.15 + 0.1 * Math.sin(globalTime * 2 + i);
    ctx.fillStyle = `rgba(100,0,200,${voidPulse - i*0.03})`;
    ctx.beginPath(); ctx.arc(0, r*0.7, r*(1.0+i*0.25), 0, Math.PI*2); ctx.fill();
  }

  drawAngularLegs(ctx, r, 'rgba(150,0,255,0.5)');

  // Abdomen — void crystal
  ctx.fillStyle = '#0D0010';
  ctx.strokeStyle = '#AA00FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, r*0.3);
  ctx.lineTo(r*0.4, r*0.5);
  ctx.lineTo(r*0.6, r*1.0);
  ctx.lineTo(r*0.3, r*1.4);
  ctx.lineTo(0, r*1.9);
  ctx.lineTo(-r*0.3, r*1.4);
  ctx.lineTo(-r*0.6, r*1.0);
  ctx.lineTo(-r*0.4, r*0.5);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Void cracks
  ctx.strokeStyle = 'rgba(224,64,251,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, r*0.5); ctx.lineTo(r*0.2, r*0.9); ctx.lineTo(-r*0.1, r*1.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, r*0.7); ctx.lineTo(-r*0.3, r*1.0); ctx.lineTo(r*0.1, r*1.5);
  ctx.stroke();

  // Thorax
  ctx.fillStyle = '#0D0010';
  ctx.strokeStyle = '#AA00FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0,-r*.4); ctx.lineTo(r*.5,-r*.15); ctx.lineTo(r*.45,r*.4);
  ctx.lineTo(0,r*.65); ctx.lineTo(-r*.45,r*.4); ctx.lineTo(-r*.5,-r*.15); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Wings — writhing void tendrils
  const flapAngle = Math.sin(wingAngle) * 0.35;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side*r*0.4, 0);
    ctx.rotate(side*(0.75 + flapAngle));
    // Base wing
    ctx.fillStyle = 'rgba(100,0,200,0.1)';
    ctx.strokeStyle = 'rgba(170,0,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,0);
    const wc = globalTime * 8;
    // Writhing bezier wing
    ctx.bezierCurveTo(
      side*r*(1.2 + 0.2*Math.sin(wc)), -r*(0.5+0.1*Math.cos(wc)),
      side*r*(1.8 + 0.15*Math.cos(wc+1)), -r*(1.5+0.1*Math.sin(wc+1)),
      side*r*0.4, -r*2.1
    );
    ctx.bezierCurveTo(
      -side*r*0.3, -r*1.2,
      -side*r*0.1, -r*0.5,
      0, 0
    );
    ctx.fill(); ctx.stroke();
    // Tendril tip glow
    ctx.fillStyle = `rgba(224,64,251,${0.5+0.5*Math.sin(globalTime*6+side*2)})`;
    ctx.beginPath(); ctx.arc(side*r*0.4, -r*2.1, r*0.1, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Head
  ctx.fillStyle = '#0D0010';
  ctx.strokeStyle = '#AA00FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0,-r*1.0); ctx.lineTo(r*.5,-r*.45); ctx.lineTo(r*.15,-r*.35);
  ctx.lineTo(-r*.15,-r*.35); ctx.lineTo(-r*.5,-r*.45); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Eyes — void purple
  ctx.fillStyle = '#E040FB';
  ctx.globalAlpha = 0.6 + 0.4*Math.sin(globalTime*7);
  for (const side of [-1,1]) {
    ctx.beginPath(); ctx.arc(side*r*0.23, -r*0.6, r*0.13, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawProboscis(ctx, r, opts.isDashing, 2.2, '#E040FB');
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 7. CYBER HORNET — Gold/black armored beast.
//    Heavy armored plating, mechanical mandibles,
//    thick stinger, 4 buzzing wings.
// ─────────────────────────────────────────────────────────────
export function drawCyberHornet(ctx, x, y, size, angle, wingAngle, globalTime, opts) {
  ctx.save();
  ctx.translate(x, y);
  const r = size;

  ctx.rotate(angle + Math.PI / 2);
  const sq = opts.squashStretch || 1.0;
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Threat aura — gold
  ctx.strokeStyle = 'rgba(255,215,0,0.2)';
  ctx.lineWidth = r * 0.5;
  ctx.beginPath(); ctx.arc(0, r*0.5, r*1.2, 0, Math.PI*2); ctx.stroke();

  // Heavy mechanical legs
  ctx.strokeStyle = '#4A3800';
  ctx.lineWidth = Math.max(2.5, r*0.12);
  ctx.lineCap = 'square';
  const hLegs = [
    { sx:-r*.4, sy:-r*.3, jx:-r*1.2, jy:-r*.7, tx:-r*1.5, ty:-r*1.2 },
    { sx: r*.4, sy:-r*.3, jx: r*1.2, jy:-r*.7, tx: r*1.5, ty:-r*1.2 },
    { sx:-r*.45,sy: r*.2, jx:-r*1.4, jy: r*.1,  tx:-r*1.9, ty: r*.5  },
    { sx: r*.45,sy: r*.2, jx: r*1.4, jy: r*.1,  tx: r*1.9, ty: r*.5  },
    { sx:-r*.3, sy: r*.7, jx:-r*1.1, jy: r*1.1, tx:-r*1.4, ty: r*1.7 },
    { sx: r*.3, sy: r*.7, jx: r*1.1, jy: r*1.1, tx: r*1.4, ty: r*1.7 },
  ];
  for (const l of hLegs) {
    ctx.beginPath(); ctx.moveTo(l.sx,l.sy); ctx.lineTo(l.jx,l.jy); ctx.lineTo(l.tx,l.ty); ctx.stroke();
  }
  // Leg tips — gold claws
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.5;
  for (const l of hLegs) {
    ctx.beginPath();
    ctx.moveTo(l.tx, l.ty);
    ctx.lineTo(l.tx + (l.tx-l.jx)*0.3, l.ty + r*0.2);
    ctx.stroke();
  }

  // Abdomen — hornet stripes (yellow/black)
  const stripes = [
    [r*0.3, r*0.6, r*0.5, '#1A1000'],
    [r*0.6, r*0.9, r*0.48, '#FFD700'],
    [r*0.9, r*1.15, r*0.42, '#1A1000'],
    [r*1.15,r*1.38, r*0.33, '#FFD700'],
    [r*1.38,r*1.58, r*0.22, '#1A1000'],
    [r*1.58,r*1.8,  r*0.12, '#FFD700'],
  ];
  for (const [y0, y1, w, col] of stripes) {
    ctx.fillStyle = col;
    ctx.strokeStyle = 'rgba(255,215,0,0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0,y0); ctx.lineTo(w,y0+(y1-y0)*0.5); ctx.lineTo(0,y1); ctx.lineTo(-w,y0+(y1-y0)*0.5); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  // Stinger tip
  ctx.fillStyle = '#FF6F00';
  ctx.beginPath(); ctx.moveTo(0,r*1.8); ctx.lineTo(r*0.08,r*1.65); ctx.lineTo(-r*0.08,r*1.65); ctx.closePath(); ctx.fill();

  // Thorax — armored
  ctx.fillStyle = '#1A1000';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0,-r*.3); ctx.lineTo(r*.65,-r*.05); ctx.lineTo(r*.6,r*.45);
  ctx.lineTo(0,r*.65); ctx.lineTo(-r*.6,r*.45); ctx.lineTo(-r*.65,-r*.05); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Armor plate detail
  ctx.strokeStyle = 'rgba(255,215,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r*.4,0); ctx.lineTo(0,-r*.25); ctx.lineTo(r*.4,0);
  ctx.moveTo(-r*.3, r*.3); ctx.lineTo(0,r*.55); ctx.lineTo(r*.3,r*.3);
  ctx.stroke();

  // Wings — 4 buzzing wings with vein detail
  const flapAngle = Math.sin(wingAngle) * (opts.isDashing ? 0.8 : 0.35);
  const flapAngle2 = Math.sin(wingAngle * 1.3 + 0.5) * 0.3;
  for (const side of [-1, 1]) {
    // Upper wing
    ctx.save();
    ctx.translate(side*r*0.55, -r*0.15);
    ctx.rotate(side*(0.5 + flapAngle));
    ctx.fillStyle = 'rgba(255,215,0,0.12)';
    ctx.strokeStyle = 'rgba(255,215,0,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(side*r*1.8,-r*0.3); ctx.lineTo(side*r*1.5,-r*2.0); ctx.lineTo(side*r*0.3,-r*0.9); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(255,215,0,0.4)'; ctx.lineWidth=0.7;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(side*r*1.3,-r*1.5); ctx.moveTo(side*r*0.8,-r*0.5); ctx.lineTo(side*r*1.6,-r*0.8); ctx.stroke();
    ctx.restore();
    // Lower wing
    ctx.save();
    ctx.translate(side*r*0.45, r*0.25);
    ctx.rotate(side*(0.9 + flapAngle2));
    ctx.fillStyle = 'rgba(255,215,0,0.08)';
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(side*r*1.4,r*0.1); ctx.lineTo(side*r*1.2,-r*1.2); ctx.lineTo(side*r*0.2,-r*0.6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // Head — armored hornet helmet
  ctx.fillStyle = '#1A1000';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0,-r*1.0); ctx.lineTo(r*.6,-r*.5); ctx.lineTo(r*.5,-r*.2);
  ctx.lineTo(r*.2,-r*.15); ctx.lineTo(-r*.2,-r*.15); ctx.lineTo(-r*.5,-r*.2); ctx.lineTo(-r*.6,-r*.5); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Mandibles
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  for (const side of [-1,1]) {
    ctx.beginPath();
    ctx.moveTo(side*r*.15, -r*.2);
    ctx.quadraticCurveTo(side*r*.4, -r*.35, side*r*.55, -r*.15);
    ctx.stroke();
  }

  // Eyes — compound gold
  ctx.fillStyle = '#FFD700';
  ctx.globalAlpha = 0.9;
  for (const side of [-1,1]) {
    ctx.beginPath(); ctx.ellipse(side*r*0.3, -r*0.65, r*0.18, r*0.13, 0, 0, Math.PI*2); ctx.fill();
    // Compound dots
    ctx.fillStyle = '#1A1000';
    for (let d = 0; d < 3; d++) {
      ctx.beginPath(); ctx.arc(side*(r*0.22+d*r*0.08), -r*0.65, r*0.04, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#FFD700';
  }
  ctx.globalAlpha = 1;

  // Proboscis — stinger-style
  drawProboscis(ctx, r, opts.isDashing, 2.2, '#FF6F00');
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 8. BLOOD GOD — Deep crimson demonic boss.
//    Crown of bone spikes, orbiting blood diamonds,
//    massive sweeping dark wings, dominating aura.
// ─────────────────────────────────────────────────────────────
export function drawBloodGod(ctx, x, y, size, angle, wingAngle, globalTime, opts) {
  ctx.save();
  ctx.translate(x, y);
  const r = size;

  ctx.rotate(angle + Math.PI / 2);
  const sq = opts.squashStretch || 1.0;
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Demonic aura — pulsing blood
  for (let i = 3; i >= 1; i--) {
    ctx.fillStyle = `rgba(213,0,0,${0.08 - i*0.02})`;
    ctx.beginPath(); ctx.arc(0, r*0.5, r*(1.2+i*0.3), 0, Math.PI*2); ctx.fill();
  }

  // Orbiting blood diamonds
  for (let d = 0; d < 4; d++) {
    const dAngle = globalTime * 2 + d * Math.PI / 2;
    const dx = Math.cos(dAngle) * r * 1.3;
    const dy = Math.sin(dAngle) * r * 0.8 + r * 0.7;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(dAngle + globalTime);
    ctx.fillStyle = '#FF1744';
    ctx.strokeStyle = '#FF5252';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0,-r*0.18); ctx.lineTo(r*0.12,0); ctx.lineTo(0,r*0.18); ctx.lineTo(-r*0.12,0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  drawAngularLegs(ctx, r, 'rgba(100,0,0,0.9)');

  // Abdomen — kingly draped
  ctx.fillStyle = '#1A0000';
  ctx.strokeStyle = '#D50000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, r*.3);
  ctx.lineTo(r*.7, r*.7);
  ctx.lineTo(r*.6, r*1.2);
  ctx.lineTo(r*.3, r*1.6);
  ctx.lineTo(0, r*2.0);
  ctx.lineTo(-r*.3, r*1.6);
  ctx.lineTo(-r*.6, r*1.2);
  ctx.lineTo(-r*.7, r*.7);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Thorax — throne
  ctx.fillStyle = '#0D0000';
  ctx.strokeStyle = '#D50000';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r*0.6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Inner ring detail
  ctx.strokeStyle = 'rgba(255,23,68,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, r*0.4, 0, Math.PI*2); ctx.stroke();

  // Wings — massive bat-like sweeping
  const flapAngle = Math.sin(wingAngle) * (opts.isDashing ? 0.4 : 0.15);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side*r*0.5, 0);
    ctx.rotate(side*(0.5 + flapAngle));
    // Main wing membrane
    ctx.fillStyle = 'rgba(100,0,0,0.25)';
    ctx.strokeStyle = '#D50000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.bezierCurveTo(side*r*1.5, -r*0.5, side*r*2.8, -r*0.3, side*r*3.0, r*0.5);
    ctx.bezierCurveTo(side*r*2.5, r*1.0, side*r*1.0, r*0.8, 0, r*0.5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Wing bone spars
    ctx.strokeStyle = 'rgba(200,0,0,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(side*r*2.0, -r*0.2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(side*r*2.5, r*0.3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(side*r*1.5, r*0.8); ctx.stroke();
    ctx.restore();
  }

  // Head — demonic
  ctx.fillStyle = '#1A0000';
  ctx.strokeStyle = '#D50000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0,-r*1.1); ctx.lineTo(r*.55,-r*.5); ctx.lineTo(r*.3,-r*.3);
  ctx.lineTo(-r*.3,-r*.3); ctx.lineTo(-r*.55,-r*.5); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Crown of bone spikes
  const spikeCount = 5;
  ctx.fillStyle = '#D50000';
  for (let i = 0; i < spikeCount; i++) {
    const sa = Math.PI + (i / (spikeCount-1)) * Math.PI;
    const baseR = r * 0.55;
    const bx = Math.cos(sa) * baseR;
    const by = Math.sin(sa) * baseR - r*0.1;
    const tipR = r * (0.75 + i%2 * 0.2);
    const tx = Math.cos(sa) * tipR;
    const ty = Math.sin(sa) * tipR - r*0.1;
    ctx.beginPath();
    ctx.moveTo(bx - Math.cos(sa+Math.PI/2)*r*0.08, by - Math.sin(sa+Math.PI/2)*r*0.08);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx + Math.cos(sa+Math.PI/2)*r*0.08, by + Math.sin(sa+Math.PI/2)*r*0.08);
    ctx.closePath();
    ctx.fill();
  }

  // Eyes — glowing red
  ctx.fillStyle = '#FF1744';
  ctx.globalAlpha = 0.8 + 0.2*Math.sin(globalTime*4);
  for (const side of [-1,1]) {
    ctx.beginPath(); ctx.arc(side*r*0.25, -r*0.65, r*0.15, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawProboscis(ctx, r, opts.isDashing, 2.2, '#FF1744');
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 9. DIGITAL WRAITH — Purple glitch entity.
//    Corrupted fractured body, scanline distortion,
//    data-ghost wings that flicker.
// ─────────────────────────────────────────────────────────────
export function drawDigitalWraith(ctx, x, y, size, angle, wingAngle, globalTime, opts) {
  ctx.save();
  ctx.translate(x, y);
  const r = size;

  ctx.rotate(angle + Math.PI / 2);
  const sq = opts.squashStretch || 1.0;
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Glitch offset — random jitter on fast intervals
  const glitchActive = Math.sin(globalTime * 47) > 0.85;
  const gx = glitchActive ? (Math.random()-0.5)*r*0.3 : 0;
  const gy = glitchActive ? (Math.random()-0.5)*r*0.2 : 0;

  drawAngularLegs(ctx, r, 'rgba(101,31,255,0.5)');

  // Abdomen — glitched diamond
  ctx.save();
  ctx.translate(gx*0.5, gy*0.5);
  ctx.fillStyle = '#150030';
  ctx.strokeStyle = '#651FFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, r*.3); ctx.lineTo(r*.6, r*.85); ctx.lineTo(0, r*1.95); ctx.lineTo(-r*.6, r*.85); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Glitch slices
  if (glitchActive) {
    ctx.fillStyle = 'rgba(101,31,255,0.5)';
    const sliceY = r*0.5 + Math.random()*r;
    ctx.fillRect(-r*0.5, sliceY, r, r*0.08);
    ctx.fillStyle = 'rgba(0,229,255,0.3)';
    ctx.fillRect(-r*0.5, sliceY + r*0.15, r*0.7, r*0.05);
  }
  ctx.restore();

  // Thorax
  ctx.save();
  ctx.translate(gx, gy);
  ctx.fillStyle = '#0A001A';
  ctx.strokeStyle = '#7C4DFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0,-r*.4); ctx.lineTo(r*.55,-r*.1); ctx.lineTo(r*.5,r*.4);
  ctx.lineTo(0,r*.6); ctx.lineTo(-r*.5,r*.4); ctx.lineTo(-r*.55,-r*.1); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();

  // Wings — ghost flickering
  const flapAngle = Math.sin(wingAngle) * 0.3;
  const flickerAlpha = glitchActive ? 0.3 + Math.random()*0.5 : 0.7;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side*r*0.4, 0);
    ctx.rotate(side*(0.75 + flapAngle));
    // Ghost echo layer
    ctx.globalAlpha = flickerAlpha * 0.3;
    ctx.translate(gx*side*0.5, gy*0.3);
    ctx.fillStyle = '#651FFF';
    ctx.strokeStyle = '#7C4DFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(side*r*1.8,-r*1.3); ctx.lineTo(side*r*0.5,-r*2.5); ctx.lineTo(-side*r*0.2,-r*0.8); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.globalAlpha = flickerAlpha;
    ctx.translate(-gx*side*0.5, -gy*0.3);
    ctx.fillStyle = 'rgba(101,31,255,0.15)';
    ctx.strokeStyle = '#7C4DFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(side*r*1.8,-r*1.3); ctx.lineTo(side*r*0.5,-r*2.5); ctx.lineTo(-side*r*0.2,-r*0.8); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Digital veins
    ctx.strokeStyle = 'rgba(124,77,255,0.6)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(side*r*1.0,-r*1.8);
    ctx.moveTo(side*r*0.5,-r*0.6); ctx.lineTo(side*r*1.5,-r*0.9);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Head
  ctx.save();
  ctx.translate(gx, gy);
  ctx.fillStyle = '#0A001A';
  ctx.strokeStyle = '#7C4DFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0,-r*1.0); ctx.lineTo(r*.45,-r*.5); ctx.lineTo(r*.15,-r*.35);
  ctx.lineTo(-r*.15,-r*.35); ctx.lineTo(-r*.45,-r*.5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();

  // Eyes — corrupted pixels
  for (const side of [-1,1]) {
    const eyeGlitch = glitchActive && Math.random() > 0.5;
    ctx.fillStyle = eyeGlitch ? '#00E5FF' : '#7C4DFF';
    ctx.globalAlpha = eyeGlitch ? 1 : 0.7+0.3*Math.sin(globalTime*9);
    ctx.fillRect(side*(r*0.13+gx*0.5), -r*0.72+gy*0.3, r*0.2, r*0.15);
  }
  ctx.globalAlpha = 1;

  drawProboscis(ctx, r, opts.isDashing, 2.2, '#7C4DFF');
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 10. THE HIVE — Swarm-mind collective. Black/cyan.
//     Crystalline hexagonal body, multiple mini-drones orbiting,
//     honeycomb wing texture, hive-mind eye pattern.
// ─────────────────────────────────────────────────────────────
export function drawTheHive(ctx, x, y, size, angle, wingAngle, globalTime, opts) {
  ctx.save();
  ctx.translate(x, y);
  const r = size;

  ctx.rotate(angle + Math.PI / 2);
  const sq = opts.squashStretch || 1.0;
  ctx.scale(1 / Math.sqrt(sq), sq);

  // Mini-drones orbiting (3 small)
  for (let d = 0; d < 3; d++) {
    const droneAngle = globalTime * 4 + d * (Math.PI * 2 / 3);
    const dx = Math.cos(droneAngle) * r * 1.5;
    const dy = Math.sin(droneAngle) * r * 0.9 + r * 0.5;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(droneAngle * 2);
    // Tiny hex drone
    ctx.fillStyle = '#001A1A';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ha = i * Math.PI/3;
      const hx = Math.cos(ha) * r*0.2;
      const hy = Math.sin(ha) * r*0.2;
      i===0 ? ctx.moveTo(hx,hy) : ctx.lineTo(hx,hy);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Drone eye
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath(); ctx.arc(0,0,r*0.07,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  drawAngularLegs(ctx, r, 'rgba(0,180,200,0.5)');

  // Abdomen — honeycomb segmented
  const hexSegs = [
    [r*.5, r*.3, r*.65],[r*.45,r*.65,r*1.0],[r*.38,r*1.0,r*1.3],[r*.28,r*1.3,r*1.6],[r*.15,r*1.6,r*1.85]
  ];
  for (let i = 0; i < hexSegs.length; i++) {
    const [w, y0, y1] = hexSegs[i];
    const h = y1 - y0;
    ctx.fillStyle = '#001010';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1;
    // Hex shape
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(w, y0 + h*0.3);
    ctx.lineTo(w, y0 + h*0.7);
    ctx.lineTo(0, y1);
    ctx.lineTo(-w, y0 + h*0.7);
    ctx.lineTo(-w, y0 + h*0.3);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Honeycomb inner glow
    ctx.strokeStyle = `rgba(0,229,255,${0.3+0.2*Math.sin(globalTime*5+i)})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(0, y0 + h*0.5, w*0.45, 0, Math.PI*2);
    ctx.stroke();
  }

  // Thorax — large hexagon
  ctx.fillStyle = '#001515';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ha = i * Math.PI/3 - Math.PI/6;
    const hx = Math.cos(ha) * r*0.6;
    const hy = Math.sin(ha) * r*0.5;
    i===0 ? ctx.moveTo(hx,hy) : ctx.lineTo(hx,hy);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Hive eye on thorax
  ctx.fillStyle = '#00E5FF';
  ctx.globalAlpha = 0.8 + 0.2*Math.sin(globalTime*6);
  ctx.beginPath(); ctx.arc(0,0,r*0.22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#001010';
  ctx.beginPath(); ctx.arc(0,0,r*0.14,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  // Wings — honeycomb mesh
  const flapAngle = Math.sin(wingAngle) * (opts.isDashing ? 0.6 : 0.25);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side*r*0.45, -r*0.1);
    ctx.rotate(side*(0.75 + flapAngle));
    // Wing base
    ctx.fillStyle = 'rgba(0,229,255,0.07)';
    ctx.strokeStyle = 'rgba(0,229,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.lineTo(side*r*1.7,-r*0.8); ctx.lineTo(side*r*1.2,-r*2.1); ctx.lineTo(side*r*0.2,-r*0.9); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Honeycomb cells on wing
    const cellPositions = [
      [side*r*0.6,-r*0.6], [side*r*1.0,-r*0.9], [side*r*0.7,-r*1.3],
      [side*r*1.2,-r*1.5], [side*r*0.5,-r*1.6]
    ];
    ctx.fillStyle = 'transparent';
    ctx.strokeStyle = `rgba(0,229,255,${0.3+0.2*Math.sin(globalTime*4+side)})`;
    ctx.lineWidth = 0.6;
    for (const [cx,cy] of cellPositions) {
      ctx.beginPath();
      for (let hi = 0; hi < 6; hi++) {
        const ha = hi * Math.PI/3;
        const hx = cx + Math.cos(ha)*r*0.18;
        const hy = cy + Math.sin(ha)*r*0.18;
        hi===0 ? ctx.moveTo(hx,hy) : ctx.lineTo(hx,hy);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }

  // Head — compound eye cluster
  ctx.fillStyle = '#001010';
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0,-r*1.05); ctx.lineTo(r*.5,-r*.5); ctx.lineTo(r*.2,-r*.35);
  ctx.lineTo(-r*.2,-r*.35); ctx.lineTo(-r*.5,-r*.5); ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Compound eyes — 3 each side
  const eyePulse = 0.7 + 0.3*Math.sin(globalTime*8);
  for (const side of [-1,1]) {
    for (let ei = 0; ei < 3; ei++) {
      ctx.fillStyle = '#00E5FF';
      ctx.globalAlpha = eyePulse - ei*0.15;
      ctx.beginPath();
      ctx.arc(side*(r*0.12 + ei*r*0.1), -r*0.6 - ei*r*0.08, r*(0.12-ei*0.03), 0, Math.PI*2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  drawProboscis(ctx, r, opts.isDashing, 2.2, '#00E5FF');
  ctx.restore();
}

// ── Skin Drawer Registry ─────────────────────────────────────
export const SKIN_DRAWERS = {
  'neon_drifter':    drawNeonDrifter,
  'bloodbyte':       drawBloodbyte,
  'phantom_vector':  drawPhantomVector,
  'overclock':       drawOverclock,
  'blood_reactor':   drawBloodReactor,
  'void_mosquito':   drawVoidMosquito,
  'cyber_hornet':    drawCyberHornet,
  'blood_god':       drawBloodGod,
  'digital_wraith':  drawDigitalWraith,
  'the_hive':        drawTheHive,
};

export default SKIN_DRAWERS;
