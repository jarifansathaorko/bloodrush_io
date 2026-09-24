// ============================================================
// BloodRush.io — Audio Manager (Volume Levels & Kill Sound Anti-Spam)
// ============================================================

export class AudioManager {
  constructor() {
    this.ctx          = null;
    this.musicEnabled = true;
    this.sfxEnabled   = true;
    this._masterGain  = null;
    this._sfxGain     = null;
    this._initialized = false;

    // Volume levels (0–1 each)
    this.masterVolume = 0.8;
    this.musicVolume  = 0.5;
    this.sfxVolume    = 0.7;

    // Background Music
    this.bgm          = new Audio("assets/audio/bgm.mp3");
    this.bgm.loop     = true;
    this._updateBgmVolume();
  }

  init() {
    try {
      this.ctx         = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this.ctx.createGain();
      this._sfxGain    = this.ctx.createGain();
      this._masterGain.gain.value = this.masterVolume;
      this._sfxGain.gain.value   = this.sfxVolume;
      this._sfxGain.connect(this._masterGain);
      this._masterGain.connect(this.ctx.destination);
      this._initialized = true;

      // iOS / Safari touch unlock
      document.addEventListener("touchend", () => {
        if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      });
    } catch (e) {
      console.warn("AudioContext not available:", e);
    }
  }

  _ensureInit() {
    if (!this._initialized) this.init();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  _updateBgmVolume() {
    this.bgm.volume = this.masterVolume * this.musicVolume;
  }

  // ── Volume control ────────────────────────────────────────
  setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this._masterGain) {
      this._masterGain.gain.setTargetAtTime(
        this.masterVolume, this.ctx.currentTime, 0.02,
      );
    }
    this._updateBgmVolume();
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    this._updateBgmVolume();
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this._sfxGain) {
      this._sfxGain.gain.setTargetAtTime(
        this.sfxVolume, this.ctx.currentTime, 0.02,
      );
    }
  }

  setMusicEnabled(val) {
    this.musicEnabled = val;
    if (!val) this.stopMusic();
    else      this.startMusic();
  }

  setSfxEnabled(val) {
    this.sfxEnabled = val;
  }

  // ── Internal tone generators ──────────────────────────────
  _tone(freq, dur, type = "sine", gain = 0.3, when = 0) {
    if (!this._initialized || !this.sfxEnabled) return;
    const ctx = this.ctx;
    const t   = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type  = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this._sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  _sweep(freqStart, freqEnd, dur, type = "sine", gain = 0.3, when = 0) {
    if (!this._initialized || !this.sfxEnabled) return;
    const ctx = this.ctx;
    const t   = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type  = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this._sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  // ── Sound effects ─────────────────────────────────────────

  playClick() {
    this._ensureInit();
    this._tone(800, 0.05, "square", 0.18);
    this._tone(1200, 0.03, "square", 0.12, 0.05);
  }

  playBoost() {
    this._ensureInit();
    this._sweep(260, 680, 0.18, "sawtooth", 0.20);
    this._sweep(150, 80,  0.22, "triangle", 0.22);
  }

  // Primary kill sound — plays on first kill in a sequence
  playFeed() {
    this._ensureInit();
    this._sweep(320, 650, 0.10, "sawtooth", 0.22);
    this._sweep(650, 220, 0.08, "sawtooth", 0.18, 0.10);
  }

  // Critical hit / dash kill
  playCrit() {
    this._ensureInit();
    this._tone(900,  0.08, "triangle", 0.32);
    this._sweep(400, 1100, 0.16, "sawtooth", 0.26);
  }

  // Multi-kill: lighter variations for rapid kills (count = 2, 3+)
  playMultiKill(count) {
    this._ensureInit();
    if (count === 2) {
      // Lighter pop — satisfying but less intense
      this._sweep(420, 700, 0.09, "sawtooth", 0.16);
    } else {
      // Subtle blip for 3+ rapid kills
      this._tone(600, 0.06, "triangle", 0.12);
    }
  }

  playGrowth() {
    this._ensureInit();
    const notes = [320, 420, 540, 700];
    notes.forEach((f, i) => this._tone(f, 0.09, "sine", 0.24, i * 0.06));
  }

  // Short quiet chime when collecting food
  playFoodCollect() {
    this._ensureInit();
    this._tone(520, 0.06, "sine", 0.10);
  }

  playPowerup() {
    this._ensureInit();
    const notes = [520, 740, 960, 1280];
    notes.forEach((f, i) => this._tone(f, 0.12, "triangle", 0.22, i * 0.06));
  }

  playDeath() {
    this._ensureInit();
    this._sweep(420, 60,  0.6,  "sawtooth", 0.38);
    this._sweep(320, 40,  0.5,  "square",   0.18, 0.10);
  }

  playVictory() {
    this._ensureInit();
    const fanfare = [523, 659, 784, 1047, 1318];
    fanfare.forEach((f, i) => this._tone(f, 0.28, "sine", 0.34, i * 0.16));
  }

  playEnemyDeath() {
    this._ensureInit();
    this._sweep(520, 100, 0.2, "square", 0.14);
  }

  playRankUp() {
    this._ensureInit();
    this._tone(660,  0.10, "sine", 0.28);
    this._tone(880,  0.10, "sine", 0.28, 0.10);
    this._tone(1320, 0.15, "sine", 0.32, 0.20);
  }

  playShieldHit() {
    this._ensureInit();
    this._sweep(1000, 200, 0.10, "sawtooth", 0.28);
  }

  // ── Background Music ──────────────────────────────────────
  startMusic() {
    if (!this.musicEnabled) return;
    this.bgm.play().catch((e) => console.warn("BGM play prevented:", e));
  }

  stopMusic() {
    this.bgm.pause();
  }
}

export default AudioManager;
