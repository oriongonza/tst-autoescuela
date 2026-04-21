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
const BASE_TIMEOUT_MS = 6000;
const GAME_LOOP_FPS = 60;
const GAME_LOOP_INTERVAL = 1000 / GAME_LOOP_FPS;

// Lane indices: 0=North, 1=East, 2=South, 3=West
const LANE_NAMES = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
const LANE_DIRECTIONS = [0, 90, 180, 270]; // degrees
const LANE_ANGLES = [Math.PI * 1.5, 0, Math.PI * 0.5, Math.PI]; // radians

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
  timeoutRemaining: 0,
  timeoutMax: BASE_TIMEOUT_MS,
  totalAnswered: 0,
  totalCorrect: 0,
};

const elements = {
  canvas: null,
  container: document.getElementById('game-canvas-container'),
  hudQuestion: document.getElementById('hud-question'),
  hudLives: document.getElementById('hud-lives'),
  hudStreak: document.getElementById('hud-streak'),
  hudScore: document.getElementById('hud-score'),
  gameOverScreen: document.getElementById('game-over'),
  playAgainBtn: document.getElementById('play-again-btn'),
  quitBtn: document.getElementById('quit-btn'),
};

// Game objects
let cop = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT / 2,
  radius: 25,
  batonAngle: 0,
  targetBatonAngle: 0,
};

let cars = [
  { lane: 0, x: CANVAS_WIDTH / 2, y: 60, width: 50, height: 40, speed: 0, choice: '', bobOffset: 0 },
  { lane: 1, x: CANVAS_WIDTH - 60, y: CANVAS_HEIGHT / 2, width: 40, height: 50, speed: 0, choice: '', bobOffset: 0 },
  { lane: 2, x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, width: 50, height: 40, speed: 0, choice: '', bobOffset: 0 },
  { lane: 3, x: 60, y: CANVAS_HEIGHT / 2, width: 40, height: 50, speed: 0, choice: '', bobOffset: 0 },
];

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
  gameState.totalAnswered = 0;
  gameState.totalCorrect = 0;

  canvas = document.getElementById('game-canvas');
  elements.canvas = canvas;
  ctx = canvas.getContext('2d');

  // Set canvas size to viewport
  const rect = elements.container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  // Recalculate dimensions if not standard
  const w = canvas.width;
  const h = canvas.height;
  const aspectRatio = w / h;
  const standardRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

  setupEventListeners();
  updateHUD();
  loadQuestion();
  gameLoop();
}

