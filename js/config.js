// ============================================================
// BloodRush.io — Configuration Constants
// ============================================================
// ALL tunable balance values live here. Do not bury numbers
// in entity or system files — adjust them here.
// ============================================================

export const CONFIG = {
  // ── Arena (Expanded 8000x8000 Cyber-Grid) ────
  ARENA: {
    WIDTH: 8000,
    HEIGHT: 8000,
    SHRINK_START_TIME: 210, // seconds into match when shrink begins (Phase 4: 3:30)
    SHRINK_RATE: 2.8,       // smooth inward compression
    SHRINK_MIN_RADIUS: 700, // central arena showdown radius
    BOUNDARY_DAMAGE_RATE: 1.2, // size lost per second outside boundary
    BG_COLOR: "#0B0C10",   // dark midnight navy/black
    CENTRAL_RADIUS: 2400,  // central arena radius
  },

  // ── Match (5-Minute / 300-Second Match Progression) ────────
  MATCH: {
    DURATION: 300,          // 5 minutes (300 seconds)
    COUNTDOWN: 3,           // 3-second starting countdown
    PHASE_1_END: 60,        // 0:00 - 1:00: Dawn Exploration & Early Growth
    PHASE_2_END: 135,       // 1:00 - 2:15: Garden Swarm & Territory Battles
    PHASE_3_END: 210,       // 2:15 - 3:30: Predator Escalation & Apex Hunters
    PHASE_4_END: 255,       // 3:30 - 4:15: Red Zone Danger Shrink
    PHASE_5_END: 300,       // 4:15 - 5:00: Blood Rush Finale
  },

  // ── Player (Smooth, Balanced, Momentum-Driven Scaling) ─────
  PLAYER: {
    START_SIZE: 14,              // starting size (always 0 + orbs)
    BASE_SPEED: 310,             // agile, snappy base speed (px/sec)
    MIN_SPEED_FLOOR: 70,         // speed floor — large mosquitoes WILL be slow
    SPEED_DECAY_RATE: 0.72,      // stronger logarithmic softening curve
    EAT_THRESHOLD: 1.15,         // must be 15% larger to eat safely
    GROWTH_RATE: 0.05,           // legacy — not used for kills (see KILL_GROWTH_PERCENT)
    KILL_GROWTH_PERCENT: 0.20,   // fraction of eaten enemy size player gains (adjustable)
    GROWTH_DIMINISHING_FACTOR: 0.004, // effectiveGrowth = base/(1 + factor*currentSize)
    MASS_DECAY_START: 60,        // size threshold where decay begins (sooner to prevent runaway)
    MASS_DECAY_BASE_RATE: 0.25,  // decay rate at MASS_DECAY_START (size/sec)
    MASS_DECAY_SCALE: 0.04,      // additional decay per size unit above threshold (stronger)
    INVINCIBLE_DURATION: 2.0,    // spawn protection (seconds)
    SPAWN_PROTECTION: 3.0,       // full spawn protection duration
    MAX_SIZE: 200,               // hard cap — prevents entities filling the entire screen

    // Boost & Rear Blood Propulsion Burst
    DASH_SPEED_MULTIPLIER: 1.85,   // propulsion multiplier
    DASH_DURATION: 0.42,           // duration of full dash glide
    BOOST_BURST_DURATION: 0.24,    // intense rear blood spray duration
    DASH_STAMINA_COST: 30,         // stamina per dash
    STAMINA_MAX: 100,              // maximum stamina
    STAMINA_RECHARGE_RATE: 8,      // passive recharge (much slower — food is primary)
    STAMINA_FOOD_RECHARGE: 18,     // stamina restored per blood orb collected
    STAMINA_NECTAR_RECHARGE: 28,   // stamina restored per nectar orb collected
    STAMINA_KILL_RECHARGE: 25,     // stamina restored on kill
    PIERCE_HITBOX_EXTEND: 1.8,     // forward reach multiplier during dash
    RECOIL_IMPULSE: 0.18,          // squash/stretch impulse factor
  },

  // ── Food (Blood Droplets & Golden Nectar Drops) ────────────
  FOOD: {
    INITIAL_COUNT: 400,         // dense field of drops across 6000x6000
    MAX_COUNT: 480,
    SPAWN_INTERVAL: 0.20,       // continuous passive respawn
    BLOOD_DROP_SIZE: 4.5,
    NECTAR_DROP_SIZE: 5.5,
    SIZE_GAIN_BLOOD: 1.0,       // +1 size unit per orb (diminishing returns still apply)
    SIZE_GAIN_NECTAR: 2.0,      // +2 size unit per nectar orb
    MAGNET_PULL_RADIUS: 90,
    MAGNET_POWERUP_RADIUS: 280,
    CORPSE_BURST_COUNT: 12,     // blood droplets splattered when an enemy dies
  },

  // ── Enemy AI (Populated Map & Scaled Progression) ──────────
  ENEMY: {
    INITIAL_COUNT: 80,          // active AI mosquitoes across the 8000x8000 world
    MAX_COUNT: 110,
    MIN_SIZE: 8,
    MAX_SIZE: 160,              // larger ceiling for psychological pressure
    RESPAWN_DELAY: 1.5,         // faster respawn
    VISION_RANGE: 600,          // increased vision — more reactive AI
    BLIND_SPOT_ANGLE: 0.8,      // smaller blind spot — harder to sneak
    REACTION_DELAY_MIN: 0.08,   // faster reactions
    REACTION_DELAY_MAX: 0.22,   // faster reactions
    FLEE_SPEED_FACTOR: 0.95,
    FLEE_THRESHOLD: 1.10,
    CHASE_THRESHOLD: 1.03,      // more aggressive: chase even at 3% size advantage
    PLAYER_TARGET_FRACTION: 0.30, // 30% of AI actively hunt the player when able
    NAMES: [
      "Buzzworth",
      "Nibbles",
      "Draculette",
      "Stabby",
      "Sucksworth",
      "Chomper",
      "Bloodbane",
      "Zapper",
      "Proboscis Pete",
      "Lady Bite",
      "Sir Stings",
      "Skeetmaster",
      "Whineface",
      "Noseeum",
      "Gnasher",
      "Mosqui-King",
      "Vampy",
      "Needler",
      "Fang",
      "SwarmBot",
      "Crimson Dart",
      "Apex Wasp",
      "Shadow Fly",
      "Zephyr",
      "Venomous Pete",
    ],
  },

  // ── AI Personalities ───────────────────────────────────────
  AI_PERSONALITY: {
    WANDERER:    { weight: 0.25 },
    HUNTER:      { weight: 0.25 },
    COWARD:      { weight: 0.2  },
    OPPORTUNIST: { weight: 0.15 },
    AGGRESSOR:   { weight: 0.15 },
  },

  // ── AI Boost (Energy-Based System for Enemies) ────────────
  AI_BOOST: {
    ENERGY_MAX: 100,              // max boost energy for AI
    ENERGY_START: 60,             // initial energy on spawn
    FOOD_RECHARGE: 15,            // energy per blood orb eaten
    NECTAR_RECHARGE: 22,          // energy per nectar orb eaten
    KILL_RECHARGE: 20,            // energy restored on kill
    COST: 30,                     // energy cost per boost use
    COOLDOWN_AFTER_USE: 1.2,      // seconds before boost can fire again
    MIN_ENERGY_TO_USE: 30,        // won't boost unless energy >= this
    // Per-personality boost thresholds (fraction of max energy required)
    AGGRESSOR_THRESHOLD: 0.30,    // aggressive: boost early
    HUNTER_THRESHOLD: 0.40,
    WANDERER_THRESHOLD: 0.50,
    OPPORTUNIST_THRESHOLD: 0.45,
    COWARD_THRESHOLD: 0.65,       // coward: saves boost for escape
  },

  // ── Spawn Safety ──────────────────────────────────────────
  SPAWN: {
    PROTECTION_DURATION: 3.0,     // seconds of invincibility after spawn
    MIN_DISTANCE_FROM_LARGE: 650, // min distance from any entity > LARGE_ENTITY_SIZE
    LARGE_ENTITY_SIZE: 60,        // size threshold that makes a spawn location unsafe
    MAX_ATTEMPTS: 30,             // max retries before picking best available
  },

  // ── Kill Sound Anti-Spam ──────────────────────────────────
  AUDIO: {
    KILL_SOUND_COOLDOWN: 0.85,    // minimum seconds between kill sounds
    KILL_MULTI_WINDOW: 2.0,       // window for counting rapid kills
    MASTER_VOLUME: 0.8,           // default master volume
    MUSIC_VOLUME: 0.5,            // default music volume
    SFX_VOLUME: 0.7,              // default sfx volume
  },

  // ── Power-ups ──────────────────────────────────────────────
  POWERUP: {
    SPAWN_INTERVAL: 8,
    MAX_COUNT: 9,
    DESPAWN_TIME: 18,
    TYPES: {
      SPEED: {
        duration: 6.0,
        speedBoost: 0.45,
        color: "#FFD700",
        symbol: "⚡",
      },
      SHIELD: { duration: 0, maxHits: 1, color: "#4FC3F7", symbol: "🛡" },
      FRENZY: {
        duration: 9,
        growthBoost: 0.65,
        color: "#FF5722",
        symbol: "🔥",
      },
      MAGNET: { duration: 6, pullRange: 280, color: "#CE93D8", symbol: "🧲" },
    },
  },

  // ── Proximity Radar System ─────────────────────────────────
  RADAR: {
    SIZE: 155,
    DETECTION_RADIUS: 1400,
    SWEEP_SPEED: 3.2,
    PULSE_FREQUENCY: 3.0,
    SHOW_EDGE_WARNINGS: true,
    EDGE_WARNING_DIST: 2200,
  },

  // ── Rendering & Visuals ────────────────────────────────────
  RENDER: {
    MINIMAP_PADDING: 16,
    SHADOW_ALPHA: 0.14,
    PARTICLE_MAX: 90,
    BLOOD_BURST_PARTICLE_MAX: 50,
    FLOATING_TEXT_MAX: 30,
    TARGET_FPS: 60,
  },

  // ── Colors ─────────────────────────────────────────────────
  COLORS: {
    PLAYER: "#00E5FF",
    PLAYER_GLOW: "#84FFFF",
    BACKGROUND: "#0B0C10",
    ARENA_BG: "#0D1117",
    ARENA_CENTER: "#121820",
    ARENA_BORDER: "#FF1744",
    ARENA_RING_2: "#FF5252",
    PATH_GRAVEL: "#1F2533",
    PATH_BORDER: "#2D3748",
    GRASS: "#0F1626",
    GRASS_DARK: "#0B101D",
    FLOWER_1: "#FF1744",
    FLOWER_2: "#00E5FF",
    FLOWER_3: "#D500F9",
    FLOWER_CENTER: "#FFFFFF",
    ROCK: "#1A202C",
    ROCK_HIGHLIGHT: "#2D3748",
    PUDDLE: "#FF1744",
    PUDDLE_BORDER: "#D50000",
    BUSH: "#121820",
    BUSH_DARK: "#0B0F14",
    BUSH_FLOWER: "#FF1744",
    BLOOD_DROP: "#FF1744",
    BLOOD_BURST: "#D50000",
    BLOOD_SPRAY: "#FF5252",
    NECTAR_DROP: "#00E5FF",
    BOUNDARY: "rgba(255, 23, 68, 0.85)",
    HUD_BG: "rgba(11, 12, 16, 0.92)",
    HUD_TEXT: "#E2E8F0",
    RANK_GOLD: "#FFD700",
    RANK_SILVER: "#94A3B8",
    RANK_BRONZE: "#B45309",
  },

  // ── Economy (Balanced for 5-Minute Matches) ────────────────
  ECONOMY: {
    COIN_PER_KILL: 8,
    COIN_PER_SIZE: 0.15,
    XP_PER_KILL: 30,
    XP_PER_RANK: 15,
    XP_PER_MATCH: 100,
    XP_PER_LEVEL: [0, 100, 250, 500, 1000, 2000, 3500, 6000, 10000],
    DAILY_REWARD_MIN: 30,
    DAILY_REWARD_MAX: 75,        // hard cap — never exceed 75 coins
  },

  // ── Skins ──────────────────────────────────────────────────
  SKINS: [
    {
      id: "cyber_drone",
      name: "Cyber Drone",
      img: "assets/skins/cyber_drone.png",
      color: "#00E5FF",
      glowColor: "#84FFFF",
      unlocked: true,
      cost: 0,
      rarity: "DEFAULT",
      vfx: "cyber_drone",
      spriteSheet: {
        cols: 4,
        rows: 3,
        frameWidth: 256,
        frameHeight: 256,
        flightFrames: [0, 1, 2, 3, 2, 1], // Smooth wing flap loop
        boostFrames: [8, 9, 10, 11, 10, 9] // Powerful thruster boost burst
      }
    },
    {
      id: "default",
      name: "Classic Crimson",
      color: "#E8450A",
      glowColor: "#FF7043",
      unlocked: true,
      cost: 0,
      vfx: null
    },
    // Tier 1 (1,000 coins)
    {
      id: "neon_drifter",
      name: "Neon Drifter",
      img: "assets/skins/neon_drifter.png",
      color: "#00E5FF",
      glowColor: "#84FFFF",
      unlocked: false,
      cost: 1000,
      rarity: "RARE",
      vfx: "neon_drifter"
    },
    {
      id: "bloodbyte",
      name: "BloodByte",
      img: "assets/skins/bloodbyte.png",
      color: "#FF1744",
      glowColor: "#FF5252",
      unlocked: false,
      cost: 1000,
      rarity: "RARE",
      vfx: "bloodbyte"
    },
    // Tier 2 (10,000 coins)
    {
      id: "phantom_vector",
      name: "Phantom Vector",
      img: "assets/skins/phantom_vector.png",
      color: "#304FFE",
      glowColor: "#536DFE",
      unlocked: false,
      cost: 10000,
      rarity: "EPIC",
      vfx: "phantom_vector"
    },
    {
      id: "overclock",
      name: "Overclock",
      img: "assets/skins/overclock.png",
      color: "#00E5FF",
      glowColor: "#84FFFF",
      unlocked: false,
      cost: 10000,
      rarity: "EPIC",
      vfx: "overclock"
    },
    // Tier 3 (50,000 coins)
    {
      id: "blood_reactor",
      name: "Blood Reactor",
      img: "assets/skins/blood_reactor.png",
      color: "#FF9100",
      glowColor: "#FFD740",
      unlocked: false,
      cost: 50000,
      rarity: "LEGENDARY",
      vfx: "blood_reactor"
    },
    {
      id: "void_mosquito",
      name: "Void Mosquito",
      img: "assets/skins/void_mosquito.png",
      color: "#AA00FF",
      glowColor: "#E040FB",
      unlocked: false,
      cost: 50000,
      rarity: "LEGENDARY",
      vfx: "void_mosquito"
    },
    {
      id: "cyber_hornet",
      name: "Cyber Hornet",
      img: "assets/skins/cyber_hornet.png",
      color: "#FFD700",
      glowColor: "#FFF176",
      unlocked: false,
      cost: 50000,
      rarity: "LEGENDARY",
      vfx: "cyber_hornet"
    },
    // Tier 4 (100,000 coins)
    {
      id: "blood_god",
      name: "Blood God",
      img: "assets/skins/blood_god.png",
      color: "#D50000",
      glowColor: "#FF1744",
      unlocked: false,
      cost: 100000,
      rarity: "MYTHIC",
      vfx: "blood_god"
    },
    {
      id: "digital_wraith",
      name: "Digital Wraith",
      img: "assets/skins/digital_wraith.png",
      color: "#651FFF",
      glowColor: "#7C4DFF",
      unlocked: false,
      cost: 100000,
      rarity: "MYTHIC",
      vfx: "digital_wraith"
    },
    {
      id: "the_hive",
      name: "The Hive",
      img: "assets/skins/the_hive.png",
      color: "#000000",
      glowColor: "#00E5FF",
      unlocked: false,
      cost: 100000,
      rarity: "MYTHIC",
      vfx: "the_hive"
    },
  ],

  // ── AI Cosmetics ───────────────────────────────────────────
  AI_SKIN_WEIGHTS: {
    default: 0.70,
    tier1:   0.20,
    tier2:   0.08,
    tier3:   0.019,
    tier4:   0.001
  },

  // ── Environment ────────────────────────────────────────────
  ENV: {
    GRASS_PATCH_COUNT: 160,
    FLOWER_COUNT: 140,
    ROCK_COUNT: 70,
    PUDDLE_COUNT: 40,
    BUSH_COUNT: 85,
    STONE_RING_COUNT: 90,
    PATH_WAYPOINTS: 20,
    PUDDLE_SPEED_BOOST: 0.2,
    BUSH_SLOW_FACTOR: 0.7,
  },

  // ── Save ───────────────────────────────────────────────────
  SAVE: {
    KEY: "bloodrush_save_v4",   // bumped version for cyber_drone default
    VERSION: 4,
  },
};

export const SKIN_MAP = new Map(CONFIG.SKINS.map((s) => [s.id, s]));
export function getSkin(id) {
  return SKIN_MAP.get(id) || CONFIG.SKINS[0];
}
CONFIG.getSkin = getSkin;
CONFIG.SKIN_MAP = SKIN_MAP;

export default CONFIG;
