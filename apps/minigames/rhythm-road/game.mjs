// Rhythm Road — 4-lane falling-notes rhythm minigame
import {
  loadQuestionBank,
  loadExplanations,
  createQuiz,
} from '../core/quiz-core.mjs';
import {
  beepCorrect,
  beepWrong,
  beepCombo,
  beepGameover,
  flashElement,
  spawnParticles,
  floatText,
} from '../core/juice.mjs';

const LANE_WIDTH = 25; // percent of width each lane uses
const NOTE_HEIGHT = 40; // px
const NOTE_FALL_SPEED = 300; // px/s
const HIT_ZONE_Y = 80; // percent from top (bottom of screen)
const HIT_WINDOW = 150; // ms acceptable window for hit
const GAME_DURATION = 60000; // 60 seconds
const QUESTION_INTERVAL_BEATS = 8; // one question every 8 beats
const BPM = 120;
const BEAT_DUR_MS = (60 / BPM) * 1000; // ms per beat

const HS_KEY = 'autoescuela-arcade.rhythm-road.highscore';

let state = {
  screen: 'title', // 'title', 'game', 'gameover'
  quiz: null,
  bank: null,
  explanations: null,
  startTime: null,
  timeRemaining: GAME_DURATION,
  lives: 3,
  score: 0,
  combo: 0,
  bestStreak: 0,
  audioCtx: null,
  bgOscillators: [], // oscillators for background chiptune
  bgStartTime: null,
  highscore: parseInt(localStorage.getItem(HS_KEY), 10) || 0,
  gameLoopId: null,
  lastBeatTime: 0,
  beatCount: 0,
  nextQuestionBeat: QUESTION_INTERVAL_BEATS,
  currentQuestion: null,
  currentCorrectLane: -1,
  notes: [], // { id, laneIndex, spawnTime, fallTime, lane, el, answered }
  nextNoteId: 0,
};

const LANE_NAMES = ['A', 'B', 'C', 'D'];
const KEY_BINDINGS = {
  'D': 0, 'd': 0,
  'F': 1, 'f': 1,
  'J': 2, 'j': 2,
  'K': 3, 'k': 3,
  '1': 0,
  '2': 1,
  '3': 2,
  '4': 3,
};

function audioCtx() {
  if (!state.audioCtx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) state.audioCtx = new C();
  }
  return state.audioCtx;
}

// Synthesized chiptune loop (120 BPM, ~2 bars = 4 beats x 2)
function startChiptune() {
  try {
    const ctx = audioCtx();
    if (!ctx) return;

    state.bgStartTime = ctx.currentTime;

    // Background buzz oscillator (low, always on)
    const buzz = ctx.createOscillator();
    const buzzGain = ctx.createGain();
    buzz.type = 'square';
    buzz.frequency.setValueAtTime(60, ctx.currentTime);
    buzzGain.gain.setValueAtTime(0.08, ctx.currentTime);
    buzz.connect(buzzGain).connect(ctx.destination);
    buzz.start(ctx.currentTime);
    state.bgOscillators.push(buzz);

    // Bass kick on each beat
    function scheduleBassKick(beatTime) {
      const now = ctx.currentTime;
      const schedTime = state.bgStartTime + (beatTime * BEAT_DUR_MS / 1000);
      if (schedTime < now + 30) return; // skip if already passed

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, schedTime);
      osc.frequency.exponentialRampToValueAtTime(50, schedTime + 0.15);
      gain.gain.setValueAtTime(0.3, schedTime);
      gain.gain.exponentialRampToValueAtTime(0.01, schedTime + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(schedTime);
      osc.stop(schedTime + 0.2);
    }

    // Melody note every 2 beats
    function scheduleMelody(beatTime) {
      const now = ctx.currentTime;
      const schedTime = state.bgStartTime + (beatTime * BEAT_DUR_MS / 1000);
      if (schedTime < now + 30) return;

      const freqs = [440, 550, 660, 550]; // A4, C#5, E5, C#5
      const freq = freqs[(Math.floor(beatTime / 2)) % freqs.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, schedTime);
      gain.gain.setValueAtTime(0.12, schedTime);
      gain.gain.exponentialRampToValueAtTime(0.01, schedTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(schedTime);
      osc.stop(schedTime + 0.35);
    }

    // Cymbal sizzle every 4 beats
    function scheduleCymbal(beatTime) {
      const now = ctx.currentTime;
      const schedTime = state.bgStartTime + (beatTime * BEAT_DUR_MS / 1000);
      if (schedTime < now + 30) return;

      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000 + i * 1000, schedTime);
        gain.gain.setValueAtTime(0.08, schedTime);
        gain.gain.exponentialRampToValueAtTime(0.01, schedTime + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(schedTime);
        osc.stop(schedTime + 0.3);
      }
    }

    // Schedule upcoming sounds in gameLoop
    setInterval(() => {
      const beatsSinceStart = (audioCtx().currentTime - state.bgStartTime) * 1000 / BEAT_DUR_MS;
      for (let b = Math.floor(beatsSinceStart); b < Math.floor(beatsSinceStart) + 10; b++) {
        scheduleBassKick(b);
        if (b % 2 === 0) scheduleMelody(b);
        if (b % 4 === 0) scheduleCymbal(b);
      }
    }, 200);
  } catch {}
}

