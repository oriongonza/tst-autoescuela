import { loadQuestionBank, loadExplanations, createQuiz } from '../core/quiz-core.mjs';
import { beep, beepCorrect, beepWrong, beepGameover, shakeScreen, spawnParticles, floatText } from '../core/juice.mjs';

// Game state
let quiz = null;
let gameState = {
  gameActive: false,
  lives: 3,
  score: 0,
  streak: 0,
  opponentHP: 100,
  opponentHPMax: 100,
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

// Opponent animation state
let opponentState = {
  windingUp: false,
  windUpTime: 0,
  windUpDuration: 0,
  attackLanded: false,
  attackLandedTime: 0,
  stunned: false,
  stunnedTime: 0,
  bobOffset: 0,
  lastWind: Date.now(),
};

// Round state
let roundState = {
  punchWindow: null,
  playerPunched: false,
  punchDirection: -1,
};

// Input handling
let keysPressed = {};

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keysPressed[key] = true;

  if (e.key === 'Escape') quitGame();

  // Punch input: arrow keys or WASD
  if (!gameState.gameActive) return;
  if (roundState.punchWindow && !roundState.playerPunched) {
    let dir = -1;
    if (key === 'arrowup' || key === 'w') dir = 0; // UP
    else if (key === 'arrowright' || key === 'd') dir = 1; // RIGHT
    else if (key === 'arrowdown' || key === 's') dir = 2; // DOWN
    else if (key === 'arrowleft' || key === 'a') dir = 3; // LEFT

    if (dir >= 0) {
      e.preventDefault();
      handlePunch(dir);
    }
  }
});

window.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

// HUD updates
function updateHUD() {
  const q = quiz.current();
  document.getElementById('hud-question').textContent = q ? q.prompt : 'Loading...';
  document.getElementById('hud-lives').textContent = `❤️ ${gameState.lives}`;
  document.getElementById('hud-score').textContent = `Score ${gameState.score}`;
  document.getElementById('hud-streak').textContent = `Streak ${gameState.streak}`;
}

// Handle punch
function handlePunch(direction) {
  if (!roundState.punchWindow || roundState.playerPunched) return;

  roundState.playerPunched = true;
  const timeInWindow = roundState.punchWindow.elapsed;
  const timeLeft = roundState.punchWindow.duration - timeInWindow;

  // Only valid if within window
  if (timeInWindow > 0 && timeLeft > 0) {
    const result = quiz.submit(direction);
    if (result) {
      if (result.correct) {
        handleCorrectPunch();
      } else {
        handleWrongPunch();
      }
    }
  } else {
    // Too late or too early, counts as miss
    handleWrongPunch();
  }
}

function handleCorrectPunch() {
  beepCorrect();
  gameState.streak++;
  gameState.score += 100 * gameState.streak;

  // Opponent stunned
  opponentState.stunned = true;
  opponentState.stunnedTime = 0;

  // Particle burst
  const opponentX = canvas.width / 2;
  const opponentY = canvas.height * 0.4;
  spawnParticles(opponentX, opponentY, {
    count: 24,
    colors: ['#00ffa2', '#00eaff', '#fff200'],
    speed: 400,
    life: 600,
    size: 8,
  });

  // Opponent HP
  gameState.opponentHP = Math.max(0, gameState.opponentHP - 15);

  updateHUD();

  setTimeout(() => {
    if (gameState.opponentHP <= 0) {
      endGame(true);
    } else {
      quiz.next();
      const q = quiz.current();
      if (!q) {
        endGame(true);
      } else {
        nextRound();
      }
    }
  }, 600);
}

function handleWrongPunch() {
  beepWrong();
  gameState.streak = 0;
  gameState.lives--;

  shakeScreen(canvas, 200, 8);
  opponentState.attackLanded = true;
  opponentState.attackLandedTime = 0;

  updateHUD();

  if (gameState.lives <= 0) {
    setTimeout(() => endGame(false), 400);
  } else {
    setTimeout(() => {
      nextRound();
    }, 800);
  }
}

function handleMissedPunch() {
  // Timeout: opponent lands free hit
  beepWrong();
  gameState.streak = 0;
  gameState.lives--;

  shakeScreen(canvas, 200, 8);
  opponentState.attackLanded = true;
  opponentState.attackLandedTime = 0;

  updateHUD();

  if (gameState.lives <= 0) {
    setTimeout(() => endGame(false), 400);
  } else {
    setTimeout(() => {
      nextRound();
    }, 800);
  }
}

