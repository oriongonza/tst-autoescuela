import { loadQuestionBank, loadExplanations, createQuiz } from '../core/quiz-core.mjs';
import {
  beep, beepCorrect, beepWrong, beepCombo, beepGameover,
  spawnParticles, floatText, flashElement
} from '../core/juice.mjs';

const COLS = 8;
const ROWS = 14;
const CELL_SIZE = 48;

// Color mapping: A=cyan, B=magenta, C=yellow, D=green
const CHOICE_COLORS = {
  0: { name: 'cyan', hex: '#00eaff', rgb: 'rgb(0, 234, 255)' },
  1: { name: 'magenta', hex: '#ff00aa', rgb: 'rgb(255, 0, 170)' },
  2: { name: 'yellow', hex: '#fff200', rgb: 'rgb(255, 242, 0)' },
  3: { name: 'green', hex: '#00ffa2', rgb: 'rgb(0, 255, 162)' }
};

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'];

class TetrisQuizGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Game state
    this.quiz = null;
    this.grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    this.fallingBlock = null;
    this.blockQueue = [];
    this.lives = 3;
    this.score = 0;
    this.streak = 0;
    this.gameOver = false;
    this.lastSpawnTime = 0;
    this.lastMoveTime = 0;

    // Input
    this.keys = {};
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    this.gameLoopId = null;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.min(rect.width - 20, COLS * CELL_SIZE);
    const h = Math.min(rect.height - 20, ROWS * CELL_SIZE);
    this.canvas.width = w;
    this.canvas.height = h;
    this.cellSize = Math.floor(w / COLS);
  }

  async init() {
    const bank = await loadQuestionBank('../data/questions.json');
    const explanations = await loadExplanations('../data/explanations.json');
    this.quiz = createQuiz(bank, { seed: Date.now(), explanations, limit: 20 });
    this.updateHUD();
    this.spawnBlock();
    this.gameLoopId = setInterval(() => this.gameLoop(), 32);
  }

  spawnBlock() {
    const current = this.quiz.current();
    if (!current) return;

    const choiceIndex = this.blockQueue.length % 4;
    this.blockQueue.push(choiceIndex);

    this.fallingBlock = {
      x: Math.floor(COLS / 2) - 1,
      y: 0,
      choice: choiceIndex,
      landed: false,
      landTime: 0
    };

    // Check for immediate game over (stack at top)
    if (this.grid[0].some(cell => cell !== null)) {
      this.endGame();
    }
  }

  onKeyDown(e) {
    this.keys[e.key] = true;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
    if (e.key === 'Escape') {
      this.quit();
    }
  }

  onKeyUp(e) {
    this.keys[e.key] = false;
  }

  gameLoop() {
    if (this.gameOver) return;

    const now = Date.now();

    // Handle input
    this.handleInput(now);

    // Update falling block
    if (this.fallingBlock) {
      this.updateFallingBlock(now);
    }

    // Render
    this.render();
  }

  handleInput(now) {
    if (!this.fallingBlock) return;

    // Move left
    if (this.keys['ArrowLeft']) {
      if (now - this.lastMoveTime > 100) {
        if (this.canMove(this.fallingBlock.x - 1, this.fallingBlock.y)) {
          this.fallingBlock.x--;
          beep({ freq: 300, dur: 0.08, type: 'square', volume: 0.1 });
          this.lastMoveTime = now;
        }
      }
    }

    // Move right
    if (this.keys['ArrowRight']) {
      if (now - this.lastMoveTime > 100) {
        if (this.canMove(this.fallingBlock.x + 1, this.fallingBlock.y)) {
          this.fallingBlock.x++;
          beep({ freq: 300, dur: 0.08, type: 'square', volume: 0.1 });
          this.lastMoveTime = now;
        }
      }
    }

    // Soft drop
    if (this.keys['ArrowDown']) {
      if (now - this.lastMoveTime > 50) {
        if (this.canMove(this.fallingBlock.x, this.fallingBlock.y + 1)) {
          this.fallingBlock.y++;
          this.lastMoveTime = now;
        }
      }
    }

    // Hard drop
    if (this.keys[' ']) {
      while (this.canMove(this.fallingBlock.x, this.fallingBlock.y + 1)) {
        this.fallingBlock.y++;
      }
      this.landBlock();
      this.keys[' '] = false;
    }
  }

  updateFallingBlock(now) {
    if (!this.fallingBlock) return;

    // Fall every 500ms
    if (now - this.lastSpawnTime > 500) {
      if (this.canMove(this.fallingBlock.x, this.fallingBlock.y + 1)) {
        this.fallingBlock.y++;
      } else {
        this.landBlock();
      }
      this.lastSpawnTime = now;
    }
  }

  canMove(x, y) {
    if (x < 0 || x >= COLS || y >= ROWS) return false;
    if (y < 0) return true; // Allow movement above screen
    return this.grid[y][x] === null;
  }

  landBlock() {
    if (!this.fallingBlock) return;

    const block = this.fallingBlock;
    const y = block.y;

    // Check if block lands in bottom row
    if (y === ROWS - 1) {
      const current = this.quiz.current();
      const landZone = Math.floor(block.x / 2); // 0-3 zones
      const correctZone = block.choice;

      if (block.choice === current.correctIndex && landZone === correctZone) {
        // CORRECT!
        this.handleCorrectDrop(block.x, y);
        this.quiz.next();
        this.spawnBlock();
      } else {
        // WRONG
        this.handleWrongDrop(block, y);
      }
    } else if (y < ROWS - 1 && this.grid[y + 1][block.x] !== null) {
      // Block lands on another block
      const current = this.quiz.current();
      const zone = Math.floor(block.x / 2);
      const correctZone = block.choice;

      if (block.choice === current.correctIndex && zone === correctZone && y + 1 === ROWS - 1) {
        this.handleCorrectDrop(block.x, y);
        this.quiz.next();
        this.spawnBlock();
      } else {
        this.handleWrongDrop(block, y);
      }
    } else {
      // Place block in grid
      this.grid[y][block.x] = block.choice;
      this.fallingBlock = null;
      this.spawnBlock();
    }
  }

  handleCorrectDrop(x, y) {
    const points = 100 * (1 + this.streak);
    this.score += points;
    this.streak++;

    beepCorrect();
    floatText(`+${points}`, {
      x: this.canvas.offsetLeft + (x + 0.5) * this.cellSize,
      y: this.canvas.offsetTop + (y + 0.5) * this.cellSize,
      color: '#00ffa2',
      size: 32,
      life: 800
    });

    spawnParticles(
      this.canvas.offsetLeft + (x + 0.5) * this.cellSize,
      this.canvas.offsetTop + (y + 0.5) * this.cellSize,
      { count: 16, colors: ['#00ffa2', '#00eaff', '#fff200'], life: 600 }
    );

    this.updateHUD();
  }

  handleWrongDrop(block, y) {
    this.grid[y][block.x] = block.choice;
    this.fallingBlock = null;
    this.lives--;
    this.streak = 0;

    beepWrong();
    flashElement(this.canvas, 'var(--juice-bad)', 150);

    this.updateHUD();

    if (this.lives <= 0 || this.isStackFull()) {
      this.endGame();
    } else {
      this.spawnBlock();
    }
  }

  isStackFull() {
    return this.grid[0].some(cell => cell !== null);
  }

  render() {
    const ctx = this.ctx;
    const cs = this.cellSize;

    // Clear
    ctx.fillStyle = '#0a001a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 234, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cs, 0);
      ctx.lineTo(i * cs, this.canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cs);
      ctx.lineTo(this.canvas.width, i * cs);
      ctx.stroke();
    }

    // Draw placed blocks
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const choice = this.grid[y][x];
        if (choice !== null) {
          this.drawBlock(x, y, choice, 1.0);
        }
      }
    }

    // Draw falling block
    if (this.fallingBlock) {
      this.drawBlock(this.fallingBlock.x, this.fallingBlock.y, this.fallingBlock.choice, 0.95);
    }

    // Draw zone labels at bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let zone = 0; zone < 4; zone++) {
      const x = (zone * 2 + 1) * cs;
      const y = (ROWS + 0.5) * cs;
      ctx.fillText(CHOICE_LETTERS[zone], x, y);
    }

    // Draw stack warning if high
    const stackHeight = this.grid.filter(row => row.some(c => c !== null)).length;
    if (stackHeight >= ROWS - 3) {
      ctx.fillStyle = 'rgba(255, 48, 96, 0.5)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      beep({ freq: 120, dur: 0.15, type: 'sine', volume: 0.2 });
    }
  }

  drawBlock(x, y, choice, alpha) {
    if (y < 0) return; // Don't draw above screen

    const ctx = this.ctx;
    const cs = this.cellSize;
    const color = CHOICE_COLORS[choice];

    ctx.globalAlpha = alpha;

    // Main block
    ctx.fillStyle = color.hex;
    ctx.shadowColor = color.hex;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillRect(x * cs + 2, y * cs + 2, cs - 4, cs - 4);

    // Label text
    ctx.fillStyle = '#0a001a';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'transparent';
    ctx.fillText(CHOICE_LETTERS[choice], x * cs + cs / 2, y * cs + cs / 2);

    ctx.globalAlpha = 1.0;
  }

  updateHUD() {
    const current = this.quiz.current();
    const score = this.quiz.score();

    // Question
    const qText = current ? `[Q] ${current.prompt.substring(0, 60)}...` : 'Loading...';
    document.getElementById('hud-question').textContent = qText;

    // Choices
    if (current) {
      const choices = current.choices.map((c, i) => `${CHOICE_LETTERS[i]}: ${c}`).join(' | ');
      const div = document.createElement('div');
      div.id = 'hud-choices';
      div.textContent = choices;
      div.style.cssText = 'color: var(--fg-dim); font-size: 0.85rem; margin-top: 4px;';
      const qDiv = document.getElementById('hud-question');
      qDiv.innerHTML = qText + '<br>';
      qDiv.appendChild(div);
    }

    // Lives
    document.getElementById('hud-lives').textContent = `LIVES ${this.lives}`;
    const livesEl = document.getElementById('hud-lives');
    livesEl.className = 'hud-item hud-bad';
    if (this.lives >= 2) livesEl.className = 'hud-item hud-warn';

    // Streak
    document.getElementById('hud-combo').textContent = `COMBO ${this.streak}`;

    // Score
    document.getElementById('hud-score').textContent = `SCORE ${this.score}`;
  }

  endGame() {
    this.gameOver = true;
    if (this.gameLoopId) clearInterval(this.gameLoopId);
    beepGameover();

    const score = this.quiz.score();
    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-correct').textContent = score.correct;
    document.getElementById('final-total').textContent = score.answered;
    document.getElementById('final-streak').textContent = score.bestStreak;

    document.getElementById('game-over').classList.remove('hidden');

    document.getElementById('play-again-btn').onclick = () => this.restart();
    document.getElementById('quit-btn').onclick = () => this.quit();
  }

  restart() {
    this.grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    this.fallingBlock = null;
    this.blockQueue = [];
    this.lives = 3;
    this.score = 0;
    this.streak = 0;
    this.gameOver = false;
    this.lastSpawnTime = Date.now();
    this.lastMoveTime = 0;
    this.quiz.reset();
    document.getElementById('game-over').classList.add('hidden');
    this.spawnBlock();
    this.updateHUD();
    this.gameLoopId = setInterval(() => this.gameLoop(), 32);
  }

  quit() {
    if (this.gameLoopId) clearInterval(this.gameLoopId);
    window.location.href = '../';
  }
}

// Initialize on load
window.addEventListener('load', async () => {
  const canvas = document.getElementById('game-canvas');
  const game = new TetrisQuizGame(canvas);
  await game.init();
});