function setupEventListeners() {
  const keyMap = {
    'ArrowUp': 0, 'w': 0, 'W': 0,
    'ArrowRight': 1, 'd': 1, 'D': 1,
    'ArrowDown': 2, 's': 2, 'S': 2,
    'ArrowLeft': 3, 'a': 3, 'A': 3,
  };

  document.addEventListener('keydown', (e) => {
    if (!gameState.running || gameState.answered) return;
    if (e.key === 'Escape') return quitToHub();
    const idx = keyMap[e.key];
    if (idx !== undefined) {
      e.preventDefault();
      cop.targetBatonAngle = LANE_ANGLES[idx];
      submitAnswer(idx);
    }
  });

  canvas.addEventListener('click', (e) => {
    if (!gameState.running || gameState.answered) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const cX = canvas.width / 2, cY = canvas.height / 2;
    let idx = y < cY - 80 ? 0 : x > cX + 80 ? 1 : y > cY + 80 ? 2 : x < cX - 80 ? 3 : -1;
    if (idx < 0) idx = (x < cX) ? 3 : 1;
    cop.targetBatonAngle = LANE_ANGLES[idx];
    submitAnswer(idx);
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
  // Reduce timeout with streak
  const streakMultiplier = gameState.streak >= 10 ? 0.5 : gameState.streak >= 6 ? 0.667 : gameState.streak >= 3 ? 0.833 : 1;
  gameState.timeoutMax = BASE_TIMEOUT_MS * streakMultiplier;
  gameState.timeoutRemaining = gameState.timeoutMax;

  // Assign choices to lanes
  for (let i = 0; i < 4; i++) {
    cars[i].choice = q.choices[i] || '';
    cars[i].bobOffset = Math.random() * Math.PI * 2;
  }

  updateHUD();
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

function submitAnswer(laneIndex) {
  if (!gameState.running || gameState.answered || !quiz.current()) return;

  gameState.answered = true;
  gameState.totalAnswered++;
  const result = quiz.submit(laneIndex);

  if (!result) return;

  if (result.correct) {
    handleCorrectAnswer(laneIndex);
  } else {
    handleWrongAnswer();
  }
}

function handleCorrectAnswer(laneIndex) {
  gameState.totalCorrect++;
  gameState.streak++;
  if (gameState.streak > gameState.bestStreak) {
    gameState.bestStreak = gameState.streak;
  }

  const scoreGain = Math.round(100 * gameState.streak);
  gameState.score += scoreGain;

  beepCorrect();
  floatText(canvas.width / 2, canvas.height / 2, `+${scoreGain}`, 'var(--neon-green)');
  spawnParticles(cars[laneIndex].x, cars[laneIndex].y, {
    count: 20,
    colors: ['#00ffa2', '#00eaff'],
    speed: 300,
    life: 600,
    size: 5,
    container: document.body,
  });

  cars[laneIndex].speed = 600; // Launch the correct car

  // Other cars screech
  for (let i = 0; i < 4; i++) {
    if (i !== laneIndex) {
      beep({ freq: 200 - i * 20, dur: 0.15, type: 'square', volume: 0.1 });
    }
  }

  setTimeout(() => {
    quiz.next();
    if (!quiz.isDone()) {
      loadQuestion();
    } else {
      endGame();
    }
  }, 800);
}

function handleWrongAnswer() {
  gameState.streak = 0;
  gameState.lives--;

  beepWrong();
  flashElement(elements.container, 'var(--neon-red)', 200);
  shakeScreen(canvas, 300, 6);

  // All cars honk chaos
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      beep({ freq: 300 + Math.random() * 200, dur: 0.2, type: 'square', volume: 0.12 });
    }, i * 80);
  }

  if (gameState.lives <= 0) {
    endGame();
  } else {
    setTimeout(() => {
      quiz.next();
      if (!quiz.isDone()) {
        loadQuestion();
      } else {
        endGame();
      }
    }, 800);
  }
}

function endGame() {
  gameState.running = false;
  beepGameover();
  setTimeout(() => {
    document.getElementById('final-score').textContent = gameState.score;
    document.getElementById('final-streak').textContent = gameState.bestStreak;
    document.getElementById('final-correct').textContent = gameState.totalCorrect;
    document.getElementById('final-total').textContent = gameState.totalAnswered;
    elements.gameOverScreen.classList.remove('hidden');
  }, 600);
}

function quitToHub() {
  if (confirm('Quit to hub?')) {
    window.location.href = '../';
  }
}

