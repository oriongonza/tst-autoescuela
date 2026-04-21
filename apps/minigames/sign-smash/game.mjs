// apps/minigames/sign-smash/game.mjs
// Whack-a-mole minigame. 4 holes (2x2), pop signs, smash the correct one.

import {
  loadQuestionBank,
  loadExplanations,
  createQuiz,
} from '../core/quiz-core.mjs';
import {
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

// ===== Game State =====
let quiz = null;
let gameState = {
  lives: 3,
  score: 0,
  combo: 0,
  bestStreak: 0,
  gameActive: false,
  roundActive: false,
  frenzied: false,
  isFrenzyAnimating: false,
};

// ===== DOM Elements =====
const gameContainer = document.getElementById('game-container');
const gameArea = document.getElementById('game-area');
const holesGrid = document.getElementById('holes-grid');
const holes = Array.from(document.querySelectorAll('.hole'));
const signs = Array.from(document.querySelectorAll('.sign'));
const hammer = document.getElementById('hammer');
const promptEl = document.getElementById('prompt');
const timerEl = document.getElementById('timer');
const comboEl = document.getElementById('combo');
const livesEl = document.getElementById('lives');
const scoreEl = document.getElementById('score');
const frenzyLabel = document.getElementById('frenzy-label');
const gameOverScreen = document.getElementById('game-over-screen');

// ===== Configuration =====
const CONFIG = {
  baseTimeLimit: 4.0,
  popInDuration: 400,
  popOutDuration: 300,
  frenzyThreshold: 10,
  frenzySpeedMultiplier: 2,
  frenzyPointMultiplier: 2,
  basePoints: 100,
};

// ===== Initialization =====
async function init() {
  try {
    const bank = await loadQuestionBank('../data/questions.json');
    const explanations = await loadExplanations('../data/explanations.json');
    quiz = createQuiz(bank, {
      seed: Date.now(),
      explanations,
    });
    startGame();
  } catch (err) {
    console.error('Failed to load quiz:', err);
    promptEl.textContent = 'Error loading quiz. Check console.';
  }
}

function startGame() {
  gameState.gameActive = true;
  gameState.lives = 3;
  gameState.score = 0;
  gameState.combo = 0;
  gameState.bestStreak = 0;
  gameState.frenzied = false;
  quiz.reset();
  updateHUD();
  nextRound();
}

function nextRound() {
  gameState.roundActive = true;
  const q = quiz.current();

  if (!q) {
    endGame();
    return;
  }

  promptEl.textContent = q.prompt;
  updateComboDisplay();

  // Shuffle hole indices for variation
  const indices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);

  // Pop signs with staggered timing
  const popDelay = gameState.frenzied ? 100 : 200;
  indices.forEach((idx, order) => {
    setTimeout(() => {
      popSign(idx, q.choices[idx]);
    }, order * popDelay);
  });

  // Start timer
  const timeLimit = gameState.frenzied
    ? CONFIG.baseTimeLimit / CONFIG.frenzySpeedMultiplier
    : CONFIG.baseTimeLimit;
  startTimer(timeLimit);
}

function popSign(index, text) {
  const sign = signs[index];
  sign.textContent = text.substring(0, 50);
  sign.classList.remove('hide', 'smashed', 'bounce', 'correct-flash');
  sign.classList.add('popped');
  sign.dataset.index = index;
}

function startTimer(duration) {
  let remaining = duration;
  const interval = setInterval(() => {
    remaining -= 0.05;

    // Update visual display
    timerEl.textContent = remaining.toFixed(1) + 's';

    if (remaining <= 1) {
      timerEl.classList.add('danger');
    } else if (remaining <= 2) {
      timerEl.classList.add('warning');
    }

    if (remaining <= 0) {
      clearInterval(interval);
      timerEl.classList.remove('warning', 'danger');
      timerEl.textContent = '0.0s';

      if (gameState.roundActive) {
        handleTimeout();
      }
    }
  }, 50);
}

function handleTimeout() {
  if (!gameState.roundActive) return;

  gameState.roundActive = false;
  gameState.combo = 0;
  gameState.lives -= 1;

  beepWrong();
  shakeScreen(gameArea, 300, 10);

  // Hide signs
  signs.forEach((s) => {
    s.classList.add('hide');
  });

  updateHUD();

  if (gameState.lives <= 0) {
    setTimeout(() => endGame(), 500);
  } else {
    setTimeout(() => nextRound(), 800);
  }
}

function handleSignClick(event) {
  if (!gameState.gameActive || !gameState.roundActive) return;

  const sign = event.currentTarget;
  const clickedIndex = parseInt(sign.dataset.index, 10);

  gameState.roundActive = false;

  // Stop timer (visual only, just clear timer classes)
  timerEl.classList.remove('warning', 'danger');

  const result = quiz.submit(clickedIndex);
  if (!result) return;

  if (result.correct) {
    handleCorrectHit(clickedIndex, result);
  } else {
    handleWrongHit(clickedIndex, result);
  }
}

