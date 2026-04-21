# Minigame Arcade — Build Log

Live ledger of minigame implementation. Updated by Opus between each wave.

## Status

Legend: 🔜 queued · 🛠️ in progress · 🧪 implemented, awaiting smoke test · ✅ merged · ❌ broken · 🐛 under rework

| # | Game | Slug | Branch | PR | Status |
|---|------|------|--------|----|--------|
| 0 | Foundation (core + hub + data) | `—` | `minigames/foundation` | — | 🛠️ scaffolded |
| 1 | Lane Runner | `lane-runner` | `minigame/lane-runner` | — | 🛠️ Haiku |
| 2 | Sign Smash | `sign-smash` | `minigame/sign-smash` | — | 🛠️ Haiku |
| 3 | Lightning Strike | `lightning-strike` | `minigame/lightning-strike` | — | 🛠️ Haiku |
| 4 | Asteroid Answer | `asteroid-answer` | `minigame/asteroid-answer` | — | 🔜 queued |
| 5 | Flappy Signal | `flappy-signal` | `minigame/flappy-signal` | — | 🔜 queued |
| 6 | Sign Slicer | `sign-slicer` | `minigame/sign-slicer` | — | 🔜 queued |

## Waves

### Wave 0 — Foundation
- Scaffold `apps/minigames/` (core/data/hub/games).
- `quiz-core.mjs` ready with seeded shuffle, `submit` returns streak + explanation.
- `juice.mjs` with WebAudio beeps + DOM particles + float-text.
- `shared.css` neon-arcade palette.
- Hub `index.html` with 6 placeholder tiles (all `.wip`).
- Smoke test `core/quiz-core.test.html`.

### Wave 1 — 🛠️ in flight
3 Haikus spawned in parallel (background):
- `minigame/lane-runner` — Lane Runner
- `minigame/sign-smash` — Sign Smash
- `minigame/lightning-strike` — Lightning Strike

Each targets PR → `minigames/foundation`. Will be merged as they come in.

### Wave 2 — queued
Then: `asteroid-answer`, `flappy-signal`, `sign-slicer`.

### Wave 3+ — see IDEAS.md for rank-ordered backlog.

## Notes for future me
- Don't rewrite `quiz-core.mjs` — every minigame depends on it. Fix bugs in place only; never change the public signature.
- Each Haiku owns exactly its own `apps/minigames/<slug>/` — they never read or write outside.
- Hub tile state transitions: `.wip` (dashed gray) → `.ready` (green) when smoke test passes. Toggle only after confirming the game loads and accepts input.
