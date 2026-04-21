import {
  loadQuestionBank,
  loadExplanations,
  createQuiz,
} from '../core/quiz-core.mjs';

import {
  beep,
  beepCorrect,
  beepWrong,
  beepGameover,
  shakeScreen,
  flashElement,
  spawnParticles,
  floatText,
} from '../core/juice.mjs';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const INITIAL_LIVES = 3;
const INITIAL_REACTION_TIME = 1500; // ms
const BASE_REACTION_DECAY = 0.95;
const GAME_LOOP_INTERVAL = 30; // ms

const OBSTACLES = ['🚶', '🐕', '🚴', '🚗', '🚧'];

let quiz = null;
let canvas = null;
let ctx = null;
let gameState = {
  running: false,
  lives: INITIAL_LIVES,
  score: 0,
  streak: 0,
  bestStreak: 0,
  answered: false,
  reactionTimeRemaining: 0,
  reactionTimeMax: INITIAL_REACTION_TIME,
};

const elements = {
  canvas: null,
  container: document.getElementById('game-canvas-container'),
  hudQuestion: document.getElementById('hud-question'),
  hudLives: document.getElementById('hud-lives'),
  hudStreak: document.getElementById('hud-streak'),
  hudScore: document.getElementById('hud-score'),
  actionButtons: document.querySelectorAll('.action-btn'),
  gameOverScreen: document.getElementById('game-over'),
  playAgainBtn: document.getElementById('play-again-btn'),
  quitBtn: document.getElementById('quit-btn'),
};

// Game objects
let player = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT - 80,
  width: 40,
  height: 50,
};

let obstacle = null;
let particles = [];

async function initGame() {
  const bank = await loadQuestionBank('../data/questions.json');
  const explanations = await loadExplanations('../data/explanations.json');
  quiz = createQuiz(bank, {
    seed: Date.now(),
    explanations,
  });

  gameState.running = true;
  gameState.lives = INITIAL_LIVES;
  gameState.score = 0;
  gameState.streak = 0;
  gameState.bestStreak = 0;

  canvas = document.getElementById('game-canvas');
  elements.canvas = canvas;
  ctx = canvas.getContext('2d');

  // Set canvas size
  const rect = elements.container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  setupEventListeners();
  updateHUD();
  loadQuestion();
  gameLoop();
}

function setupEventListeners() {
  elements.actionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      submitAnswer(index);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (!gameState.running || gameState.answered) return;

    let index = -1;
    if (e.key === '1' || e.code === 'Digit1') index = 0;
    else if (e.key === '2' || e.code === 'Digit2') index = 1;
    else if (e.key === '3' || e.code === 'Digit3') index = 2;
    else if (e.key === '4' || e.code === 'Digit4') index = 3;
    else if (e.key === ' ') { e.preventDefault(); index = 0; } // Space = BRAKE
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Shift') index = 1; // <- / -> / Shift = SWERVE
    else if (e.key === 'h' || e.key === 'H') index = 2; // H = HORN
    else if (e.key === 'ArrowUp') { e.preventDefault(); index = 3; } // Up = ACCELERATE
    else if (e.key === 'Escape') quitToHub();

    if (index >= 0) {
      e.preventDefault();
      submitAnswer(index);
    }
  });

  elements.playAgainBtn.addEventListener('click', () => {
    elements.gameOverScreen.classList.add('hidden');
    initGame();
  });

  elements.quitBtn.addEventListener('click', quitToHub);
}

function loadQuestion() {
  const q = quiz.current();
  if (!q) {
    endGame();
    return;
  }

  gameState.answered = false;
  gameState.reactionTimeMax = INITIAL_REACTION_TIME * Math.pow(BASE_REACTION_DECAY, Math.floor(gameState.streak / 5));
  gameState.reactionTimeRemaining = gameState.reactionTimeMax;

  updateHUD();
  updateChoiceButtons();
  createObstacle();

  // Idle engine sound
  beep({ freq: 60, dur: 0.5, type: 'sine', volume: 0.08 });
}

function createObstacle() {
  const emoji = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
  obstacle = {
    emoji,
    x: CANVAS_WIDTH / 2,
    y: -80,
    width: 60,
    height: 60,
    speed: 300, // pixels per second
  };
}

function updateChoiceButtons() {
  const q = quiz.current();
  if (!q) return;

  elements.actionButtons.forEach((btn, i) => {
    const choice = q.choices[i] || '';
    const span = btn.querySelector('span');
    if (span) span.textContent = choice.substring(0, 40);
  });
}

function updateHUD() {
  const q = quiz.current();
  if (q) {
    const prompt = q.prompt.substring(0, 120);
    elements.hudQuestion.textContent = prompt;
  }
  elements.hudLives.textContent = `❤️ ${gameState.lives}`;
  elements.hudStreak.textContent = `Streak ${gameState.streak}`;
  elements.hudScore.textContent = `Score ${gameState.score}`;
}

function submitAnswer(choiceIndex) {
  if (!gameState.running || gameState.answered || !quiz.current()) return;

  gameState.answered = true;
  const result = quiz.submit(choiceIndex);

  if (!result) return;

  if (result.correct) {
    handleCorrectAnswer();
  } else {
    handleWrongAnswer();
  }
}

