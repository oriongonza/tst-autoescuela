// Lightning Strike minigame — 60 second speed quiz with maximum juice
import {
  loadQuestionBank,
  loadExplanations,
  createQuiz,
} from '../core/quiz-core.mjs';
import {
  beep,
  beepCorrect,
  beepWrong,
  beepCombo,
  beepFever,
  beepGameover,
  shakeScreen,
  flashElement,
  spawnParticles,
  floatText,
} from '../core/juice.mjs';

const HS_KEY = 'autoescuela-arcade.lightning-strike.highscore';
const GAME_DURATION_MS = 60000; // 60 seconds
const FEVER_DURATION_MS = 10000; // 10 seconds fever mode
const FEVER_THRESHOLD = 10; // combo to trigger fever
const TIME_PENALTY_MS = 2000; // time penalty on wrong answer
const BASE_POINTS = 100;

let state = {
  screen: 'title', // 'title', 'game', 'gameover'
  quiz: null,
  bank: null,
  explanations: null,
  timeRemaining: GAME_DURATION_MS,
  startTime: null,
  pausedTime: 0,
  score: 0,
  combo: 0,
  bestStreak: 0,
  correct: 0,
  wrong: 0,
  inFever: false,
  feverEndTime: null,
  highscore: parseInt(localStorage.getItem(HS_KEY), 10) || 0,
  gameLoopId: null,
};

async function init() {
  const app = document.getElementById('app');

  try {
    state.bank = await loadQuestionBank(new URL('../data/questions.json', import.meta.url));
    state.explanations = await loadExplanations(new URL('../data/explanations.json', import.meta.url));
  } catch (err) {
    console.error('Failed to load quiz data:', err);
    app.innerHTML = '<p style="color: red;">Failed to load quiz data. Check browser console.</p>';
    return;
  }

  renderTitleScreen();
}

function renderTitleScreen() {
  const app = document.getElementById('app');
  const highscoreText = state.highscore > 0 ? `High Score: ${state.highscore}` : 'No score yet';

  app.innerHTML = `
    <div class="ls-screen ls-title-screen active">
      <h1 class="arcade-title">⚡ Lightning Strike</h1>
      <p style="color: var(--fg-dim); font-size: 1.1rem; margin-bottom: 1rem;">
        60 seconds. Big buttons. Maximum juice.
      </p>
      <p style="color: var(--fg-dim); font-size: 0.95rem; margin-bottom: 2rem;">
        Reach combo 10 to enter <strong>FEVER MODE</strong>:<br>
        Time slows 0.5x, points triple.
      </p>
      <div class="highscore-display">${highscoreText}</div>
      <button class="arcade-btn ls-start-btn">Start Game</button>
      <p style="color: var(--fg-dim); font-size: 0.85rem; margin-top: 2rem;">
        Click buttons or press <strong>1-4</strong> / <strong>A-D</strong><br>
        Press <strong>Esc</strong> to return to hub
      </p>
    </div>
  `;

  app.querySelector('.ls-start-btn').addEventListener('click', () => startGame());
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

  state.timeRemaining = GAME_DURATION_MS;
  state.startTime = Date.now();
  state.pausedTime = 0;
  state.score = 0;
  state.combo = 0;
  state.bestStreak = 0;
  state.correct = 0;
  state.wrong = 0;
  state.inFever = false;
  state.feverEndTime = null;

  state.screen = 'game';
  renderGameScreen();
  startGameLoop();
}

function renderGameScreen() {
  const app = document.getElementById('app');
  const q = state.quiz.current();

  if (!q) {
    endGame();
    return;
  }

  const choiceLabels = ['A', 'B', 'C', 'D'];
  const choicesHtml = q.choices.map((choice, i) => `
    <button class="ls-answer-btn" data-index="${i}">
      <span class="label">${choiceLabels[i]}</span>
      <span class="choice-text">${choice}</span>
    </button>
  `).join('');

  app.innerHTML = `
    <div class="ls-screen ls-game-screen active">
      <div class="ls-hud">
        <div class="ls-hud-left">
          <div class="ls-hud-item ls-timer">⏱ <span id="timer-text">60s</span></div>
        </div>
        <div class="ls-hud-right">
          <div class="ls-hud-item">Score: <span id="score-text">0</span></div>
          <div class="ls-hud-item">Combo: <span id="combo-text">0</span></div>
          <div class="ls-hud-item ls-fever-badge" id="fever-badge" style="display: none;">🔥 FEVER</div>
        </div>
      </div>

      <div class="ls-combo-meter">
        <div class="ls-combo-meter-fill" id="combo-meter"></div>
      </div>

      <div class="ls-question-card">
        <p class="ls-question">${q.prompt}</p>
      </div>

      <div class="ls-answer-grid">
        ${choicesHtml}
      </div>

      <div class="ls-fever-overlay" id="fever-overlay"></div>
    </div>
  `;

  const buttons = app.querySelectorAll('.ls-answer-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => submitAnswer(parseInt(btn.dataset.index, 10)));
  });

  // Keyboard controls
  document.addEventListener('keydown', handleKeyboardInput);
}

