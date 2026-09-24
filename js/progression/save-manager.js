// ============================================================
// BloodRush.io — Save Manager (Clean Fresh Account Defaults)
// ============================================================
import { CONFIG } from "../config.js";
import { CrazyGames } from "../sdk/crazygames.js";

const DEFAULT_SAVE = {
  version: CONFIG.SAVE.VERSION,
  playerId: null,
  username: "",
  level: 1,
  xp: 0,
  coins: 50, // fresh player starts with 50 gold
  gems: 0, // no fake gems
  equippedSkin: "cyber_drone",
  unlockedSkins: ["cyber_drone", "default"],
  achievements: [],
  bestScore: 0,
  bestRank: 999,
  longestSurvival: 0,
  totalMatches: 0,
  totalKills: 0,
  topScores: [
    { name: "ApexVamp", score: 4850 },
    { name: "BloodLord", score: 3420 },
    { name: "CrimsonDart", score: 2190 },
  ],
  lastDailyRewardClaimed: 0,
  settings: {
    musicEnabled:  true,
    sfxEnabled:    true,
    masterVolume:  0.8,
    musicVolume:   0.5,
    sfxVolume:     0.7,
    quality:       "high",
    showFPS:       false,
  },
  lastSaved: null,
};

export class SaveManager {
  constructor() {
    this.data = null;
  }

  load() {
    try {
      const raw = localStorage.getItem(CONFIG.SAVE.KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = Object.assign({}, DEFAULT_SAVE, parsed);
        this._migrate(parsed.version);
      } else {
        this.data = this._createDefault();
        this.save();
      }
    } catch (e) {
      console.warn("Save load failed, resetting:", e);
      this.data = this._createDefault();
      this.save();
    }
    return this.data;
  }

  save() {
    try {
      this.data.lastSaved = Date.now();
      localStorage.setItem(CONFIG.SAVE.KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn("Save failed:", e);
    }
  }

  reset() {
    this.data = this._createDefault();
    this.save();
    return this.data;
  }

  _createDefault() {
    const d = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    d.playerId = "player_" + Math.random().toString(36).substr(2, 9);
    return d;
  }

  _migrate(fromVersion) {
    if (!this.data.unlockedSkins) this.data.unlockedSkins = ["cyber_drone", "default"];
    if (!this.data.unlockedSkins.includes("cyber_drone")) {
      this.data.unlockedSkins.unshift("cyber_drone");
    }
    if (!this.data.equippedSkin || this.data.equippedSkin === "default") {
      this.data.equippedSkin = "cyber_drone";
    }
    this.data.version = CONFIG.SAVE.VERSION;
  }

  get(key) {
    return this.data ? this.data[key] : null;
  }
  set(key, value) {
    if (this.data) {
      this.data[key] = value;
      this.save();
    }
  }

  getUsername() {
    return this.data && this.data.username ? this.data.username.trim() : "";
  }

  setUsername(name) {
    if (this.data) {
      this.data.username = (name || "").trim().slice(0, 15);
      this.save();
    }
  }

  addCoins(amount) {
    this.data.coins = Math.max(0, this.data.coins + amount);
    this.save();
  }

  addXP(amount) {
    this.data.xp += amount;
    this._checkLevelUp();
    this.save();
  }

  _checkLevelUp() {
    const thresholds = CONFIG.ECONOMY.XP_PER_LEVEL;
    while (
      this.data.level < thresholds.length &&
      this.data.xp >= thresholds[this.data.level]
    ) {
      this.data.level++;
    }
  }

  unlockSkin(skinId) {
    if (!this.data.unlockedSkins.includes(skinId)) {
      this.data.unlockedSkins.push(skinId);
      this.save();
    }
  }

  equipSkin(skinId) {
    if (this.data.unlockedSkins.includes(skinId)) {
      this.data.equippedSkin = skinId;
      this.save();
      return true;
    }
    return false;
  }

  updateMatchStats({ kills, rank, score, size, survivalTime = 0, username = '' }) {
    this.data.totalMatches++;
    this.data.totalKills += kills;
    if (score > this.data.bestScore) this.data.bestScore = score;
    if (rank < this.data.bestRank) this.data.bestRank = rank;
    if (survivalTime > this.data.longestSurvival) this.data.longestSurvival = survivalTime;

    // Maintain top-3 leaderboard
    if (!this.data.topScores || this.data.topScores.length === 0) {
      this.data.topScores = [
        { name: "ApexVamp", score: 4850 },
        { name: "BloodLord", score: 3420 },
        { name: "CrimsonDart", score: 2190 },
      ];
    }

    const name = username || this.data.username || "Hunter";
    if (score > 0) {
      // Check if player is already in topScores, replace or add
      const existingIdx = this.data.topScores.findIndex((e) => e.name === name);
      if (existingIdx !== -1) {
        if (score > this.data.topScores[existingIdx].score) {
          this.data.topScores[existingIdx].score = score;
        }
      } else {
        this.data.topScores.push({ name, score });
      }
      this.data.topScores.sort((a, b) => b.score - a.score);
      this.data.topScores = this.data.topScores.slice(0, 3); // keep top 3

      // Submit to CrazyGames Leaderboard if connected
      CrazyGames.submitScore(score);
    }

    this.save();
  }

  /**
   * Returns a full 10-player leaderboard containing global champions
   * and the current player's personal high score.
   */
  getFullLeaderboard() {
    const defaultChampions = [
      { name: "ApexVamp",    score: 4850 },
      { name: "BloodLord",   score: 3420 },
      { name: "CrimsonDart", score: 2190 },
      { name: "CyberMoth",   score: 1850 },
      { name: "DarkWing",    score: 1620 },
      { name: "StingerX",    score: 1410 },
      { name: "PhantomBite", score: 1280 },
      { name: "HiveMind",    score: 1150 },
      { name: "VenomShot",   score: 980 },
      { name: "ShadowBuzz",  score: 820 },
    ];

    const playerName = this.data.username || "Hunter";
    const playerScore = this.data.bestScore || 0;

    // Filter out duplicate if champion matches player name
    const list = defaultChampions.filter((c) => c.name !== playerName);

    // If player has a score, insert into rankings
    if (playerScore > 0) {
      list.push({ name: playerName, score: playerScore, isPlayer: true });
    }

    list.sort((a, b) => b.score - a.score);

    // Attach ranks 1..N
    return list.slice(0, 10).map((entry, idx) => ({
      rank: idx + 1,
      name: entry.name,
      score: entry.score,
      isPlayer: entry.isPlayer || (entry.name === playerName && playerScore > 0),
    }));
  }
}

export default SaveManager;