function handleCorrectHit(index, result) {
  const sign = signs[index];

  // Animations
  sign.classList.add('smashed');
  beepCorrect();

  // Particles at sign center
  const signRect = sign.getBoundingClientRect();
  const x = signRect.left + signRect.width / 2;
  const y = signRect.top + signRect.height / 2;
  spawnParticles(x, y, {
    count: 16,
    colors: ['#00ffa2', '#fff200', '#00eaff'],
    speed: 300,
    life: 800,
    size: 7,
  });

  // Score and combo
  gameState.combo += 1;
  gameState.bestStreak = Math.max(gameState.bestStreak, gameState.combo);
  const pointMultiplier = gameState.frenzied ? CONFIG.frenzyPointMultiplier : 1;
  const points = CONFIG.basePoints * pointMultiplier;
  gameState.score += points;

  // Float text
  floatText('+' + points, {
    x,
    y,
    color: '#00ffa2',
    size: 42,
    life: 1000,
  });

  // Check frenzy transition
  if (!gameState.frenzied && gameState.combo >= CONFIG.frenzyThreshold) {
    activateFrenzy();
  } else if (gameState.frenzied && gameState.combo >= CONFIG.frenzyThreshold) {
    beepCombo(Math.min(gameState.combo, 10));
  } else if (gameState.combo > 1) {
    beepCombo(gameState.combo);
  }

  updateHUD();

  // Hide all signs and load next
  setTimeout(() => {
    signs.forEach((s) => {
      if (s !== sign) s.classList.add('hide');
    });
  }, 100);

  setTimeout(() => {
    quiz.next();
    nextRound();
  }, 600);
}

function handleWrongHit(index, result) {
  const sign = signs[index];
  const correctSign = signs[result.correctIndex];

  // Bounce animation on hammer
  hammer.classList.remove('bounce-hammer');
  void hammer.offsetWidth; // Trigger reflow
  hammer.classList.add('bounce-hammer');

  beepWrong();
  shakeScreen(gameArea, 300, 8);

  gameState.combo = 0;
  gameState.lives -= 1;

  // Flash correct answer green briefly
  correctSign.classList.add('correct-flash');

  updateHUD();

  // Hide all signs
  setTimeout(() => {
    signs.forEach((s) => {
      s.classList.add('hide');
    });
  }, 200);

  if (gameState.lives <= 0) {
    setTimeout(() => endGame(), 800);
  } else {
    setTimeout(() => nextRound(), 1200);
  }
}

function activateFrenzy() {
  gameState.frenzied = true;
  gameState.isFrenzyAnimating = true;
  document.body.classList.add('frenzy-mode');

  // Show frenzy label
  frenzyLabel.classList.remove('frenzy-hidden');
  setTimeout(() => {
    frenzyLabel.classList.add('frenzy-hidden');
  }, 1000);

  beepFever();

  setTimeout(() => {
    gameState.isFrenzyAnimating = false;
  }, 500);
}

function endGame() {
  gameState.gameActive = false;
  gameState.roundActive = false;

  // Play game over sound
  beepGameover();

  // Hide signs
  signs.forEach((s) => {
    s.classList.add('hide');
  });

  // Show game over screen
  const finalScore = gameState.score;
  const { correct, wrong, bestStreak } = quiz.score();

  document.getElementById('final-correct').textContent = correct;
  document.getElementById('final-wrong').textContent = wrong;
  document.getElementById('final-streak').textContent = bestStreak;
  document.getElementById('final-score').textContent = finalScore;

  setTimeout(() => {
    gameOverScreen.classList.remove('game-over-hidden');
  }, 500);
}

function updateHUD() {
  promptEl.textContent = quiz.current()?.prompt || 'Loading...';
  comboEl.textContent = `COMBO: ${gameState.combo}`;
  livesEl.textContent = `LIVES: ${gameState.lives}`;
  scoreEl.textContent = `SCORE: ${gameState.score}`;

  updateComboDisplay();
  updateLivesDisplay();
}

function updateComboDisplay() {
  if (gameState.frenzied) {
    comboEl.classList.add('frenzy');
  } else {
    comboEl.classList.remove('frenzy');
  }
}

function updateLivesDisplay() {
  if (gameState.lives <= 1) {
    livesEl.classList.add('critical');
  } else {
    livesEl.classList.remove('critical');
  }
}

// ===== Mouse / Hammer Tracking =====
document.addEventListener('mousemove', (e) => {
  hammer.style.left = e.clientX + 'px';
  hammer.style.top = e.clientY + 'px';
});

// Touch support for mobile
document.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  hammer.style.left = touch.clientX + 'px';
  hammer.style.top = touch.clientY + 'px';
});

// ===== Event Listeners =====
signs.forEach((sign) => {
  sign.addEventListener('click', handleSignClick);
  // Also allow click on hole to hit the sign
  sign.addEventListener('touchend', handleSignClick);
});

holes.forEach((hole) => {
  // Prevent double-firing by only listening on signs, not holes
  hole.addEventListener('click', (e) => {
    if (e.target.classList.contains('sign')) {
      handleSignClick({ currentTarget: e.target });
    }
  });
});

// Keyboard shortcuts for accessibility
document.addEventListener('keydown', (e) => {
  if (!gameState.gameActive || !gameState.roundActive) return;

  const key = e.key;
  if (key === '1') {
    const evt = new Event('click');
    Object.defineProperty(evt, 'currentTarget', { value: signs[0], enumerable: true });
    handleSignClick(evt);
  } else if (key === '2') {
    const evt = new Event('click');
    Object.defineProperty(evt, 'currentTarget', { value: signs[1], enumerable: true });
    handleSignClick(evt);
  } else if (key === '3') {
    const evt = new Event('click');
    Object.defineProperty(evt, 'currentTarget', { value: signs[2], enumerable: true });
    handleSignClick(evt);
  } else if (key === '4') {
    const evt = new Event('click');
    Object.defineProperty(evt, 'currentTarget', { value: signs[3], enumerable: true });
    handleSignClick(evt);
  } else if (key === 'Escape') {
    if (gameState.gameActive) {
      window.location.href = '../';
    }
  }
});

// Play Again button
document.getElementById('play-again-btn').addEventListener('click', () => {
  gameOverScreen.classList.add('game-over-hidden');
  document.body.classList.remove('frenzy-mode');
  gameState.frenzied = false;
  startGame();
});

// Quit to Hub button
document.getElementById('quit-btn').addEventListener('click', () => {
  window.location.href = '../';
});

// ===== Start =====
init();