function stopChiptune() {
  try {
    state.bgOscillators.forEach(osc => {
      try { osc.stop(audioCtx().currentTime + 0.1); } catch {}
    });
    state.bgOscillators = [];
  } catch {}
}

function getCurrentBeat() {
  if (!state.bgStartTime) return 0;
  const ctx = audioCtx();
  if (!ctx) return 0;
  return (ctx.currentTime - state.bgStartTime) * 1000 / BEAT_DUR_MS;
}

async function init() {
  try {
    state.bank = await loadQuestionBank(new URL('../data/questions.json', import.meta.url));
    state.explanations = await loadExplanations(new URL('../data/explanations.json', import.meta.url));
  } catch (err) {
    console.error('Failed to load quiz data:', err);
    document.getElementById('game-container').innerHTML = '<p style="color: red;">Failed to load quiz data. Check browser console.</p>';
    return;
  }

  renderTitleScreen();
}

function renderTitleScreen() {
  const container = document.getElementById('game-container');
  const highscoreText = state.highscore > 0 ? `High Score: ${state.highscore}` : 'No score yet';

  container.innerHTML = `
    <div class="rr-screen rr-title-screen active">
      <h1 class="arcade-title">🎵 Rhythm Road</h1>
      <p style="color: var(--fg-dim); font-size: 1.1rem; margin-bottom: 1.5rem;">
        Four lanes. One beat. Hit the note in the correct-answer lane.
      </p>
      <p style="color: var(--fg-dim); font-size: 0.95rem; margin-bottom: 2rem; max-width: 600px;">
        A chiptune loop runs at 120 BPM. Every 8 beats, a question appears and a note falls down its correct-answer lane.
        Hit the key when the note crosses the hit zone. Three lives. 60 seconds.
      </p>
      <div class="highscore-display">${highscoreText}</div>
      <button class="arcade-btn rr-start-btn">Start Game</button>
      <p style="color: var(--fg-dim); font-size: 0.85rem; margin-top: 2rem;">
        <strong>Lanes:</strong> D/F/J/K or 1/2/3/4 for A/B/C/D<br>
        Press <strong>Esc</strong> to return to hub
      </p>
    </div>
  `;

  container.querySelector('.rr-start-btn').addEventListener('click', () => startGame());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.location.href = '../';
    if (state.screen === 'title' && (e.key === 'Enter' || e.key === ' ')) startGame();
  });
}

function startGame() {
  state.quiz = createQuiz(state.bank, {
    seed: Date.now(),
    explanations: state.explanations,
  });

  state.startTime = Date.now();
  state.timeRemaining = GAME_DURATION;
  state.lives = 3;
  state.score = 0;
  state.combo = 0;
  state.bestStreak = 0;
  state.nextNoteId = 0;
  state.notes = [];
  state.lastBeatTime = 0;
  state.beatCount = 0;
  state.nextQuestionBeat = QUESTION_INTERVAL_BEATS;
  state.currentQuestion = state.quiz.current();
  state.currentCorrectLane = state.currentQuestion ? state.currentQuestion.correctIndex : -1;

  state.screen = 'game';
  renderGameScreen();
  startChiptune();
  startGameLoop();
}

