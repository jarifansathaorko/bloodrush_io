// ============================================================
// BloodRush.io — Game Manager (Main Orchestrator)
// ============================================================
import { CONFIG } from "../config.js";
import { TimeManager } from "./time.js";
import { StateMachine, AppState, MatchState } from "./state-machine.js";
import { InputManager } from "./input.js";
import { Player, PlayerState } from "../entities/player.js";
import { EnvironmentManager } from "../systems/environment.js";
import { Renderer } from "../systems/renderer.js";
import { CameraManager } from "../systems/camera.js";
import { EnemyManager } from "../systems/enemy-manager.js";
import { AIManager } from "../systems/ai-manager.js";
import { PowerupManager } from "../systems/powerup-manager.js";
import { FoodManager } from "../systems/food-manager.js";
import { MatchManager } from "../systems/match-manager.js";
import { UIManager } from "../ui/ui-manager.js";
import {
  bindScreenHandlers,
  renderCollection,
  renderSettings,
} from "../ui/screens.js";
import { AudioManager } from "../audio/audio-manager.js";
import { SaveManager } from "../progression/save-manager.js";
import { EconomyManager } from "../progression/economy.js";
import { AssetLoader } from "./assets.js";
import { VFXManager } from "../systems/vfx-manager.js";
import { CrazyGames } from "../sdk/crazygames.js";
import { MosquitoHero } from "../ui/mosquito-hero.js";

