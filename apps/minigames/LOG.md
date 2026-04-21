# Minigame Arcade — Build Log

Live ledger of minigame implementation. Updated by Opus between each wave.

## Status

Legend: 🔜 queued · 🛠️ in progress · 🧪 implemented, awaiting smoke test · ✅ merged · ❌ broken · 🐛 under rework

| # | Game | Slug | Branch | PR | Status |
|---|------|------|--------|----|--------|
| 0 | Foundation (core + hub + data) | `—` | `minigames/foundation` | #80 | 🛠️ open |
| 1 | Lane Runner | `lane-runner` | `minigame/lane-runner` | #82 | ✅ merged |
| 2 | Sign Smash | `sign-smash` | `minigame/sign-smash` | #81 | ✅ merged |
| 3 | Lightning Strike | `lightning-strike` | `minigame/lightning-strike` | #83 | ✅ merged |
| 4 | Asteroid Answer | `asteroid-answer` | `minigame/asteroid-answer` | #85 | ✅ merged |
| 5 | Flappy Signal | `flappy-signal` | `minigame/flappy-signal` | #86 | ✅ merged |
| 6 | Sign Slicer | `sign-slicer` | `minigame/sign-slicer` | #84 | ✅ merged |
| 7 | Brake or Floor It | `brake-or-floor-it` | `minigame/brake-or-floor-it` | — | 🛠️ Haiku |
| 8 | Plinko Test | `plinko-test` | `minigame/plinko-test` | — | 🛠️ Haiku |
| 9 | Traffic Tinder | `traffic-tinder` | `minigame/traffic-tinder` | — | 🛠️ Haiku |
| 10 | Crossing Guard | `crossing-guard` | `minigame/crossing-guard` | — | 🔜 Wave 4 |
| 11 | Rhythm Road | `rhythm-road` | `minigame/rhythm-road` | — | 🔜 Wave 4 |
| 12 | Tetris-Quiz | `tetris-quiz` | `minigame/tetris-quiz` | — | 🔜 Wave 4 |

## Waves

### Wave 0 — Foundation
- Scaffold `apps/minigames/` (core/data/hub/games).
- `quiz-core.mjs` ready with seeded shuffle, `submit` returns streak + explanation.
- `juice.mjs` with WebAudio beeps + DOM particles + float-text.
- `shared.css` neon-arcade palette.
- Hub `index.html` with 6 placeholder tiles (all `.wip`).
- Smoke test `core/quiz-core.test.html`.

### Wave 1 — ✅ shipped
3 Haikus in parallel → all 3 PRs squash-merged into `minigames/foundation`:
- #82 Lane Runner — 4-lane dodger, gate collision, 3 lives, 60s timer
- #81 Sign Smash — whack-a-mole 2×2, FRENZY mode @ 10x, keyboard 1234 accessibility
- #83 Lightning Strike — juiced baseline, FEVER @ 10x (3x pts, time 0.5x), localStorage HS

### Wave 2 — ✅ shipped
3 Haikus in parallel → all 3 PRs squash-merged:
- #85 Asteroid Answer — 589 LOC, Canvas Asteroids clone, ship inertia, procedural rocks, screen wrap
- #86 Flappy Signal — 599 LOC, Flappy Bird clone, 4-gap labeled segments every 3 pipes, parallax bg, localStorage HS
- #84 Sign Slicer — 647 LOC, Fruit Ninja, arc-trajectory placards, slice trail, bomb decoys at 35%

### Wave 3 — 🛠️ in flight
3 Haikus spawned in parallel:
- `minigame/brake-or-floor-it` — 1s-reflex driving, 4 intents mapped to choices
- `minigame/plinko-test` — physics ball through pegs, 4 labeled slots, nudge budget
- `minigame/traffic-tinder` — swipe-card yes/no rapid fire

### Wave 4 — queued
- `crossing-guard` — 4 queued cars at intersection; wave through the correct one (traffic-cop baton)
- `rhythm-road` — 4 lanes A/B/C/D; chiptune beat, notes fall, hit correct-lane note on beat
- `tetris-quiz` — labeled blocks fall; drop correct block into slot; wrong blocks stack & kill you

### Waves 5+ — see IDEAS.md (25+ enriched candidates: Parking Lot, Pong, Simon Says DGT, Answer Boxing, Autoescuela Survivor, Typography Fall, Neon Bowl, Connect-4 Quiz, Frogger Crossing, Tower of Yield, Archery, Scratch-off, Piano Tiles, Spin the Wheel…).

## Notes for future me
- Don't rewrite `quiz-core.mjs` — every minigame depends on it. Fix bugs in place only; never change the public signature.
- Each Haiku owns exactly its own `apps/minigames/<slug>/` — they never read or write outside.
- Hub tile state transitions: `.wip` (dashed gray) → `.ready` (green) when smoke test passes. Toggle only after confirming the game loads and accepts input.
