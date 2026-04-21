import { loadQuestionBank, loadExplanations, createQuiz } from '../core/quiz-core.mjs';
import { beep, beepCorrect, beepWrong, beepGameover, shakeScreen, spawnParticles, floatText } from '../core/juice.mjs';

// Game state
let quiz = null;
let gameState = {
  gameActive: false,
  lives: 3,
  score: 0,
  streak: 0,
  ballSpeed: 200,
  ballSpeedBase: 200,
};

// Canvas & rendering
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Resize canvas to fill viewport
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - document.getElementById('hud').offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game objects
class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * gameState.ballSpeed;
    this.vy = gameState.ballSpeed * 0.7;
    this.radius = 6;
    this.trail = [];
  }

  update(dt) {
    this.trail.push({ x: this.x, y: this.y, age: 0 });
    if (this.trail.length > 20) this.trail.shift();
    for (const p of this.trail) p.age += dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Side wall bounces
    if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
      this.vx *= -1;
      this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
      beep({ freq: 300, dur: 0.08, volume: 0.15 });
    }

    // Top wall bounce (shouldn't happen in normal play)
    if (this.y - this.radius < 0) {
      this.vy = Math.abs(this.vy);
      this.y = this.radius;
    }
  }

  draw() {
    // Trail
    for (let i = 0; i < this.trail.length - 1; i++) {
      const p1 = this.trail[i];
      const p2 = this.trail[i + 1];
      const alpha = Math.max(0, 1 - p1.age / 300);
      ctx.strokeStyle = `rgba(0, 234, 255, ${alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Ball
    ctx.fillStyle = '#00eaff';
    ctx.shadowColor = 'rgba(0, 234, 255, 0.8)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
  }

  reset() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 3;
    this.vx = (Math.random() - 0.5) * gameState.ballSpeed;
    this.vy = gameState.ballSpeed * 0.7;
    this.trail = [];
  }
}

class Paddle {
  constructor() {
    this.x = canvas.width / 2;
    this.y = 40;
    this.width = 80;
    this.height = 12;
    this.vx = 0;
    this.speed = 400;
  }

  update(dt, mouseX = null) {
    if (mouseX !== null) {
      this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, mouseX));
    } else {
      this.x += this.vx * dt;
      this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
    }
  }

  draw() {
    const pulseAmount = 1 + Math.sin(Date.now() / 200) * 0.1;
    ctx.fillStyle = '#00eaff';
    ctx.shadowColor = 'rgba(0, 234, 255, 0.8)';
    ctx.shadowBlur = 16;
    ctx.fillRect(this.x - this.width / 2 * pulseAmount, this.y, this.width * pulseAmount, this.height);
    ctx.shadowColor = 'transparent';
  }

  getBounds() {
    const halfWidth = (this.width / 2) * (1 + Math.sin(Date.now() / 200) * 0.1);
    return {
      x1: this.x - halfWidth,
      x2: this.x + halfWidth,
      y1: this.y,
      y2: this.y + this.height,
    };
  }

  collideWithBall(ball) {
    const bounds = this.getBounds();
    if (ball.y + ball.radius > bounds.y1 && ball.y - ball.radius < bounds.y2 &&
        ball.x > bounds.x1 && ball.x < bounds.x2) {
      // Angle variation based on where ball hits paddle
      const hitPos = (ball.x - bounds.x1) / (bounds.x2 - bounds.x1);
      const angle = (hitPos - 0.5) * 1.2; // ±0.6 radians
      const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
      ball.vy = -Math.abs(ball.vy);
      ball.vx = Math.sin(angle) * speed;
      ball.y = bounds.y1 - ball.radius;
      beep({ freq: 600, dur: 0.1, volume: 0.18 });
      return true;
    }
    return false;
  }
}

class BottomWall {
  constructor(index, label, color) {
    this.index = index;
    this.label = label;
    this.color = color;
    this.x = (canvas.width / 4) * index;
    this.y = canvas.height - 40;
    this.width = canvas.width / 4;
    this.height = 40;
    this.flashAlpha = 0;
  }

  update(dt) {
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3);
  }

  draw() {
    const baseColor = this.color;
    const flash = this.flashAlpha * 0.5;
    ctx.fillStyle = baseColor;
    ctx.globalAlpha = 0.8 + flash;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Label
    ctx.fillStyle = baseColor;
    ctx.shadowColor = `rgba(${this.color === '#ff0078' ? '255,0,120' : '0,170,0'}, 0.6)`;
    ctx.shadowBlur = 8;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2);
    ctx.shadowColor = 'transparent';
  }

  getBounds() {
    return { x1: this.x, x2: this.x + this.width, y1: this.y, y2: this.y + this.height };
  }

  collideWithBall(ball) {
    const bounds = this.getBounds();
    if (ball.y + ball.radius > bounds.y1 && ball.y - ball.radius < bounds.y2 &&
        ball.x > bounds.x1 && ball.x < bounds.x2) {
      ball.vy = Math.abs(ball.vy);
      ball.y = bounds.y1 - ball.radius;
      this.flashAlpha = 1;
      return true;
    }
    return false;
  }
}

let ball = new Ball(canvas.width / 2, canvas.height / 3);
let paddle = new Paddle();
let bottomWalls = [];

// Input handling
let keysPressed = {};
let mouseX = canvas.width / 2;

window.addEventListener('keydown', (e) => {
  keysPressed[e.key.toLowerCase()] = true;
  if (e.key === 'Escape') quitGame();
});

window.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
});

function updatePaddleMovement() {
  paddle.vx = 0;
  if (keysPressed['arrowleft'] || keysPressed['a']) {
    paddle.vx = -paddle.speed;
  }
  if (keysPressed['arrowright'] || keysPressed['d']) {
    paddle.vx = paddle.speed;
  }
}

// HUD updates
function updateHUD() {
  const q = quiz.current();
  document.getElementById('hud-question').textContent = q ? q.prompt : 'Loading...';
  document.getElementById('hud-lives').textContent = `❤️ ${gameState.lives}`;
  document.getElementById('hud-score').textContent = `Score ${gameState.score}`;
  document.getElementById('hud-streak').textContent = `Streak ${gameState.streak}`;
}

// Game loop
let lastTime = Date.now();
function gameLoop() {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Update
  if (gameState.gameActive) {
    updatePaddleMovement();
    paddle.update(dt, mouseX);
    ball.update(dt);

    for (const wall of bottomWalls) {
      wall.update(dt);
    }

    // Paddle collision
    paddle.collideWithBall(ball);

    // Bottom wall collisions
    for (const wall of bottomWalls) {
      if (wall.collideWithBall(ball)) {
        const result = quiz.submit(wall.index);
        if (result) {
          if (result.correct) {
            handleCorrectHit(wall);
          } else {
            handleWrongHit(wall, result.correctIndex);
          }
        }
        break;
      }
    }

    // Ball out of bounds (bottom)
    if (ball.y > canvas.height + 100) {
      gameState.lives -= 1;
      beepWrong();
      if (gameState.lives <= 0) {
        endGame();
      } else {
        ball.reset();
        nextRound();
      }
    }
  }

  // Draw
  ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameState.gameActive) {
    for (const wall of bottomWalls) {
      wall.draw();
    }
    paddle.draw();
    ball.draw();
  }

  requestAnimationFrame(gameLoop);
}

function handleCorrectHit(wall) {
  gameState.streak += 1;
  gameState.score += 100 * gameState.streak;
  gameState.ballSpeed = gameState.ballSpeedBase * (1 + gameState.streak * 0.05);

  beepCorrect();
  wall.flashAlpha = 1;

  const x = wall.x + wall.width / 2;
  const y = wall.y + wall.height / 2;
  spawnParticles(x, y, { count: 20, colors: ['#00ff88', '#00eaff', '#ffff00'], speed: 350, life: 600, size: 6 });
  floatText('+' + (100 * gameState.streak), { x, y, color: '#00ff88', size: 36, life: 800 });

  updateHUD();
  setTimeout(() => {
    quiz.next();
    const q = quiz.current();
    if (!q) {
      endGame();
    } else {
      ball.reset();
      nextRound();
    }
  }, 400);
}

function handleWrongHit(wallIndex, correctIndex) {
  gameState.streak = 0;
  gameState.lives -= 1;

  beepWrong();
  shakeScreen(canvas, 200, 6);
  bottomWalls[correctIndex].flashAlpha = 1;

  updateHUD();
  setTimeout(() => {
    if (gameState.lives <= 0) {
      endGame();
    } else {
      ball.reset();
      nextRound();
    }
  }, 400);
}

function nextRound() {
  const q = quiz.current();
  if (!q) {
    endGame();
    return;
  }

  updateHUD();
  ball.reset();

  // Set up bottom walls with current question choices
  bottomWalls = [
    new BottomWall(0, 'A', '#00aa00'),
    new BottomWall(1, 'B', '#00aa00'),
    new BottomWall(2, 'C', '#00aa00'),
    new BottomWall(3, 'D', '#00aa00'),
  ];

  // Label walls with choices
  for (let i = 0; i < 4; i++) {
    if (i === q.correctIndex) {
      bottomWalls[i].color = '#00dd77';
    } else {
      bottomWalls[i].color = '#ff0078';
    }
  }
}

async function startGame() {
  try {
    const bank = await loadQuestionBank('../data/questions.json');
    const explanations = await loadExplanations('../data/explanations.json');
    quiz = createQuiz(bank, { seed: Date.now(), explanations });

    gameState.gameActive = true;
    gameState.lives = 3;
    gameState.score = 0;
    gameState.streak = 0;
    gameState.ballSpeed = gameState.ballSpeedBase;

    nextRound();
    gameLoop();
  } catch (err) {
    console.error('Game init failed:', err);
    document.getElementById('hud-question').textContent = 'Error loading quiz.';
  }
}

function endGame() {
  gameState.gameActive = false;
  beepGameover();

  const stats = quiz.score();
  document.getElementById('final-score').textContent = gameState.score;
  document.getElementById('final-correct').textContent = stats.correct;
  document.getElementById('final-total').textContent = stats.correct + stats.wrong;
  document.getElementById('final-streak').textContent = stats.bestStreak;

  setTimeout(() => {
    document.getElementById('game-over').classList.remove('hidden');
  }, 500);
}

function quitGame() {
  window.location.href = '../';
}

document.getElementById('play-again-btn').addEventListener('click', () => {
  document.getElementById('game-over').classList.add('hidden');
  startGame();
});

document.getElementById('quit-btn').addEventListener('click', quitGame);

// Start the game
startGame();
