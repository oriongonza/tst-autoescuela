# Autoescuela Arcade

One pure quiz core; many independent minigame shells built on top of it.
Zero build step — plain ES modules, served static.

## Run locally

From the repo root `app/`:

```bash
python3 -m http.server 8000
```

Then open:

- <http://localhost:8000/apps/minigames/> — hub with all games
- <http://localhost:8000/apps/minigames/core/quiz-core.test.html> — core smoke test

## Architecture: 1 core, N games

### The core — `core/quiz-core.mjs`

Pure. No DOM, no timers, no globals. Every minigame owns its *own* game state
(car position, ship velocity, particles, lives, …) and only calls into this
for truth-of-correctness.

```js
import { loadQuestionBank, loadExplanations, createQuiz } from '../core/quiz-core.mjs';

const bank         = await loadQuestionBank('../data/questions.json');
const explanations = await loadExplanations('../data/explanations.json');
const quiz         = createQuiz(bank, { seed: 42, explanations });

const q = quiz.current();          // { id, prompt, choices[4], correctIndex, explanation? }
const r = quiz.submit(2);          // { correct, correctIndex, streak, bestStreak, explanation? }
quiz.next();                       // advance (returns new current())
quiz.score();                      // { correct, wrong, streak, bestStreak, answered, total }
quiz.isDone();                     // boolean
quiz.reset();                      // restart from scratch
```

### Shared FX — `core/juice.mjs`

No asset files. All FX synthesized at runtime.

- `beep`, `beepCorrect`, `beepWrong`, `beepCombo`, `beepFever`, `beepGameover`
- `shakeScreen(el, ms, magnitude?)`
- `flashElement(el, color?, ms?)`
- `spawnParticles(x, y, opts?)` — burst of colored particles from an absolute point
- `floatText(text, { x, y, color, size })` — "+100", "COMBO x5", etc.

### Shared styles — `core/shared.css`

CSS variables (`--neon-cyan`, `--neon-magenta`, `--bg-deep`, `--juice-good`, …),
base reset, `.arcade-title` / `.arcade-btn` / `.hud` / `.scanlines`,
`@keyframes` for `pop`, `flash`, `shake`, `glow-pulse`, `drift-down`.

Each minigame should `<link rel="stylesheet" href="../core/shared.css">` before
its own `style.css` so variables compose.

## Adding a new minigame

1. Make `apps/minigames/<slug>/` with `index.html`, `game.mjs`, optional `style.css`.
2. Import from `../core/quiz-core.mjs` and `../core/juice.mjs`.
3. Don't touch any other minigame's files or the core.
4. Add a tile in `apps/minigames/index.html` (toggle `.wip` → `.ready` when done).
5. Branch: `minigame/<slug>` off `minigames/foundation`.

See `IDEAS.md` for the backlog and `LOG.md` for the live build ledger.
