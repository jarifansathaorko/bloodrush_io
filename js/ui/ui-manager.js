// ============================================================
// BloodRush.io — UI Manager
// Bridges game state to DOM screen visibility
// ============================================================

const SCREENS = [
  "screen-main-menu",
  "screen-name-input",
  "screen-mode-select",
  "screen-pre-match",
  "screen-gameplay",
  "screen-pause",
  "screen-game-over",
  "screen-victory",
  "screen-reward",
  "screen-collection",
  "screen-settings",
];

export class UIManager {
  constructor() {
    this._screens = {};
    for (const id of SCREENS) {
      this._screens[id] = document.getElementById(id);
    }
    this._activeScreen = null;
  }

  showScreen(id) {
    for (const [key, el] of Object.entries(this._screens)) {
      if (el) el.classList.toggle("active", key === id);
    }
    this._activeScreen = id;
  }

  hideAll() {
    for (const el of Object.values(this._screens)) {
      if (el) el.classList.remove("active");
    }
    this._activeScreen = null;
  }

  updateHUD(player, matchManager, enemyManager, username = "You") {
    if (!player) return;

    const rank  = enemyManager.getPlayerRank(player, username);
    const total = enemyManager.enemies.filter((e) => e.alive).length + 1;
    const size  = Math.floor(player.size);
    const time  = matchManager.formatTime();
    const phase = matchManager.phase;

    this._set("hud-rank",  `#${rank}/${total}`);
    this._set("hud-size",  `${size}`);
    // Timer removed per design — no countdown needed without explicit match duration UI

    // Phase indicator
    const phaseEl = document.getElementById("hud-phase");
    if (phaseEl) {
      const labels = [
        "",
        "DAWN HUNT",
        "SWARM",
        "PREDATORS",
        "⚠ ZONE CLOSING",
        "🔥 BLOOD RUSH",
      ];
      phaseEl.textContent = labels[phase] || "";
      phaseEl.className   = `hud-phase phase-${phase}`;
    }

    // Power-up indicator
    const puEl = document.getElementById("hud-powerup");
    if (puEl && player.powerup) {
      const cfg = { SPEED: "⚡", SHIELD: "🛡", FRENZY: "🔥", MAGNET: "🧲" };
      puEl.textContent  = cfg[player.powerup] + " " + Math.ceil(player.powerupTimer) + "s";
      puEl.style.display = "flex";
    } else if (puEl) {
      puEl.style.display = "none";
    }

    // ── Boost / Stamina bar ───────────────────────────────
    this._updateBoostBar(player);
  }

  _updateBoostBar(player) {
    const fill     = document.getElementById("boost-bar-fill");
    const label    = document.getElementById("boost-bar-label");
    const container = document.getElementById("boost-bar-container");
    if (!fill || !label || !container) return;

    const pct = Math.floor((player.stamina / player.maxStamina) * 100);

    fill.style.width = `${pct}%`;

    // Color the bar based on level
    if (pct >= 100) {
      fill.className = "boost-fill boost-ready";
      label.textContent = "BOOST READY";
    } else if (pct <= 0) {
      fill.className = "boost-fill boost-empty";
      label.textContent = "COLLECT BLOOD TO RECHARGE";
    } else if (player.isDashing) {
      fill.className = "boost-fill boost-active";
      label.textContent = "BOOSTING...";
    } else {
      fill.className = "boost-fill boost-recharging";
      label.textContent = `BOOST  ${pct}%`;
    }
  }

  updateCountdown(seconds) {
    const el = document.getElementById("countdown-display");
    if (!el) return;
    if (seconds > 0) {
      el.textContent = Math.ceil(seconds);
      el.style.display = "flex";
    } else {
      el.textContent = "GO!";
      setTimeout(() => { el.style.display = "none"; }, 600);
    }
  }

  updateLeaderboard(rankings) {
    const el = document.getElementById("hud-leaderboard");
    if (!el || !rankings) return;
    const top5 = rankings.slice(0, 5);
    el.innerHTML = top5
      .map(
        (r, i) => `
      <div class="lb-row${r.isPlayer ? " lb-player" : ""}">
        <span class="lb-rank">#${i + 1}</span>
        <span class="lb-name">${r.name}</span>
        <span class="lb-size">${Math.floor(r.size)}</span>
      </div>
    `,
      )
      .join("");
  }

  updateJoystick(joystickState) {
    const knob = document.getElementById("joystick-knob");
    if (!knob) return;
    if (joystickState && joystickState.active) {
      const maxR = 30;
      knob.style.transform = `translate(${joystickState.dx * maxR}px, ${joystickState.dy * maxR}px)`;
    } else {
      knob.style.transform = "translate(0px, 0px)";
    }
  }

  updateCurrencyDisplay(coins, gems = 0, level = 1, xp = 0) {
    this._set("display-coins", coins !== undefined ? coins : 50);
    this._set("coll-coins",    coins !== undefined ? coins : 50);

    const lvlEl = document.getElementById("display-level");
    if (lvlEl) {
      if (xp > 0 || level > 1) {
        lvlEl.style.display = "inline-flex";
        lvlEl.textContent   = `Lv.${level}`;
      } else {
        lvlEl.style.display = "none";
      }
    }
  }

  updateMainMenuStats(saveData) {
    if (!saveData) return;
    // Show top-3 all-time scorers
    this.updateMainMenuLeaderboard(saveData);

    const inputEl = document.getElementById("input-player-name");
    if (inputEl && saveData.username) {
      inputEl.value = saveData.username;
    }
  }