function renderGameScreen() {
  const container = document.getElementById('game-container');

  container.innerHTML = `
    <div class="rr-screen rr-game-screen active">
      <div class="rr-hud">
        <div class="rr-hud-left">
          <div class="rr-hud-item rr-timer" id="timer">⏱ 60s</div>
        </div>
        <div class="rr-hud-center">
          <div class="rr-hud-prompt" id="prompt">Loading...</div>
        </div>
        <div class="rr-hud-right">
          <div class="rr-hud-item">Score: <span id="score">0</span></div>
          <div class="rr-hud-item">Combo: <span id="combo">0</span></div>
          <div class="rr-hud-item rr-lives" id="lives">❤ 3</div>
        </div>
      </div>

      <div class="rr-lanes-container">
        <div class="rr-lanes">
          ${[0, 1, 2, 3].map((i) => `
            <div class="rr-lane" data-lane="${i}">
              <div class="rr-lane-header">${LANE_NAMES[i]}: <span class="choice-text" data-choice="${i}"></span></div>
              <div class="rr-lane-notes"></div>
              <div class="rr-hit-zone"></div>
              <div class="rr-lane-bg"></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  updateHUD();
  setupKeyboard();
}

function updateHUD() {
  const q = state.currentQuestion;
  if (q) {
    document.getElementById('prompt').textContent = q.prompt;
    q.choices.forEach((choice, i) => {
      const el = document.querySelector(`[data-choice="${i}"]`);
      if (el) el.textContent = choice;
    });
  }
  document.getElementById('score').textContent = state.score;
  document.getElementById('combo').textContent = state.combo;
  document.getElementById('lives').textContent = `❤ ${state.lives}`;

  const elapsed = Date.now() - state.startTime;
  const remaining = Math.max(0, Math.ceil((GAME_DURATION - elapsed) / 1000));
  document.getElementById('timer').textContent = `⏱ ${remaining}s`;
}

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      endGame();
      window.location.href = '../';
      return;
    }

    const laneIndex = KEY_BINDINGS[e.key];
    if (laneIndex !== undefined) {
      e.preventDefault();
      handleLanePress(laneIndex);
    }
  });
}

function handleLanePress(laneIndex) {
  const lane = document.querySelector(`[data-lane="${laneIndex}"]`);
  if (!lane) return;

  // Find hittable notes in this lane
  const hittable = state.notes.filter(n => n.laneIndex === laneIndex && !n.answered && isNoteHittable(n));

  if (hittable.length > 0) {
    const note = hittable[0]; // hit the first one
    const isCorrect = laneIndex === state.currentCorrectLane;

    if (isCorrect) {
      handleCorrectHit(note, lane, laneIndex);
    } else {
      handleWrongHit(note, lane, laneIndex);
    }
  } else {
    // Lane press with no hittable note = miss
    handleMiss(lane, laneIndex);
  }
}

function isNoteHittable(note) {
  const hitZonePx = (HIT_ZONE_Y / 100) * window.innerHeight;
  const noteTop = note.el.getBoundingClientRect().top;
  const distance = Math.abs(noteTop - hitZonePx);
  return distance < (NOTE_HEIGHT / 2) + 30; // ±30px around hit zone
}

function handleCorrectHit(note, lane, laneIndex) {
  note.answered = true;
  state.combo++;
  state.score += 100 * state.combo;

  beepCorrect();
  beepCombo(state.combo);

  const y = note.el.getBoundingClientRect().top;
  const x = note.el.getBoundingClientRect().left + NOTE_HEIGHT / 2;

  spawnParticles(x, y, { count: 12, life: 600, speed: 200 });
  floatText('+' + (100 * state.combo), { x, y, color: 'var(--neon-green)', life: 700 });

  lane.classList.add('rr-lane-hit-good');
  setTimeout(() => lane.classList.remove('rr-lane-hit-good'), 150);

  note.el.remove();
  state.notes = state.notes.filter(n => n !== note);

  if (state.quiz.isDone()) {
    endGame();
  } else {
    state.currentQuestion = state.quiz.next();
    state.currentCorrectLane = state.currentQuestion ? state.currentQuestion.correctIndex : -1;
  }
}

function handleWrongHit(note, lane, laneIndex) {
  note.answered = true;
  state.combo = 0;
  state.lives--;

  beepWrong();

  lane.classList.add('rr-lane-hit-bad');
  setTimeout(() => lane.classList.remove('rr-lane-hit-bad'), 150);

  note.el.remove();
  state.notes = state.notes.filter(n => n !== note);

  if (state.lives <= 0) {
    endGame();
  }
}

