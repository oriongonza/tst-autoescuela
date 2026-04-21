import { beep, beepCorrect, spawnParticles, floatText } from './core/juice.mjs';

const PLAYLIST_KEY = 'arcade:playlist';

const tiles = Array.from(document.querySelectorAll('.tile.ready'));
const surprise = document.getElementById('surprise-me');
const playAll = document.getElementById('play-all');

function audioCtx() {
  // Touch the audio graph so juice beeps work after user gesture.
  try { beep({ freq: 440, dur: 0.05, type: 'sine', volume: 0.08 }); } catch {}
}

function cyclePick(onDone) {
  if (!tiles.length) return;
  const pickedIndex = Math.floor(Math.random() * tiles.length);
  const startMs = performance.now();
  const totalMs = 2200;
  let lastCursor = -1;

  function frame(now) {
    const elapsed = now - startMs;
    const progress = Math.min(1, elapsed / totalMs);
    // Ease-out: fast spin then slow. Cursor advances more slowly as progress -> 1.
    const eased = 1 - Math.pow(1 - progress, 3);
    const ticks = Math.floor(eased * (tiles.length * 3 + pickedIndex));
    const cursor = ticks % tiles.length;

    if (cursor !== lastCursor) {
      tiles.forEach(t => t.classList.remove('spinning'));
      tiles[cursor].classList.add('spinning');
      tiles[cursor].scrollIntoView({ behavior: 'smooth', block: 'center' });
      beep({ freq: 260 + cursor * 40, dur: 0.04, type: 'square', volume: 0.05 });
      lastCursor = cursor;
    }

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      tiles.forEach(t => t.classList.remove('spinning'));
      const winner = tiles[pickedIndex];
      winner.classList.add('picked');
      const rect = winner.getBoundingClientRect();
      spawnParticles(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        { count: 24, colors: ['#55ff88', '#fff200', '#ff00aa'], speed: 320, life: 900 }
      );
      floatText(
        '🎯 ' + winner.querySelector('h3').textContent,
        { x: rect.left + rect.width / 2, y: rect.top + 20, color: '#fff200', size: 28 }
      );
      beepCorrect();
      setTimeout(() => onDone(winner), 700);
    }
  }
  requestAnimationFrame(frame);
}

surprise?.addEventListener('click', () => {
  audioCtx();
  surprise.disabled = true;
  playAll && (playAll.disabled = true);
  cyclePick(winner => {
    window.location.href = winner.getAttribute('href');
  });
});

playAll?.addEventListener('click', () => {
  audioCtx();
  // Build a shuffled playlist of all ready tiles.
  const playlist = tiles
    .map(t => ({ href: t.getAttribute('href'), slug: t.dataset.slug }))
    .sort(() => Math.random() - 0.5);
  sessionStorage.setItem(PLAYLIST_KEY, JSON.stringify({ queue: playlist, index: 0 }));
  playAll.disabled = true;
  surprise && (surprise.disabled = true);
  playAll.textContent = '🏆 Starting tournament…';
  beepCorrect();
  setTimeout(() => {
    window.location.href = playlist[0].href;
  }, 500);
});

// Show a little "TOURNAMENT" banner if we're mid-playlist (returning from a game).
const raw = sessionStorage.getItem(PLAYLIST_KEY);
if (raw) {
  try {
    const { queue, index } = JSON.parse(raw);
    if (Array.isArray(queue) && index < queue.length) {
      const remaining = queue.length - index;
      const banner = document.createElement('div');
      banner.style.cssText = `
        text-align: center; margin: 0 0 1.25rem;
        color: var(--neon-magenta); letter-spacing: 0.25em;
        font-size: 0.9rem; text-transform: uppercase;
      `;
      banner.innerHTML = `🏆 Tournament in progress — ${remaining} game${remaining === 1 ? '' : 's'} left · <a href="#" id="abort-tournament" style="color:var(--neon-red)">abort</a>`;
      document.querySelector('header').after(banner);
      document.getElementById('abort-tournament').addEventListener('click', e => {
        e.preventDefault();
        sessionStorage.removeItem(PLAYLIST_KEY);
        banner.remove();
      });
      const nextBtn = document.createElement('button');
      nextBtn.className = 'picker-btn';
      nextBtn.type = 'button';
      nextBtn.textContent = `▶ Next: ${queue[index].slug}`;
      nextBtn.addEventListener('click', () => {
        const state = JSON.parse(sessionStorage.getItem(PLAYLIST_KEY));
        state.index += 1;
        if (state.index >= state.queue.length) {
          sessionStorage.removeItem(PLAYLIST_KEY);
          alert('🏆 Tournament complete! You played all ' + state.queue.length + ' minigames.');
          return;
        }
        sessionStorage.setItem(PLAYLIST_KEY, JSON.stringify(state));
        window.location.href = state.queue[state.index].href;
      });
      document.querySelector('.picker-row').prepend(nextBtn);
    }
  } catch {
    sessionStorage.removeItem(PLAYLIST_KEY);
  }
}
