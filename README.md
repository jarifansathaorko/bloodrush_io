# 🦟 BloodRush.io (v1.5.1)

**A high-performance HTML5 mosquito survival .io game — eat, dash, and climb the food chain!**

![BloodRush.io](https://img.shields.io/badge/Platform-HTML5-orange)
![Version](https://img.shields.io/badge/Version-v1.5.1-crimson)
![License](https://img.shields.io/badge/License-MIT-blue)
![CrazyGames](https://img.shields.io/badge/Target-CrazyGames-green)

---

## 🎮 How to Play

**Open `index.html` in any modern browser.** No server, no build step required.

Or serve locally with:
```bash
npx serve .
# then open http://localhost:3000
```

---

## 🕹️ Controls

| Input | Action |
|-------|--------|
| `W A S D` / `↑ ↓ ← →` | Move mosquito |
| `Space` / `Shift` / `Right Click` | 🚀 **Dash & Strike!** (Proboscis thrust attack) |
| Touch Joystick + Dash Button | Move & Dash (Mobile) |
| `Esc` / Pause button | Pause game |

**Goal:** Feed on sparkling ruby blood drops and golden flower nectar to recharge boost stamina, dash to strike smaller mosquitoes with your needle proboscis, avoid giant predators, and climb to #1!

---

## 🎯 Core Gameplay & Combat Mechanics

- **Dash & Strike Attack:** Press `Space`, `Shift`, or `Right-Click` to surge forward at **1.75x speed** with a proboscis thrust! Consumes stamina (recharged by food & kills).
- **Passive Food System:** Over 400 sparkling **Blood Droplets** and **Golden Flower Nectar Orbs** scattered across the garden allow constant growth and dynamic grazing zones.
- **Corpse Bursts:** Devouring an enemy mosquito triggers an explosive burst of blood droplets for instant rewards!
- **Realistic AI Personalities:** 5 specialized AI behaviors (Wanderer, Hunter, Coward, Opportunist, Aggressor) with terrain obstacle cover-seeking and strategic boost attacks.
- **Proboscis Piercing Collision:** Direct hits with your needle stinger guarantee clean, instant kills with floating combat feedback (`CRITICAL PIERCE!`, `CRUNCH!`).
- **Rewarded Revives:** Watch an ad on death to revive directly in the arena with temporary invulnerability shields.

---

## ⚡ High-Performance Architecture (v1.5.1)

```
bloodrush-io/
├── index.html              ← App entry point with preloader & unified menu
├── css/
│   ├── main.css            ← Design system, typography, animations & preloader
│   └── ui.css              ← Screen & HUD component styles
├── js/
│   ├── main.js             ← Entry point (bootstrap & preloader dismissal)
│   ├── config.js           ← Central game configuration & constants
│   ├── core/
│   │   ├── game.js         ← GameManager (main orchestrator, game loop)
│   │   ├── state-machine.js← App + match state machines
│   │   ├── input.js        ← Keyboard + touch + mouse input
│   │   └── time.js         ← Delta time, FPS, fixed timestep
│   ├── entities/
│   │   ├── player.js       ← Player with state machine & power-up handling
│   │   ├── enemy.js        ← Enemy entity with AI state, personality & dynamic speed
│   │   ├── food.js         ← Blood drops & nectar with integer counter IDs
│   │   └── powerup.js      ← Power-up entity with pulse animations
│   ├── systems/
│   │   ├── renderer.js     ← Canvas 2D rendering pipeline
│   │   ├── camera.js       ← Smooth follow camera with zoom clamped to [0.35, 1.0]
│   │   ├── collision.js    ← Zero-allocation spatial hash grid
│   │   ├── match-manager.js← Timer, phases, arena shrink
│   │   ├── enemy-manager.js← Spatial hash enemy collisions & frame-delayed audio
│   │   ├── food-manager.js ← Spatial hash player & enemy food grazing
│   │   ├── ai-manager.js   ← 5-personality AI state machine with cover-seeking
│   │   ├── vfx-manager.js  ← Particle trails, glitch bytes, shockwaves & halos
│   │   ├── skin-drawers.js ← Specialized procedural skin rendering
│   │   ├── powerup-manager.js← Power-up spawning & magnet physics
│   │   └── environment.js  ← Procedural garden arena & obsidian shards
│   ├── ui/
│   │   ├── ui-manager.js   ← DOM element reuse & diffing, toast notifications
│   │   └── screens.js      ← Button handlers, collection UI, non-blocking toasts
│   ├── progression/
│   │   ├── save-manager.js ← localStorage versioned persistence
│   │   ├── economy.js      ← Match rewards, skin purchases
│   │   └── missions.js     ← Daily mission system
│   ├── audio/
│   │   └── audio-manager.js← Web Audio API synthesizer (zero external audio files)
│   └── sdk/
│       └── crazygames.js   ← CrazyGames SDK integration & rewarded ads
└── README.md
```

### Key Performance Innovations

| Feature | Solution | Impact |
|---------|----------|--------|
| **Spatial Grid Food Collision** | Replaced O(n) & O(n*m) loops with `CollisionSystem` spatial grid | Eliminates 32,000+ checks/frame |
| **Spatial Grid Enemy Eating** | Replaced O(n²) pairwise loop with cell-bucket queries | Drops pair checks from 3,200 to ~80/frame |
| **Zero-Allocation Grid** | Reuses array buckets in `CollisionSystem` without clearing Maps | 0 GC memory allocations per frame |
| **Leaderboard DOM Diffing** | Cached DOM elements & diffed text/classes in `UIManager` | Eliminates innerHTML layout thrashing |
| **Preloader & Font Optimization** | HTML preconnect + font-display:swap + CSS preloader | Zero layout jump, smooth first paint |
| **Frame-Delayed Audio** | Replaced `setTimeout` with game loop delta-time accumulator | Deterministic audio, zero orphaned timers |
| **In-Game Toast System** | Non-blocking glassmorphic toasts replace blocking `alert()` | Smooth uninterrupted gameplay & audio |

---

## 📦 CrazyGames Compliance

- ✅ Initial download size: **< 60KB**
- ✅ SDK: `gameplayStart/Stop` and rewarded ad integration
- ✅ No banner ads interrupting active gameplay
- ✅ PEGI-12 compliant
- ✅ Mobile touch controls & desktop keyboard/mouse support
- ✅ 100% relative paths, works standalone

---

## 💾 Save Data

All progress persists in `localStorage` under key `bloodrush_save_v1`:
- Level, XP, Coins, Gems
- Equipped & unlocked skins
- Daily missions progress
- Best score, best rank, total matches/kills
- Settings (music/sfx volume and toggles)

---

*BloodRush.io — v1.5.1*