function handleMiss(lane, laneIndex) {
  state.combo = 0;
  state.lives--;

  beepWrong();
  lane.classList.add('rr-lane-hit-bad');
  setTimeout(() => lane.classList.remove('rr-lane-hit-bad'), 150);

  if (state.lives <= 0) {
    endGame();
  }
}

function spawnNote(laneIndex) {
  const note = {
    id: state.nextNoteId++,
    laneIndex,
    spawnTime: Date.now(),
    answered: false,
  };

  const lane = document.querySelector(`[data-lane="${laneIndex}"] .rr-lane-notes`);
  if (!lane) return;

  const el = document.createElement('div');
  el.className = 'rr-note';
  if (laneIndex === state.currentCorrectLane) {
    el.classList.add('rr-note-correct');
  }
  el.style.top = '0px';
  lane.appendChild(el);

  note.el = el;
  state.notes.push(note);
}

function startGameLoop() {
  state.gameLoopId = setInterval(() => {
    if (state.screen !== 'game') return;

    const beat = getCurrentBeat();
    const elapsed = Date.now() - state.startTime;
    state.timeRemaining = GAME_DURATION - elapsed;

    // Spawn question note every QUESTION_INTERVAL_BEATS beats
    if (beat >= state.nextQuestionBeat && state.currentQuestion) {
      spawnNote(state.currentCorrectLane);
      state.nextQuestionBeat += QUESTION_INTERVAL_BEATS;
    }

    // Pulse hit zone on every beat
    const beatPhase = beat % 1.0;
    const hitZone = document.querySelector('.rr-hit-zone');
    if (hitZone && beatPhase < 0.2) {
      hitZone.classList.add('rr-pulse');
    } else if (hitZone) {
      hitZone.classList.remove('rr-pulse');
    }

    // Update note positions
    state.notes.forEach(note => {
      if (note.el && !note.answered) {
        const age = Date.now() - note.spawnTime;
        const distance = (age / 1000) * NOTE_FALL_SPEED;
        const hitZonePx = (HIT_ZONE_Y / 100) * window.innerHeight;
        const noteStartY = -NOTE_HEIGHT;
        const noteY = noteStartY + distance;

        note.el.style.top = noteY + 'px';

        // Auto-miss if note passes hit zone
        if (noteY > hitZonePx + 60 && !note.answered) {
          note.answered = true;
          state.combo = 0;
          state.lives--;
          beepWrong();
          note.el.remove();
          state.notes = state.notes.filter(n => n !== note);

          if (state.lives <= 0) {
            endGame();
          }
        }
      }
    });

    updateHUD();

    // Check game over conditions
    if (state.timeRemaining <= 0 || state.lives <= 0) {
      endGame();
    }
  }, 16); // ~60fps
}

function endGame() {
  state.screen = 'gameover';
  clearInterval(state.gameLoopId);
  stopChiptune();

  if (state.score > state.highscore) {
    state.highscore = state.score;
    localStorage.setItem(HS_KEY, state.highscore);
  }

  beepGameover();

  const container = document.getElementById('game-container');
  container.innerHTML = `
    <div class="rr-screen rr-gameover-screen active">
      <h2 class="arcade-title">GAME OVER</h2>
      <div class="rr-score-display">
        <div class="rr-score-line">
          <span class="label">SCORE:</span>
          <span class="value">${state.score}</span>
        </div>
        <div class="rr-score-line">
          <span class="label">BEST:</span>
          <span class="value">${state.highscore}</span>
        </div>
        <div class="rr-score-line">
          <span class="label">COMBO:</span>
          <span class="value">${state.combo}</span>
        </div>
      </div>
      <button class="arcade-btn rr-play-again-btn">Play Again</button>
      <button class="arcade-btn rr-btn-secondary" id="quit-btn">Quit to Hub</button>
    </div>
  `;

  container.querySelector('.rr-play-again-btn').addEventListener('click', () => {
    state.screen = 'title';
    renderTitleScreen();
  });

  container.querySelector('#quit-btn').addEventListener('click', () => {
    window.location.href = '../';
  });

  document.removeEventListener('keydown', setupKeyboard);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.location.href = '../';
    if (e.key === 'Enter' || e.key === ' ') {
      state.screen = 'title';
      renderTitleScreen();
    }
  });
}

init();
