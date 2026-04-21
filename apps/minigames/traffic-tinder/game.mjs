// Traffic Tinder — swipe card dating-app aesthetic for traffic rules
// Each card asks "Is this driver doing the right thing?" with YES/NO swipe mechanics.

import {
  loadQuestionBank,
  loadExplanations,
  createQuiz,
} from '../core/quiz-core.mjs';
import {
  beepCorrect,
  beepWrong,
  spawnParticles,
  floatText,
} from '../core/juice.mjs';

const HS_KEY = 'autoescuela-arcade.traffic-tinder.highscore';
const SWIPE_THRESHOLD = 80; // px to trigger swipe
const AUTO_ADVANCE_MS = 4000; // 4s timer for auto-wrong
const CARD_ANIMATION_MS = 600; // swipe animation duration
const CARD_STACK_DEPTH = 3;

let state = {
  screen: 'title', // 'title', 'game', 'gameover'
  quiz: null,
  bank: null,
  explanations: null,
  lives: 3,
  score: 0,
  streak: 0,
  bestStreak: 0,
  cardsAnswered: 0,
  highscore: parseInt(localStorage.getItem(HS_KEY), 10) || 0,
  currentQuestion: null,
  currentQuestionCards: [], // 3 cards per question (1 correct, 2 incorrect scenarios)
  currentCardIndex: 0, // which of the 3 cards we're on
  touchStartX: 0,
  touchStartY: 0,
  mouseDownX: 0,
  mouseDownY: 0,
  dragOffsetX: 0,
  autoAdvanceTimer: null,
  cardsResolvedCorrectly: 0, // per question
};

async function init() {
  const app = document.getElementById('app');

  try {
    state.bank = await loadQuestionBank(new URL('../data/questions.json', import.meta.url));
    state.explanations = await loadExplanations(new URL('../data/explanations.json', import.meta.url));
  } catch (err) {
    console.error('Failed to load quiz data:', err);
    app.innerHTML = '<p style="color: red;">Failed to load quiz data. Check browser console.</p>';
    return;
  }

  renderTitleScreen();
}

function renderTitleScreen() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="tt-screen tt-title-screen active">
      <div class="emoji-large">💳</div>
      <h1 class="arcade-title">Traffic Tinder</h1>
      <p>Swipe right for YES. Swipe left for NO.</p>
      <p>Is the driver doing the right thing?</p>

      <div class="info-block">
        <strong>Rules:</strong><br>
        Swipe RIGHT on correct scenarios. Swipe LEFT on incorrect ones.<br>
        3 lives. Streak multiplier. 4 seconds to swipe or auto-lose.
      </div>

      <button class="arcade-btn tt-start-btn">Start Swiping</button>

      <p style="color: var(--fg-dim); font-size: 0.85rem; margin-top: 2rem;">
        Mouse: drag left/right · Touch: swipe · Keyboard: → / J = swipe right, ← / L = swipe left<br>
        Press <strong>Esc</strong> to return to hub
      </p>
    </div>
  `;

  app.querySelector('.tt-start-btn').addEventListener('click', () => startGame());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.location.href = '../';
    if (state.screen === 'title' && (e.key === 'Enter' || e.key === ' ')) startGame();
  });
}

function startGame() {
  state.quiz = createQuiz(state.bank, {
    seed: Date.now(),
    explanations: state.explanations,
  });

  state.lives = 3;
  state.score = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.cardsAnswered = 0;
  state.screen = 'game';

  advanceToNextQuestion();
  renderGameScreen();
  setupCardInteractions();
}

function advanceToNextQuestion() {
  state.currentQuestion = state.quiz.current();
  if (!state.currentQuestion) {
    endGame();
    return;
  }

  // Generate 3 cards: 1 correct scenario + 2 incorrect scenarios
  const correctIdx = state.currentQuestion.correctIndex;
  const correctChoice = state.currentQuestion.choices[correctIdx];

  const incorrectChoices = state.currentQuestion.choices
    .map((c, i) => i !== correctIdx ? c : null)
    .filter(c => c !== null);

  state.currentQuestionCards = [
    { scenario: correctChoice, isCorrect: true, choiceIndex: correctIdx },
    { scenario: incorrectChoices[0], isCorrect: false, choiceIndex: state.currentQuestion.choices.indexOf(incorrectChoices[0]) },
    { scenario: incorrectChoices[1], isCorrect: false, choiceIndex: state.currentQuestion.choices.indexOf(incorrectChoices[1]) },
  ];

  // Shuffle cards
  shuffleArray(state.currentQuestionCards);
  state.currentCardIndex = 0;
  state.cardsResolvedCorrectly = 0;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function renderGameScreen() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="tt-screen tt-game-screen active">
      <div class="tt-hud">
        <div class="tt-hud-item lives">❤ <span id="lives-text">3</span> LIVES</div>
        <div class="tt-hud-item">Score: <span id="score-text">0</span></div>
        <div class="tt-hud-item good">Streak: <span id="streak-text">0</span></div>
      </div>
      <div class="tt-card-stack" id="card-stack"></div>
      <div style="text-align: center; color: var(--fg-dim); font-size: 0.9rem;">
        <span id="cards-progress">1</span> / 3
      </div>
    </div>
  `;

  updateHUD();
  renderCardStack();
  setupCardInteractions();
}

