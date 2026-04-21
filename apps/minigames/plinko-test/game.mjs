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

const INITIAL_LIVES = 3;
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const SLOT_HEIGHT = 80;
const PEG_RADIUS = 8;
const BALL_RADIUS = 6;
const GRAVITY = 0.6;
const BOUNCE_DAMPING = 0.85;
const NUDGE_BUDGET = 5;
const NUDGE_FORCE = 3;

let quiz = null;
let gameState = {
  running: false,
  lives: INITIAL_LIVES,
  score: 0,
  streak: 0,
  bestStreak: 0,
};

const elements = {
  canvas: document.getElementById('plinko-canvas'),
  slotsContainer: document.getElementById('slots-container'),
  hudQuestion: document.getElementById('hud-question'),
  hudNudges: document.getElementById('hud-nudges'),
  hudLives: document.getElementById('hud-lives'),
  hudStreak: document.getElementById('hud-streak'),
  hudScore: document.getElementById('hud-score'),
  gameOverScreen: document.getElementById('game-over'),
  playAgainBtn: document.getElementById('play-again-btn'),
  quitBtn: document.getElementById('quit-btn'),
  finalScore: document.getElementById('final-score'),
  finalCorrect: document.getElementById('final-correct'),
  finalTotal: document.getElementById('final-total'),
  finalStreak: document.getElementById('final-streak'),
};

let ctx = null;
let gameLoopId = null;

// Physics body for the ball
let ball = null;
let pegs = [];
let slots = [];
let ballInFlight = false;
let nudgesRemaining = NUDGE_BUDGET;
let ballLanded = false;

class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = BALL_RADIUS;
  }

  update() {
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98; // air friction
  }

  draw(ctx) {
    ctx.fillStyle = '#00eaff';
    ctx.shadowColor = 'rgba(0, 234, 255, 0.8)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  isOutOfBounds() {
    return this.y > CANVAS_HEIGHT;
  }
}

function initGame() {
  ctx = elements.canvas.getContext('2d');
  elements.canvas.width = CANVAS_WIDTH;
  elements.canvas.height = CANVAS_HEIGHT;

  gameState.running = true;
  gameState.lives = INITIAL_LIVES;
  gameState.score = 0;
  gameState.streak = 0;
  gameState.bestStreak = 0;

  ball = null;
  ballInFlight = false;
  nudgesRemaining = NUDGE_BUDGET;
  ballLanded = false;

  setupPegs();
  setupSlots();
  updateHUD();
  showQuestion();

  startGameLoop();

  window.addEventListener('keydown', handleKeyDown);
}

function setupPegs() {
  pegs = [];
  const pegRows = 6;
  const pegCols = 5;
  const rowSpacing = 70;
  const colSpacing = 70;
  const offsetX = 40;
  const offsetY = 40;

  for (let row = 0; row < pegRows; row++) {
    for (let col = 0; col < pegCols; col++) {
      const x = offsetX + col * colSpacing + (row % 2) * (colSpacing / 2);
      const y = offsetY + row * rowSpacing;
      pegs.push({ x, y, radius: PEG_RADIUS, hit: false });
    }
  }
}

function setupSlots() {
  slots = [];
  const q = quiz.current();
  if (!q) return;

  for (let i = 0; i < 4; i++) {
    const x = (CANVAS_WIDTH / 4) * i;
    const w = CANVAS_WIDTH / 4;
    const label = (q.choices && q.choices[i]) || `Choice ${i + 1}`;
    slots.push({
      x,
      y: CANVAS_HEIGHT - SLOT_HEIGHT,
      width: w,
      height: SLOT_HEIGHT,
      index: i,
      label,
      active: false,
    });
  }

  // Update DOM slots display
  elements.slotsContainer.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.id = `slot-${i}`;
    slot.textContent = slots[i].label;
    elements.slotsContainer.appendChild(slot);
  }
}

function showQuestion() {
  const q = quiz.current();
  if (q) {
    elements.hudQuestion.textContent = q.prompt.substring(0, 120);
  }
}

