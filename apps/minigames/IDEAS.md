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

### Wave 4+ candidates (riskier / more ambitious)

11. **Submarine Signs** — Battleship-style: hidden "correct" tile in a 4x1 row; sonar ping reveals heat; tap the right square.
12. **Pixel Roadtrip** — map-scroll; at forks, take the path labeled with the correct answer; wrong path = cliff.
13. **Answer Boxing** — rhythm-boxer: question appears, 4 punch directions = 4 choices; land the combo in the right direction.
14. **Autoescuela: Survivor** — vampire-survivors-like; orbital weapons kill wrong-sign enemies, correct sign = XP. Deep rabbit hole.
15. **Trivia Solitaire** — Klondike variant; only cards matching correct answer can be stacked.
16. **Typography Fall** — answer text rains from top; type the right answer's first letter to catch it.
17. **Neon Bowl** — lane-based bowling: aim curl into the right pin among 4.
18. **Quiz Balatro** — scoring engine meme; answers are "jokers" that multiply base points; deep chain building.
19. **Whack + Eye-test** — signs pop up half-occluded; identify AND whack the correct one.
20. **Cross-the-Street** — Frogger: hop lanes, but only onto the lane labeled correct.
21. **Escape the Car** — text adventure; each turn is a MCQ; wrong = extra fuel burn; beat the clock.
22. **Cookie Clicker: DGT** — idle clicker; upgrades unlock when you answer questions correctly.
23. **Tower of Yield** — stack yield/stop signs Jenga-style; block falls if you answer wrong.
24. **Bumper Cars Battle Royale** — multiplayer feel: bump AI cars off the arena; correct answers = speed boost.
25. **Connect 4 Quiz** — drop token into a column matching your answer; aligned = bonus combo.
26. **Cross-examination** — police-interrogation framing; choose the right line of questioning (MCQ) to "crack" the driver.

## Cut / parked ideas

- Full DDR rhythm game — audio-asset heavy, skip for Haiku budget.
- Dungeon crawler — too much scope, not "minigame".
- 3D anything — no WebGL abstractions, out of scope for an overnight run.
- Real multiplayer — no backend.