function renderCardStack() {
  const stack = document.getElementById('card-stack');
  if (!stack) return;

  stack.innerHTML = '';

  // Show up to CARD_STACK_DEPTH cards
  for (let i = 0; i < Math.min(CARD_STACK_DEPTH, state.currentQuestionCards.length - state.currentCardIndex); i++) {
    const card = state.currentQuestionCards[state.currentCardIndex + i];
    const cardEl = document.createElement('div');
    cardEl.className = `tt-card ${i === 0 ? 'active' : ''}`;
    cardEl.dataset.index = state.currentCardIndex + i;
    cardEl.innerHTML = `
      <div class="tt-card-overlay-right">✓</div>
      <div class="tt-card-overlay-left">✗</div>
      <div class="tt-card-prompt">${state.currentQuestion.prompt}</div>
      <div class="tt-card-scenario">"${card.scenario}"</div>
      <div class="tt-card-ask">IS THIS RIGHT?</div>
      <div class="tt-timer-bar" style="width: 100%;"></div>
    `;
    stack.appendChild(cardEl);

    // Start auto-advance timer for active card
    if (i === 0) {
      startAutoAdvanceTimer(cardEl);
    }
  }

  document.getElementById('cards-progress').textContent = (state.currentCardIndex + 1);
}

function setupCardInteractions() {
  const stack = document.getElementById('card-stack');
  if (!stack) return;

  const activeCard = stack.querySelector('.tt-card.active');
  if (!activeCard) return;

  let isDragging = false;

  // Mouse down
  activeCard.addEventListener('mousedown', (e) => {
    isDragging = true;
    state.mouseDownX = e.clientX;
    state.mouseDownY = e.clientY;
    state.dragOffsetX = 0;
    activeCard.style.cursor = 'grabbing';
  });

  // Touch start
  activeCard.addEventListener('touchstart', (e) => {
    isDragging = true;
    state.touchStartX = e.touches[0].clientX;
    state.touchStartY = e.touches[0].clientY;
    state.dragOffsetX = 0;
  });

  // Mouse/touch move
  const handleMove = (clientX) => {
    if (!isDragging || state.screen !== 'game') return;

    const startX = state.mouseDownX || state.touchStartX;
    state.dragOffsetX = clientX - startX;

    // Update card transform and drag overlays
    const rotation = (state.dragOffsetX / 200) * 15; // max ±15°
    activeCard.style.transform = `translateX(${state.dragOffsetX}px) rotateZ(${rotation}deg)`;

    // Show/hide drag indicator badges
    const rightOverlay = activeCard.querySelector('.tt-card-overlay-right');
    const leftOverlay = activeCard.querySelector('.tt-card-overlay-left');

    if (state.dragOffsetX > 0) {
      // dragging right
      const opacity = Math.min(Math.abs(state.dragOffsetX) / SWIPE_THRESHOLD, 1);
      rightOverlay.style.opacity = opacity * 0.8;
      leftOverlay.style.opacity = 0;
    } else {
      // dragging left
      const opacity = Math.min(Math.abs(state.dragOffsetX) / SWIPE_THRESHOLD, 1);
      leftOverlay.style.opacity = opacity * 0.8;
      rightOverlay.style.opacity = 0;
    }
  };

  document.addEventListener('mousemove', (e) => handleMove(e.clientX));
  document.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientX));

  // Mouse/touch up
  const handleUp = () => {
    if (!isDragging || state.screen !== 'game') return;
    isDragging = false;
    activeCard.style.cursor = 'grab';

    const cardData = state.currentQuestionCards[state.currentCardIndex];
    const swipedRight = state.dragOffsetX > SWIPE_THRESHOLD;
    const swipedLeft = state.dragOffsetX < -SWIPE_THRESHOLD;

    if (swipedRight || swipedLeft) {
      clearAutoAdvanceTimer();
      handleSwipe(swipedRight, cardData);
    } else {
      // snap back
      activeCard.style.transform = '';
      activeCard.querySelector('.tt-card-overlay-right').style.opacity = 0;
      activeCard.querySelector('.tt-card-overlay-left').style.opacity = 0;
    }

    state.dragOffsetX = 0;
  };

  document.addEventListener('mouseup', handleUp);
  document.addEventListener('touchend', handleUp);

  // Keyboard swipe
  document.addEventListener('keydown', (e) => {
    if (state.screen !== 'game') return;
    const cardData = state.currentQuestionCards[state.currentCardIndex];

    if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      clearAutoAdvanceTimer();
      handleSwipe(true, cardData);
    } else if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      clearAutoAdvanceTimer();
      handleSwipe(false, cardData);
    } else if (e.key === 'Escape') {
      window.location.href = '../';
    }
  });
}

