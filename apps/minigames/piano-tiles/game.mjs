// Piano Tiles minigame — 4-lane falling tile quiz game
import {
  loadQuestionBank,
  loadExplanations,
  createQuiz,
} from '../core/quiz-core.mjs';
import {
  beep,
  beepCorrect,
  beepWrong,
  floatText,
  spawnParticles,
} from '../core/juice.mjs';

// Game state
let quiz;
let lives = 3;
let score = 0;
let combo = 0;
let gameActive = true;
let tilesCleared = 0;
let speedMultiplier = 1;

// Constants
const LANE_COUNT = 4;
const HIT_ZONE_Y_RATIO = 0.85; // Bottom 15% is hit zone
const HIT_ZONE_TOLERANCE = 40; // pixels
const REGULAR_TILE_SPAWN_INTERVAL = 700; // ms
const QUESTION_TILE_INTERVAL = 5; // tiles
const MAX_TILE_HEIGHT = 100;
const TILE_BASE_SPEED = 200; // pixels/sec
const SPEED_INCREMENT_TILES = 10;
const SPEED_INCREMENT_PERCENT = 0.03;

// Game objects
let tiles = [];
let lastSpawnTime = Date.now();
let regularTileCount = 0;
let gameLoopId = null;

// DOM elements
const gameContainer = document.getElementById('game-container');
const lanesContainer = document.getElementById('lanes-container');
const laneElements = document.querySelectorAll('.lane');
const laneHeaders = document.querySelectorAll('.lane-header');
const hudQuestion = document.getElementById('hud-question');
const hudLives = document.getElementById('hud-lives');
const hudCombo = document.getElementById('hud-combo');
const hudScore = document.getElementById('hud-score');
const gameOverScreen = document.getElementById('game-over');
const finalScore = document.getElementById('final-score');
const finalCorrect = document.getElementById('final-correct');
const finalTotal = document.getElementById('final-total');
const finalStreak = document.getElementById('final-streak');
const playAgainBtn = document.getElementById('play-again-btn');
const quitBtn = document.getElementById('quit-btn');

// Get lane width from DOM
function getLaneWidth() {
  return lanesContainer.offsetWidth / LANE_COUNT;
}

function getLaneHeight() {
  return lanesContainer.offsetHeight;
}

// Piano note frequencies (C, E, G, B in middle octave)
const PIANO_FREQS = [262, 330, 392, 494]; // C, E, G, B

function playPianoNote(laneIndex) {
  beep({
    freq: PIANO_FREQS[laneIndex],
    dur: 0.15,
    type: 'sine',
    volume: 0.2,
    attack: 0.01,
  });
}

function playSuccessChord() {
  const freqs = [330, 392, 494]; // E, G, B
  for (let i = 0; i < freqs.length; i++) {
    setTimeout(() => {
      beep({
        freq: freqs[i],
        dur: 0.3,
        type: 'sine',
        volume: 0.18,
        attack: 0.01,
      });
    }, i * 40);
  }
}

// Initialize game
async function init() {
  try {
    const bank = await loadQuestionBank('../data/questions.json');
    const explanations = await loadExplanations(
      '../data/explanations.json'
    );
    quiz = createQuiz(bank, {
      seed: Date.now(),
      explanations,
    });

    lives = 3;
    score = 0;
    combo = 0;
    gameActive = true;
    tilesCleared = 0;
    speedMultiplier = 1;
    tiles = [];
    regularTileCount = 0;
    lastSpawnTime = Date.now();

    updateHUD();
    loadQuestion();
    startGameLoop();
  } catch (err) {
    console.error('Failed to init game:', err);
    hudQuestion.textContent = 'Error loading questions';
  }
}

function loadQuestion() {
  const q = quiz.current();
  if (!q) {
    endGame();
    return;
  }

  hudQuestion.textContent = q.prompt || 'Question...';

  // Update lane headers with choices
  for (let i = 0; i < LANE_COUNT; i++) {
    const choice = (q.choices && q.choices[i]) || '?';
    const choiceEl = laneHeaders[i].querySelector('.lane-choice');
    if (choiceEl) {
      choiceEl.textContent = choice;
    }
  }
}

function updateHUD() {
  const progress = quiz.score();
  hudLives.textContent = `LIVES ${Math.max(0, lives)}`;
  hudCombo.textContent = `COMBO ${combo}`;
  hudScore.textContent = `SCORE ${score}`;

  // Update HUD colors based on lives
  if (lives <= 1) {
    hudLives.className = 'hud-item hud-bad';
  } else if (lives <= 2) {
    hudLives.className = 'hud-item hud-warn';
  } else {
    hudLives.className = 'hud-item hud-good';
  }
}

