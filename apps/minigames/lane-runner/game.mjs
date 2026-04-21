import {
  loadQuestionBank,
  loadExplanations,
  createQuiz,
} from '../core/quiz-core.mjs';

import {
  beepCorrect,
  beepWrong,
  beepGameover,
  shakeScreen,
  flashElement,
  spawnParticles,
  floatText,
} from '../core/juice.mjs';

const LANES = 4;
const GATE_INTERVAL = 3500; // ms between gates
const GAME_DURATION = 60000; // 60 seconds
const INITIAL_LIVES = 3;
const GATE_HEIGHT = 60;
const GAME_CONTAINER_HEIGHT = window.innerHeight;

let quiz = null;
let gameState = {
  running: false,
  currentLane: 1, // 0-3
  lives: INITIAL_LIVES,
  score: 0,
  streak: 0,
  bestStreak: 0,
  gatesActive: 0,
  startTime: 0,
  endTime: 0,
};

const elements = {
  gameContainer: document.getElementById('game-container'),
  road: document.getElementById('road'),
  car: document.getElementById('car'),
  gatesContainer: document.getElementById('gates-container'),
  hudQuestion: document.getElementById('hud-question'),
  hudLives: document.getElementById('hud-lives'),
  hudTimer: document.getElementById('hud-timer'),
  hudScore: document.getElementById('hud-score'),
  gameOverScreen: document.getElementById('game-over'),
  playAgainBtn: document.getElementById('play-again-btn'),
  quitBtn: document.getElementById('quit-btn'),
};

let gameLoopId = null;
let gateLoopId = null;
let timerLoopId = null;

async function initGame() {
  const bank = await loadQuestionBank('../data/questions.json');
  const explanations = await loadExplanations('../data/explanations.json');
  quiz = createQuiz(bank, {
    seed: Date.now(),
    explanations,
  });

  gameState.running = true;
  gameState.startTime = Date.now();
  gameState.currentLane = 1;
  gameState.lives = INITIAL_LIVES;
  gameState.score = 0;
  gameState.streak = 0;
  gameState.bestStreak = 0;

  setupLanes();
  updateHUD();
  showQuestion();

  startGameLoop();
  startGateLoop();
  startTimer();
}

function setupLanes() {
  elements.road.innerHTML = '';
  for (let i = 0; i < LANES; i++) {
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.setAttribute('data-lane', i);
    elements.road.appendChild(lane);
  }
  const car = document.createElement('div');
  car.id = 'car';
  elements.road.appendChild(car);
}

function updateHUD() {
  const q = quiz.current();
  if (q) {
    const prompt = q.prompt.substring(0, 140);
    elements.hudQuestion.textContent = prompt;
  }

  elements.hudLives.textContent = `❤️ ${gameState.lives}`;
  elements.hudLives.className =
    gameState.lives > 1 ? 'hud-item hud-good' : 'hud-item hud-bad';

  const score = quiz.score();
  elements.hudScore.textContent = `Score ${gameState.score}`;

  const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
  const timeLeft = Math.max(0, Math.floor(GAME_DURATION / 1000) - timeElapsed);
  elements.hudTimer.textContent = `⏱️ ${timeLeft}s`;
}

function showQuestion() {
  const q = quiz.current();
  if (q) {
    elements.hudQuestion.textContent = q.prompt.substring(0, 140);
  }
}

function startGameLoop() {
  gameLoopId = setInterval(() => {
    updateHUD();
  }, 100);
}

