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
const QUESTION_TIME = 20000; // ms
const GAME_LOOP_INTERVAL = 30; // ms
const BAY_WIDTH = 180;
const BAY_HEIGHT = 100;
const CAR_WIDTH = 40;
const CAR_HEIGHT = 60;

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
  parked: false,
  parkingTimeout: 0,
};

let car = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT - 120,
  vx: 0,
  vy: 0,
  heading: -Math.PI / 2,
  speed: 0,
  accel: 0,
  friction: 0.92,
  maxSpeed: 4,
};

let bays = [];
let particles = [];
let keys = {};
let engineVolume = 0;

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
    keys[e.code] = true;
    if (e.code === 'Escape') quitToHub();
  });

  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
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

  gameState.parked = false;
  gameState.parkingTimeout = 0;
  gameState.timeRemaining = gameState.timeMax;
  car.x = CANVAS_WIDTH / 2;
  car.y = CANVAS_HEIGHT - 120;
  car.vx = 0;
  car.vy = 0;
  car.speed = 0;
  car.heading = -Math.PI / 2;
  car.accel = 0;

  setupBays();
  updateHUD();

  beep({ freq: 60, dur: 0.3, type: 'sine', volume: 0.1 });
}

function setupBays() {
  const q = quiz.current();
  if (!q) return;

  const startX = (CANVAS_WIDTH - BAY_WIDTH * 4) / 2;
  const y = 30;

  bays = q.choices.map((choice, i) => ({
    index: i,
    label: String.fromCharCode(65 + i),
    choice,
    x: startX + i * (BAY_WIDTH + 20),
    y,
    width: BAY_WIDTH,
    height: BAY_HEIGHT,
    glowTime: 0,
    glowColor: 'rgba(0, 234, 255, 0.1)',
  }));
}

function updateHUD() {
  const q = quiz.current();
  if (q) {
    const prompt = q.prompt.substring(0, 100);
    elements.hudQuestion.textContent = prompt;
  }
  elements.hudLives.textContent = `❤️ ${gameState.lives}`;
  elements.hudStreak.textContent = `Streak ${gameState.streak}`;
  elements.hudScore.textContent = `Score ${gameState.score}`;

  const progress = Math.max(0, gameState.timeRemaining / gameState.timeMax);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - progress);
  elements.timerRing.style.strokeDasharray = `${circumference}`;
  elements.timerRing.style.strokeDashoffset = `${offset}`;
  elements.timerRing.style.borderColor = progress > 0.3 ? 'var(--neon-yellow)' : 'var(--neon-red)';
}

function updatePhysics() {
  const dt = GAME_LOOP_INTERVAL / 1000;

  // Input
  car.accel = 0;
  if (keys['ArrowUp'] || keys['KeyW']) car.accel = 0.08;
  if (keys['ArrowDown'] || keys['KeyS']) car.accel = -0.06;

  let steerRate = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) steerRate = 0.1;
  if (keys['ArrowRight'] || keys['KeyD']) steerRate = -0.1;

  // Apply steering (proportional to speed)
  car.heading += steerRate * Math.min(1, Math.abs(car.speed) * 0.5) * dt;

  // Apply acceleration
  car.speed += car.accel;
  car.speed = Math.max(-3, Math.min(car.maxSpeed, car.speed));

  // Friction
  car.speed *= car.friction;

  // Update velocity
  car.vx = car.speed * Math.cos(car.heading);
  car.vy = car.speed * Math.sin(car.heading);

  // Update position
  car.x += car.vx;
  car.y += car.vy;

  // Clamp to canvas with wall bounce
  const margin = 40;
  if (car.x < margin || car.x > CANVAS_WIDTH - margin) {
    car.vx = 0;
    car.speed = 0;
    car.x = Math.max(margin, Math.min(CANVAS_WIDTH - margin, car.x));
    spawnParticles(car.x, car.y, { count: 4, colors: ['#888', '#666'], speed: 120, life: 300, size: 3 });
    beep({ freq: 300, dur: 0.1, type: 'square', volume: 0.15 });
  }
  if (car.y < 180 || car.y > CANVAS_HEIGHT - margin) {
    car.vy = 0;
    car.speed = 0;
    car.y = Math.max(180, Math.min(CANVAS_HEIGHT - margin, car.y));
    spawnParticles(car.x, car.y, { count: 4, colors: ['#888', '#666'], speed: 120, life: 300, size: 3 });
    beep({ freq: 300, dur: 0.1, type: 'square', volume: 0.15 });
  }

  // Tire marks on sharp turns
  if (Math.abs(steerRate) > 0.05 && Math.abs(car.speed) > 0.5) {
    spawnParticles(car.x - car.vx * 0.5, car.y - car.vy * 0.5, {
      count: 1,
      colors: ['#444', '#333'],
      speed: 0,
      life: 2000,
      size: 2,
    });
  }

  // Engine sound: proportional to throttle
  const targetVolume = Math.abs(car.accel) * 0.3;
  engineVolume += (targetVolume - engineVolume) * 0.2;
  if (engineVolume > 0.01) {
    beep({ freq: 150 + Math.abs(car.speed) * 100, dur: GAME_LOOP_INTERVAL / 1000, type: 'sine', volume: engineVolume * 0.08 });
  }
}