function handleKeyboardInput(e) {
  if (state.screen !== 'game') return;

  const keyMap = {
    '1': 0, 'a': 0, 'A': 0,
    '2': 1, 'b': 1, 'B': 1,
    '3': 2, 'c': 2, 'C': 2,
    '4': 3, 'd': 3, 'D': 3,
  };

  if (e.key === 'Escape') window.location.href = '../';

  if (keyMap.hasOwnProperty(e.key)) {
    e.preventDefault();
    submitAnswer(keyMap[e.key]);
  }
}

function submitAnswer(index) {
  if (state.screen !== 'game') return;

  const q = state.quiz.current();
  if (!q) return;

  const buttons = document.querySelectorAll('.ls-answer-btn');
  buttons.forEach(btn => btn.classList.add('disabled'));

  const result = state.quiz.submit(index);
  if (!result) return;

  const answerBtn = document.querySelector(`[data-index="${index}"]`);
  const card = document.querySelector('.ls-question-card');

  if (result.correct) {
    // Correct answer
    beepCorrect();
    flashElement(card, 'var(--juice-good)', 200);
    card.classList.add('correct');

    const rect = answerBtn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    spawnParticles(x, y);

    // Award points
    const multiplier = state.inFever ? 3 : 1;
    const points = BASE_POINTS * Math.max(1, result.streak) * multiplier;
    state.score += points;
    state.correct++;
    state.combo = result.streak;
    state.bestStreak = result.bestStreak;

    // Float text
    floatText(`+${points}`, {
      x: x,
      y: y,
      color: 'var(--neon-green)',
      size: 28,
    });

    // Every 5th combo: bigger burst
    if (state.combo % 5 === 0 && state.combo > 0) {
      beepCombo(state.combo);
      spawnParticles(window.innerWidth / 2, window.innerHeight / 2, {
        count: 20,
        speed: 320,
      });
    }

    // Check FEVER entry
    if (state.combo === FEVER_THRESHOLD && !state.inFever) {
      enterFever();
    }
  } else {
    // Wrong answer
    beepWrong();
    flashElement(card, 'var(--juice-bad)', 300);
    card.classList.add('wrong');
    shakeScreen(document.body, 300, 12);

    state.wrong++;
    state.combo = 0;

    // Time penalty
    state.timeRemaining -= TIME_PENALTY_MS;
    if (state.timeRemaining < 0) state.timeRemaining = 0;
  }

  // Update HUD
  updateHUD();

  // Highlight correct answer
  const correctBtn = document.querySelector(`[data-index="${result.correctIndex}"]`);
  correctBtn.style.borderColor = 'var(--neon-green)';
  correctBtn.style.color = 'var(--neon-green)';
  correctBtn.style.boxShadow = '0 0 20px var(--neon-green)';

  // Advance to next question
  setTimeout(() => {
    state.quiz.next();
    card.classList.remove('correct', 'wrong');
    renderGameScreen();
  }, 800);
}

function enterFever() {
  state.inFever = true;
  state.feverEndTime = Date.now() + FEVER_DURATION_MS;
  beepFever();

  document.body.classList.add('fever-mode');
  const overlay = document.getElementById('fever-overlay');
  if (overlay) {
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 400);
  }

  floatText('FEVER!', {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    color: 'var(--neon-magenta)',
    size: 64,
  });
}

function exitFever() {
  state.inFever = false;
  state.feverEndTime = null;
  document.body.classList.remove('fever-mode');
  const badge = document.getElementById('fever-badge');
  if (badge) badge.style.display = 'none';
}