function spawnTile(laneIndex, isQuestion = false) {
  const laneWidth = getLaneWidth();
  const x = laneIndex * laneWidth;
  const y = -MAX_TILE_HEIGHT;
  const tileHeight = MAX_TILE_HEIGHT;

  const tile = {
    x,
    y,
    laneIndex,
    width: laneWidth,
    height: tileHeight,
    isQuestion,
    isHit: false,
    speed: TILE_BASE_SPEED * speedMultiplier,
    element: null,
  };

  // Create DOM element
  const el = document.createElement('div');
  el.className = isQuestion ? 'tile question' : 'tile regular';
  el.style.left = `${(laneIndex * 100) / LANE_COUNT}%`;
  el.style.width = `${100 / LANE_COUNT}%`;
  el.style.top = `${y}px`;
  el.style.height = `${tileHeight}px`;
  el.textContent = isQuestion ? '?' : '•';

  if (isQuestion) {
    el.addEventListener('click', () => handleTileClick(tile));
  } else {
    el.addEventListener('click', () => handleRegularTileClick(tile));
  }

  lanesContainer.appendChild(el);
  tile.element = el;
  tiles.push(tile);

  return tile;
}

function updateTiles(deltaTime) {
  const laneHeight = getLaneHeight();
  const hitZoneY = laneHeight * HIT_ZONE_Y_RATIO;
  const hitZoneBottom = laneHeight;

  for (let i = tiles.length - 1; i >= 0; i--) {
    const tile = tiles[i];
    if (tile.isHit) continue;

    tile.y += tile.speed * deltaTime;
    tile.element.style.top = `${tile.y}px`;

    // Check if tile passed hit zone
    if (tile.y > hitZoneBottom) {
      if (!tile.isHit) {
        handleMissedTile(tile);
      }
      tiles.splice(i, 1);
      tile.element.remove();
    }
  }
}

function handleRegularTileClick(tile) {
  if (!gameActive || tile.isHit) return;

  const laneHeight = getLaneHeight();
  const hitZoneY = laneHeight * HIT_ZONE_Y_RATIO;
  const hitZoneBottom = laneHeight;

  // Check if in hit zone
  const tileCenter = tile.y + tile.height / 2;
  if (
    tileCenter >= hitZoneY - HIT_ZONE_TOLERANCE &&
    tileCenter <= hitZoneBottom + HIT_ZONE_TOLERANCE
  ) {
    tile.isHit = true;
    playPianoNote(tile.laneIndex);
    score += 10;
    combo++;
    updateBackground();

    // Visual feedback
    tile.element.classList.add('hit');
    spawnParticles(
      tile.x + tile.width / 2,
      tile.y + tile.height / 2,
      { colors: ['#00eaff', '#00ffa2'], count: 8 }
    );

    // Flash lane
    const lane = laneElements[tile.laneIndex];
    lane.classList.add('lane-flash');
    setTimeout(() => lane.classList.remove('lane-flash'), 300);

    updateHUD();
    setTimeout(() => {
      tiles = tiles.filter((t) => t !== tile);
      tile.element.remove();
    }, 400);
  }
}

function handleTileClick(tile) {
  if (!gameActive || tile.isHit) return;

  const q = quiz.current();
  const laneHeight = getLaneHeight();
  const hitZoneY = laneHeight * HIT_ZONE_Y_RATIO;
  const hitZoneBottom = laneHeight;

  // Check if in hit zone
  const tileCenter = tile.y + tile.height / 2;
  const inHitZone =
    tileCenter >= hitZoneY - HIT_ZONE_TOLERANCE &&
    tileCenter <= hitZoneBottom + HIT_ZONE_TOLERANCE;

  if (!inHitZone) {
    return; // Too early or too late
  }

  if (tile.laneIndex === q.correctIndex) {
    // Correct!
    tile.isHit = true;
    playSuccessChord();

    const scoreGain = 100 * (combo + 1);
    score += scoreGain;
    combo++;
    tilesCleared++;
    updateBackground();

    // Visual feedback
    tile.element.classList.add('hit');
    spawnParticles(
      tile.x + tile.width / 2,
      tile.y + tile.height / 2,
      {
        colors: ['#fff200', '#ffaa00', '#00ffa2'],
        count: 20,
        speed: 300,
      }
    );

    floatText(`+${scoreGain}`, {
      x: tile.x + tile.width / 2,
      y: tile.y,
      color: '#00ffa2',
      size: 48,
    });

    // Flash lane green
    const lane = laneElements[tile.laneIndex];
    lane.classList.add('lane-flash');
    setTimeout(() => lane.classList.remove('lane-flash'), 300);

    // Speed increase
    if (tilesCleared % SPEED_INCREMENT_TILES === 0) {
      speedMultiplier *= 1 + SPEED_INCREMENT_PERCENT;
    }

    updateHUD();

    // Submit answer and load next question
    quiz.submit(q.correctIndex);
    setTimeout(() => {
      if (!quiz.isDone()) {
        quiz.next();
        loadQuestion();
        regularTileCount = 0;
      } else {
        endGame();
      }

      tiles = tiles.filter((t) => t !== tile);
      tile.element.remove();
    }, 500);
  } else {
    // Tapped question tile in wrong lane (or no tile at hit zone)
    return;
  }
}

