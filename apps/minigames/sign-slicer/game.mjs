import { loadQuestionBank, loadExplanations, createQuiz } from '../core/quiz-core.mjs';
import {
  beepCorrect, beepWrong, beepGameover, beepCombo,
  shakeScreen, spawnParticles, floatText
} from '../core/juice.mjs';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const promptEl = document.getElementById('prompt');
const comboEl = document.getElementById('combo');
const livesEl = document.getElementById('lives');
const scoreEl = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over-screen');
const playAgainBtn = document.getElementById('play-again-btn');
const quitBtn = document.getElementById('quit-btn');

let quiz = null;
let gameState = {
  lives: 3,
  score: 0,
  combo: 0,
  gameOver: false,
  placards: [],
  sliceTrail: [],
  mouseX: 0,
  mouseY: 0,
};

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

async function init() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const bank = await loadQuestionBank();
  const explanations = await loadExplanations();
  quiz = createQuiz(bank, { seed: Date.now(), explanations });

  setupInputs();
  loadNextQuestion();
  gameLoop();
}

function setupInputs() {
  document.addEventListener('mousemove', (e) => {
    gameState.mouseX = e.clientX;
    gameState.mouseY = e.clientY;
    addToSliceTrail(e.clientX, e.clientY);
  });

  document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    gameState.mouseX = touch.clientX;
    gameState.mouseY = touch.clientY;
    addToSliceTrail(touch.clientX, touch.clientY);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      quitToHub();
    }
  });

  playAgainBtn.addEventListener('click', resetGame);
  quitBtn.addEventListener('click', quitToHub);
}

function addToSliceTrail(x, y) {
  gameState.sliceTrail.push({ x, y, age: 0 });
  if (gameState.sliceTrail.length > 30) {
    gameState.sliceTrail.shift();
  }
}

function loadNextQuestion() {
  if (gameState.gameOver) return;

  const q = quiz.next();
  if (!q) {
    endGame();
    return;
  }

  promptEl.textContent = q.prompt;
  launchWave(q.choices);
}

function launchWave(choices) {
  gameState.placards = [];
  const baseVelocity = 200 + gameState.score * 0.5;

  for (let i = 0; i < choices.length; i++) {
    setTimeout(() => {
      const placard = {
        text: choices[i],
        index: i,
        x: canvas.width * (0.2 + i * 0.2),
        y: canvas.height + 80,
        vx: (Math.random() - 0.5) * 50,
        vy: -baseVelocity - Math.random() * 60,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        width: 140,
        height: 80,
        isBomb: false,
        isSliced: false,
        sliceTime: 0,
        colors: [
          '#00eaff',
          '#ff00aa',
          '#fff200',
          '#00ffa2'
        ]
      };
      gameState.placards.push(placard);
    }, i * 400);
  }

  const haveBomb = Math.random() < 0.35 && gameState.score > 0;
  if (haveBomb) {
    setTimeout(() => {
      const bomb = {
        text: '💣',
        index: -1,
        x: canvas.width * Math.random(),
        y: canvas.height + 80,
        vx: (Math.random() - 0.5) * 80,
        vy: -150 - Math.random() * 80,
        rotation: 0,
        rotationSpeed: Math.random() * 0.2,
        width: 100,
        height: 100,
        isBomb: true,
        isSliced: false,
        sliceTime: 0,
        colors: ['#ff3060']
      };
      gameState.placards.push(bomb);
    }, Math.random() * 1000 + 400);
  }
}