function updateParking() {
  // Check if car is inside a bay and properly aligned
  for (let bay of bays) {
    const carCenterX = car.x;
    const carCenterY = car.y;

    const inBayX = carCenterX >= bay.x && carCenterX <= bay.x + bay.width;
    const inBayY = carCenterY >= bay.y && carCenterY <= bay.y + bay.height;

    if (inBayX && inBayY) {
      // Bay glow yellow when car is inside
      bay.glowTime = 0.5;
      bay.glowColor = 'rgba(255, 242, 0, 0.3)';

      // Check if heading is roughly into the bay (±30°)
      const targetHeading = -Math.PI / 2; // Points up
      let headingDiff = Math.abs(car.heading - targetHeading);
      if (headingDiff > Math.PI) headingDiff = 2 * Math.PI - headingDiff;

      const isAligned = headingDiff < Math.PI / 6; // 30°

      if (isAligned && Math.abs(car.speed) < 0.2) {
        gameState.parkingTimeout++;
        if (gameState.parkingTimeout > 13) { // 0.4s at 30ms intervals
          submitParking(bay.index);
          gameState.parked = true;
          return;
        }
      } else {
        gameState.parkingTimeout = 0;
      }
    } else {
      gameState.parkingTimeout = 0;
    }
  }
}

function submitParking(bayIndex) {
  if (!gameState.running || gameState.parked) return;

  const result = quiz.submit(bayIndex);
  if (!result) return;

  if (result.correct) {
    handleCorrectParking();
  } else {
    handleWrongParking();
  }
}

function handleCorrectParking() {
  beepCorrect();
  flashElement(elements.container, 'var(--neon-green)', 150);

  const scoreGain = Math.max(10, 100 - Math.floor((gameState.timeMax - gameState.timeRemaining) / 200));
  gameState.score += scoreGain * Math.max(1, gameState.streak);
  gameState.streak = quiz.score().streak;
  gameState.bestStreak = Math.max(gameState.bestStreak, gameState.streak);

  // Tire chirp particles
  spawnParticles(car.x, car.y + 20, {
    count: 12,
    colors: ['#ffaa00', '#ff6600', '#ff9900'],
    speed: 200,
    life: 600,
    size: 4,
  });

  setTimeout(() => {
    quiz.next();
    loadQuestion();
  }, 600);
}

function handleWrongParking() {
  beepWrong();
  flashElement(elements.container, 'var(--neon-red)', 200);
  shakeScreen(elements.container, 250, 10);

  gameState.lives--;
  gameState.streak = 0;

  spawnParticles(car.x, car.y, {
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

  gameState.timeRemaining -= GAME_LOOP_INTERVAL;

  if (gameState.timeRemaining <= 0 && !gameState.parked) {
    gameState.lives--;
    gameState.streak = 0;
    flashElement(elements.container, 'var(--neon-red)', 200);

    if (gameState.lives <= 0) {
      endGame();
    } else {
      gameState.timeRemaining = gameState.timeMax;
      quiz.next();
      loadQuestion();
    }
  }

  updatePhysics();
  if (!gameState.parked) {
    updateParking();
  }

  updateHUD();
  draw();

  setTimeout(gameLoop, GAME_LOOP_INTERVAL);
}

function draw() {
  // Clear with fade
  ctx.fillStyle = 'rgba(8, 0, 20, 0.08)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw perimeter walls
  ctx.strokeStyle = 'rgba(0, 234, 255, 0.4)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 160, canvas.width - 40, canvas.height - 180);

  // Draw center line markings
  ctx.strokeStyle = 'rgba(0, 234, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([30, 20]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 180);
  ctx.lineTo(canvas.width / 2, canvas.height - 20);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw bays
  for (let bay of bays) {
    if (bay.glowTime > 0) {
      bay.glowTime -= GAME_LOOP_INTERVAL / 1000;
    }

    ctx.fillStyle = bay.glowColor;
    if (bay.glowTime > 0) {
      const intensity = (bay.glowTime / 0.5) * 0.3;
      ctx.fillStyle = `rgba(255, 242, 0, ${intensity})`;
    } else {
      ctx.fillStyle = 'rgba(0, 234, 255, 0.08)';
    }

    ctx.fillRect(bay.x, bay.y, bay.width, bay.height);

    ctx.strokeStyle = 'rgba(0, 234, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bay.x, bay.y, bay.width, bay.height);

    // Label
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = 'rgba(0, 234, 255, 0.7)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(bay.label, bay.x + 12, bay.y + 12);

    // Choice text
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(0, 234, 255, 0.5)';
    const choiceText = bay.choice.substring(0, 20);
    ctx.fillText(choiceText, bay.x + 12, bay.y + 60);
  }

  // Draw car
  drawCar();

  // Draw timer bar at bottom
  const progress = Math.max(0, gameState.timeRemaining / gameState.timeMax);
  const barColor = progress > 0.3 ? 'rgba(0, 255, 162, 0.4)' : 'rgba(255, 0, 0, 0.4)';
  ctx.fillStyle = barColor;
  ctx.fillRect(0, canvas.height - 8, canvas.width * progress, 8);

  // Debug: parking timeout indicator
  if (gameState.parkingTimeout > 0) {
    ctx.fillStyle = `rgba(255, 242, 0, ${0.3 + gameState.parkingTimeout / 20})`;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PARKING...', car.x, car.y - 50);
  }
}

function drawCar() {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.heading + Math.PI / 2);

  // Main body (orange)
  ctx.fillStyle = '#ff9900';
  ctx.fillRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);

  // Windshield
  ctx.fillStyle = 'rgba(0, 200, 255, 0.4)';
  ctx.fillRect(-CAR_WIDTH / 2 + 4, -CAR_HEIGHT / 2 + 6, CAR_WIDTH - 8, 14);

  // Headlights (front)
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(-CAR_WIDTH / 2 + 8, -CAR_HEIGHT / 2 + 2, 4, 4);
  ctx.fillRect(CAR_WIDTH / 2 - 12, -CAR_HEIGHT / 2 + 2, 4, 4);

  // Border glow
  ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT);

  ctx.restore();
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

window.addEventListener('load', initGame);