function gameLoop() {
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;

  // Clear canvas
  ctx.fillStyle = '#080014';
  ctx.fillRect(0, 0, w, h);

  // Draw road grid
  ctx.strokeStyle = 'rgba(0, 234, 255, 0.15)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo((w / 4) * i, 0);
    ctx.lineTo((w / 4) * i, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (h / 4) * i);
    ctx.lineTo(w, (h / 4) * i);
    ctx.stroke();
  }

  // Draw intersection center cross
  ctx.strokeStyle = 'rgba(0, 234, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, h / 2 - 60);
  ctx.lineTo(w / 2, h / 2 + 60);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2 - 60, h / 2);
  ctx.lineTo(w / 2 + 60, h / 2);
  ctx.stroke();

  // Update and draw cars
  const now = Date.now();
  for (let i = 0; i < 4; i++) {
    const car = cars[i];

    // Idle bob animation
    car.bobOffset += 0.03;
    const bobY = Math.sin(car.bobOffset) * 3;

    // Move correct car
    if (car.speed > 0) {
      const angle = LANE_ANGLES[i];
      car.x += Math.cos(angle) * car.speed * (GAME_LOOP_INTERVAL / 1000);
      car.y += Math.sin(angle) * car.speed * (GAME_LOOP_INTERVAL / 1000);
      car.speed *= 0.96; // Decelerate
      if (car.speed < 5) car.speed = 0;
    }

    drawCar(car, bobY, i);
  }

  // Update cop baton angle
  cop.batonAngle += (cop.targetBatonAngle - cop.batonAngle) * 0.1;
  drawCop();

  // Draw timeout ring
  if (!gameState.answered && gameState.running) {
    const ratio = gameState.timeoutRemaining / gameState.timeoutMax;
    ctx.strokeStyle = `rgba(255, 48, 96, ${0.6 + ratio * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, cop.radius + 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.stroke();

    // Draw timeout warning text
    if (ratio < 0.3) {
      ctx.fillStyle = `rgba(255, 48, 96, ${0.5 + Math.sin(now / 100) * 0.3})`;
      ctx.font = 'bold 24px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.ceil(gameState.timeoutRemaining / 1000)}s`, w / 2, h / 2 + 50);
    }
  }

  // Update timeout
  if (gameState.running && !gameState.answered) {
    gameState.timeoutRemaining -= GAME_LOOP_INTERVAL;
    if (gameState.timeoutRemaining <= 0) {
      gameState.answered = true;
      gameState.lives--;
      beepWrong();
      flashElement(elements.container, 'var(--neon-red)', 200);
      if (gameState.lives <= 0) {
        endGame();
      } else {
        setTimeout(() => {
          quiz.next();
          if (!quiz.isDone()) {
            loadQuestion();
          } else {
            endGame();
          }
        }, 800);
      }
    }
  }

  // Draw particles
  particles = particles.filter(p => p.life > 0);

  if (gameState.running || gameState.lives > 0) {
    requestAnimationFrame(gameLoop);
  }
}

function drawCar(car, bobY, laneIndex) {
  const x = car.x;
  const y = car.y + bobY;
  const w = car.width;
  const h = car.height;
  const angle = LANE_ANGLES[laneIndex];

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Car body
  ctx.fillStyle = '#00eaff';
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Car border
  ctx.strokeStyle = '#00ffa2';
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  // Windows
  ctx.fillStyle = 'rgba(8, 0, 20, 0.7)';
  ctx.fillRect(-w / 3, -h / 3, w / 3, h / 3);

  // Choice text on flag
  ctx.fillStyle = '#000';
  ctx.font = 'bold 10px Courier New';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = car.choice.substring(0, 25);
  ctx.fillText(text, 0, h / 2 + 10);

  ctx.restore();
}

function drawCop() {
  const x = cop.x;
  const y = cop.y;
  const r = cop.radius;

  // Cop body (circle)
  ctx.fillStyle = '#ff00aa';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#00eaff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cop hat
  ctx.fillStyle = '#fff200';
  ctx.fillRect(x - r * 0.8, y - r * 1.2, r * 1.6, r * 0.4);

  // Baton
  ctx.strokeStyle = '#fff200';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const batonLen = r * 1.8;
  const bx = Math.cos(cop.batonAngle) * batonLen;
  const by = Math.sin(cop.batonAngle) * batonLen;
  ctx.moveTo(x, y);
  ctx.lineTo(x + bx, y + by);
  ctx.stroke();

  // Baton end glow
  ctx.fillStyle = 'rgba(255, 242, 0, 0.6)';
  ctx.beginPath();
  ctx.arc(x + bx, y + by, 6, 0, Math.PI * 2);
  ctx.fill();
}

initGame();