function startAutoAdvanceTimer(cardEl) {
  clearAutoAdvanceTimer();
  const timerBar = cardEl.querySelector('.tt-timer-bar');
  const startTime = Date.now();

  const tick = () => {
    const elapsed = Date.now() - startTime;
    const progress = 1 - (elapsed / AUTO_ADVANCE_MS);
    timerBar.style.width = (progress * 100) + '%';

    if (elapsed >= AUTO_ADVANCE_MS) {
      if (state.screen === 'game' && state.currentCardIndex < state.currentQuestionCards.length) {
        handleSwipe(false, state.currentQuestionCards[state.currentCardIndex]); // wrong answer
      }
    } else {
      state.autoAdvanceTimer = requestAnimationFrame(tick);
    }
  };

  state.autoAdvanceTimer = requestAnimationFrame(tick);
}

function clearAutoAdvanceTimer() {
  if (state.autoAdvanceTimer) {
    cancelAnimationFrame(state.autoAdvanceTimer);
    state.autoAdvanceTimer = null;
  }
}

function handleSwipe(swipedRight, cardData) {
  const stack = document.getElementById('card-stack');
  const activeCard = stack.querySelector('.tt-card.active');

  // Determine correctness
  const isCorrectSwipe = cardData.isCorrect ? swipedRight : !swipedRight;

  if (isCorrectSwipe) {
    // Correct swipe: fly off with green glow
    beepCorrect();
    state.cardsResolvedCorrectly++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);

    const multiplier = Math.max(1, state.streak);
    const points = 100 * multiplier;
    state.score += points;

    // Particle burst at card center
    const rect = activeCard.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, {
      colors: ['#00ffa2', '#00eaff', '#fff200'],
      count: 16,
    });

    // Float text
    floatText(`+${points}`, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      color: '#00ffa2',
      size: 32,
    });

    // Fly off
    activeCard.style.transition = `all ${CARD_ANIMATION_MS}ms cubic-bezier(0.2, 0.8, 0.3, 1)`;
    activeCard.style.transform = `translateX(${swipedRight ? 800 : -800}px) rotateZ(${swipedRight ? 30 : -30}deg) scale(0.8)`;
    activeCard.style.opacity = '0';
  } else {
    // Wrong swipe: snap back + lose life
    beepWrong();
    state.lives--;
    state.streak = 0;

    // Brief red flash
    activeCard.style.backgroundColor = 'rgba(255, 48, 96, 0.3)';
    activeCard.style.borderColor = '#ff3060';
    setTimeout(() => {
      activeCard.style.backgroundColor = '';
      activeCard.style.borderColor = '';
    }, 240);

    // Snap back
    activeCard.style.transition = 'all 200ms cubic-bezier(0.6, 0.2, 0.7, 0.2)';
    activeCard.style.transform = '';
    activeCard.querySelector('.tt-card-overlay-right').style.opacity = 0;
    activeCard.querySelector('.tt-card-overlay-left').style.opacity = 0;
  }

  // After animation, advance
  setTimeout(() => {
    state.currentCardIndex++;

    if (state.currentCardIndex >= state.currentQuestionCards.length) {
      // All 3 cards resolved for this question
      const wasFullyCorrect = state.cardsResolvedCorrectly === 3;
      const submitIdx = wasFullyCorrect ? state.currentQuestion.correctIndex : 0;

      if (wasFullyCorrect) {
        state.quiz.submit(submitIdx);
      } else {
        state.quiz.submit(0); // submit first choice to mark as wrong for streak/score tracking
      }

      state.quiz.next();
      advanceToNextQuestion();

      if (state.lives <= 0 || state.quiz.isDone()) {
        endGame();
      } else {
        renderGameScreen();
      }
    } else {
      renderCardStack();
      setupCardInteractions();
    }

    updateHUD();
  }, CARD_ANIMATION_MS);
}

