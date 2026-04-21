// apps/minigames/core/juice.mjs
// Shared FX: synthesized beeps, screen shake, particle bursts, floating text.
// No asset files — everything is generated at runtime. Safe to import from any minigame.

let _audioCtx = null;
function audioCtx() {
  if (!_audioCtx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    _audioCtx = new C();
  }
  return _audioCtx;
}

export function beep({ freq = 440, dur = 0.12, type = 'square', volume = 0.2, attack = 0.005 } = {}) {
  try {
    const ctx = audioCtx(); if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch {}
}

export function beepCorrect() {
  beep({ freq: 880, dur: 0.14, type: 'triangle', volume: 0.25 });
  beep({ freq: 1320, dur: 0.18, type: 'triangle', volume: 0.18 });
}
export function beepWrong() {
  beep({ freq: 140, dur: 0.3, type: 'sawtooth', volume: 0.25 });
}
export function beepCombo(n = 1) {
  beep({ freq: 600 + Math.min(n * 40, 800), dur: 0.08, type: 'square', volume: 0.15 });
}
export function beepFever() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => beep({ freq: 400 + i * 200, dur: 0.1, type: 'triangle', volume: 0.2 }), i * 60);
  }
}
export function beepGameover() {
  beep({ freq: 260, dur: 0.25, type: 'sawtooth', volume: 0.3 });
  setTimeout(() => beep({ freq: 200, dur: 0.3, type: 'sawtooth', volume: 0.3 }), 180);
  setTimeout(() => beep({ freq: 140, dur: 0.5, type: 'sawtooth', volume: 0.3 }), 400);
}

export function shakeScreen(el, ms = 300, magnitude = 8) {
  if (!el || !el.animate) return;
  el.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${-magnitude}px, ${magnitude/2}px)` },
      { transform: `translate(${magnitude}px, ${-magnitude/2}px)` },
      { transform: `translate(${-magnitude/2}px, ${magnitude}px)` },
      { transform: `translate(${magnitude/2}px, ${-magnitude}px)` },
      { transform: 'translate(0,0)' },
    ],
    { duration: ms, easing: 'ease-out' }
  );
}

export function flashElement(el, color = 'var(--juice-good)', ms = 240) {
  if (!el || !el.animate) return;
  el.animate(
    [
      { backgroundColor: color, boxShadow: `0 0 40px ${color}` },
      { backgroundColor: 'transparent', boxShadow: 'none' },
    ],
    { duration: ms, easing: 'ease-out' }
  );
}

export function spawnParticles(x, y, {
  count = 14,
  colors = ['#00eaff', '#ff00aa', '#fff200'],
  speed = 260,
  life = 700,
  size = 6,
  container = document.body,
} = {}) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const v = speed * (0.6 + Math.random() * 0.6);
    const dx = Math.cos(angle) * v;
    const dy = Math.sin(angle) * v;
    const color = colors[i % colors.length];
    p.style.cssText = `
      position: fixed;
      left: ${x}px; top: ${y}px;
      width: ${size}px; height: ${size}px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 0 10px ${color};
    `;
    frag.appendChild(p);
    p.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * life / 1000}px, ${dy * life / 1000}px) scale(0)`, opacity: 0 },
      ],
      { duration: life, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }
    );
    setTimeout(() => p.remove(), life + 30);
  }
  container.appendChild(frag);
}

export function floatText(text, {
  x, y,
  color = '#00eaff',
  size = 36,
  life = 900,
  container = document.body,
} = {}) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position: fixed;
    left: ${x}px; top: ${y}px;
    transform: translate(-50%, -50%);
    color: ${color};
    font-family: 'Courier New', monospace;
    font-weight: 800;
    font-size: ${size}px;
    text-shadow: 0 0 12px currentColor, 0 0 24px currentColor;
    pointer-events: none;
    z-index: 10000;
    letter-spacing: 2px;
  `;
  container.appendChild(el);
  el.animate(
    [
      { transform: 'translate(-50%,-50%) scale(0.7)', opacity: 0 },
      { transform: 'translate(-50%,-120%) scale(1)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%,-180%) scale(1)', opacity: 0 },
    ],
    { duration: life, easing: 'ease-out', fill: 'forwards' }
  );
  setTimeout(() => el.remove(), life + 30);
}
