# Minigame Arcade — Idea Backlog

Living brainstorm. Items at the top are the most promising / most likely
to ship next. Cut anything that feels derivative.

## Rules for what ships

- Mechanic must **naturally** consume a 4-choice MCQ (or be easily adapted to 2-choice True/False pairs).
- Must run in a browser with zero build: vanilla JS ES modules, no deps, no bundler.
- Must fit in one Haiku-sized implementation slice (roughly: one `index.html` + one `game.mjs` + optional `style.css`, under ~600 LOC total).
- Must be fun to play for 60 seconds.

## First 6 (greenlit — Wave 1 & 2)

| Slug | Genre | One-liner |
|------|-------|-----------|
| `lane-runner` | endless runner | Swerve to the right lane before the answer gate |
| `sign-smash` | whack-a-mole | Hammer the correct sign among 4 popping up |
| `lightning-strike` | speed quiz + juice | 60s, combo into FEVER mode, triple points |
| `asteroid-answer` | arcade shooter | Shoot the correctly-labeled asteroid |
| `flappy-signal` | Flappy Bird clone | Flap through the right gate |
| `sign-slicer` | Fruit Ninja | Slice the correct answer-placard mid-air |

## Next waves (queued — rank-ordered)

### Wave 3 candidates

1. **Brake or Floor It** — top-down driving; a pedestrian/animal appears; you have ~1s to choose BRAKE (A) / SWERVE (B) / HORN (C) / ACCELERATE (D). Each answer = one choice. Correct → next scene; wrong → crash.
2. **Plinko Test** — drop a ball from the top; use left/right nudge arrows to steer it into the slot matching the correct answer. Satisfying clacks.
3. **Traffic Tinder** — cards swipe-left/swipe-right style: "Is this driver doing the right thing?" 2-choice variant, fast.
4. **Minesweeper of Answers** — 4x4 grid of cells. Each row is a question. Reveal only cells of the correct answer per row without hitting mines.
5. **Simon Says DGT** — show a sequence of 3 signs quickly; user must recall + classify last one. Memory + quiz fusion.
6. **Parking Lot** — Top-down. Park in the correct numbered bay (A/B/C/D). Reverse, turn, squeeze in before the timer.
7. **Pong with Prompts** — paddle up top shows the question; ball bounces; block the ball ONLY when it heads to the wrong-answer walls; let it hit the right-answer wall.
8. **Crossing Guard** — you're the traffic cop; wave the correct vehicle through. 4 cars queue, each with a label.
9. **Rhythm Road** — A/B/C/D lanes, notes fall in rhythm with synthesized chiptune; hit the note in the lane that matches the correct answer when the question appears.
10. **Tetris-Quiz** — falling blocks labeled with choices; only the "correct" block fits cleanly into the slot; wrong blocks stack and kill you.

### Wave 4+ candidates (enriched — easier to hand to a Haiku)

11. **Brake or Floor It** — 🛑 top-down driving. A pedestrian, dog, or vehicle appears; ~1s window to choose BRAKE (A), SWERVE (B), HORN (C), ACCELERATE (D). Each MCQ's 4 choices map to those 4 intents by index. High-stakes binary "save" animation on correct. Cinematic near-misses.

12. **Plinko Test** — drop a ball from the top. `←`/`→` nudge arrows steer gently (limited nudges). Ball clacks through pegs to land in 1 of 4 slots labeled with choices. Satisfying peg sounds + slot glow on correct.

13. **Traffic Tinder** — 2-choice swipe cards: "Is this driver doing the right thing?" Fast cadence. Auto-generate Yes/No variants by pairing each question's `correctIndex` as "correct" vs a randomly-chosen wrong one as "incorrect" card.

14. **Simon Says DGT** — show a sequence of 3 traffic signs flashing quickly; player must repeat the sequence by tapping the matching sign. Each round = 1 question where "correct" is the right sequence.

15. **Parking Lot** — top-down. Park in the correct numbered bay (A/B/C/D). Physics-lite: arrow keys for steering. Timer pressure. Crashing = wrong.

16. **Pong with Prompts** — paddle at top; ball bounces; 4 "walls" along bottom labeled A/B/C/D. Let the ball hit the correct wall; block wrong walls with your paddle.

17. **Crossing Guard** — you're the traffic cop; 4 cars queue at an intersection each labeled with a choice. Wave through the correct one. Wrong = honk chaos.

18. **Rhythm Road** — A/B/C/D lanes; chiptune beat; notes fall on each lane. When a question is "up", hit the note in the correct lane in time with the beat.

19. **Tetris-Quiz** — simplified: blocks fall labeled with choices. The "slot" on the ground shows the current question. Move correct block into slot; wrong blocks stack and game ends when they reach the top.

20. **Answer Boxing** — rhythm punch-out: 4 punch directions (arrow keys) = 4 choices. Land the combo in the right direction before the opponent counter-punches.

21. **Autoescuela Survivor** — top-down WASD; orbs orbit you; enemies (wrong signs) spawn; touching = damage; correct signs = XP. Deep rabbit-hole but MVP version can be ~400 LOC.

22. **Typography Fall** — answer TEXT rains from the top; type the first letter of the correct answer to "catch" it. Words stack if ignored.

23. **Neon Bowl** — top-down lane; aim and fire a ball into 4 pins each labeled with a choice. Knock down the correct pin (and avoid gutter).

24. **Connect-4 Quiz** — drop token into column matching your answer; token stays on board; aim for 4-in-a-row across questions as bonus points.

25. **Frogger Crossing** — hop lanes of moving traffic; each safe lane is labeled; reach the correct-answer lane without getting hit.

26. **Tower of Yield** — Jenga. Pull the block whose label is the correct answer. Tower wobbles physically. Wrong = collapse = game over.

27. **Escape the Car** — text adventure. Each turn a MCQ; wrong = fuel burn; goal: reach the DGT headquarters before fuel runs out.

28. **Cookie Clicker: DGT** — idle clicker themed as "hours studied". Upgrades unlock when you answer questions; buy better study tools; prestige = pass the exam, restart with multiplier.

29. **Minesweeper of Answers** — 4x4 grid: each row is a question. Reveal cells in the correct column per row without stepping on mines (wrong columns).

30. **Bullet Hell Dodge** — 4 streams of bullets labeled with choices; dodge the 3 wrong ones, collide with the 1 correct (heart-collecting logic inverted).

31. **Spin the Wheel** — wheel with 4 sectors labeled; spin, stop it on the correct answer by pressing space at the right moment.

32. **2048-Quiz** — combine tiles labeled with the correct answer to level up; wrong tiles are obstacles.

33. **Archery** — 4 targets at different heights/distances. Aim and shoot the right-labeled one. Physics of arrow drop.

34. **Scratch-off** — lottery-card aesthetic; scratch with mouse to reveal the correct answer under a panel; wrong scratches reduce time.

35. **Piano Tiles** — 4 vertical lanes; tiles cascade down; only press the lane matching the correct answer (avoid miss-presses).

## Meta-ideas (not for Wave-N, but interesting)

- **Daily challenge mode** — all games share a seed for the day; leaderboard across games.
- **Tournament mode** — play all games in sequence with cumulative score.
- **Replay / ghost** — record player's run, replay as ghost next time.
- **Rogue modifiers** — between rounds, pick a modifier ("bombs spawn 2x" / "points 2x, lives ×0.5").

## Cut / parked ideas

- Full DDR rhythm game — audio-asset heavy, skip for Haiku budget.
- Dungeon crawler — too much scope, not "minigame".
- 3D anything — no WebGL abstractions, out of scope for an overnight run.
- Real multiplayer — no backend.
