# Autoescuela Arcade — Shipped

One quiz core, **18 minigames**, zero build step.

## How to run

```sh
cd /path/to/tst_autoescuela/app
python3 -m http.server 8000
# then open http://localhost:8000/apps/minigames/
```

Everything is static — vanilla ES modules, no npm, no bundler, no external assets.

## Hub

`apps/minigames/index.html` lists all 18 games with two picker buttons at the top:

- **🎲 Surprise Me** — spins through the grid with rising beeps and a particle burst, lands on one random game, navigates.
- **🏆 Play All (Random Order)** — shuffles all 18 into a tournament playlist (sessionStorage); a "Next: slug" button appears on the hub after each game. Abort link restores the normal hub.

## The core

```
apps/minigames/core/
├── quiz-core.mjs         # createQuiz(bank, { seed, explanations })
├── juice.mjs             # beep/beepCorrect/beepWrong/shakeScreen/spawnParticles/floatText
├── shared.css            # neon-arcade palette + keyframes
└── quiz-core.test.html   # browser smoke test for the core
apps/minigames/data/
├── questions.json        # 24 autoescuela MCQs
└── explanations.json
```

Every game imports from the same core and never modifies it. The quiz contract
was frozen after Wave 0 and held across all 6 waves.

## The 18 games

| # | Slug | Genre | Key mechanic |
|---|------|-------|--------------|
|  1 | lane-runner        | Endless runner   | 4 lanes, swap before the gate |
|  2 | sign-smash         | Whack-a-mole     | 2×2 hole grid, hammer cursor |
|  3 | lightning-strike   | Juiced speed-quiz | FEVER @ 10× combo |
|  4 | asteroid-answer    | Arcade shooter   | Ship inertia + screen wrap |
|  5 | flappy-signal      | Flappy Bird      | Correct gap between pipes |
|  6 | sign-slicer        | Fruit-Ninja      | Mouse slice trail + bombs |
|  7 | brake-or-floor-it  | 1s reflex driver | 4 intents = 4 choices |
|  8 | plinko-test        | Plinko           | Peg physics + 5 nudges |
|  9 | traffic-tinder     | Swipe cards      | Yes/No reduction |
| 10 | crossing-guard     | Traffic cop      | Baton rotates 4 directions |
| 11 | rhythm-road        | Guitar Hero      | 120 BPM chiptune, correct lane |
| 12 | tetris-quiz        | Tetris-lite      | Drop labeled block in zone |
| 13 | pong-prompts       | Pong             | Block wrong walls with paddle |
| 14 | parking-lot        | Top-down driving | Steer into labeled bay |
| 15 | piano-tiles        | Piano Tiles      | Gold tile in correct lane |
| 16 | frogger-crossing   | Frogger          | Hop lanes to correct zone |
| 17 | archery            | Projectile aim   | Angle + draw + gravity + wind |
| 18 | answer-boxing      | Punch-Out        | 4 punch directions = 4 choices |

## Shared gameplay contract

Every game:

- loads the **same** question bank
- uses `quiz.current()` / `quiz.submit(index)` / `quiz.next()` / `quiz.isDone()`
- has **3 lives**, **streak multiplier**, **game-over screen**
- synthesizes all audio via WebAudio (no asset files)
- uses shared CSS variables so the neon palette stays consistent
- fits in `apps/minigames/<slug>/` with exactly 3 files

## Smoke test

```sh
cd app
python3 -m http.server 8765 &
apps/minigames/scripts/smoke.sh
# ✓ All checks passed (18 games + core)
```

The shell script hits the hub, core files, questions JSON, picker, and every
game's `index.html` + `game.mjs` over HTTP — any broken import, missing file,
or 404 surfaces immediately.

## Process notes

- 6 parallel waves of Haiku agents, 3 simultaneous, stacked PRs onto a single
  `minigames/foundation` branch.
- 17 games landed via PR (squash-merge); Archery landed via a stray direct
  push (PR #98 closed as redundant).
- Only recurring conflict was `apps/minigames/index.html` — every game adds one
  tile, so parallel branches collide there. Resolved each time by appending
  new tiles at the end.
- `LOG.md` in this directory tracks the wave-by-wave history.

## Known limitations

- Tested on desktop Chrome/Firefox. Mobile touch paths exist in some games
  (Sign Slicer, Traffic Tinder) but not all.
- No linting/formatting pass across games — each Haiku's style lives
  in-situ. Deliberate: swapping a game is replacing its folder, not refactoring.
- No unit tests on game logic. The smoke test only checks the import graph
  loads; gameplay correctness is tested by playing.

## Handoff

Merge `minigames/foundation` → `main` to ship all 18 at once, or cherry-pick.
The foundation branch is one PR (#80) with the full stack of squash-merges
behind it.
