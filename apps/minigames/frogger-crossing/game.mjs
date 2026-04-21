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

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 700;
const INITIAL_LIVES = 3;
const QUESTION_TIME = 15000; // 15s per question
const GAME_LOOP_INTERVAL = 30;
const LANE_HEIGHT = 60;
const NUM_LANES = 4;
const FROG_SIZE = 24;
const ZONE_WIDTH = 200;

let quiz = null;
let canvas = null;
let ctx = null;
let gameState = {
  running: false,
  lives: INITIAL_LIVES,
  score: 0,
  streak: 0,
  bestStreak: 0,
  timeRemaining: 0,
  timeMax: QUESTION_TIME,
  speedMultiplier: 1.0,
  inZone: -1,
  celebrationTime: 0,
};

let frog = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT - LANE_HEIGHT - FROG_SIZE / 2,
  gridX: 0,
  gridY: 0,
  animScale: 1,
  animTime: 0,
};

let cars = [];
let zones = [];
let particles = [];
let keys = {};

const elements = {
  canvas: null,
  container: document.getElementById('game-canvas-container'),
  hudQuestion: document.getElementById('hud-question'),
  hudLives: document.getElementById('hud-lives'),
  hudStreak: document.getElementById('hud-streak'),
  hudScore: document.getElementById('hud-score'),
  timerRing: document.getElementById('hud-timer-ring'),
  gameOverScreen: document.getElementById('game-over'),
  playAgainBtn: document.getElementById('play-again-btn'),
  quitBtn: document.getElementById('quit-btn'),
};

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
  gameState.speedMultiplier = 1.0;

  canvas = document.getElementById('game-canvas');
  elements.canvas = canvas;
  ctx = canvas.getContext('2d');

  const rect = elements.container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  setupEventListeners();
  updateHUD();
  loadQuestion();
  gameLoop();
}

function setupEventListeners() {
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape') {
      quit();
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  elements.playAgainBtn.addEventListener('click', () => {
    elements.gameOverScreen.classList.add('hidden');
    initGame();
  });

  elements.quitBtn.addEventListener('click', quit);
}

function quit() {
  window.location.href = '../';
}

function loadQuestion() {
  const q = quiz.current();
  if (!q) {
    endGame();
    return;
  }

  gameState.inZone = -1;
  gameState.celebrationTime = 0;
  gameState.timeRemaining = gameState.timeMax;

  // Place frog at bottom
  frog.x = CANVAS_WIDTH / 2;
  frog.y = CANVAS_HEIGHT - LANE_HEIGHT - FROG_SIZE / 2;

  // Create zones at top with choices
  zones = q.choices.map((choice, i) => ({
    index: i,
    label: choice,
    x: (CANVAS_WIDTH / 4) * (i + 0.5),
    isCorrect: i === q.correctIndex,
    glow: 0,
  }));

  // Generate cars for lanes
  cars = [];
  for (let lane = 0; lane < NUM_LANES; lane++) {
    const carCount = 3 + Math.floor(Math.random() * 3);
    const speed = (2 + lane * 0.8) * gameState.speedMultiplier;
    const direction = lane % 2 === 0 ? 1 : -1;

    for (let i = 0; i < carCount; i++) {
      cars.push({
        x: (i * (CANVAS_WIDTH / carCount)) + Math.random() * 50,
        y: CANVAS_HEIGHT - (lane + 1) * LANE_HEIGHT - LANE_HEIGHT / 2,
        width: 50 + Math.random() * 30,
        height: LANE_HEIGHT - 8,
        vx: speed * direction,
        lane: lane,
        glow: 0,
      });
    }
  }

  updateHUD();
}

function updateHUD() {
  const q = quiz.current();
  if (q) {
    elements.hudQuestion.textContent = q.prompt;
  }

  elements.hudLives.textContent = `❤️ ${gameState.lives}`;
  elements.hudStreak.textContent = `Streak ${gameState.streak}`;
  elements.hudScore.textContent = `Score ${gameState.score}`;

  // Timer ring visual
  const pct = gameState.timeRemaining / gameState.timeMax;
  const colors = ['var(--neon-red)', 'var(--neon-yellow)', 'var(--neon-green)'];
  const color = pct > 0.6 ? colors[2] : pct > 0.3 ? colors[1] : colors[0];
  elements.timerRing.style.borderColor = color;
  elements.timerRing.style.boxShadow = `0 0 16px ${color}`;
}

