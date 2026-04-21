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
| 4 | Asteroid Answer | `asteroid-answer` | `minigame/asteroid-answer` | — | 🛠️ Haiku |
| 5 | Flappy Signal | `flappy-signal` | `minigame/flappy-signal` | — | 🛠️ Haiku |
| 6 | Sign Slicer | `sign-slicer` | `minigame/sign-slicer` | — | 🛠️ Haiku |
| 7 | Brake or Floor It | `brake-or-floor-it` | `minigame/brake-or-floor-it` | — | 🔜 Wave 3 |
| 8 | Plinko Test | `plinko-test` | `minigame/plinko-test` | — | 🔜 Wave 3 |
| 9 | Traffic Tinder | `traffic-tinder` | `minigame/traffic-tinder` | — | 🔜 Wave 3 |

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

### Wave 2 — 🛠️ in flight
3 Haikus spawned in parallel:
- `minigame/asteroid-answer` — Canvas Asteroids clone
- `minigame/flappy-signal` — Flappy Bird clone with labeled gaps
- `minigame/sign-slicer` — Fruit Ninja with answer placards

### Wave 3 — queued (prompts prepped in /tmp/ms-wave3-prompts.md)
- `brake-or-floor-it` — top-down 1s-reflex driving: BRAKE/SWERVE/HORN/ACCELERATE mapped to choices[0..3]
- `plinko-test` — ball drops through pegs into 1 of 4 slots; nudge left/right
- `traffic-tinder` — 2-choice swipe cards: "Is this driver doing the right thing?"

### Waves 4+ — see IDEAS.md for rank-ordered backlog.

## Notes for future me
- Don't rewrite `quiz-core.mjs` — every minigame depends on it. Fix bugs in place only; never change the public signature.
- Each Haiku owns exactly its own `apps/minigames/<slug>/` — they never read or write outside.
- Hub tile state transitions: `.wip` (dashed gray) → `.ready` (green) when smoke test passes. Toggle only after confirming the game loads and accepts input.