function handleMissedTile(tile) {
  if (tile.isQuestion) {
    // Missed a question tile
    handleMissedQuestion(tile);
  }
  // Regular tiles don't cause penalty if missed
}

function handleMissedQuestion(tile) {
  if (!gameActive) return;

  beepWrong();
  lives--;
  combo = 0;
  updateHUD();

  // Flash lane red
  const lane = laneElements[tile.laneIndex];
  lane.classList.add('lane-flash-bad');
  setTimeout(() => lane.classList.remove('lane-flash-bad'), 300);

  spawnParticles(
    tile.x + tile.width / 2,
    tile.y + tile.height / 2,
    {
      colors: ['#ff3060', '#ff00aa'],
      count: 16,
    }
  );

  if (lives <= 0) {
    endGame();
  }
}

function handleKeyPress(key) {
  if (!gameActive) return;

  const keyMap = {
    d: 0,
    D: 0,
    '1': 0,
    f: 1,
    F: 1,
    '2': 1,
    j: 2,
    J: 2,
    '3': 2,
    k: 3,
    K: 3,
    '4': 3,
  };

  const laneIndex = keyMap[key];
  if (laneIndex !== undefined) {
    handleLanePress(laneIndex);
  }
}

function handleLanePress(laneIndex) {
  const laneHeight = getLaneHeight();
  const hitZoneY = laneHeight * HIT_ZONE_Y_RATIO;
  const hitZoneBottom = laneHeight;

  // Check if there's a tile in hit zone in this lane
  let hitTile = null;
  for (const tile of tiles) {
    if (tile.isHit || tile.laneIndex !== laneIndex) continue;

    const tileCenter = tile.y + tile.height / 2;
    if (
      tileCenter >= hitZoneY - HIT_ZONE_TOLERANCE &&
      tileCenter <= hitZoneBottom + HIT_ZONE_TOLERANCE
    ) {
      hitTile = tile;
      break;
    }
  }

  if (hitTile) {
    if (hitTile.isQuestion) {
      handleTileClick(hitTile);
    } else {
      handleRegularTileClick(hitTile);
    }
  } else {
    // No tile in hit zone — penalty
    beepWrong();
    lives--;
    combo = 0;
    updateHUD();

    // Flash lane red
    const lane = laneElements[laneIndex];
    lane.classList.add('lane-flash-bad');
    setTimeout(() => lane.classList.remove('lane-flash-bad'), 300);

    spawnParticles(
      (laneIndex + 0.5) * (getLaneWidth()),
      laneHeight * HIT_ZONE_Y_RATIO,
      { colors: ['#ff3060', '#ff00aa'], count: 12 }
    );

    if (lives <= 0) {
      endGame();
    }
  }
}

function updateBackground() {
  const hue = Math.min(combo * 5, 60); // Shift towards red with combo
  gameContainer.style.background = `linear-gradient(135deg, hsl(${hue}, 100%, 5%), hsl(${hue + 20}, 100%, 10%))`;
}

function startGameLoop() {
  let lastTime = Date.now();

  function gameLoop() {
    if (!gameActive) {
      return;
    }

    const now = Date.now();
    const deltaTime = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Spawn new tiles
    if (now - lastSpawnTime >= REGULAR_TILE_SPAWN_INTERVAL) {
      regularTileCount++;

      if (regularTileCount % QUESTION_TILE_INTERVAL === 0) {
        // Spawn question tile in correct lane
        const q = quiz.current();
        if (q) {
          spawnTile(q.correctIndex, true);
        }
      } else {
        // Spawn regular tile in random lane
        const laneIndex = Math.floor(Math.random() * LANE_COUNT);
        spawnTile(laneIndex, false);
      }

      lastSpawnTime = now;
    }

    // Update tiles
    updateTiles(deltaTime);

    gameLoopId = requestAnimationFrame(gameLoop);
  }

  gameLoopId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameActive = false;

  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
  }

  const progress = quiz.score();
  finalScore.textContent = score;
  finalCorrect.textContent = progress.correct;
  finalTotal.textContent = progress.answered;
  finalStreak.textContent = progress.bestStreak;

  gameOverScreen.classList.remove('hidden');
}

function quit() {
  if (confirm('Are you sure you want to quit?')) {
    window.location.href = '../';
  }
}

function resetGame() {
  gameOverScreen.classList.add('hidden');
  tiles.forEach((t) => t.element.remove());
  init();
}

// Event listeners
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    quit();
  } else {
    handleKeyPress(e.key);
  }
});

playAgainBtn.addEventListener('click', resetGame);
quitBtn.addEventListener('click', quit);

// Handle window resize
window.addEventListener('resize', () => {
  // Reposition all tiles
  tiles.forEach((tile) => {
    tile.width = getLaneWidth();
    tile.x = tile.laneIndex * tile.width;
    tile.element.style.left = `${(tile.laneIndex * 100) / LANE_COUNT}%`;
    tile.element.style.width = `${100 / LANE_COUNT}%`;
  });
});

// Start game
init();