function startGateLoop() {
  let gateIdCounter = 0;

  const spawnGate = () => {
    if (!gameState.running) return;

    const q = quiz.current();
    if (!q) {
      endGame();
      return;
    }

    const gate = document.createElement('div');
    const gateId = gateIdCounter++;
    gate.className = 'gate';
    gate.setAttribute('data-gate-id', gateId);
    gate.style.top = '-' + GATE_HEIGHT + 'px';

    const choices = q.choices.map((choice, idx) => {
      const seg = document.createElement('div');
      seg.className = 'gate-segment';
      seg.setAttribute('data-lane', idx);
      seg.setAttribute('data-correct', idx === q.correctIndex);

      // Truncate long choice labels
      const label = choice.substring(0, 24) + (choice.length > 24 ? '…' : '');
      seg.textContent = label;
      gate.appendChild(seg);
      return seg;
    });

    elements.gatesContainer.appendChild(gate);
    gameState.gatesActive++;

    // Animate gate down
    const startY = -GATE_HEIGHT;
    const endY = GAME_CONTAINER_HEIGHT;
    const duration = GATE_INTERVAL;
    const startTime = Date.now();

    const checkGatePosition = setInterval(() => {
      if (!document.body.contains(gate)) {
        clearInterval(checkGatePosition);
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const y = startY + (endY - startY) * progress;
      gate.style.top = y + 'px';

      // Check collision with car
      const carY = GAME_CONTAINER_HEIGHT - 80 - 30; // Car center
      if (y <= carY && y + GATE_HEIGHT >= carY) {
        const segment = choices[gameState.currentLane];
        const isCorrect =
          segment.getAttribute('data-correct') === 'true';

        handleGateCollision(isCorrect, gateId);
        clearInterval(checkGatePosition);
      }

      if (progress >= 1) {
        // Gate passed, check if no collision
        if (gate.parentNode) {
          gate.remove();
          gameState.gatesActive--;
        }
        clearInterval(checkGatePosition);
      }
    }, 16);
  };

  gateLoopId = setInterval(spawnGate, GATE_INTERVAL);
  // Spawn first gate immediately
  spawnGate();
}

function handleGateCollision(isCorrect, gateId) {
  const q = quiz.current();
  if (!q) return;

  if (isCorrect) {
    beepCorrect();
    flashElement(elements.car, 'var(--juice-good)', 200);
    spawnParticles(
      window.innerWidth / 2,
      GAME_CONTAINER_HEIGHT - 80,
      {
        count: 12,
        colors: ['#00ffa2', '#fff200', '#00eaff'],
        speed: 300,
        life: 600,
        size: 5,
        container: elements.gameContainer,
      }
    );

    const points = 100 * Math.max(1, gameState.streak);
    gameState.score += points;
    floatText(`+${points}`, {
      x: window.innerWidth / 2,
      y: GAME_CONTAINER_HEIGHT - 120,
      color: '#00ffa2',
      size: 32,
      life: 900,
      container: elements.gameContainer,
    });

    gameState.streak = quiz.submit(q.correctIndex).streak;
    gameState.bestStreak = Math.max(
      gameState.bestStreak,
      gameState.streak
    );
  } else {
    beepWrong();
    shakeScreen(elements.gameContainer, 250, 6);
    elements.car.classList.add('wobble');
    setTimeout(() => elements.car.classList.remove('wobble'), 200);

    gameState.lives--;
    if (gameState.lives <= 0) {
      endGame();
      return;
    }

    quiz.submit(q.correctIndex);
    gameState.streak = 0;
  }

  quiz.next();
  showQuestion();
}

function startTimer() {
  timerLoopId = setInterval(() => {
    const elapsed = Date.now() - gameState.startTime;
    if (elapsed >= GAME_DURATION) {
      endGame();
    }
  }, 100);
}

function endGame() {
  gameState.running = false;

  if (gameLoopId) clearInterval(gameLoopId);
  if (gateLoopId) clearInterval(gateLoopId);
  if (timerLoopId) clearInterval(timerLoopId);

  beepGameover();

  const score = quiz.score();
  document.getElementById('final-score').textContent = gameState.score;
  document.getElementById('final-correct').textContent = score.correct;
  document.getElementById('final-total').textContent = score.total;
  document.getElementById('final-streak').textContent = gameState.bestStreak;

  elements.gameOverScreen.classList.remove('hidden');
}

function resetGame() {
  gameState.running = false;
  gameState.gatesActive = 0;

  if (gameLoopId) clearInterval(gameLoopId);
  if (gateLoopId) clearInterval(gateLoopId);
  if (timerLoopId) clearInterval(timerLoopId);

  elements.gatesContainer.innerHTML = '';
  elements.gameOverScreen.classList.add('hidden');

  initGame();
}

function handleLaneChange(newLane) {
  if (newLane >= 0 && newLane < LANES) {
    gameState.currentLane = newLane;
    const offset = (newLane * 100) / LANES;
    elements.car.style.left = `calc(${offset}% + ${LANES === 4 ? 5 : 0}%)`;
  }
}

document.addEventListener('keydown', (e) => {
  if (!gameState.running) return;

  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    handleLaneChange(gameState.currentLane - 1);
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    handleLaneChange(gameState.currentLane + 1);
  } else if (e.key === 'Escape') {
    window.location.href = '../index.html';
  }
});

elements.playAgainBtn.addEventListener('click', resetGame);

elements.quitBtn.addEventListener('click', () => {
  window.location.href = '../index.html';
});

// Start the game
initGame();