function gameLoop() {
  const dt = GAME_LOOP_INTERVAL / 1000;

  // Update timer
  if (gameState.running && gameState.celebrationTime === 0) {
    gameState.timeRemaining -= GAME_LOOP_INTERVAL;
    if (gameState.timeRemaining <= 0) {
      loseLife('timeout');
      loadQuestion();
    }
  }

  // Update celebration timer
  if (gameState.celebrationTime > 0) {
    gameState.celebrationTime -= GAME_LOOP_INTERVAL;
    if (gameState.celebrationTime <= 0) {
      loadQuestion();
    }
  }

  // Handle input
  handleInput();

  // Update frog animation
  if (frog.animTime > 0) {
    frog.animTime -= GAME_LOOP_INTERVAL;
    const progress = 1 - Math.max(0, frog.animTime) / 150;
    frog.animScale = 1 - Math.sin(progress * Math.PI) * 0.15;
  }

  // Update car glows
  cars.forEach((car) => {
    car.x += car.vx * dt;
    if (car.vx > 0 && car.x > CANVAS_WIDTH + 100) car.x = -100;
    if (car.vx < 0 && car.x < -100) car.x = CANVAS_WIDTH + 100;
    car.glow = Math.max(0, car.glow - GAME_LOOP_INTERVAL);
  });

  // Update zone glows
  zones.forEach((zone) => {
    zone.glow = Math.max(0, zone.glow - GAME_LOOP_INTERVAL);
  });

  // Check collision with cars
  cars.forEach((car) => {
    if (checkCollision(frog, car)) {
      loseLife('collision');
      respawnFrog();
    }
  });

  // Check if in zone
  const prevZone = gameState.inZone;
  gameState.inZone = -1;
  zones.forEach((zone) => {
    const dx = frog.x - zone.x;
    if (Math.abs(dx) < ZONE_WIDTH / 2 && frog.y < LANE_HEIGHT) {
      gameState.inZone = zone.index;
      zone.glow = 200;
    }
  });

  // Trigger win when entering zone (transition)
  if (gameState.inZone >= 0 && prevZone === -1 && gameState.celebrationTime === 0) {
    winZone(gameState.inZone);
  }

  // Render
  render();

  if (gameState.running) {
    setTimeout(gameLoop, GAME_LOOP_INTERVAL);
  }
}

function handleInput() {
  const stepDist = 40;

  if (keys['arrowup'] || keys['w']) {
    if (frog.y > LANE_HEIGHT) {
      frog.y -= stepDist;
      frog.animTime = 150;
      beep({ freq: 600, dur: 0.08, volume: 0.15 });
    }
  }
  if (keys['arrowdown'] || keys['s']) {
    if (frog.y < CANVAS_HEIGHT - LANE_HEIGHT - FROG_SIZE) {
      frog.y += stepDist;
      frog.animTime = 150;
      beep({ freq: 600, dur: 0.08, volume: 0.15 });
    }
  }
  if (keys['arrowleft'] || keys['a']) {
    if (frog.x > FROG_SIZE) {
      frog.x -= stepDist;
      frog.animTime = 150;
      beep({ freq: 600, dur: 0.08, volume: 0.15 });
    }
  }
  if (keys['arrowright'] || keys['d']) {
    if (frog.x < CANVAS_WIDTH - FROG_SIZE) {
      frog.x += stepDist;
      frog.animTime = 150;
      beep({ freq: 600, dur: 0.08, volume: 0.15 });
    }
  }
}

function checkCollision(frog, car) {
  const frogLeft = frog.x - FROG_SIZE / 2;
  const frogRight = frog.x + FROG_SIZE / 2;
  const frogTop = frog.y - FROG_SIZE / 2;
  const frogBottom = frog.y + FROG_SIZE / 2;

  const carLeft = car.x;
  const carRight = car.x + car.width;
  const carTop = car.y - car.height / 2;
  const carBottom = car.y + car.height / 2;

  return !(frogRight < carLeft || frogLeft > carRight || frogBottom < carTop || frogTop > carBottom);
}

function respawnFrog() {
  frog.x = CANVAS_WIDTH / 2;
  frog.y = CANVAS_HEIGHT - LANE_HEIGHT - FROG_SIZE / 2;
}

function loseLife(reason) {
  beepWrong();
  shakeScreen(canvas, 200, 6);
  flashElement(canvas, 'var(--juice-bad)', 200);
  gameState.streak = 0;
  gameState.lives--;

  if (gameState.lives <= 0) {
    beepGameover();
    endGame();
  }
}

