// ============================================================
// BloodRush.io — Screen Logic (button handlers, collection UI)
// ============================================================
import { CONFIG } from "../config.js";
import { CrazyGames } from "../sdk/crazygames.js";

export function bindScreenHandlers(game) {
  const on = (id, fn) => {
    const el = document.getElementById(id);
    if (el)
      el.addEventListener("click", () => {
        game.audio.playClick();
        fn();
      });
  };

  const bindModal = (btnId, modalId) => {
    on(btnId, () => {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = "block";
        modal.classList.add("active");
      }
    });
  };

  // Main Menu Buttons
  on("btn-play", () => {
    const inputEl = document.getElementById("input-player-name");
    let name = inputEl ? inputEl.value.trim() : "";
    if (name) {
      game.username = name.substring(0, 15);
      game.save.setUsername(game.username);
    } else {
      game.username = "Mosquito";
    }

    // Trigger mosquito fly-away transition, then start match
    if (game._mosquitoHero) {
      game._mosquitoHero.triggerPlayTransition(() => {
        game.startMatch();
      });
    } else {
      game.startMatch();
    }
  });

  on("btn-collection", () => game.goCollection());

  // Settings button now opens a popup modal instead of a full screen
  on("btn-settings", () => {
    const modal = document.getElementById("modal-settings");
    if (modal) {
      modal.style.display = "flex";
      modal.classList.add("active");
      // Sync slider values from saved settings
      const s = game.save.data.settings;
      const syncSlider = (id, labelId, val) => {
        const el = document.getElementById(id);
        const lb = document.getElementById(labelId);
        if (el) el.value = Math.round(val * 100);
        if (lb) lb.textContent = `${Math.round(val * 100)}%`;
      };
      syncSlider('popup-slider-music', 'popup-label-music',
        s.musicVolume !== undefined ? s.musicVolume : 0.5);
      syncSlider('popup-slider-sfx', 'popup-label-sfx',
        s.sfxVolume !== undefined ? s.sfxVolume : 0.7);
    }
  });

  // Leaderboard Modal (Full 10-player rankings + CrazyGames sync)
  on("btn-trophy", async () => {
    const modal = document.getElementById("modal-leaderboard");
    if (!modal) return;
    modal.style.display = "flex";
    modal.classList.add("active");

    const list = document.getElementById("modal-lb-list");
    if (list) {
      list.innerHTML = '<div class="modal-lb-empty" style="opacity:0.6;">Loading rankings...</div>';

      // Try CrazyGames leaderboard first, fallback to save manager full leaderboard
      let entries = null;
      try {
        const sdkEntries = await CrazyGames.getLeaderboard("global-highscores", { count: 10 });
        if (sdkEntries && sdkEntries.length > 0) {
          const pName = game.save.data.username || "Hunter";
          entries = sdkEntries.map((e, idx) => ({
            rank: idx + 1,
            name: e.name,
            score: e.score,
            isPlayer: e.name === pName,
          }));
        }
      } catch (err) {
        console.warn("[Leaderboard] CrazyGames fetch fallback:", err);
      }

      if (!entries || entries.length === 0) {
        entries = game.save.getFullLeaderboard();
      }

      const medals = ["🥇", "🥈", "🥉"];
      list.innerHTML = entries.map((e) => `
        <div class="modal-lb-row${e.isPlayer ? " modal-lb-player" : ""}">
          <span class="modal-lb-pos">${e.rank <= 3 ? medals[e.rank - 1] : `<span class="modal-lb-rank-num">#${e.rank}</span>`}</span>
          <span class="modal-lb-name">${e.name}${e.isPlayer ? ' <span class="modal-lb-you-tag">YOU</span>' : ""}</span>
          <span class="modal-lb-score">${e.score.toLocaleString()}</span>
        </div>
      `).join("");
    }

    // Also update personal career stats
    const d = game.save.data;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("modal-lb-best", (d.bestScore || 0).toLocaleString());
    set("modal-lb-matches", d.totalMatches || 0);
    set("modal-lb-kills", d.totalKills || 0);
  });

  // Footer Links (using generic info modal)
  const showInfo = (title, content) => {
    const modal = document.getElementById("modal-info");
    const titleEl = document.getElementById("modal-info-title");
    const contentEl = document.getElementById("modal-info-content");
    if (modal && titleEl && contentEl) {
      titleEl.textContent = title;
      contentEl.textContent = content;
      modal.style.display = "block";
      modal.classList.add("active");
    }
  };
  on("btn-about", () => showInfo("About BloodRush.io", "A fast-paced multiplayer-style HTML5 survival game built with modern web technologies."));
  on("btn-privacy", () => showInfo("Privacy Policy", "No personal data is collected. All game progress is stored locally in your browser."));
  on("btn-terms", () => showInfo("Terms of Service", "By playing, you agree to have fun and not cheat."));

  // Invite Button
  on("btn-invite", () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: 'BloodRush.io',
        text: 'Come play BloodRush with me!',
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        if (game.ui && game.ui.showToast) {
          game.ui.showToast("📋 Link copied to clipboard!", "info");
        }
      });
    }
  });

  // Daily Reward
  on("btn-claim-reward", () => {
    const amount = game.economy.claimDailyReward();
    if (amount) {
      if (game.ui && game.ui.showToast) {
        game.ui.showToast(`🎉 Claimed ${amount} 🪙!`, "reward");
      }
      // Update display immediately
      const el = document.getElementById("display-coins");
      if (el) el.textContent = game.save.data.coins;
      document.getElementById("btn-claim-reward").style.display = "none";
      document.querySelector(".mm-reward-timer-container").style.display = "flex";
    }
  });

  // Global Modal Close logic
  document.querySelectorAll(".btn-close-modal").forEach(btn => {
    btn.addEventListener("click", (e) => {
      game.audio.playClick();
      const modal = e.target.closest(".modal-overlay, .screen");
      if (modal) {
        modal.style.display = "none";
        modal.classList.remove("active");
      }
    });
  });

  // Also close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.active, .screen[id^='modal-']").forEach(modal => {
        modal.style.display = "none";
        modal.classList.remove("active");
      });
    }
  });

  // Close modal when clicking directly on overlay backdrop
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        game.audio.playClick();
        overlay.style.display = "none";
        overlay.classList.remove("active");
      }
    });
  });

  // Audio Toggles on Main Menu
  on("mm-toggle-music", () => {
    const isEnabled = game.save.data.settings.musicEnabled !== false;
    const newState = !isEnabled;
    game.audio.setMusicEnabled(newState);
    game.save.data.settings.musicEnabled = newState;
    game.save.save();
    document.getElementById("mm-toggle-music").style.opacity = newState ? "1" : "0.5";
  });

  on("mm-toggle-sfx", () => {
    const isEnabled = game.save.data.settings.sfxEnabled !== false;
    const newState = !isEnabled;
    game.audio.setSfxEnabled(newState);
    game.save.data.settings.sfxEnabled = newState;
    game.save.save();
    document.getElementById("mm-toggle-sfx").style.opacity = newState ? "1" : "0.5";
  });

  // Settings Popup Music/SFX sliders
  const popupSliderMusic = document.getElementById('popup-slider-music');
  const popupSliderSfx   = document.getElementById('popup-slider-sfx');

  if (popupSliderMusic) {
    popupSliderMusic.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      const lb = document.getElementById('popup-label-music');
      if (lb) lb.textContent = `${val}%`;
      game.audio.setMusicVolume(val / 100);
      game.save.data.settings.musicVolume = val / 100;
      game.save.save();
    });
  }
  if (popupSliderSfx) {
    popupSliderSfx.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      const lb = document.getElementById('popup-label-sfx');
      if (lb) lb.textContent = `${val}%`;
      game.audio.setSfxVolume(val / 100);
      game.save.data.settings.sfxVolume = val / 100;
      game.save.save();
    });
  }

  // Mode Select (Pre-match flow)
  on("btn-mode-survival", () => game.startMatch());
  on("btn-mode-back", () => game.goMainMenu());
  on("btn-prematch-go", () => game.confirmStartMatch());

  // Pause
  on("btn-pause", () => game.pauseGame());
  on("btn-resume", () => game.resumeGame());
  on("btn-restart", () => game.restartMatch());
  on("btn-pause-menu", () => game.goMainMenu());

  // Game Over
  on("btn-go-replay", () => game.restartMatch());
  on("btn-go-shop", () => game.goCollection());
  on("btn-go-menu", () => game.goMainMenu());

  // Victory
  on("btn-v-replay", () => game.restartMatch());
  on("btn-v-shop", () => game.goCollection());
  on("btn-v-menu", () => game.goMainMenu());

  // Revive Prompt
  on("btn-revive-ad", () => game.requestRewardedRevive());
  on("btn-revive-decline", () => game.declineRevive());

  // Collection
  on("btn-coll-back", () => game.goMainMenu());

  // Settings Screen Toggles
  on("btn-sett-back", () => game.goMainMenu());
  on("btn-reset-data", () => {
    if (confirm("Reset all progress? This cannot be undone.")) {
      game.save.reset();
      location.reload();
    }
  });

  const sliderMaster = document.getElementById("slider-vol-master");
  const sliderMusic  = document.getElementById("slider-vol-music");
  const sliderSfx    = document.getElementById("slider-vol-sfx");

  if (sliderMaster) {
    sliderMaster.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById("label-vol-master").textContent = `${val}%`;
      game.audio.setMasterVolume(val / 100);
      game.save.data.settings.masterVolume = val / 100;
      game.save.save();
    });
  }

  if (sliderMusic) {
    sliderMusic.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById("label-vol-music").textContent = `${val}%`;
      game.audio.setMusicVolume(val / 100);
      game.save.data.settings.musicVolume = val / 100;
      game.save.save();
    });
  }

  if (sliderSfx) {
    sliderSfx.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById("label-vol-sfx").textContent = `${val}%`;
      game.audio.setSfxVolume(val / 100);
      game.save.data.settings.sfxVolume = val / 100;
      game.save.save();
    });
  }
}

export function renderCollection(game, onSelectSkin) {
  const container = document.getElementById("collection-grid");
  if (!container) return;
  container.innerHTML = "";
  
  const saveData = game.save.data;

  for (const skin of CONFIG.SKINS) {
    const unlocked = saveData.unlockedSkins.includes(skin.id);
    const equipped = saveData.equippedSkin === skin.id;

    const card = document.createElement("div");
    card.className = `shop-card${unlocked ? "" : " locked"}${equipped ? " selected" : ""}`;
    card.dataset.id = skin.id;

    // Use PNG extension for images (fallback to color if image missing/not loading)
    card.innerHTML = `
      <div class="shop-card-img-wrap">
        <canvas class="shop-card-canvas" width="80" height="80" data-skin-id="${skin.id}"></canvas>
      </div>
      <div class="shop-card-name" style="color: ${skin.glowColor || skin.color}">${skin.name}</div>
      ${equipped ? `<div class="shop-card-owned">EQUIPPED</div>` : (unlocked ? `<div class="shop-card-owned">OWNED</div>` : `<div class="shop-card-price">🪙 ${skin.cost}</div>`)}
    `;

    card.addEventListener("click", () => {
      container.querySelectorAll(".shop-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      onSelectSkin(skin);
    });

    container.appendChild(card);
  }
}

export function renderSettings(settings) {
  const sliderMaster = document.getElementById("slider-vol-master");
  const sliderMusic  = document.getElementById("slider-vol-music");
  const sliderSfx    = document.getElementById("slider-vol-sfx");

  const vMaster = settings.masterVolume !== undefined ? Math.round(settings.masterVolume * 100) : 80;
  const vMusic  = settings.musicVolume  !== undefined ? Math.round(settings.musicVolume * 100)  : 50;
  const vSfx    = settings.sfxVolume    !== undefined ? Math.round(settings.sfxVolume * 100)    : 70;

  if (sliderMaster) {
    sliderMaster.value = vMaster;
    document.getElementById("label-vol-master").textContent = `${vMaster}%`;
  }
  if (sliderMusic) {
    sliderMusic.value = vMusic;
    document.getElementById("label-vol-music").textContent = `${vMusic}%`;
  }
  if (sliderSfx) {
    sliderSfx.value = vSfx;
    document.getElementById("label-vol-sfx").textContent = `${vSfx}%`;
  }
  
  // Also sync main menu icons
  const mmMusic = document.getElementById("mm-toggle-music");
  const mmSfx = document.getElementById("mm-toggle-sfx");
  if (mmMusic) mmMusic.style.opacity = settings.musicEnabled !== false ? "1" : "0.5";
  if (mmSfx) mmSfx.style.opacity = settings.sfxEnabled !== false ? "1" : "0.5";
}

export default { bindScreenHandlers, renderCollection, renderSettings };