function updateHUD() {
  const timerEl = document.getElementById('timer-text');
  const scoreEl = document.getElementById('score-text');
  const comboEl = document.getElementById('combo-text');
  const comboMeter = document.getElementById('combo-meter');
  const timerHud = document.querySelector('.ls-timer');
  const feverBadge = document.getElementById('fever-badge');
  const comboMeterContainer = document.querySelector('.ls-combo-meter');

  if (timerEl) {
    const secs = Math.ceil(state.timeRemaining / 1000);
    timerEl.textContent = `${secs}s`;

    timerHud.classList.remove('warn', 'danger');
    if (secs <= 10) timerHud.classList.add('danger');
    else if (secs <= 20) timerHud.classList.add('warn');
  }

  if (scoreEl) scoreEl.textContent = state.score;
  if (comboEl) comboEl.textContent = state.combo;

  if (comboMeter) {
    const percent = Math.min((state.combo / FEVER_THRESHOLD) * 100, 100);
    comboMeter.style.width = `${percent}%`;
  }

  if (state.inFever) {
    if (feverBadge) feverBadge.style.display = 'inline-block';
    if (comboMeterContainer) comboMeterContainer.classList.add('fever');
  } else {
    if (feverBadge) feverBadge.style.display = 'none';
    if (comboMeterContainer) comboMeterContainer.classList.remove('fever');
  }
}

function startGameLoop() {
  if (state.gameLoopId) clearInterval(state.gameLoopId);

  state.gameLoopId = setInterval(() => {
    const elapsed = Date.now() - state.startTime - state.pausedTime;
    let realElapsed = elapsed;

    // If in FEVER, time decrement slows to 0.5x
    if (state.inFever) {
      realElapsed = state.pausedTime + (elapsed - state.pausedTime) * 0.5;
    }

    state.timeRemaining = GAME_DURATION_MS - realElapsed;

    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      clearInterval(state.gameLoopId);
      endGame();
    }

    // Check FEVER expiration
    if (state.inFever && Date.now() >= state.feverEndTime) {
      exitFever();
    }

    updateHUD();
  }, 50);
}

function endGame() {
  clearInterval(state.gameLoopId);
  document.removeEventListener('keydown', handleKeyboardInput);
  document.body.classList.remove('fever-mode');

  state.screen = 'gameover';
  const finalScore = state.score;

  // Update high score
  if (finalScore > state.highscore) {
    state.highscore = finalScore;
    localStorage.setItem(HS_KEY, finalScore);
  }

  beepGameover();
  renderGameOverScreen();
}

function renderGameOverScreen() {
  const app = document.getElementById('app');
  const scoreObj = state.quiz.score();
  const newHighscore = state.score > state.highscore - state.score ? 'NEW HIGH SCORE!' : '';

  app.innerHTML = `
    <div class="ls-screen ls-gameover-screen active">
      <h2>Game Over!</h2>

      <div class="ls-score-display">
        <div class="ls-score-row">
          <span class="ls-score-label">Correct:</span>
          <span class="ls-score-value">${state.correct}</span>
        </div>
        <div class="ls-score-row">
          <span class="ls-score-label">Wrong:</span>
          <span class="ls-score-value">${state.wrong}</span>
        </div>
        <div class="ls-score-row">
          <span class="ls-score-label">Best Combo:</span>
          <span class="ls-score-value">${state.bestStreak}</span>
        </div>
        <div class="ls-score-row">
          <span class="ls-score-label">Final Score:</span>
          <span class="ls-score-value" style="font-size: 1.4rem;">${state.score}</span>
        </div>
        ${state.score > state.highscore - state.score ? `<div style="color: var(--neon-yellow); margin-top: 1rem; font-size: 1.1rem; text-shadow: 0 0 8px var(--neon-yellow);">🏆 ${newHighscore}</div>` : `<div class="ls-score-row ls-highscore-row">
          <span class="ls-score-label">High Score:</span>
          <span class="ls-score-value">${state.highscore}</span>
        </div>`}
      </div>

      <div class="ls-gameover-buttons">
        <button class="arcade-btn ls-play-again-btn">Play Again</button>
        <button class="arcade-btn ls-hub-btn">Back to Hub</button>
      </div>
    </div>
  `;

  app.querySelector('.ls-play-again-btn').addEventListener('click', () => startGame());
  app.querySelector('.ls-hub-btn').addEventListener('click', () => window.location.href = '../');

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === ' ') window.location.href = '../';
    if (e.key === 'Enter') startGame();
  });
}

// Start initialization when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