function handleCorrectAnswer() {
  beepCorrect();
  flashElement(elements.container, 'var(--neon-green)', 150);

  const scoreGain = Math.max(10, 100 - Math.floor((INITIAL_REACTION_TIME - gameState.reactionTimeRemaining) / 10));
  gameState.score += scoreGain * Math.max(1, gameState.streak);
  gameState.streak = quiz.score().streak;
  gameState.bestStreak = Math.max(gameState.bestStreak, gameState.streak);

  // Smoke/tire particles
  spawnParticles(player.x, player.y + 20, {
    count: 8,
    colors: ['#888', '#999', '#666'],
    speed: 150,
    life: 600,
    size: 4,
  });

  setTimeout(() => {
    quiz.next();
    loadQuestion();
  }, 600);
}

function handleWrongAnswer() {
  beepWrong();
  flashElement(elements.container, 'var(--neon-red)', 200);
  shakeScreen(elements.container, 250, 10);

  gameState.lives--;
  gameState.streak = 0;

  // Crash particles
  spawnParticles(player.x, player.y + 25, {
    count: 12,
    colors: ['var(--neon-red)', '#ff6600', '#ffaa00'],
    speed: 280,
    life: 800,
    size: 5,
  });

  if (gameState.lives <= 0) {
    endGame();
  } else {
    setTimeout(() => {
      quiz.next();
      loadQuestion();
    }, 800);
  }
}

function gameLoop() {
  if (!gameState.running) return;

  const deltaTime = GAME_LOOP_INTERVAL / 1000;

  // Update reaction timer
  if (!gameState.answered && obstacle) {
    gameState.reactionTimeRemaining -= GAME_LOOP_INTERVAL;
    if (gameState.reactionTimeRemaining <= 0) {
      // Timeout = auto-crash
      submitAnswer(-1); // Invalid index triggers crash
    }
  }

  // Update obstacle
  if (obstacle) {
    obstacle.y += obstacle.speed * deltaTime;
  }

  // Check collision
  if (obstacle && !gameState.answered && isColliding()) {
    // Player hit the obstacle with wrong/no answer
    if (Math.random() > 0.3) { // 70% collision = crash
      submitAnswer(-1);
    }
  }

  draw();
  setTimeout(gameLoop, GAME_LOOP_INTERVAL);
}

function isColliding() {
  if (!obstacle) return false;
  return (
    obstacle.x < player.x + player.width &&
    obstacle.x + obstacle.width > player.x &&
    obstacle.y < player.y + player.height &&
    obstacle.y + obstacle.height > player.y
  );
}

function draw() {
  // Clear canvas
  ctx.fillStyle = 'rgba(8, 0, 20, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw road markings (animated)
  ctx.strokeStyle = 'rgba(0, 234, 255, 0.4)';
  ctx.lineWidth = 2;
  const offset = (Date.now() % 2000) / 2000 * 80;
  for (let i = 0; i < canvas.height; i += 80) {
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, (i - offset) % canvas.height);
    ctx.lineTo(canvas.width / 2, ((i + 40 - offset) % canvas.height));
    ctx.stroke();
  }

  // Draw lane dividers (side lines)
  ctx.strokeStyle = 'rgba(0, 234, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 4, 0);
  ctx.lineTo(canvas.width / 4, canvas.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((canvas.width * 3) / 4, 0);
  ctx.lineTo((canvas.width * 3) / 4, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw player car
  drawCar(player.x, player.y);

  // Draw obstacle
  if (obstacle) {
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obstacle.emoji, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);

    // Draw reaction timer ring
    if (!gameState.answered) {
      const progress = Math.max(0, gameState.reactionTimeRemaining / gameState.reactionTimeMax);
      ctx.strokeStyle = `rgba(255, 242, 0, ${progress * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const centerX = obstacle.x + obstacle.width / 2;
      const centerY = obstacle.y + obstacle.height / 2;
      ctx.arc(centerX, centerY, 45, 0, 2 * Math.PI * progress);
      ctx.stroke();
    }
  }

  // Draw score/streak in center
  if (gameState.streak > 0) {
    ctx.font = 'bold 24px Courier New';
    ctx.fillStyle = `rgba(0, 255, 162, ${0.3 + gameState.streak * 0.05})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`STREAK: ${gameState.streak}`, canvas.width / 2, 40);
  }
}

function drawCar(x, y) {
  // Main body (orange gradient)
  ctx.fillStyle = '#ff9900';
  ctx.fillRect(x - player.width / 2, y, player.width, player.height);

  // Windshield
  ctx.fillStyle = 'rgba(0, 200, 255, 0.4)';
  ctx.fillRect(x - player.width / 2 + 4, y + 6, player.width - 8, 16);

  // Headlights
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(x - player.width / 2 + 6, y + 2, 5, 5);
  ctx.fillRect(x + player.width / 2 - 11, y + 2, 5, 5);

  // Border glow
  ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - player.width / 2, y, player.width, player.height);
}

function endGame() {
  gameState.running = false;
  const score = quiz.score();

  document.getElementById('final-score').textContent = gameState.score;
  document.getElementById('final-streak').textContent = gameState.bestStreak;
  document.getElementById('final-correct').textContent = score.correct;
  document.getElementById('final-total').textContent = score.total;

  beepGameover();
  setTimeout(() => {
    elements.gameOverScreen.classList.remove('hidden');
  }, 500);
}

function quitToHub() {
  window.location.href = '../';
}

// Start the game
window.addEventListener('load', initGame);
