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
| 7 | Brake or Floor It | `brake-or-floor-it` | `minigame/brake-or-floor-it` | #87 | ✅ merged |
| 8 | Plinko Test | `plinko-test` | `minigame/plinko-test` | #89 | ✅ merged |
| 9 | Traffic Tinder | `traffic-tinder` | `minigame/traffic-tinder` | #88 | ✅ merged |
| 10 | Crossing Guard | `crossing-guard` | `minigame/crossing-guard` | #91 | ✅ merged |
| 11 | Rhythm Road | `rhythm-road` | `minigame/rhythm-road` | #92 | ✅ merged |
| 12 | Tetris-Quiz | `tetris-quiz` | `minigame/tetris-quiz` | #90 | ✅ merged |
| 13 | Parking Lot | `parking-lot` | `minigame/parking-lot` | #94 | ✅ merged |
| 14 | Pong with Prompts | `pong-prompts` | `minigame/pong-prompts` | #93 | ✅ merged |
| 15 | Piano Tiles | `piano-tiles` | `minigame/piano-tiles` | #95 | ✅ merged |
| 16 | Frogger Crossing | `frogger-crossing` | `minigame/frogger-crossing` | — | 🛠️ Haiku |
| 17 | Archery | `archery` | `minigame/archery` | — | 🛠️ Haiku |
| 18 | Answer Boxing | `answer-boxing` | `minigame/answer-boxing` | — | 🛠️ Haiku |

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

### Wave 3 — ✅ shipped (with conflict dance)
3 Haikus in parallel → all merged. ALL 3 added tiles to hub simultaneously so each needed a `git merge foundation` + manual resolution before merge. Lesson learned: switched Wave 4 prompt to say "ADD a tile" clearly instead of "flip a class".
- #87 Brake or Floor It — 393 LOC, 1.5s reaction ring, shrinking window with streak
- #89 Plinko Test — 484 LOC, 6 peg rows, 5-nudge budget per drop
- #88 Traffic Tinder — 483 LOC, 3-cards-per-question, 4s auto-advance

### Wave 4 — ✅ shipped
3 Haikus in parallel → all merged (conflict dance x2 on hub tiles):
- #91 Crossing Guard — 585 LOC, 4 cars queue, baton rotation, 3-6s shrinking timeout
- #90 Tetris-Quiz — 555 LOC total, 8×14 grid, drop correct-labeled block into A/B/C/D zone
- #92 Rhythm Road — 958 LOC total, 120 BPM chiptune with bass kick+melody+cymbal, ±30px hit window

### Wave 5 — ✅ shipped
3 Haikus in parallel → all merged (conflict dance x2 on hub tiles):
- #93 Pong with Prompts — paddle at top, ball bounces, 4 labeled goal-walls at bottom
- #94 Parking Lot — 602 LOC, 4 bays, 20s timer, 0.4s parking-lock window, synthesized engine hum
- #95 Piano Tiles — ~540 LOC, 4-lane cascading tiles, gold tile in correct-answer lane, piano tones

### Wave 6 — 🛠️ in flight
3 Haikus in parallel:
- `minigame/frogger-crossing` — hop lanes of traffic to the correct-answer zone
- `minigame/archery` — 4 targets at different heights; aim + shoot the correct one
- `minigame/answer-boxing` — rhythm punch-out: 4 arrow-key directions = 4 choices

### Waves 7+ — see IDEAS.md (still ≥15 candidates: Simon Says DGT, Autoescuela Survivor, Typography Fall, Neon Bowl, Connect-4 Quiz, Tower of Yield, Scratch-off, Spin the Wheel, 2048-Quiz, Minesweeper of Answers, Bullet Hell Dodge, Escape the Car, …).

## Notes for future me
- Don't rewrite `quiz-core.mjs` — every minigame depends on it. Fix bugs in place only; never change the public signature.
- Each Haiku owns exactly its own `apps/minigames/<slug>/` — they never read or write outside.
- Hub tile state transitions: `.wip` (dashed gray) → `.ready` (green) when smoke test passes. Toggle only after confirming the game loads and accepts input.
