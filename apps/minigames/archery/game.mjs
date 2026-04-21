// Archery minigame — projectile-motion archery with labeled targets
import { loadQuestionBank, loadExplanations, createQuiz } from '../core/quiz-core.mjs';
import { beep, beepCorrect, beepWrong, spawnParticles, floatText } from '../core/juice.mjs';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let w = canvas.width = window.innerWidth;
let h = canvas.height = window.innerHeight;

// Game state
let quiz;
let lives = 3;
let score = 0;
let combo = 0;
let gameActive = true;

// Archer on left side
const archer = {
  x: w * 0.1,
  y: h * 0.5,
  angle: 45, // degrees
  power: 0, // 0-100
  isDrawing: false,
};

// Arrow
let arrow = null;
const arrowSpeed = 400;
const gravity = 600; // pixels/sec^2
let windForce = 0; // -1 to 1
let windAngle = 0;

// Targets: 4 targets at varying heights/distances
const targets = [
  { x: w * 0.35, y: h * 0.25, correctIndex: 0, label: '', hit: false },
  { x: w * 0.55, y: h * 0.4, correctIndex: 1, label: '', hit: false },
  { x: w * 0.7, y: h * 0.6, correctIndex: 2, label: '', hit: false },
  { x: w * 0.8, y: h * 0.35, correctIndex: 3, label: '', hit: false },
];
const targetRadius = 25;

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') quit();
  if (e.key === ' ') {
    e.preventDefault();
    if (!archer.isDrawing && !arrow) {
      archer.isDrawing = true;
      playBowDraw();
    }
  }
  keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === ' ') {
    if (archer.isDrawing) {
      archer.isDrawing = false;
      shoot();
    }
  }
  keys[e.key] = false;
});
window.addEventListener('resize', () => {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
});

// Audio synthesis
function playBowDraw() {
  try {
    const audioCtx = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) return;
    const ctx = new audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function playThwip() {
  beep({ freq: 450, dur: 0.08, type: 'triangle', volume: 0.15 });
}

function playThock() {
  beep({ freq: 800, dur: 0.1, type: 'triangle', volume: 0.18 });
  beep({ freq: 500, dur: 0.12, type: 'sine', volume: 0.1 });
}

// Shoot arrow
function shoot() {
  if (!gameActive || arrow) return;

  const angleRad = (archer.angle * Math.PI) / 180;
  const speed = (archer.power / 100) * arrowSpeed;

  arrow = {
    x: archer.x + 30,
    y: archer.y,
    vx: Math.cos(angleRad) * speed,
    vy: -Math.sin(angleRad) * speed,
    age: 0,
    trail: [],
  };

  windForce = (Math.random() - 0.5) * 200; // -100 to 100 pixels/sec
  windAngle = Math.sign(windForce) * 45;

  archer.power = 0;
  playThwip();
}

// Update
function update(dt) {
  if (!gameActive) return;

  // Angle adjustment
  if (keys['ArrowUp'] && archer.angle < 90) archer.angle += 80 * dt;
  if (keys['ArrowDown'] && archer.angle > 0) archer.angle -= 80 * dt;
  archer.angle = Math.max(0, Math.min(90, archer.angle));

  // Power charge
  if (archer.isDrawing && archer.power < 100) {
    archer.power += 120 * dt;
  }
  archer.power = Math.min(100, archer.power);

  // Arrow update
  if (arrow) {
    arrow.age += dt;

    // Store trail
    if (arrow.age % 0.02 < dt) {
      arrow.trail.push({ x: arrow.x, y: arrow.y });
      if (arrow.trail.length > 15) arrow.trail.shift();
    }

    // Physics
    arrow.vy += gravity * dt;
    arrow.vx += (windForce / 100) * dt; // Wind nudge
    arrow.x += arrow.vx * dt;
    arrow.y += arrow.vy * dt;

    // Timeout: 10 seconds
    if (arrow.age > 10) {
      onMiss();
      arrow = null;
    }

    // Check collisions with targets
    let hitTarget = null;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const dx = arrow.x - t.x;
      const dy = arrow.y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < targetRadius) {
        hitTarget = i;
        break;
      }
    }

    if (hitTarget !== null) {
      const q = quiz.current();
      const t = targets[hitTarget];

      if (q && hitTarget === q.correctIndex) {
        onCorrect(t);
      } else {
        onWrong(t);
      }
      arrow = null;
    }

    // Miss if off-screen
    if (arrow && (arrow.x > w + 50 || arrow.y > h + 50)) {
      onMiss();
      arrow = null;
    }
  }

  // Update HUD
  updateHUD();
}

