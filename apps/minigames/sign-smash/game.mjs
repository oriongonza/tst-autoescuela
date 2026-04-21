import { loadQuestionBank, loadExplanations, createQuiz } from '../core/quiz-core.mjs';
import { beepCorrect, beepWrong, beepCombo, beepFever, beepGameover, shakeScreen, spawnParticles, floatText } from '../core/juice.mjs';
let quiz = null, gameState = { lives: 3, score: 0, combo: 0, bestStreak: 0, gameActive: false, roundActive: false, frenzied: false };
const gameArea = document.getElementById('game-area'), holes = Array.from(document.querySelectorAll('.hole'));
const signs = Array.from(document.querySelectorAll('.sign')), hammer = document.getElementById('hammer');
const promptEl = document.getElementById('prompt'), timerEl = document.getElementById('timer');
const comboEl = document.getElementById('combo'), livesEl = document.getElementById('lives');
const scoreEl = document.getElementById('score'), frenzyLabel = document.getElementById('frenzy-label');
const gameOverScreen = document.getElementById('game-over-screen');
const CONFIG = { baseTimeLimit: 4, frenzyThreshold: 10, frenzySpeedMult: 2, frenzyPointMult: 2, basePoints: 100 };

async function init() {
  try {
    const bank = await loadQuestionBank('../data/questions.json');
    const explanations = await loadExplanations('../data/explanations.json');
    quiz = createQuiz(bank, { seed: Date.now(), explanations });
    startGame();
  } catch (err) {
    promptEl.textContent = 'Error loading quiz.';
  }
}

function startGame() {
  gameState.gameActive = true;
  gameState.lives = 3;
  gameState.score = 0;
  gameState.combo = 0;
  gameState.bestStreak = 0;
  gameState.frenzied = false;
  quiz.reset();
  updateHUD();
  nextRound();
}

function nextRound() {
  gameState.roundActive = true;
  const q = quiz.current();
  if (!q) { endGame(); return; }
  promptEl.textContent = q.prompt;
  updateComboDisplay();
  const indices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  const popDelay = gameState.frenzied ? 100 : 200;
  indices.forEach((idx, order) => setTimeout(() => popSign(idx, q.choices[idx]), order * popDelay));
  const timeLimit = gameState.frenzied ? CONFIG.baseTimeLimit / CONFIG.frenzySpeedMult : CONFIG.baseTimeLimit;
  startTimer(timeLimit);
}

function popSign(index, text) {
  const sign = signs[index];
  sign.textContent = text.substring(0, 50);
  sign.classList.remove('hide', 'smashed', 'bounce', 'correct-flash');
  sign.classList.add('popped');
  sign.dataset.index = index;
}

function startTimer(duration) {
  let remaining = duration;
  const interval = setInterval(() => {
    remaining -= 0.05;
    timerEl.textContent = remaining.toFixed(1) + 's';
    if (remaining <= 1) timerEl.classList.add('danger');
    else if (remaining <= 2) timerEl.classList.add('warning');
    if (remaining <= 0) {
      clearInterval(interval);
      timerEl.classList.remove('warning', 'danger');
      timerEl.textContent = '0.0s';
      if (gameState.roundActive) handleTimeout();
    }
  }, 50);
}

function handleTimeout() {
  if (!gameState.roundActive) return;
  gameState.roundActive = false;
  gameState.combo = 0;
  gameState.lives -= 1;
  beepWrong();
  shakeScreen(gameArea, 300, 10);
  signs.forEach(s => s.classList.add('hide'));
  updateHUD();
  setTimeout(() => gameState.lives <= 0 ? endGame() : nextRound(), gameState.lives <= 0 ? 500 : 800);
}

function handleSignClick(event) {
  if (!gameState.gameActive || !gameState.roundActive) return;
  const sign = event.currentTarget;
  const clickedIndex = parseInt(sign.dataset.index, 10);
  gameState.roundActive = false;
  timerEl.classList.remove('warning', 'danger');
  const result = quiz.submit(clickedIndex);
  if (!result) return;
  result.correct ? handleCorrectHit(clickedIndex, result) : handleWrongHit(clickedIndex, result);
}