// Game loop
let lastTime = Date.now();
function gameLoop() {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  // Update
  if (gameState.gameActive) {
    // Bob animation
    opponentState.bobOffset = Math.sin(now / 500) * 15;

    // Stun state
    if (opponentState.stunned) {
      opponentState.stunnedTime += dt;
      if (opponentState.stunnedTime > 0.6) {
        opponentState.stunned = false;
      }
    }

    // Attack landing visual
    if (opponentState.attackLanded) {
      opponentState.attackLandedTime += dt;
      if (opponentState.attackLandedTime > 0.4) {
        opponentState.attackLanded = false;
      }
    }

    // Opponent wind-up
    if (opponentState.windingUp) {
      opponentState.windUpTime += dt;
      if (opponentState.windUpTime >= opponentState.windUpDuration) {
        // Attack happens
        opponentState.windingUp = false;
        roundState.punchWindow = null;

        // If player didn't punch, they got hit
        if (!roundState.playerPunched) {
          handleMissedPunch();
        }
      }
    }

    // Update punch window timing
    if (roundState.punchWindow) {
      roundState.punchWindow.elapsed += dt;
    }
  }

  // Draw
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameState.gameActive) {
    drawRing();
    drawOpponent(now);
    drawPlayerGloves();
    drawDirectionLabels();
    drawHPBars();
  }

  requestAnimationFrame(gameLoop);
}

function drawRing() {
  // Ring floor
  ctx.strokeStyle = 'rgba(0, 234, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(canvas.width * 0.1, canvas.height * 0.6, canvas.width * 0.8, canvas.height * 0.3);
}

function drawOpponent(now) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height * 0.4 + opponentState.bobOffset;

  // Head (circle)
  const headRadius = 40;
  ctx.fillStyle = '#ff9966';
  ctx.shadowColor = 'rgba(255, 150, 100, 0.5)';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(centerX, centerY - 20, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(centerX - 15, centerY - 30, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + 15, centerY - 30, 6, 0, Math.PI * 2);
  ctx.fill();

  // Mouth (grimace)
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY - 10, 8, 0, Math.PI);
  ctx.stroke();

  // Body (rectangle)
  ctx.fillStyle = '#4488ff';
  ctx.shadowColor = 'rgba(68, 136, 255, 0.5)';
  ctx.shadowBlur = 12;
  ctx.fillRect(centerX - 35, centerY + 20, 70, 60);
  ctx.shadowColor = 'transparent';

  // Gloves on opponent
  ctx.fillStyle = '#ffcc99';
  // Left glove
  ctx.beginPath();
  ctx.arc(centerX - 50, centerY + 40, 12, 0, Math.PI * 2);
  ctx.fill();
  // Right glove
  ctx.beginPath();
  ctx.arc(centerX + 50, centerY + 40, 12, 0, Math.PI * 2);
  ctx.fill();

  // Wind-up indicator
  if (opponentState.windingUp) {
    const windupProgress = opponentState.windUpTime / opponentState.windUpDuration;
    const intensity = Math.sin(now / 100) * 0.5 + 0.5;

    // Glow effect
    ctx.strokeStyle = `rgba(255, 100, 100, ${intensity * 0.7})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, headRadius + 25 + windupProgress * 15, 0, Math.PI * 2);
    ctx.stroke();

    // Indicator text
    ctx.fillStyle = `rgba(255, 100, 100, ${intensity})`;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('⚠️', centerX, centerY - 80);
  }

  // Attack landing flash
  if (opponentState.attackLanded) {
    const flashAlpha = 1 - opponentState.attackLandedTime / 0.4;
    ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha * 0.3})`;
    ctx.fillRect(canvas.width * 0.1, canvas.height * 0.1, canvas.width * 0.8, canvas.height * 0.6);
  }

  // Stun animation
  if (opponentState.stunned) {
    const starsX = centerX + Math.random() * 40 - 20;
    const starsY = centerY - 60 + Math.random() * 30;
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('*', starsX, starsY);
    ctx.fillText('*', starsX + 30, starsY - 20);
    ctx.fillText('*', starsX - 25, starsY + 15);
  }
}