// On correct target hit
function onCorrect(target) {
  const result = quiz.submit(target.correctIndex);
  if (!result) return;

  beepCorrect();
  target.hit = true;

  // Score bonus
  let earnedPoints = 100 + (result.streak - 1) * 20;

  // Bullseye bonus (random on this frame)
  if (Math.random() < 0.3) {
    earnedPoints += 50;
    floatText('BULLSEYE!', {
      x: target.x,
      y: target.y - 50,
      color: 'var(--neon-yellow)',
      size: 48,
      life: 1200,
    });
  } else {
    floatText('+' + earnedPoints, {
      x: target.x,
      y: target.y - 50,
      color: 'var(--neon-green)',
      size: 36,
      life: 900,
    });
  }

  score += earnedPoints;
  combo = result.streak;

  spawnParticles(target.x, target.y, {
    count: 20,
    colors: ['#ffdb1f', '#ff00aa', '#00eaff'],
    speed: 300,
    life: 600,
    size: 5,
  });

  // Next question
  setTimeout(() => {
    const next = quiz.next();
    if (!next || quiz.isDone()) {
      endGame();
    } else {
      resetTargets();
      playThock();
    }
  }, 600);
}

// On wrong target hit
function onWrong(target) {
  beepWrong();
  lives -= 1;
  combo = 0;

  floatText('WRONG!', {
    x: target.x,
    y: target.y - 50,
    color: 'var(--neon-red)',
    size: 40,
    life: 800,
  });

  target.hit = true;

  if (lives <= 0) {
    endGame();
  } else {
    const next = quiz.next();
    if (!next || quiz.isDone()) {
      endGame();
    } else {
      resetTargets();
    }
  }
}

// On miss (arrow doesn't hit any target)
function onMiss() {
  beepWrong();
  lives -= 1;
  combo = 0;

  if (lives <= 0) {
    endGame();
  } else {
    const next = quiz.next();
    if (!next || quiz.isDone()) {
      endGame();
    } else {
      resetTargets();
    }
  }
}

// Reset targets for new question
function resetTargets() {
  targets.forEach(t => t.hit = false);
  const q = quiz.current();
  if (q) {
    targets.forEach((t, i) => {
      t.label = q.choices[i] || '';
      t.correctIndex = i;
    });
  }
}

// Update HUD
function updateHUD() {
  const q = quiz.current();
  if (q) document.getElementById('hud-question').textContent = q.prompt;

  document.getElementById('hud-lives').textContent = `LIVES ${lives}`;
  document.getElementById('hud-combo').textContent = `COMBO ${combo}`;
  document.getElementById('hud-score').textContent = `SCORE ${score}`;

  document.getElementById('angle-display').textContent = `ANGLE ${Math.round(archer.angle)}°`;
  document.getElementById('power-bar').style.width = archer.power + '%';

  const windDir = Math.sign(windForce) > 0 ? '→' : '←';
  const windStr = windForce === 0 ? 'NO WIND' : `WIND ${windDir} ${Math.abs(Math.round(windForce / 10))}`;
  document.getElementById('wind-indicator').textContent = windStr;
}

// Draw
function draw() {
  // Clear canvas
  ctx.fillStyle = 'rgba(8, 0, 20, 0.05)';
  ctx.fillRect(0, 0, w, h);

  // Draw starfield
  drawStarfield();

  // Draw archer
  drawArcher();

  // Draw targets
  targets.forEach((t, i) => {
    drawTarget(t, i);
  });

  // Draw arrow trail
  if (arrow) {
    drawArrowTrail(arrow);
    drawArrow(arrow);
  }

  // Draw wind indicator arrow
  if (windForce !== 0) {
    drawWindArrow();
  }
}

function drawStarfield() {
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  const seed = 42;
  let rng = seededRng(seed);
  for (let i = 0; i < 100; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const size = rng() * 1;
    ctx.fillRect(x, y, size, size);
  }
}

function seededRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawArcher() {
  const ax = archer.x;
  const ay = archer.y;

  // Body
  ctx.fillStyle = '#00eaff';
  ctx.fillRect(ax - 8, ay - 20, 16, 40);

  // Head
  ctx.beginPath();
  ctx.arc(ax, ay - 25, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#00eaff';
  ctx.fill();

  // Bow
  const angleRad = (archer.angle * Math.PI) / 180;
  const bowLength = 25;
  const bowX = ax + 15;
  const bowY = ay;

  ctx.strokeStyle = '#ffdb1f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(bowX, bowY - bowLength);
  ctx.lineTo(bowX, bowY + bowLength);
  ctx.stroke();

  // Draw string (flexed if drawing)
  const flex = archer.isDrawing ? archer.power * 0.15 : 0;
  ctx.strokeStyle = '#ff00aa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bowX, bowY - bowLength);
  ctx.lineTo(bowX - 15 - flex, bowY);
  ctx.lineTo(bowX, bowY + bowLength);
  ctx.stroke();

  // Arrow in hand (if not shot)
  if (!arrow && archer.isDrawing) {
    const arrowX = bowX - 10 - flex;
    const arrowY = bowY;
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(arrowX - 12, arrowY);
    ctx.lineTo(arrowX + 5, arrowY);
    ctx.stroke();
  }
}

function drawTarget(target, index) {
  const t = target;

  // Outer ring (silver)
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(t.x, t.y, targetRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Middle ring
  ctx.strokeStyle = 'rgba(220, 180, 100, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(t.x, t.y, targetRadius * 0.65, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring (gold)
  ctx.fillStyle = 'rgba(255, 200, 50, 0.4)';
  ctx.beginPath();
  ctx.arc(t.x, t.y, targetRadius * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Hit flash
  if (t.hit) {
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, targetRadius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Label
  ctx.fillStyle = '#00eaff';
  ctx.font = 'bold 14px Courier';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(t.label, t.x, t.y + targetRadius + 12);
}

function drawArrow(arrow) {
  const angle = Math.atan2(arrow.vy, arrow.vx);

  ctx.save();
  ctx.translate(arrow.x, arrow.y);
  ctx.rotate(angle);

  // Arrow shaft
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(16, 0);
  ctx.stroke();

  // Arrow head
  ctx.fillStyle = '#ffdb1f';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(12, -4);
  ctx.lineTo(12, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawArrowTrail(arrow) {
  if (arrow.trail.length < 2) return;

  ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(arrow.trail[0].x, arrow.trail[0].y);

  for (let i = 1; i < arrow.trail.length; i++) {
    ctx.lineTo(arrow.trail[i].x, arrow.trail[i].y);
  }
  ctx.stroke();
}

function drawWindArrow() {
  const x = w / 2;
  const y = 80;
  const arrowLen = Math.abs(windForce) / 100 * 40;
  const dir = Math.sign(windForce);

  ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - arrowLen * dir, y);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 200, 50, 0.6)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 8 * dir, y - 5);
  ctx.lineTo(x - 8 * dir, y + 5);
  ctx.closePath();
  ctx.fill();
}

// Game loop
let lastTime = Date.now();
function gameLoop() {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  update(Math.min(dt, 0.033)); // Cap at 30fps
  draw();

  requestAnimationFrame(gameLoop);
}

// End game
function endGame() {
  gameActive = false;
  const score_obj = quiz.score();
  const final = document.getElementById('final-stats');

  document.getElementById('final-score').textContent = score;
  document.getElementById('final-correct').textContent = score_obj.correct;
  document.getElementById('final-total').textContent = score_obj.total;
  document.getElementById('final-streak').textContent = score_obj.bestStreak;

  document.getElementById('game-over').classList.remove('hidden');
}

// Quit to hub
function quit() {
  window.location.href = '../';
}

// Init
async function init() {
  try {
    const bank = await loadQuestionBank('../data/questions.json');
    const explanations = await loadExplanations('../data/explanations.json');
    quiz = createQuiz(bank, { seed: Date.now(), explanations });

    resetTargets();
    gameLoop();
  } catch (err) {
    console.error('Init failed:', err);
    document.getElementById('hud-question').textContent = 'Error loading quiz';
  }
}

document.getElementById('play-again-btn').addEventListener('click', () => {
  window.location.reload();
});

document.getElementById('quit-btn').addEventListener('click', quit);

init();
