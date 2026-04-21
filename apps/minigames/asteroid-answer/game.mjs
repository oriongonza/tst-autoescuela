// Asteroid Answer minigame — Asteroids-style shooter with quiz integration
import { loadQuestionBank, loadExplanations, createQuiz } from '../core/quiz-core.mjs';
import { beep, beepCorrect, beepWrong, floatText, spawnParticles, shakeScreen } from '../core/juice.mjs';

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
let speedMultiplier = 1;

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') quit();
  keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});
window.addEventListener('resize', () => {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
});

// Ship physics
const ship = {
  x: w / 2,
  y: h - 80,
  vx: 0,
  vy: 0,
  angle: 0,
  maxSpeed: 200,
};

// Bullets
let bullets = [];
const bulletSpeed = 500;

// Asteroids
let asteroids = [];
const asteroidBaseSpeed = 50;

// Thruster audio context for continuous sound
let thrustGain = null;
function startThrust() {
  try {
    const audioCtx = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) return;
    const ctx = new audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    thrustGain = { gain, osc, ctx, startTime: ctx.currentTime };
  } catch {}
}

function stopThrust() {
  if (thrustGain) {
    try {
      const { gain, osc, ctx, startTime } = thrustGain;
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
    thrustGain = null;
  }
}

// Draw starfield background
function drawStarfield(offset = 0) {
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  const seed = 42;
  let rng = seededRng(seed);
  for (let i = 0; i < 200; i++) {
    const x = (rng() * w * 1.5 - offset * 0.3) % w;
    const y = rng() * h;
    const size = rng() * 1.2;
    ctx.fillRect(x, y, size, size);
  }
}

// Seeded RNG for consistent star placement
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

// Draw ship as triangle with thruster glow
function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  // Engine glow
  const glow = ctx.createRadialGradient(0, 12, 0, 0, 12, 20);
  glow.addColorStop(0, 'rgba(0,234,255,0.4)');
  glow.addColorStop(1, 'rgba(0,234,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-15, 0, 30, 30);

  // Ship triangle
  ctx.fillStyle = '#00eaff';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(12, 14);
  ctx.lineTo(0, 6);
  ctx.lineTo(-12, 14);
  ctx.closePath();
  ctx.fill();

  // Glow outline
  ctx.strokeStyle = 'rgba(0,234,255,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// Draw asteroid as procedural polygon
function drawAsteroid(ast) {
  ctx.save();
  ctx.translate(ast.x, ast.y);
  ctx.rotate(ast.rotation);

  const sides = ast.sides || 8;
  const size = ast.size || 30;

  // Glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.2);
  glow.addColorStop(0, 'rgba(255,255,255,0.2)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-size * 1.3, -size * 1.3, size * 2.6, size * 2.6);

  // Rock shape
  ctx.fillStyle = '#ff00aa';
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const r = size * (0.7 + Math.random() * 0.3);
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(255,0,170,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Label text
  if (ast.label) {
    ctx.save();
    ctx.rotate(-ast.rotation);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(ast.label, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

// Spawn 4 asteroids for current question
async function spawnQuestion() {
  asteroids = [];
  const q = quiz.current();
  if (!q) {
    endGame();
    return;
  }

  updateHUD();

  const choices = q.choices || [];
  const positions = [
    { x: w * 0.25, y: -50 },
    { x: w * 0.5, y: -50 },
    { x: w * 0.75, y: -50 },
    { x: w * 0.9, y: -50 },
  ];

  for (let i = 0; i < 4 && i < choices.length; i++) {
    const label = (choices[i] || '?').substring(0, 12);
    asteroids.push({
      x: positions[i].x,
      y: positions[i].y,
      vx: (Math.random() - 0.5) * 30,
      vy: asteroidBaseSpeed * speedMultiplier,
      size: 30 + Math.random() * 15,
      sides: 6 + Math.floor(Math.random() * 4),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      label,
      choiceIndex: i,
      dead: false,
    });
  }
}

// Handle bullet collision with asteroid
function checkCollisions() {
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const bullet = bullets[bi];
    for (let ai = 0; ai < asteroids.length; ai++) {
      const ast = asteroids[ai];
      if (ast.dead) continue;

      const dx = bullet.x - ast.x;
      const dy = bullet.y - ast.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ast.size + 5) {
        bullets.splice(bi, 1);
        const q = quiz.current();

        if (ast.choiceIndex === q.correctIndex) {
          // Correct!
          beepCorrect();
          ast.dead = true;
          score += 100 * (combo + 1);
          combo++;
          floatText(`+${100 * (combo)}`, { x: ast.x, y: ast.y, color: '#00ffa2' });
          spawnParticles(ast.x, ast.y, { colors: ['#00ffa2', '#00eaff'] });

          // Expand ring effect
          expandRing(ast.x, ast.y, ast.size);

          setTimeout(() => {
            quiz.next();
            spawnQuestion();
          }, 500);
        } else {
          // Wrong!
          beepWrong();
          ast.dead = true;
          combo = 0;
          lives--;
          shakeScreen(canvas, 200, 12);
          spawnParticles(ast.x, ast.y, { colors: ['#ff3060', '#ff00aa'], count: 20 });

          if (lives <= 0) {
            endGame();
          } else {
            updateHUD();
          }
        }
        return;
      }
    }
  }
}

// Expanding ring effect on correct hit
function expandRing(x, y, baseSize) {
  let ringSize = baseSize;
  const maxSize = baseSize * 4;
  const startTime = Date.now();
  const duration = 300;

  function drawRing() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;
    ringSize = baseSize + (maxSize - baseSize) * progress;
    const alpha = 1 - progress;

    ctx.strokeStyle = `rgba(0,255,162,${alpha * 0.8})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, ringSize, 0, Math.PI * 2);
    ctx.stroke();

    if (progress < 1) {
      requestAnimationFrame(drawRing);
    }
  }

  drawRing();
}

// Asteroid reaches ship (auto-fail)
function checkAsteroidsReachedShip() {
  for (let ast of asteroids) {
    if (ast.dead) continue;
    if (ast.y > ship.y) {
      // Auto-fail
      beepWrong();
      ast.dead = true;
      combo = 0;
      lives--;
      shakeScreen(canvas, 200, 12);
      spawnParticles(ast.x, ast.y, { colors: ['#ff3060'], count: 15 });

      if (lives <= 0) {
        endGame();
      } else {
        setTimeout(() => {
          quiz.next();
          spawnQuestion();
        }, 400);
      }
      updateHUD();
    }
  }
}

// Update HUD display
function updateHUD() {
  const q = quiz.current();
  document.getElementById('hud-question').textContent = q ? q.prompt : 'Quiz Complete!';
  document.getElementById('hud-lives').textContent = `LIVES ${lives}`;
  document.getElementById('hud-combo').textContent = `COMBO ${combo}`;
  document.getElementById('hud-score').textContent = `SCORE ${score}`;

  if (lives <= 1) {
    document.getElementById('hud-lives').classList.add('hud-bad');
  } else {
    document.getElementById('hud-lives').classList.remove('hud-bad');
  }
}

function endGame() {
  gameActive = false;
  stopThrust();
  const s = quiz.score();
  document.getElementById('game-over').classList.remove('hidden');
  document.getElementById('final-score').textContent = score;
  document.getElementById('final-correct').textContent = s.correct;
  document.getElementById('final-total').textContent = s.answered;
  document.getElementById('final-streak').textContent = s.bestStreak;
}

function quit() {
  window.location.href = '../';
}

// Game loop
function update(dt) {
  if (!gameActive) return;

  // Ship rotation
  if (keys['ArrowLeft'] || keys['a']) ship.angle -= 0.15;
  if (keys['ArrowRight'] || keys['d']) ship.angle += 0.15;

  // Ship thrust
  if (keys['ArrowUp'] || keys['w']) {
    if (!thrustGain) startThrust();
    const thrustForce = 400;
    ship.vx += Math.cos(ship.angle + Math.PI / 2) * thrustForce * dt;
    ship.vy += Math.sin(ship.angle + Math.PI / 2) * thrustForce * dt;
  } else {
    stopThrust();
  }

  // Ship friction/damping
  ship.vx *= 0.98;
  ship.vy *= 0.98;

  // Ship max speed
  const speed = Math.sqrt(ship.vx ** 2 + ship.vy ** 2);
  if (speed > ship.maxSpeed) {
    ship.vx = (ship.vx / speed) * ship.maxSpeed;
    ship.vy = (ship.vy / speed) * ship.maxSpeed;
  }

  // Update ship position
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  // Wrap ship around edges
  if (ship.x < -20) ship.x = w + 20;
  if (ship.x > w + 20) ship.x = -20;
  if (ship.y < -20) ship.y = h + 20;
  if (ship.y > h + 20) ship.y = -20;

  // Shooting
  if (keys[' ']) {
    if (!window.lastShotTime || Date.now() - window.lastShotTime > 250) {
      beep({ freq: 600, dur: 0.08, volume: 0.15 });
      bullets.push({
        x: ship.x + Math.cos(ship.angle + Math.PI / 2) * 16,
        y: ship.y + Math.sin(ship.angle + Math.PI / 2) * 16,
        vx: Math.cos(ship.angle + Math.PI / 2) * bulletSpeed,
        vy: Math.sin(ship.angle + Math.PI / 2) * bulletSpeed,
        trail: [],
      });
      window.lastShotTime = Date.now();
    }
  }

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;

    // Add to trail
    bullet.trail.push({ x: bullet.x, y: bullet.y });
    if (bullet.trail.length > 8) bullet.trail.shift();

    // Remove if off-screen
    if (bullet.x < -10 || bullet.x > w + 10 || bullet.y < -10 || bullet.y > h + 10) {
      bullets.splice(i, 1);
    }
  }

  // Update asteroids
  for (let ast of asteroids) {
    if (!ast.dead) {
      ast.x += ast.vx * dt;
      ast.y += ast.vy * dt;
      ast.rotation += ast.rotationSpeed;

      // Wrap asteroid
      if (ast.x < -50) ast.x = w + 50;
      if (ast.x > w + 50) ast.x = -50;
    }
  }

  // Check collisions
  checkCollisions();
  checkAsteroidsReachedShip();

  // Increase speed every 3 correct answers
  speedMultiplier = 1 + Math.floor(combo / 3) * 0.1;
}

function draw() {
  // Clear canvas
  ctx.fillStyle = 'rgba(8,0,20,0.8)';
  ctx.fillRect(0, 0, w, h);

  // Draw starfield
  drawStarfield(ship.vx);

  // Draw bullets with trails
  for (let bullet of bullets) {
    // Trail
    ctx.strokeStyle = 'rgba(0,234,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (bullet.trail.length > 0) {
      ctx.moveTo(bullet.trail[0].x, bullet.trail[0].y);
      for (let p of bullet.trail) {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();

    // Bullet glow
    const bulletGlow = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, 8);
    bulletGlow.addColorStop(0, 'rgba(0,234,255,0.8)');
    bulletGlow.addColorStop(1, 'rgba(0,234,255,0)');
    ctx.fillStyle = bulletGlow;
    ctx.fillRect(bullet.x - 8, bullet.y - 8, 16, 16);

    // Bullet core
    ctx.fillStyle = '#00eaff';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw asteroids
  for (let ast of asteroids) {
    if (!ast.dead) {
      drawAsteroid(ast);
    }
  }

  // Draw ship
  drawShip();
}

function gameLoop(currentTime) {
  const dt = window.lastTime ? (currentTime - window.lastTime) / 1000 : 0.016;
  window.lastTime = currentTime;

  update(Math.min(dt, 0.033)); // Cap dt to 33ms
  draw();
  requestAnimationFrame(gameLoop);
}

// Setup buttons
document.getElementById('play-again-btn').addEventListener('click', () => {
  location.reload();
});
document.getElementById('quit-btn').addEventListener('click', quit);

// Initialize game
async function init() {
  try {
    const bank = await loadQuestionBank('../data/questions.json');
    const explanations = await loadExplanations('../data/explanations.json');
    quiz = createQuiz(bank, { seed: Date.now(), explanations, limit: 20 });
    await spawnQuestion();
    updateHUD();
    requestAnimationFrame(gameLoop);
  } catch (err) {
    console.error('Init failed:', err);
    document.getElementById('hud-question').textContent = 'Error loading quiz';
  }
}

init();
