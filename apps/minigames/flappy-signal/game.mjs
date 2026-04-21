import { loadQuestionBank, loadExplanations, createQuiz } from '../core/quiz-core.mjs';
import {
  beep, beepCorrect, beepWrong, beepGameover,
  shakeScreen, flashElement, spawnParticles, floatText
} from '../core/juice.mjs';

// ============================================================================
// CONFIG
// ============================================================================

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.6;
const FLAP_POWER = -12;
const PIPE_SPEED_BASE = 4;
const PIPE_WIDTH = 80;
const PIPE_GAP = 140;
const SPAWN_DISTANCE = 1200;
const PIPES_PER_QUESTION = 3;

// ============================================================================
// STATE
// ============================================================================

let game = {
  running: false,
  quiz: null,
  score: 0,
  bestScore: parseInt(localStorage.getItem('flappy-signal-best') || '0'),
  currentQuestion: null,
  questionAnswered: false,
  pipeSpeed: PIPE_SPEED_BASE,
  pipeSpeedRamp: 0.0001,
};

let bird = {
  x: CANVAS_WIDTH * 0.2,
  y: CANVAS_HEIGHT * 0.5,
  width: 24,
  height: 24,
  velY: 0,
  rotation: 0,
};

let pipes = [];
let pipeCounter = 0;
let spawnX = SPAWN_DISTANCE;

// ============================================================================
// CANVAS & DOM
// ============================================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const promptEl = document.getElementById('prompt');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const finalBestEl = document.getElementById('final-best');
const playAgainBtn = document.getElementById('play-again-btn');
const quitBtn = document.getElementById('quit-btn');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================================================
// GAME LOOP
// ============================================================================

function update(dt) {
  if (!game.running) return;

  // Apply gravity
  bird.velY += GRAVITY;
  bird.y += bird.velY;

  // Rotation based on velocity
  bird.rotation = Math.min(Math.max(bird.velY * 3, -30), 90) * Math.PI / 180;

  // Bounds checks for game over
  if (bird.y + bird.height / 2 > canvas.height) endGame(); // Hit ground
  if (bird.y - bird.height / 2 < 0) endGame(); // Hit ceiling

  // Update pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].x -= game.pipeSpeed;
    if (pipes[i].x + PIPE_WIDTH < 0) pipes.splice(i, 1);
  }

  // Spawn new pipes
  spawnX -= game.pipeSpeed;
  if (spawnX <= 0) {
    pipeCounter++;
    const isQuestion = pipeCounter % PIPES_PER_QUESTION === 0;
    if (isQuestion && game.currentQuestion && !game.questionAnswered) {
      spawnQuestionPipes();
    } else {
      spawnRegularPipes();
    }
    spawnX = SPAWN_DISTANCE;
  }

  // Collision detection with pipes
  for (const pipe of pipes) {
    if (checkCollision(bird, pipe)) {
      beepWrong();
      endGame();
    }
  }

  // Ramp up speed slightly
  game.pipeSpeed += game.pipeSpeedRamp;
}

function draw() {
  // Clear with gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#2a1a4e');
  gradient.addColorStop(1, '#140024');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw parallax background
  drawBackground();

  // Draw pipes
  for (const pipe of pipes) {
    drawPipe(pipe);
  }

  // Draw bird
  drawBird();
}

function drawBackground() {
  // Distant clouds (slowest parallax)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  const cloudOffset = ((pipeCounter * game.pipeSpeed * 0.2) % 400);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(100 + i * 300 - cloudOffset, 100 + Math.sin(i) * 30, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mid buildings (medium parallax)
  ctx.fillStyle = 'rgba(0, 234, 255, 0.1)';
  const buildingOffset = ((pipeCounter * game.pipeSpeed * 0.5) % 600);
  for (let i = 0; i < 4; i++) {
    const bx = 150 + i * 400 - buildingOffset;
    ctx.fillRect(bx, canvas.height * 0.6, 120, canvas.height * 0.4);
  }

  // Foreground grass (fastest parallax)
  ctx.fillStyle = 'rgba(0, 255, 162, 0.15)';
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
}

