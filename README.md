# 🦟 BloodRush.io

**A complete HTML5 mosquito survival .io game — eat or be eaten!**

![BloodRush.io](https://img.shields.io/badge/Platform-HTML5-orange)
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
| Touch D-Pad + Dash Button | Move & Dash (Mobile) |
| `Esc` / Pause button | Pause game |

**Goal:** Feed on sparkling ruby blood drops and golden flower nectar to grow fast, dash to strike smaller mosquitoes with your needle proboscis, avoid giant predators, and climb to #1!

---

## 🎯 Core Gameplay & Combat Mechanics

- **Dash & Strike Attack:** Press `Space`, `Shift`, or `Right-Click` to surge forward at **1.75x speed** with a proboscis thrust! Consumes stamina (recharges quickly).
- **Passive Food System:** Over 200 sparkling **Blood Droplets** and **Golden Flower Nectar Orbs** scattered across the garden allow constant growth and create lively grazing zones.
- **Corpse Bursts:** Devouring an enemy mosquito triggers a satisfying burst of blood drops for extra rewards!
- **Realistic AI Awareness:** Enemies have realistic vision cones with blind spots behind them. Sneak up from behind or ambush enemies grazing on nectar!
- **Eat Threshold:** You only need to be **5% larger** (`1.05x`) to eat a smaller mosquito.
- **Proboscis Piercing Collision:** Direct hits with your needle stinger guarantee clean, instant kills with floating combat feedback (`CRITICAL PIERCE!`, `CRUNCH!`).

### Match Phases
| Time | Phase | Description |
|------|-------|-------------|
| 0–30s | Hunt | Safe exploration, smaller enemies |
| 30–75s | Compete | Competition increases |
| 75–120s | Danger | Larger enemies, power-ups critical |
| 120–180s | Zone Closing | Arena shrinks, final survival |

### Power-ups
| Icon | Name | Effect |
|------|------|--------|
| ⚡ | Speed | +40% speed for 5 seconds |
| 🛡 | Shield | Block one lethal hit |
| 🔥 | Frenzy | +50% growth for 8 seconds |
| 🧲 | Magnet | Attract nearby power-ups |

### AI Personalities
- **Wanderer** — explores, avoids fights
- **Hunter** — seeks smaller targets aggressively
- **Coward** — flees larger enemies, hides in bushes
- **Opportunist** — attacks weakened/smallest targets
- **Aggressor** — constantly chases, high risk

---

## 🏗️ Architecture

```
bloodrush-io/
├── index.html              ← App entry point (all 11 screens)
├── css/
│   ├── main.css            ← Design system (variables, typography, animations)
│   └── ui.css              ← All screen & HUD component styles
├── js/
│   ├── main.js             ← Entry point (imports GameManager)
│   ├── config.js           ← All game constants
│   ├── core/
│   │   ├── game.js         ← GameManager (main orchestrator, game loop)
│   │   ├── state-machine.js← App + match state machines
│   │   ├── input.js        ← Keyboard + touch + mouse input
│   │   └── time.js         ← Delta time, FPS, fixed timestep
│   ├── entities/
│   │   ├── player.js       ← Player with state machine + power-ups
│   │   ├── enemy.js        ← Enemy with AI state + personality
│   │   └── powerup.js      ← Power-up entity with pulse animation
│   ├── systems/
│   │   ├── renderer.js     ← Canvas 2D rendering (all art = primitives)
│   │   ├── camera.js       ← Smooth follow camera with zoom
│   │   ├── collision.js    ← Spatial hash grid broad-phase collision
│   │   ├── match-manager.js← Timer, phases, arena shrink
│   │   ├── enemy-manager.js← Enemy pool, respawn queue, eating logic
│   │   ├── ai-manager.js   ← 5-personality AI state machine
│   │   ├── spawn-manager.js← (reserved for future use)
│   │   ├── powerup-manager.js← Power-up spawning + magnet physics
│   │   └── environment.js  ← Procedural garden arena generation
│   ├── ui/
│   │   ├── ui-manager.js   ← Screen visibility + HUD updates
│   │   └── screens.js      ← Button handlers, collection/mission UI
│   ├── progression/
│   │   ├── save-manager.js ← localStorage versioned persistence
│   │   ├── economy.js      ← Match rewards, skin purchases
│   │   └── missions.js     ← Daily mission system
│   ├── audio/
│   │   └── audio-manager.js← Web Audio API synthesizer (no files!)
│   └── sdk/
│       └── crazygames.js   ← CrazyGames SDK stub (Basic Launch ready)
└── README.md
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| No bundler | Opens directly in browser, simplest deployment |
| Canvas 2D for world | Efficient, no DOM-per-entity overhead |
| HTML/CSS for UI | Easy to style, accessible |
| Web Audio synthesis | No audio file downloads, tiny footprint |
| Canvas primitives for art | No image files, instant load |
| Spatial hash collision | O(1) lookup vs O(n²) brute force |
| ES6 modules | Clean imports, tree-shakeable, native browser support |

---

## 📦 CrazyGames Compliance

- ✅ Initial download size: **< 50KB** (no external assets)
- ✅ SDK stub: `gameplayStart/Stop` events ready
- ✅ No ads during gameplay
- ✅ No pay-to-win
- ✅ PEGI-12 compliant
- ✅ Desktop + Mobile responsive
- ✅ Relative paths only
- ✅ Works without server

---

## 💾 Save Data

All progress persists in `localStorage` under key `bloodrush_save_v1`:
- Level, XP, Coins, Gems
- Equipped & unlocked skins
- Daily missions progress
- Best score, best rank, total matches/kills
- Settings (music/sfx)

**Reset:** Settings screen → Reset All Progress

---

## 🚀 Development Phases Completed

| Phase | Status | Description |
|-------|--------|-------------|
| 0 — Foundation | ✅ | HTML, CSS, config, entry point |
| 1 — Core Systems | ✅ | Game loop, state machines, input, time |
| 2 — Entities | ✅ | Player, enemy, power-up entities |
| 3 — Systems | ✅ | All game systems (AI, collision, camera, renderer) |
| 4 — Environment | ✅ | Procedural garden arena |
| 5 — UI/Screens | ✅ | All 11 screens, HUD, leaderboard |
| 6 — Progression | ✅ | Economy, missions, save system |
| 7 — Audio | ✅ | Web Audio synthesizer |
| 8 — CrazyGames | ✅ | SDK stub |

---

## 🎨 Visual Style

- **Background:** Warm ivory (#F5F0E8) world with dark UI chrome
- **Player:** Orange-red accent (#E8450A) — always visually distinct
- **Enemies:** Unique HSL hues per enemy
- **Art style:** Pure Canvas 2D primitives — ellipses, arcs, beziers
- **Mosquito anatomy:** Body, wings, eyes, proboscis, legs, name tag
- **Font:** Outfit (Google Fonts)

---

*Built with the BloodRush.io Master Development Prompt and CrazyGames DevBook guidelines.*