function winZone(zoneIndex) {
  const zone = zones[zoneIndex];
  const q = quiz.current();
  const correct = q.correctIndex === zoneIndex;

  if (correct) {
    beepCorrect();
    const pointsGain = 100 * Math.max(1, gameState.streak);
    gameState.score += pointsGain;
    gameState.streak++;
    if (gameState.streak > gameState.bestStreak) {
      gameState.bestStreak = gameState.streak;
    }

    // Speed ramp
    gameState.speedMultiplier += 0.05;

    // Visual feedback
    spawnParticles(frog.x, frog.y, {
      count: 20,
      colors: ['#00ff00', '#00eaff', '#ffff00'],
      speed: 300,
      life: 800,
    });
    zone.glow = 300;
    flashElement(canvas, 'var(--juice-good)', 300);

    quiz.submit(zoneIndex);
    gameState.celebrationTime = 800;
  } else {
    beepWrong();
    flashElement(canvas, 'var(--juice-bad)', 200);
    gameState.streak = 0;
    gameState.lives--;

    if (gameState.lives > 0) {
      quiz.submit(zoneIndex);
      gameState.celebrationTime = 600;
    } else {
      beepGameover();
      endGame();
    }
  }
}

function endGame() {
  gameState.running = false;
  elements.gameOverScreen.classList.remove('hidden');
  document.getElementById('final-score').textContent = gameState.score;
  document.getElementById('final-streak').textContent = gameState.bestStreak;
  document.getElementById('final-correct').textContent = quiz.correct();
  document.getElementById('final-total').textContent = quiz.answered();
}

function render() {
  ctx.fillStyle = '#000014';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw grass at bottom (start)
  ctx.fillStyle = '#004400';
  ctx.fillRect(0, CANVAS_HEIGHT - LANE_HEIGHT, CANVAS_WIDTH, LANE_HEIGHT);

  // Draw zones at top
  ctx.fillStyle = '#003300';
  ctx.fillRect(0, 0, CANVAS_WIDTH, LANE_HEIGHT);

  zones.forEach((zone) => {
    const x = zone.x - ZONE_WIDTH / 2;
    const y = 8;
    const w = ZONE_WIDTH;
    const h = LANE_HEIGHT - 16;

    // Draw zone box
    ctx.fillStyle = zone.isCorrect ? 'rgba(0, 255, 100, 0.1)' : 'rgba(0, 100, 255, 0.05)';
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.strokeStyle = zone.glow > 0 ? 'rgba(255, 255, 0, 0.8)' : zone.isCorrect ? 'rgba(0, 255, 100, 0.4)' : 'rgba(0, 100, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Label text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(zone.label, zone.x, y + h / 2);
  });

  // Draw lanes with road markings
  for (let lane = 0; lane < NUM_LANES; lane++) {
    const laneY = CANVAS_HEIGHT - (lane + 1) * LANE_HEIGHT;
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(0, laneY, CANVAS_WIDTH, LANE_HEIGHT);

    // Lane markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.setLineDash([20, 20]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, laneY + LANE_HEIGHT / 2);
    ctx.lineTo(CANVAS_WIDTH, laneY + LANE_HEIGHT / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw cars
  cars.forEach((car) => {
    const x = car.x;
    const y = car.y;
    const w = car.width;
    const h = car.height;

    // Car body
    ctx.fillStyle = 'rgba(255, 100, 50, 0.9)';
    ctx.fillRect(x, y - h / 2, w, h);

    // Car glow when close
    if (car.glow > 0) {
      ctx.strokeStyle = `rgba(255, 200, 0, ${car.glow / 200})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - h / 2 - 2, w + 4, h + 4);
    }

    // Windows
    ctx.fillStyle = 'rgba(100, 150, 255, 0.7)';
    ctx.fillRect(x + w * 0.15, y - h * 0.3, w * 0.25, h * 0.4);
    ctx.fillRect(x + w * 0.6, y - h * 0.3, w * 0.25, h * 0.4);
  });

  // Draw frog
  ctx.save();
  ctx.translate(frog.x, frog.y);
  ctx.scale(frog.animScale, frog.animScale);

  // Frog body (circle)
  ctx.fillStyle = '#00ff00';
  ctx.beginPath();
  ctx.arc(0, 0, FROG_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  // Frog glow
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-6, -4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6, -4, 3, 0, Math.PI * 2);
  ctx.fill();

  // Pupils (looking forward)
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-5, -5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, -5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Draw HUD timer
  const timePercent = gameState.timeRemaining / gameState.timeMax;
  ctx.fillStyle = timePercent > 0.6 ? 'rgba(0, 255, 100, 0.3)' : timePercent > 0.3 ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH - 50, 40, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timePercent);
  ctx.lineTo(CANVAS_WIDTH - 50, 40);
  ctx.fill();

  updateHUD();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