function updateHUD() {
  const livesEl = document.getElementById('lives-text');
  const scoreEl = document.getElementById('score-text');
  const streakEl = document.getElementById('streak-text');

  if (livesEl) livesEl.textContent = state.lives;
  if (scoreEl) scoreEl.textContent = state.score;
  if (streakEl) streakEl.textContent = state.streak;
}

function endGame() {
  state.screen = 'gameover';
  clearAutoAdvanceTimer();

  const finalScore = state.score;
  if (finalScore > state.highscore) {
    state.highscore = finalScore;
    localStorage.setItem(HS_KEY, finalScore);
  }

  const scoreData = state.quiz.score();

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="tt-screen tt-gameover-screen active">
      <h2>GAME OVER</h2>
      <div class="tt-final-score">${finalScore}</div>

      <div class="tt-score-breakdown">
        <div class="tt-score-item">
          <span class="label">Correct</span>
          <span class="value">${scoreData.correct}</span>
        </div>
        <div class="tt-score-item">
          <span class="label">Wrong</span>
          <span class="value">${scoreData.wrong}</span>
        </div>
        <div class="tt-score-item">
          <span class="label">Best Streak</span>
          <span class="value">${state.bestStreak}</span>
        </div>
        <div class="tt-score-item">
          <span class="label">High Score</span>
          <span class="value">${state.highscore}</span>
        </div>
      </div>

      <button class="arcade-btn tt-restart-btn">Play Again</button>
      <button class="arcade-btn" onclick="window.location.href = '../';" style="margin-left: 1rem;">Back to Hub</button>
    </div>
  `;

  app.querySelector('.tt-restart-btn').addEventListener('click', () => {
    state.screen = 'title';
    renderTitleScreen();
  });

  document.addEventListener('keydown', (e) => {
    if (state.screen === 'gameover' && (e.key === 'Enter' || e.key === ' ')) {
      state.screen = 'title';
      renderTitleScreen();
    }
  });
}

init();