function handleCorrectHit(index, result) {
  const sign = signs[index];
  sign.classList.add('smashed');
  beepCorrect();
  const signRect = sign.getBoundingClientRect(), x = signRect.left + signRect.width / 2, y = signRect.top + signRect.height / 2;
  spawnParticles(x, y, { count: 16, colors: ['#00ffa2', '#fff200', '#00eaff'], speed: 300, life: 800, size: 7 });
  gameState.combo += 1;
  gameState.bestStreak = Math.max(gameState.bestStreak, gameState.combo);
  const points = CONFIG.basePoints * (gameState.frenzied ? CONFIG.frenzyPointMult : 1);
  gameState.score += points;
  floatText('+' + points, { x, y, color: '#00ffa2', size: 42, life: 1000 });
  if (!gameState.frenzied && gameState.combo >= CONFIG.frenzyThreshold) activateFrenzy();
  else if (gameState.frenzied && gameState.combo >= CONFIG.frenzyThreshold) beepCombo(Math.min(gameState.combo, 10));
  else if (gameState.combo > 1) beepCombo(gameState.combo);
  updateHUD();
  setTimeout(() => signs.forEach(s => { if (s !== sign) s.classList.add('hide'); }), 100);
  setTimeout(() => { quiz.next(); nextRound(); }, 600);
}

function handleWrongHit(index, result) {
  const correctSign = signs[result.correctIndex];
  beepWrong();
  shakeScreen(gameArea, 300, 8);
  gameState.combo = 0;
  gameState.lives -= 1;
  correctSign.classList.add('correct-flash');
  updateHUD();
  setTimeout(() => signs.forEach(s => s.classList.add('hide')), 200);
  setTimeout(() => gameState.lives <= 0 ? endGame() : nextRound(), gameState.lives <= 0 ? 800 : 1200);
}

function activateFrenzy() {
  gameState.frenzied = true;
  document.body.classList.add('frenzy-mode');
  frenzyLabel.classList.remove('frenzy-hidden');
  setTimeout(() => frenzyLabel.classList.add('frenzy-hidden'), 1000);
  beepFever();
}

function endGame() {
  gameState.gameActive = false;
  gameState.roundActive = false;
  beepGameover();
  signs.forEach(s => s.classList.add('hide'));
  const { correct, wrong, bestStreak } = quiz.score();
  document.getElementById('final-correct').textContent = correct;
  document.getElementById('final-wrong').textContent = wrong;
  document.getElementById('final-streak').textContent = bestStreak;
  document.getElementById('final-score').textContent = gameState.score;
  setTimeout(() => gameOverScreen.classList.remove('game-over-hidden'), 500);
}

function updateHUD() {
  promptEl.textContent = quiz.current()?.prompt || 'Loading...';
  comboEl.textContent = `COMBO: ${gameState.combo}`;
  livesEl.textContent = `LIVES: ${gameState.lives}`;
  scoreEl.textContent = `SCORE: ${gameState.score}`;
  gameState.frenzied ? comboEl.classList.add('frenzy') : comboEl.classList.remove('frenzy');
  gameState.lives <= 1 ? livesEl.classList.add('critical') : livesEl.classList.remove('critical');
}
document.addEventListener('mousemove', e => { hammer.style.left = e.clientX + 'px'; hammer.style.top = e.clientY + 'px'; });
document.addEventListener('touchmove', e => { const t = e.touches[0]; hammer.style.left = t.clientX + 'px'; hammer.style.top = t.clientY + 'px'; });
signs.forEach(sign => { sign.addEventListener('click', handleSignClick); sign.addEventListener('touchend', handleSignClick); });
holes.forEach(hole => hole.addEventListener('click', e => { if (e.target.classList.contains('sign')) handleSignClick({ currentTarget: e.target }); }));
document.addEventListener('keydown', e => {
  if (!gameState.gameActive || !gameState.roundActive) return;
  if (e.key === '1') { const evt = new Event('click'); Object.defineProperty(evt, 'currentTarget', { value: signs[0] }); handleSignClick(evt); }
  else if (e.key === '2') { const evt = new Event('click'); Object.defineProperty(evt, 'currentTarget', { value: signs[1] }); handleSignClick(evt); }
  else if (e.key === '3') { const evt = new Event('click'); Object.defineProperty(evt, 'currentTarget', { value: signs[2] }); handleSignClick(evt); }
  else if (e.key === '4') { const evt = new Event('click'); Object.defineProperty(evt, 'currentTarget', { value: signs[3] }); handleSignClick(evt); }
  else if (e.key === 'Escape' && gameState.gameActive) window.location.href = '../';
});
document.getElementById('play-again-btn').addEventListener('click', () => {
  gameOverScreen.classList.add('game-over-hidden');
  document.body.classList.remove('frenzy-mode');
  gameState.frenzied = false;
  startGame();
});
document.getElementById('quit-btn').addEventListener('click', () => window.location.href = '../');
init();