function updateHUD() {
  elements.hudNudges.textContent = `Nudges ${nudgesRemaining}`;
  elements.hudLives.textContent = `❤️ ${gameState.lives}`;
  elements.hudLives.className =
    gameState.lives > 1 ? 'hud-item hud-bad' : 'hud-item hud-bad';
  elements.hudStreak.textContent = `Streak ${gameState.streak}`;
  elements.hudScore.textContent = `Score ${gameState.score}`;
}

function dropBall() {
  if (ballInFlight || !gameState.running) return;

  const q = quiz.current();
  if (!q) return;

  // Reset peg hit status
  pegs.forEach(p => (p.hit = false));

  // Drop ball from top with slight horizontal randomness
  const startX = CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 60;
  ball = new Ball(startX, 10);
  ballInFlight = true;
  ballLanded = false;
  nudgesRemaining = NUDGE_BUDGET;
  updateHUD();
}

function nudgeBall(direction) {
  if (!ballInFlight || !ball || nudgesRemaining <= 0) return;
  ball.vx += direction * NUDGE_FORCE;
  nudgesRemaining--;
  updateHUD();
}

function handleKeyDown(e) {
  if (e.key === ' ') {
    e.preventDefault();
    dropBall();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    nudgeBall(-1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    nudgeBall(1);
  } else if (e.key === 'Escape') {
    endGame();
  }
}

function checkPegCollisions(ball) {
  for (const peg of pegs) {
    const dx = ball.x - peg.x;
    const dy = ball.y - peg.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = ball.radius + peg.radius;

    if (dist < minDist) {
      // Collision!
      if (!peg.hit) {
        peg.hit = true;
        // Emit sound and visual effect
        beep({ freq: 800 + Math.random() * 400, dur: 0.08, type: 'square', volume: 0.15 });
        flashPeg(peg);
        spawnParticles(peg.x, peg.y, {
          count: 6,
          colors: ['#00eaff'],
          speed: 150,
          life: 300,
          size: 3,
        });
      }

      // Bounce ball away from peg
      const angle = Math.atan2(dy, dx);
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const jitter = (Math.random() - 0.5) * 0.4;
      const newAngle = angle + jitter;
      const bounceSpeed = Math.max(2, speed * BOUNCE_DAMPING);
      ball.vx = Math.cos(newAngle) * bounceSpeed;
      ball.vy = Math.sin(newAngle) * bounceSpeed;

      // Push ball out of peg
      const overlap = minDist - dist;
      ball.x += Math.cos(angle) * overlap;
      ball.y += Math.sin(angle) * overlap;
    }
  }
}

function flashPeg(peg) {
  // Simple visual pulse on peg collision (handled in draw)
}

function checkSlotCollision(ball) {
  if (ballLanded) return;

  for (const slot of slots) {
    if (
      ball.x > slot.x &&
      ball.x < slot.x + slot.width &&
      ball.y > slot.y &&
      ball.y < slot.y + slot.height
    ) {
      // Ball landed in slot
      ballLanded = true;
      ballInFlight = false;
      submitAnswer(slot.index);
      return;
    }
  }
}

function submitAnswer(slotIndex) {
  const result = quiz.submit(slotIndex);
  if (!result) return;

  const slotEl = document.getElementById(`slot-${slotIndex}`);
  const q = quiz.current();

  if (result.correct) {
    // Correct!
    beepCorrect();
    if (slotEl) {
      slotEl.classList.add('correct');
      flashElement(slotEl, 'var(--juice-good)', 400);
    }
    spawnParticles(ball.x, ball.y, {
      count: 20,
      colors: ['#00ffa2', '#00eaff'],
      speed: 280,
      life: 600,
    });

    const points = 100 * result.streak;
    gameState.score += points;
    gameState.streak = result.streak;
    gameState.bestStreak = result.bestStreak;
    floatText(`+${points}`, { x: ball.x, y: ball.y, color: 'var(--neon-green)', size: 28 });

    setTimeout(() => {
      if (slotEl) slotEl.classList.remove('correct');
      nextQuestion();
    }, 400);
  } else {
    // Wrong!
    beepWrong();
    if (slotEl) {
      slotEl.classList.add('wrong');
      flashElement(slotEl, 'var(--juice-bad)', 300);
    }
    shakeScreen(elements.canvas, 300, 6);
    gameState.lives--;
    gameState.streak = 0;
    floatText('Wrong!', { x: ball.x, y: ball.y, color: 'var(--neon-red)', size: 24 });

    setTimeout(() => {
      if (slotEl) slotEl.classList.remove('wrong');
      if (gameState.lives <= 0) {
        endGame();
      } else {
        nextQuestion();
      }
    }, 400);
  }

  updateHUD();
}

function nextQuestion() {
  quiz.next();
  if (quiz.isDone()) {
    endGame();
  } else {
    ball = null;
    ballInFlight = false;
    ballLanded = false;
    nudgesRemaining = NUDGE_BUDGET;
    setupSlots();
    showQuestion();
    updateHUD();
  }
}

function drawGame() {
  // Clear canvas
  ctx.fillStyle = 'rgba(8, 0, 20, 0.2)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw pegs
  ctx.fillStyle = '#00eaff';
  for (const peg of pegs) {
    if (peg.hit) {
      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = 'rgba(0, 255, 136, 0.8)';
      ctx.shadowBlur = 15;
    } else {
      ctx.fillStyle = '#00eaff';
      ctx.shadowColor = 'rgba(0, 234, 255, 0.5)';
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Draw ball
  if (ball) {
    // Trail particles
    ctx.fillStyle = 'rgba(0, 234, 255, 0.3)';
    for (let i = 0; i < 3; i++) {
      const s = 1 - i / 3;
      ctx.globalAlpha = 0.3 * s;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y + i * 4, ball.radius * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ball.draw(ctx);
  }

  // Draw slots at bottom
  ctx.fillStyle = 'rgba(0, 234, 255, 0.1)';
  ctx.strokeStyle = '#00eaff';
  ctx.lineWidth = 2;
  for (const slot of slots) {
    ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
    ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);
  }

  // Instruction text
  if (!ballInFlight) {
    ctx.fillStyle = 'rgba(0, 234, 255, 0.6)';
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS SPACE TO DROP BALL', CANVAS_WIDTH / 2, CANVAS_HEIGHT - SLOT_HEIGHT - 20);
  }
}

function startGameLoop() {
  gameLoopId = setInterval(() => {
    if (!gameState.running) return;

    if (ball) {
      ball.update();
      checkPegCollisions(ball);
      checkSlotCollision(ball);

      // Out of bounds check (shouldn't happen, but safety)
      if (ball.isOutOfBounds() && !ballLanded) {
        ballInFlight = false;
        ballLanded = true;
        // Default to first slot (auto-fail)
        setTimeout(() => submitAnswer(0), 100);
      }
    }

    drawGame();
  }, 1000 / 60); // 60 FPS
}

function endGame() {
  gameState.running = false;
  if (gameLoopId) clearInterval(gameLoopId);
  window.removeEventListener('keydown', handleKeyDown);

  const score = quiz.score();
  elements.finalScore.textContent = gameState.score;
  elements.finalCorrect.textContent = score.correct;
  elements.finalTotal.textContent = score.total;
  elements.finalStreak.textContent = gameState.bestStreak;

  beepGameover();
  elements.gameOverScreen.classList.remove('hidden');
}

function resetGame() {
  elements.gameOverScreen.classList.add('hidden');
  quiz.reset();
  initGame();
}

// Event listeners
elements.playAgainBtn.addEventListener('click', resetGame);
elements.quitBtn.addEventListener('click', () => {
  window.location.href = '../';
});

// Initialize on load
async function main() {
  try {
    const bank = await loadQuestionBank('../data/questions.json');
    const explanations = await loadExplanations('../data/explanations.json');
    quiz = createQuiz(bank, {
      seed: Date.now(),
      explanations,
    });
    initGame();
  } catch (err) {
    console.error('Failed to load game:', err);
    elements.hudQuestion.textContent = 'Error loading game';
  }
}

main();