function updatePlacards(dt) {
  for (let i = gameState.placards.length - 1; i >= 0; i--) {
    const p = gameState.placards[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 120 * dt;
    p.rotation += p.rotationSpeed * dt;

    if (p.isSliced) {
      p.sliceTime += dt;
      if (p.sliceTime > 0.6) {
        gameState.placards.splice(i, 1);
      }
    } else if (p.y > canvas.height + 100) {
      if (p.index >= 0 && p.index === quiz.current().correctIndex) {
        onWrongAnswer(true);
      }
      gameState.placards.splice(i, 1);
    }
  }
}

function checkSliceCollisions() {
  if (gameState.sliceTrail.length < 2) return;

  const trail = gameState.sliceTrail.slice(-6);

  for (const placard of gameState.placards) {
    if (placard.isSliced) continue;

    for (let i = 0; i < trail.length - 1; i++) {
      const p1 = trail[i];
      const p2 = trail[i + 1];

      if (lineIntersectsRect(p1.x, p1.y, p2.x, p2.y, placard)) {
        placard.isSliced = true;
        placard.sliceTime = 0;

        if (placard.isBomb) {
          onBombSliced(placard);
        } else if (placard.index === quiz.current().correctIndex) {
          onCorrectAnswer(placard);
        } else {
          onWrongAnswer(false, placard);
        }
        break;
      }
    }
  }
}

function lineIntersectsRect(x1, y1, x2, y2, rect) {
  const rx = rect.x - rect.width / 2;
  const ry = rect.y - rect.height / 2;
  const rw = rect.width;
  const rh = rect.height;

  if (
    (x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) ||
    (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh)
  ) {
    return true;
  }

  const m = (y2 - y1) / (x2 - x1 || 0.001);
  const b = y1 - m * x1;

  for (let px = Math.max(rx, Math.min(x1, x2)); px <= Math.min(rx + rw, Math.max(x1, x2)); px++) {
    const py = m * px + b;
    if (py >= ry && py <= ry + rh) return true;
  }

  return false;
}

function onCorrectAnswer(placard) {
  beepCorrect();
  gameState.combo++;
  gameState.score += Math.max(100, 50 * gameState.combo);
  spawnParticles(placard.x, placard.y, {
    count: 16,
    colors: ['#00ffa2', '#fff200', '#00eaff'],
    speed: 300,
    life: 600
  });
  floatText(`+${Math.max(100, 50 * gameState.combo)}`, {
    x: placard.x,
    y: placard.y,
    color: '#00ffa2',
    size: 40
  });

  if (gameState.combo > 1) {
    floatText(`${gameState.combo}x COMBO`, {
      x: canvas.width / 2,
      y: 100,
      color: '#ff00aa',
      size: 32
    });
    beepCombo(gameState.combo);
  }

  splitPlacardAnimation(placard);
  updateHUD();

  setTimeout(() => {
    loadNextQuestion();
  }, 800);
}

function onWrongAnswer(isMiss, placard = null) {
  beepWrong();
  gameState.lives--;
  gameState.combo = 0;
  updateHUD();

  if (placard) {
    shakeScreen(canvas, 200, 10);
  }

  if (gameState.lives <= 0) {
    endGame();
  }
}

function onBombSliced(bomb) {
  beepGameover();
  gameState.lives--;
  gameState.combo = 0;
  shakeScreen(canvas, 300, 15);
  spawnParticles(bomb.x, bomb.y, {
    count: 24,
    colors: ['#ff3060', '#ff00aa', '#fff200'],
    speed: 350,
    life: 800
  });
  updateHUD();

  if (gameState.lives <= 0) {
    endGame();
  }
}

function splitPlacardAnimation(placard) {
  placard.vy = -200;
  placard.vx = (Math.random() - 0.5) * 300;
}

function updateHUD() {
  promptEl.textContent = quiz.current()?.prompt || 'Loading...';
  scoreEl.textContent = `SCORE: ${gameState.score}`;
  comboEl.textContent = `COMBO: ${gameState.combo}`;
  comboEl.classList.toggle('frenzy', gameState.combo >= 5);

  livesEl.textContent = `LIVES: ${gameState.lives}`;
  livesEl.classList.toggle('critical', gameState.lives === 1);
}

function drawPlacards() {
  for (const p of gameState.placards) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    const color = p.colors[p.index % p.colors.length];
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = p.isSliced ? 40 : 20;

    if (p.isBomb) {
      ctx.font = `bold 60px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', 0, 0);
    } else {
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(-p.width / 2, -p.height / 2, p.width, p.height);

      ctx.fillStyle = '#080014';
      ctx.font = `bold 16px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const maxWidth = p.width - 20;
      wrapText(ctx, p.text, 0, 0, maxWidth, 16);
    }

    ctx.restore();
  }
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && i > 0) {
      context.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  context.fillText(line, x, y);
}

function drawSliceTrail() {
  if (gameState.sliceTrail.length < 2) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < gameState.sliceTrail.length; i++) {
    const prev = gameState.sliceTrail[i - 1];
    const curr = gameState.sliceTrail[i];

    const age = Math.min(300, Date.now() - (prev.startTime || Date.now()));
    const maxAge = 300;
    const alpha = 1 - age / maxAge;

    ctx.strokeStyle = `rgba(0, 234, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 6;
    ctx.shadowColor = `rgba(0, 234, 255, ${alpha})`;
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

function gameLoop(lastTime = 0) {
  const now = performance.now();
  const dt = Math.min(0.016, (now - lastTime) / 1000);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameState.gameOver) {
    updatePlacards(dt);
    checkSliceCollisions();

    gameState.sliceTrail.forEach(point => {
      point.age += dt;
    });
    gameState.sliceTrail = gameState.sliceTrail.filter(point => point.age < 0.3);

    drawSliceTrail();
    drawPlacards();
  }

  requestAnimationFrame(() => gameLoop(now));
}

function endGame() {
  gameState.gameOver = true;
  const score = quiz.score();

  document.getElementById('final-correct').textContent = score.correct;
  document.getElementById('final-wrong').textContent = score.wrong;
  document.getElementById('final-streak').textContent = score.bestStreak;
  document.getElementById('final-score').textContent = gameState.score;

  gameOverScreen.classList.remove('game-over-hidden');
}

function resetGame() {
  gameState = {
    lives: 3,
    score: 0,
    combo: 0,
    gameOver: false,
    placards: [],
    sliceTrail: [],
    mouseX: 0,
    mouseY: 0,
  };
  quiz.reset();
  gameOverScreen.classList.add('game-over-hidden');
  loadNextQuestion();
}

function quitToHub() {
  window.location.href = '../';
}

init().catch(console.error);