export class GameManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.time = new TimeManager();
    this.appState = new StateMachine(AppState.BOOT);

    this.input = null;
    this.env = null;
    this.renderer = null;
    this.camera = null;

    this.player = null;
    this.enemyMgr = null;
    this.aiMgr = null;
    this.powerupMgr = null;
    this.foodMgr = null;
    this.matchMgr = null;
    this.uiMgr = null;
    this.audio = null;
    this.save = null;
    this.economy = null;
    this.assets = null;
    this.vfxMgr = null;

    this.username = "";
    this._raf = null;
    this._lastRankNotif = 0;
    this._prevRank = 999;

    // ── Hero mosquito animator (main menu) ────────────────
    this._mosquitoHero = null;

    this._matchResult = null;
    this._uiState = "menu"; // 'menu' | 'gameplay' | 'revive'

    this.hasUsedRevive = false;
    this.reviveCountdown = 10;
    this.isAdRequestActive = false;
    this._deathSnapshot = null;
  }

  async init() {
    this._resize();
    window.addEventListener("resize", () => this._resize());

    // Core systems
    this.input = new InputManager(this.canvas);
    this.assets = new AssetLoader();
    this.vfxMgr = new VFXManager();
    this.renderer = new Renderer(this.canvas, this.assets, this.vfxMgr);
    this.camera = new CameraManager(this.canvas.width, this.canvas.height);
    this.audio = new AudioManager();
    this.save = new SaveManager();
    this.economy = new EconomyManager(this.save);
    this.uiMgr = new UIManager();

    // Load assets
    await this.assets.loadAll(CONFIG.SKINS);

    // Load save
    const saveData = this.save.load();
    this.username = this.save.getUsername() || "";

    // Restore settings
    this.audio.setMusicEnabled(saveData.settings.musicEnabled !== false);
    this.audio.setSfxEnabled(saveData.settings.sfxEnabled !== false);
    // Restore volume levels
    if (saveData.settings.masterVolume !== undefined)
      this.audio.setMasterVolume(saveData.settings.masterVolume);
    if (saveData.settings.musicVolume !== undefined)
      this.audio.setMusicVolume(saveData.settings.musicVolume);
    if (saveData.settings.sfxVolume !== undefined)
      this.audio.setSfxVolume(saveData.settings.sfxVolume);

    // Bind UI buttons
    bindScreenHandlers(this);

    // ── Hero mosquito animation setup ─────────────────────
    const heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) {
      this._mosquitoHero = new MosquitoHero(heroCanvas, this.renderer, this);

      // Track mouse position relative to the hero canvas element
      // so proximity detection works correctly
      heroCanvas.addEventListener('mousemove', (e) => {
        const rect = heroCanvas.getBoundingClientRect();
        const scaleX = heroCanvas.width  / rect.width;
        const scaleY = heroCanvas.height / rect.height;
        this._mosquitoHero.onMouseMove(
          (e.clientX - rect.left) * scaleX,
          (e.clientY - rect.top)  * scaleY
        );
      });
      heroCanvas.addEventListener('mouseleave', () => {
        this._mosquitoHero.onMouseMove(null, null);
      });
    }

    // CrazyGames SDK
    await CrazyGames.init();

    // Transition to main menu
    this.appState.transition(AppState.MAIN_MENU);
    this.goMainMenu();

    // Start render loop
    this.time.reset();
    this._loop(performance.now());
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    if (this.renderer) this.renderer.resize(w, h);
    if (this.camera) this.camera.resize(w, h);
  }

  // ── Game loop ─────────────────────────────────────────────
  _loop(timestamp) {
    this._raf = requestAnimationFrame((ts) => this._loop(ts));
    this.time.tick(timestamp);
    const dt = this.time.deltaTime;

    if (this.appState.is(AppState.GAMEPLAY)) {
      this._updateGameplay(dt);
    } else if (this.appState.is(AppState.REVIVE_PROMPT)) {
      this._updateRevivePrompt(dt);
    } else if (this.appState.is(AppState.MAIN_MENU)) {
      this._updateMainMenu(dt);
    } else if (this.appState.is(AppState.COLLECTION)) {
      this._updateCollection(dt);
    }

    this._render(dt);
  }

  _updateRevivePrompt(dt) {
    if (this.isAdRequestActive) return;

    this.reviveCountdown -= dt;
    const countdownEl = document.getElementById("revive-countdown");
    if (countdownEl) {
      countdownEl.innerText = Math.max(1, Math.ceil(this.reviveCountdown));
    }

    // Animate SVG ring (circumference = 2 * pi * 52 = 326.73)
    const ringFill = document.getElementById("revive-ring-fill");
    if (ringFill) {
      const TOTAL = 10;
      const pct = Math.max(0, this.reviveCountdown / TOTAL);
      const circ = 326.73;
      ringFill.style.strokeDashoffset = circ * (1 - pct);
      // Turn red-to-orange as time runs out
      ringFill.style.stroke = pct > 0.5 ? '#FF1744' : pct > 0.25 ? '#FF6D00' : '#FF3D00';
    }

    if (this.reviveCountdown <= 0) {
      this.declineRevive();
    }
  }

  _updateMainMenu(dt) {
    // 1. Update Daily Reward Timer
    const canClaim = this.economy.canClaimDailyReward();
    const timeLeft = this.economy.getDailyRewardTimeLeft();
    this.uiMgr.updateDailyRewardTimer(timeLeft, canClaim);

    // 2. Render Hero Mosquito Animation
    if (this._mosquitoHero) {
      this._mosquitoHero.draw(dt);
    }
  }

  _updateCollection(dt) {
    if (!this._shopPreviewEntity) return;

    // Rotate and animate the preview entity
    this._shopPreviewAngle = (this._shopPreviewAngle || 0) + dt * 0.5;
    this._shopPreviewEntity.angle = this._shopPreviewAngle;
    this._shopPreviewEntity.wingAngle = (this._shopPreviewEntity.wingAngle || 0) + dt * 15;
    
    // Update VFX Manager with just this entity so auras/drones work
    this.vfxMgr.update(dt, [this._shopPreviewEntity]);

    const canvas = document.getElementById("shop-preview-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Center it
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Draw using renderer (we bypass normal game camera logic)
    const e = this._shopPreviewEntity;
    this.renderer._drawEntity(
      ctx,
      0, 0, 
      e.size, e.angle, e.color, e.glowColor, e.wingAngle,
      {
        skinId: e.skinId,
        vfx: e.vfx,
        vfxState: e.vfxState,
        name: "", // Don't draw name/HUD in preview
        isPlayer: false,
        stamina: 100,
        maxStamina: 100
      }
    );
    ctx.restore();

    // Draw all small grid canvases
    const gridCanvases = document.querySelectorAll(".shop-card-canvas");
    gridCanvases.forEach(c => {
      const skinId = c.dataset.skinId;
      const skinDef = CONFIG.getSkin ? CONFIG.getSkin(skinId) : CONFIG.SKINS.find(s => s.id === skinId);
      if (skinDef) {
        const cCtx = c.getContext("2d");
        cCtx.clearRect(0, 0, c.width, c.height);
        cCtx.save();
        cCtx.translate(c.width / 2, c.height / 2);
        
        this.renderer._drawEntity(
          cCtx,
          0, 0,
          25, this._shopPreviewAngle, skinDef.color, skinDef.glowColor, this._shopPreviewEntity.wingAngle,
          {
            skinId: skinDef.id,
            vfx: skinDef.vfx,
            vfxState: e.vfxState,
            name: "",
            isPlayer: false,
            stamina: 100,
            maxStamina: 100
          }
        );
        cCtx.restore();
      }
    });
  }

  _updateGameplay(dt) {
    const match = this.matchMgr;
    if (!match) return;

    match.update(dt);

    if (match.state === MatchState.COUNTDOWN) {
      this.uiMgr.updateCountdown(match.countdown);
      return;
    }
    if (match.state !== MatchState.PLAYING) return;

    this.uiMgr.updateCountdown(0);

    // Input → player direction & Dash
    const ps = this.camera.worldToScreen(this.player.x, this.player.y);
    this.input.update(ps.x, ps.y);
    const wantsDash = this.input.consumeDash();

    this.player.update(dt, this.input.direction, wantsDash, this.audio);

    // Spawn rear blood propulsion burst during boost activation for player
    if (this.player.boostBurstTimer > 0) {
      if (this.player.vfx) this.vfxMgr.emitDash(this.player);
      else this.renderer.spawnBloodPropulsion(this.player);
    } else if (this.player.isDashing) {
      this.renderer.spawnParticles(
        this.player.x,
        this.player.y,
        this.player.color,
        2,
        0.6,
      );
    }

    // Spawn rear blood propulsion burst for dashing enemies
    for (const enemy of this.enemyMgr.enemies) {
      if (enemy.alive && enemy.boostBurstTimer > 0) {
        if (enemy.vfx) this.vfxMgr.emitDash(enemy);
        else this.renderer.spawnBloodPropulsion(enemy);
      }
    }

    // VFX Manager
    this.vfxMgr.update(dt, [this.player, ...this.enemyMgr.enemies]);

    // Passive Food / Blood Drops update
    if (this.foodMgr) {
      this.foodMgr.update(dt, this.player, this.enemyMgr.enemies, this.audio);
    }

    // Powerups
    this.powerupMgr.update(dt, this.player, this.audio);

    // AI (pass elapsed time for difficulty scaling)
    const bounds = match.getArenaBounds();
    this.aiMgr.update(
      dt,
      this.enemyMgr.enemies,
      this.player,
      bounds.radius,
      bounds.center,
      match.elapsed,
    );

    // Enemy updates
    this.enemyMgr.update(dt, match.phase, this.player, this.audio);

    // Feeding & Combat checks
    this.enemyMgr.processPlayerEating(
      this.player,
      this.audio,
      (enemy, wasDash) => {
        const text = wasDash ? "⚡ CRITICAL PIERCE!" : "🩸 CRUNCH!";
        this.renderer.addFloatingText(
          enemy.x,
          enemy.y - 15,
          text,
          "#FFEB3B",
          20,
        );
        this.renderer.addFloatingText(
          enemy.x,
          enemy.y + 10,
          `+${Math.floor(enemy.size * 0.38)} SIZE`,
          "#76FF03",
          16,
        );
        this.renderer.spawnParticles(enemy.x, enemy.y, "#E53935", 16, 1.4);
      },
    );

    const playerDied = this.enemyMgr.processEnemyEatingPlayer(
      this.player,
      this.audio,
      (enemy, result) => {
        if (result === "fatal") {
          this.renderer.addFloatingText(
            this.player.x,
            this.player.y - 20,
            "💀 FATAL!",
            "#FF1744",
            24,
          );
          this.renderer.spawnParticles(
            this.player.x,
            this.player.y,
            "#FF1744",
            25,
            2.0,
          );
        } else if (result === "shield") {
          this.renderer.addFloatingText(
            this.player.x,
            this.player.y - 20,
            "🛡 SHIELD POPPED!",
            "#4FC3F7",
            20,
          );
        }
      },
    );

    // Camera follow
    if (this.player.isAlive()) {
      this.camera.follow(this.player);
    }
    this.camera.update(dt);

    // Arena boundary damage
    if (bounds.shrinking) {
      const dCenter = Math.hypot(
        this.player.x - bounds.center.x,
        this.player.y - bounds.center.y,
      );
      if (dCenter > bounds.radius && this.player.isAlive()) {
        this.player.size -= CONFIG.ARENA.BOUNDARY_DAMAGE_RATE * dt;
        if (this.player.size <= 5) {
          this.player.takeDamage();
          this.audio.playDeath();
        }
      }
    }

    // Rank tracking
    this._updateRankNotif();

    // HUD updates
    this.uiMgr.updateHUD(this.player, match, this.enemyMgr, this.username);
    this.uiMgr.updateJoystick(this.input.getJoystickState());
    const rankings = this.enemyMgr.getRankings(this.player, this.username);
    this.uiMgr.updateLeaderboard(rankings);

    // Match end conditions
    if (playerDied || !this.player.isAlive()) {
      if (!this.hasUsedRevive) {
        this._handlePlayerDeath();
      } else {
        this._endMatch(false);
      }
    } else if (match.isOver()) {
      this._endMatch(true);
    }
  }

  _updateRankNotif() {
    const rank = this.enemyMgr.getPlayerRank(this.player, this.username);
    if (rank < this._prevRank && this._prevRank !== 999) {
      if (rank <= 3) {
        this.renderer.showRankNotif(`🏆 TOP ${rank}!`);
        this.audio.playRankUp();
      }
    }
    this._prevRank = rank;
  }

  _render(dt) {
    if (this.renderer) {
      this.renderer.render(
        dt,
        this.camera,
        this.env,
        this.player,
        this.enemyMgr ? this.enemyMgr.enemies : null,
        this.powerupMgr ? this.powerupMgr.powerups : null,
        this.foodMgr,
        this.matchMgr,
        this._uiState,
      );
    }
  }

  // ── Match lifecycle ───────────────────────────────────────
  goMainMenu() {
    this._uiState = "menu";
    this.uiMgr.showScreen("screen-main-menu");
    this.appState.transition(AppState.MAIN_MENU);
    this.uiMgr.updateCurrencyDisplay(
      this.save.data.coins,
      this.save.data.gems,
      this.save.data.level,
      this.save.data.xp,
    );
    this.uiMgr.updateMainMenuStats(this.save.data);

    // Reset hero mosquito so it's ready for a fresh idle animation
    if (this._mosquitoHero) {
      this._mosquitoHero._isTransitioning = false;
      this._mosquitoHero._transitionT     = 0;
      this._mosquitoHero._transitionDone  = false;
      this._mosquitoHero._onComplete      = null;
    }
  }

  // Mode Selection
  goModeSelect() {
    this.uiMgr.showScreen("screen-mode-select");
    this.appState.transition(AppState.MODE_SELECT);
  }

  // Step 3: Pre-match tips
  startMatch() {
    const tips = [
      "🚀 Press SPACE or SHIFT for a rear blood-propelled DASH & proboscis strike!",
      "📡 Check your PROXIMITY RADAR to track nearby prey (green) and predators (red)!",
      "🩸 Feed on sparkling blood drops and flower nectar to grow rapidly!",
      "👁️ Sneak up from behind — enemies have a blind spot!",
      "⏳ Survive all 5 phases across 5 minutes to trigger the final BLOOD RUSH!",
    ];
    const tipEl = document.getElementById("prematch-tip");
    if (tipEl)
      tipEl.textContent = tips[Math.floor(Math.random() * tips.length)];
    this.uiMgr.showScreen("screen-pre-match");
    this.appState.transition(AppState.PRE_MATCH);
  }

  confirmStartMatch() {
    this.appState.transition(AppState.GAMEPLAY);
    this._uiState = "gameplay";

    // Init environment & food
    this.env = new EnvironmentManager();
    this.foodMgr = new FoodManager(this.env);

    // Init player
    const skinId = this.save.get("equippedSkin") || "cyber_drone";
    const skin = CONFIG.getSkin ? CONFIG.getSkin(skinId) : (CONFIG.SKINS.find((s) => s.id === skinId) || CONFIG.SKINS[0]);
    this.player = new Player(
      CONFIG.ARENA.WIDTH / 2 + (Math.random() - 0.5) * 400,
      CONFIG.ARENA.HEIGHT / 2 + (Math.random() - 0.5) * 400,
      skin.color,
    );
    this.player.skinId = skin.id;
    this.player.vfx = skin.vfx;
    this.player.glowColor = skin.glowColor || CONFIG.COLORS.PLAYER_GLOW;
    this.player.name = this.username || "You";

    // Init systems
    this.enemyMgr = new EnemyManager(this.foodMgr);
    this.aiMgr = new AIManager(this.env, this.foodMgr);
    this.powerupMgr = new PowerupManager();
    this.matchMgr = new MatchManager();

    this.enemyMgr.reset();
    this.powerupMgr.reset();

    // Camera
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.camera.follow(this.player);

    // Rank tracking
    this._prevRank = 999;
    this._matchResult = null;
    this.hasUsedRevive = false;
    this.isAdRequestActive = false;

    // Start match
    this.matchMgr.startMatch();

    // Show gameplay HUD
    this.uiMgr.showScreen("screen-gameplay");
    this.uiMgr.updateCountdown(CONFIG.MATCH.COUNTDOWN);

    // Audio
    this.audio.startMusic();

    // SDK
    CrazyGames.gameplayStart();
  }

  pauseGame() {
    if (this.appState.is(AppState.GAMEPLAY)) {
      this.matchMgr.pause();
      this.uiMgr.showScreen("screen-pause");
    }
  }

  resumeGame() {
    this.matchMgr.resume();
    this.uiMgr.showScreen("screen-gameplay");
  }

  restartMatch() {
    this.confirmStartMatch();
  }

  _endMatch(isVictory) {
    this.matchMgr.state = MatchState.ENDED;
    this._uiState = "menu";
    CrazyGames.gameplayStop();

    const rank  = this.enemyMgr.getPlayerRank(this.player, this.username);
    const size   = Math.floor(this.player.size);
    const kills  = this.player.kills;
    const score  = this.player.score;
    const survivalTime = this.player.survivalTime || this.matchMgr.elapsed || 0;

    const totalPlayers = this.enemyMgr.enemies.length + 1;
    const reward = this.economy.computeMatchRewards({
      kills:        kills,
      finalRank:    rank,
      finalSize:    size,
      totalPlayers: totalPlayers,
      survived:     isVictory,
    });

    this.save.updateMatchStats({ kills, rank, score, size, survivalTime, username: this.username });
    this.save.addCoins(reward.coins);
    this.save.addXP(reward.xp);

    const resultData = {
      rank,
      size,
      kills,
      score,
      survivalTime,
      xp:    reward.xp,
      coins: reward.coins,
    };
    this._matchResult = resultData;

    this.appState.transition(AppState.RESULT);

    setTimeout(async () => {
      await CrazyGames.requestMidgameAd();
      if (isVictory || rank === 1) {
        this.audio.playVictory();
        this.uiMgr.showVictory(resultData);
      } else {
        this.uiMgr.showGameOver(resultData);
      }
    }, 800);
  }

  _handlePlayerDeath() {
    this._uiState = "revive";
    this.appState.transition(AppState.REVIVE_PROMPT);
    this.reviveCountdown = 10;
    this.isAdRequestActive = false;
    
    // Save snapshot
    this._deathSnapshot = {
      x: this.player.x,
      y: this.player.y,
      size: this.player.size,
      score: this.player.score,
      kills: this.player.kills,
      survivalTime: this.player.survivalTime,
    };

    // Update Revive UI
    const scoreEl = document.getElementById("revive-score");
    const sizeEl = document.getElementById("revive-size");
    const countdownEl = document.getElementById("revive-countdown");
    if (scoreEl) scoreEl.innerText = this.player.score;
    if (sizeEl) sizeEl.innerText = Math.floor(this.player.size);
    if (countdownEl) countdownEl.innerText = "10";

    const adBtn = document.getElementById("btn-revive-ad");
    if (adBtn) {
      const icon = document.getElementById("btn-revive-icon");
      const title = document.getElementById("btn-revive-title");
      const sub = document.getElementById("btn-revive-sub");
      if (icon) icon.textContent = "📺";
      if (title) title.textContent = "WATCH AD TO REVIVE";
      if (sub) sub.textContent = "Continue from where you left off";
      adBtn.disabled = false;
    }

    this.uiMgr.showScreen("screen-revive");
  }

  requestRewardedRevive() {
    if (this.isAdRequestActive || this.hasUsedRevive) return;

    this.isAdRequestActive = true;
    
    const adBtn = document.getElementById("btn-revive-ad");
    if (adBtn) {
      const icon = document.getElementById("btn-revive-icon");
      const title = document.getElementById("btn-revive-title");
      const sub = document.getElementById("btn-revive-sub");
      if (icon) icon.textContent = "⏳";
      if (title) title.textContent = "LOADING AD...";
      if (sub) sub.textContent = "Please wait";
      adBtn.disabled = true;
    }

    CrazyGames.requestRewardedAd({
      adStarted: () => {
        // Mute audio during ad
        this.audio.setMusicEnabled(false);
        this.audio.setSfxEnabled(false);
      },
      adFinished: () => {
        // Restore audio
        const saveData = this.save.load();
        this.audio.setMusicEnabled(saveData.settings.musicEnabled !== false);
        this.audio.setSfxEnabled(saveData.settings.sfxEnabled !== false);
        
        this.hasUsedRevive = true;
        this.isAdRequestActive = false;
        this._restorePlayerFromSnapshot();
      },
      adError: () => {
        // Restore audio
        const saveData = this.save.load();
        this.audio.setMusicEnabled(saveData.settings.musicEnabled !== false);
        this.audio.setSfxEnabled(saveData.settings.sfxEnabled !== false);

        this.isAdRequestActive = false;
        this.declineRevive(); // Fallback to game over
      }
    });
  }

  declineRevive() {
    if (this.isAdRequestActive) return;
    this.hasUsedRevive = true;
    this._endMatch(false);
  }

  _restorePlayerFromSnapshot() {
    if (!this._deathSnapshot) {
      this._endMatch(false);
      return;
    }

    // Restore stats
    this.player.x = this._deathSnapshot.x;
    this.player.y = this._deathSnapshot.y;
    this.player.size = this._deathSnapshot.size;
    this.player.score = this._deathSnapshot.score;
    this.player.kills = this._deathSnapshot.kills;
    this.player.survivalTime = this._deathSnapshot.survivalTime;
    
    // Revive
    this.player.state = PlayerState.SPAWNING;
    this.player.health = 1.0;
    this.player.spawnTimer = 3.0; // 3 seconds of invulnerability
    
    // Avoid spawning exactly on the enemy that killed us by slightly shifting
    this.player.x += (Math.random() - 0.5) * 50;
    this.player.y += (Math.random() - 0.5) * 50;
    
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.camera.follow(this.player);

    this._uiState = "gameplay";
    this.appState.transition(AppState.GAMEPLAY);
    this.uiMgr.showScreen("screen-gameplay");
  }

  // ── Sub-screens ───────────────────────────────────────────
  goCollection() {
    this._shopPreviewAngle = -Math.PI / 2; // Face UP

    const updatePreviewUI = (skin) => {
      // Set name and description
      document.getElementById("shop-preview-name").textContent = skin.name;
      const descEl = document.getElementById("shop-preview-desc");
      if (descEl) descEl.textContent = skin.desc || "A unique cosmetic shell.";
      
      const rarityEl = document.getElementById("shop-preview-rarity");
      if (rarityEl) {
        rarityEl.textContent = skin.rarity || "COMMON";
        rarityEl.className = `rarity-tag rarity-${skin.rarity || "common"}`;
      }

      // Update action buttons based on state
      const isOwned = this.save.data.unlockedSkins.includes(skin.id);
      const isEquipped = this.save.data.equippedSkin === skin.id;
      
      const btnEquip = document.getElementById("btn-equip-skin");
      const btnBuy = document.getElementById("btn-buy-skin");
      const statusText = document.getElementById("shop-status-text");

      btnEquip.style.display = "none";
      btnBuy.style.display = "none";
      statusText.style.display = "none";

      if (isEquipped) {
        statusText.style.display = "block";
        statusText.textContent = "EQUIPPED";
      } else if (isOwned) {
        btnEquip.style.display = "block";
        btnEquip.onclick = () => {
          if (this.save.equipSkin(skin.id)) {
            this.audio.playClick();
            this.goCollection(); // Refresh
          }
        };
      } else {
        btnBuy.style.display = "block";
        document.getElementById("shop-buy-price").textContent = skin.cost;
        btnBuy.onclick = () => {
          if (this.economy.purchaseSkin(skin.id)) {
            this.audio.playClick();
            this.goCollection(); // Refresh
          }
        };
      }
    };

    const selectShopSkin = (skin) => {
      // Create mock entity for preview
      this._shopPreviewEntity = {
        x: 0, y: 0,
        size: 50,
        angle: this._shopPreviewAngle,
        color: skin.color,
        glowColor: skin.glowColor,
        skinId: skin.id,
        vfx: skin.vfx,
        wingAngle: 0,
        alive: true
      };
      updatePreviewUI(skin);
    };

    renderCollection(this, selectShopSkin);

    // Initial select (either equipped or default)
    const eq = this.save.data.equippedSkin || "default";
    const initialSkin = CONFIG.getSkin ? CONFIG.getSkin(eq) : (CONFIG.SKINS.find(s => s.id === eq) || CONFIG.SKINS[0]);
    
    // Visually mark it selected in grid
    setTimeout(() => {
      const card = document.querySelector(`.shop-card[data-id="${initialSkin.id}"]`);
      if (card) card.classList.add("selected");
    }, 10);
    
    selectShopSkin(initialSkin);

    this.uiMgr.updateCurrencyDisplay(this.save.data.coins);
    this.uiMgr.showScreen("screen-collection");
    this.appState.transition(AppState.COLLECTION);
  }

  goSettings() {
    renderSettings(this.save.data.settings);
    this.uiMgr.showScreen("screen-settings");
    this.appState.transition(AppState.SETTINGS);
  }
}

export default GameManager;