function drawPlayerGloves() {
  const gloveRadius = 20;
  const gloveY = canvas.height * 0.65;
  const gloveXLeft = canvas.width * 0.15;
  const gloveXRight = canvas.width * 0.85;

  // Left glove
  ctx.fillStyle = '#ff6644';
  ctx.shadowColor = 'rgba(255, 100, 68, 0.6)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(gloveXLeft, gloveY, gloveRadius, 0, Math.PI * 2);
  ctx.fill();

  // Right glove
  ctx.fillStyle = '#ff6644';
  ctx.beginPath();
  ctx.arc(gloveXRight, gloveY, gloveRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Label gloves
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('L', gloveXLeft, gloveY);
  ctx.fillText('R', gloveXRight, gloveY);
}

function drawDirectionLabels() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height * 0.4;
  const distance = 120;

  ctx.fillStyle = 'var(--neon-cyan)';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // UP
  ctx.fillText('↑ UP', centerX, centerY - distance);
  // RIGHT
  ctx.fillText('→ RIGHT', centerX + distance, centerY);
  // DOWN
  ctx.fillText('↓ DOWN', centerX, centerY + distance);
  // LEFT
  ctx.fillText('← LEFT', centerX - distance, centerY);

  // Show punch window indicator
  if (roundState.punchWindow) {
    const progress = roundState.punchWindow.elapsed / roundState.punchWindow.duration;
    const color = progress < 0.8 ? '#00ff88' : progress < 1.0 ? '#ffff00' : '#ff0000';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    ctx.strokeRect(canvas.width * 0.25, canvas.height * 0.15, canvas.width * 0.5, 40);
    ctx.globalAlpha = 1;

    // Progress bar
    ctx.fillStyle = color;
    ctx.fillRect(canvas.width * 0.25, canvas.height * 0.15, canvas.width * 0.5 * progress, 40);
  }
}

function drawHPBars() {
  const barWidth = 200;
  const barHeight = 16;

  // Opponent HP (top-right)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(canvas.width - barWidth - 20, 80, barWidth, barHeight);
  ctx.strokeStyle = '#ff3060';
  ctx.lineWidth = 2;
  ctx.strokeRect(canvas.width - barWidth - 20, 80, barWidth, barHeight);

  const opponentHPPercent = Math.max(0, gameState.opponentHP / gameState.opponentHPMax);
  ctx.fillStyle = '#ff3060';
  ctx.fillRect(canvas.width - barWidth - 20, 80, barWidth * opponentHPPercent, barHeight);

  // Text
  ctx.fillStyle = '#ff3060';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('OPPONENT', canvas.width - 20 - barWidth - 10, 75);

  // Player HP (bottom-left, as lives)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(20, canvas.height - 56, barWidth, barHeight);
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, canvas.height - 56, barWidth, barHeight);

  const playerHPPercent = gameState.lives / 3;
  ctx.fillStyle = '#00ff88';
  ctx.fillRect(20, canvas.height - 56, barWidth * playerHPPercent, barHeight);

  ctx.fillStyle = '#00ff88';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('YOU', 20, canvas.height - 70);
}

function nextRound() {
  const q = quiz.current();
  if (!q) {
    endGame(true);
    return;
  }

  updateHUD();

  // Start opponent wind-up
  const baseWindupDuration = 1.0;
  const streakReduction = Math.min(gameState.streak * 0.05, 0.5);
  const windupDuration = Math.max(0.4, baseWindupDuration - streakReduction);

  opponentState.windingUp = true;
  opponentState.windUpTime = 0;
  opponentState.windUpDuration = windupDuration;

  // Set punch window: will open when wind-up ends
  setTimeout(() => {
    if (!gameState.gameActive) return;

    roundState.punchWindow = {
      opened: Date.now(),
      duration: 0.8,
      elapsed: 0,
    };
    roundState.playerPunched = false;

    // Timeout after punch window
    setTimeout(() => {
      if (!gameState.gameActive) return;
      if (!roundState.playerPunched && roundState.punchWindow) {
        handleMissedPunch();
      }
    }, 900);
  }, windupDuration * 1000);
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
    gameState.opponentHP = gameState.opponentHPMax;

    nextRound();
    gameLoop();
  } catch (err) {
    console.error('Game init failed:', err);
    document.getElementById('hud-question').textContent = 'Error loading quiz.';
  }
}

function endGame(playerWon) {
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