function drawPipe(pipe) {
  ctx.fillStyle = '#00a040';
  ctx.shadowColor = 'rgba(0, 255, 162, 0.5)';
  ctx.shadowBlur = 10;

  // Top pipe
  ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
  // Bottom pipe
  ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, canvas.height - pipe.topHeight - PIPE_GAP);

  ctx.shadowColor = 'transparent';

  // Draw label if it's a question pipe
  if (pipe.label !== undefined && pipe.topHeight > 0) {
    ctx.fillStyle = pipe.correct ? '#00ffa2' : '#ff3060';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pipe.label, pipe.x + PIPE_WIDTH / 2, pipe.topHeight + PIPE_GAP / 2);
  }
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  // Body
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(0, 0, bird.width / 2, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(6, -4, 4, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.moveTo(10, -2);
  ctx.lineTo(18, -4);
  ctx.lineTo(18, 4);
  ctx.closePath();
  ctx.fill();

  // Wing
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-4, 0, 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.restore();
}

// ============================================================================
// PIPE SPAWNING
// ============================================================================

function spawnRegularPipes() {
  const gapY = Math.random() * (canvas.height - PIPE_GAP - 100) + 50;
  pipes.push({
    x: canvas.width,
    topHeight: gapY,
    label: undefined,
  });
}

function spawnQuestionPipes() {
  if (!game.currentQuestion) return;
  const q = game.currentQuestion;
  const choices = q.choices;
  const correctIndex = q.correctIndex;

  // Create 4 stacked pipes, each with one gap labeled with a choice
  const gapSize = (canvas.height - 100) / 4;
  const gapTops = [];

  for (let i = 0; i < 4; i++) {
    gapTops.push(20 + i * gapSize);
  }

  // Shuffle the gap positions randomly
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  // Spawn pipes with labels
  for (let i = 0; i < 4; i++) {
    const choiceIdx = order[i];
    pipes.push({
      x: canvas.width + i * 200,
      topHeight: gapTops[i],
      label: String.fromCharCode(65 + choiceIdx), // A, B, C, D
      choiceIdx: choiceIdx,
      correct: choiceIdx === correctIndex,
    });
  }

  game.questionAnswered = false;
}

// ============================================================================
// COLLISION DETECTION
// ============================================================================

function checkCollision(bird, pipe) {
  const bLeft = bird.x - bird.width / 2;
  const bRight = bird.x + bird.width / 2;
  const bTop = bird.y - bird.height / 2;
  const bBottom = bird.y + bird.height / 2;

  const pLeft = pipe.x;
  const pRight = pipe.x + PIPE_WIDTH;
  const gapTop = pipe.topHeight;
  const gapBottom = pipe.topHeight + PIPE_GAP;

  if (bRight < pLeft || bLeft > pRight) return false; // No horizontal overlap
  if (bBottom >= gapTop && bTop <= gapBottom) return false; // Safe in gap
  return true; // Collision
}

function checkGapPass(bird, pipe) {
  const bLeft = bird.x - bird.width / 2;
  const bRight = bird.x + bird.width / 2;
  const bTop = bird.y - bird.height / 2;
  const bBottom = bird.y + bird.height / 2;

  const pLeft = pipe.x;
  const pRight = pipe.x + PIPE_WIDTH;
  const gapTop = pipe.topHeight;
  const gapBottom = pipe.topHeight + PIPE_GAP;

  // Bird is inside the gap horizontally and vertically
  if (bRight >= pLeft && bLeft <= pRight && bTop >= gapTop && bBottom <= gapBottom) {
    return true;
  }
  return false;
}

// ============================================================================
// GAME FLOW
// ============================================================================

async function initGame() {
  const bank = await loadQuestionBank('../data/questions.json');
  const explanations = await loadExplanations('../data/explanations.json');
  game.quiz = createQuiz(bank, { seed: Date.now(), explanations, limit: 50 });
  game.currentQuestion = game.quiz.current();
  updatePrompt();
  startGame();
}

function startGame() {
  game.running = true;
  game.score = 0;
  bird.y = CANVAS_HEIGHT / 2;
  bird.velY = 0;
  pipes = [];
  pipeCounter = 0;
  spawnX = SPAWN_DISTANCE;
  game.pipeSpeed = PIPE_SPEED_BASE;
  game.questionAnswered = false;
  scoreEl.textContent = `SCORE: ${game.score}`;
  gameOverScreen.classList.add('game-over-hidden');
}

function updatePrompt() {
  if (game.currentQuestion) {
    promptEl.textContent = game.currentQuestion.prompt.substring(0, 80) + '...';
  }
}

function endGame() {
  game.running = false;
  if (game.score > game.bestScore) {
    game.bestScore = game.score;
    localStorage.setItem('flappy-signal-best', game.bestScore);
  }
  beepGameover();
  shakeScreen(canvas, 300, 10);
  finalScoreEl.textContent = game.score;
  finalBestEl.textContent = game.bestScore;
  gameOverScreen.classList.remove('game-over-hidden');
}

// ============================================================================
// INPUT
// ============================================================================

function flap() {
  if (!game.running) return;
  bird.velY = FLAP_POWER;
  beep({ freq: 600, dur: 0.1, type: 'sine', volume: 0.18 });
  spawnParticles(bird.x, bird.y, {
    count: 8,
    colors: ['#ffd700', '#ffaa00', '#ff6600'],
    speed: 200,
    life: 400,
    size: 5,
  });
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); flap(); }
  if (e.code === 'Escape') { window.location.href = '../'; }
});

canvas.addEventListener('click', flap);

playAgainBtn.addEventListener('click', () => {
  game.score = 0;
  game.currentQuestion = game.quiz.current();
  updatePrompt();
  startGame();
});

quitBtn.addEventListener('click', () => {
  window.location.href = '../';
});

// ============================================================================
// GAME LOOP FRAME
// ============================================================================

let lastTime = performance.now();
function frame(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  update(dt);
  draw();

  // Check if bird passed through a gap
  if (game.running) {
    for (let i = pipes.length - 1; i >= 0; i--) {
      const pipe = pipes[i];
      if (pipe.label !== undefined && !pipe.passed && checkGapPass(bird, pipe)) {
        pipe.passed = true;
        if (pipe.correct) {
          beepCorrect();
          game.score += 100;
          scoreEl.textContent = `SCORE: ${game.score}`;
          flashElement(canvas, 'var(--juice-good)', 150);
          spawnParticles(bird.x, bird.y, {
            count: 20,
            colors: ['#00ffa2', '#00eaff', '#fff200'],
            speed: 350,
            life: 600,
            size: 7,
          });
          floatText('+100', { x: bird.x, y: bird.y - 40, color: '#00ffa2', size: 32, life: 800 });
          game.quiz.next();
          game.currentQuestion = game.quiz.current();
          updatePrompt();
          game.questionAnswered = true;
        } else {
          beepWrong();
          flashElement(canvas, 'var(--juice-bad)', 200);
          endGame();
        }
      }
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
initGame();