  updateMainMenuLeaderboard(saveData) {
    const topScores = (saveData && saveData.topScores && saveData.topScores.length > 0)
      ? saveData.topScores
      : [
          { name: "ApexVamp", score: 4850 },
          { name: "BloodLord", score: 3420 },
          { name: "CrimsonDart", score: 2190 },
        ];
    const medals = ['🥇', '🥈', '🥉'];
    for (let i = 0; i < 3; i++) {
      const row = document.getElementById(`mm-lb-row-${i + 1}`);
      if (!row) continue;
      const entry = topScores[i];
      if (entry) {
        row.innerHTML = `
          <span class="mm-lb-medal">${medals[i]}</span>
          <span class="mm-lb-name">${entry.name}</span>
          <span class="mm-lb-score">${entry.score.toLocaleString()}</span>
        `;
        row.classList.remove('mm-lb-empty');
      } else {
        row.innerHTML = `
          <span class="mm-lb-medal">${medals[i]}</span>
          <span class="mm-lb-name" style="opacity:0.35">—</span>
          <span class="mm-lb-score" style="opacity:0.35">—</span>
        `;
        row.classList.add('mm-lb-empty');
      }
    }
  }

  updateDailyRewardTimer(timeLeftMs, canClaim) {
    const claimBtn       = document.getElementById("btn-claim-reward");
    const timerContainer = document.querySelector(".mm-reward-timer-container");
    const timeEl         = document.getElementById("mm-reward-time");

    if (canClaim) {
      if (claimBtn)       claimBtn.style.display      = "block";
      if (timerContainer) timerContainer.style.display = "none";
    } else {
      if (claimBtn)       claimBtn.style.display      = "none";
      if (timerContainer) timerContainer.style.display = "flex";

      if (timeEl) {
        const s    = Math.floor(timeLeftMs / 1000);
        const h    = Math.floor(s / 3600);
        const min  = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        timeEl.textContent = `${h.toString().padStart(2,"0")}:${min.toString().padStart(2,"0")}:${secs.toString().padStart(2,"0")}`;
      }
    }
  }

  showGameOver({ rank, size, kills, score, survivalTime, xp, coins, playerName }) {
    this._set("go-rank",        `#${rank}`);
    this._set("go-size",        Math.floor(size));
    this._set("go-kills",       kills);
    this._set("go-score",       score);
    this._set("go-xp",          `+${xp} XP`);
    this._set("go-coins",       `+${coins} 🪙`);
    this._set("go-player-name", playerName || "Hunter");

    // Format survival time MM:SS
    const st   = survivalTime || 0;
    const stM  = Math.floor(st / 60);
    const stS  = Math.floor(st % 60);
    this._set(
      "go-survival",
      `${stM.toString().padStart(2,"0")}:${stS.toString().padStart(2,"0")}`,
    );

    // Populate leaderboard
    this._buildGoLeaderboard(rank, score, playerName || "You");

    this.showScreen("screen-game-over");
  }

  _buildGoLeaderboard(playerRank, playerScore, playerName) {
    const list = document.getElementById("go-leaderboard-list");
    if (!list) return;
    list.innerHTML = "";

    const NAMES = ["SkullByte","NeonBuzz","VoidHunter","BloodAxe","CyberMoth",
      "DarkWing","StingerX","PhantomBite","HiveMind","ReactorFly",
      "GhostNeedle","IronBuzz","VenomShot","PixelFang","ShadowBuzz"];

    // Build 10 entries, inserting the real player at their rank
    const totalPlayers = 30;
    const entries = [];

    for (let i = 1; i <= Math.min(10, totalPlayers); i++) {
      if (i === playerRank) {
        entries.push({ pos: i, name: playerName, score: playerScore, isPlayer: true });
      } else {
        const fakeScore = Math.max(10, playerScore * (1 + (playerRank - i) * 0.15) + (Math.random() - 0.5) * 100);
        entries.push({ pos: i, name: NAMES[(i-1) % NAMES.length], score: Math.floor(fakeScore), isPlayer: false });
      }
    }
    // Ensure player appears even if rank > 10
    if (playerRank > 10) {
      entries.push({ pos: "...", name: "", score: "", isPlayer: false, separator: true });
      entries.push({ pos: playerRank, name: playerName, score: playerScore, isPlayer: true });
    }

    entries.sort((a,b) => (a.pos === "..." ? 1 : b.pos === "..." ? -1 : a.pos - b.pos));

    for (const e of entries) {
      const row = document.createElement("div");
      if (e.separator) {
        row.className = "go-lb-row";
        row.style.justifyContent = "center";
        row.style.color = "rgba(255,255,255,0.2)";
        row.style.fontSize = "0.7rem";
        row.textContent = "· · ·";
        list.appendChild(row);
        continue;
      }
      row.className = e.isPlayer ? "go-lb-row go-lb-player" : "go-lb-row";
      row.innerHTML = `
        <span class="go-lb-pos">${e.pos}</span>
        <span class="go-lb-name">${e.name}${e.isPlayer ? " 👤" : ""}</span>
        <span class="go-lb-score">${e.score}</span>
      `;
      list.appendChild(row);
    }
  }


  showVictory({ rank, size, kills, score, survivalTime }) {
    this._set("v-rank",  `#${rank}`);
    this._set("v-size",  Math.floor(size));
    this._set("v-kills", kills);
    this._set("v-score", score);

    const st  = survivalTime || 0;
    const stM = Math.floor(st / 60);
    const stS = Math.floor(st % 60);
    this._set(
      "v-survival",
      `${stM.toString().padStart(2,"0")}:${stS.toString().padStart(2,"0")}`,
    );

    this.showScreen("screen-victory");
  }

  _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
}

export default UIManager;
