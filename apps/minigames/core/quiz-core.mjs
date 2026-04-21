// apps/minigames/core/quiz-core.mjs
// Pure quiz core: no DOM, no timers, no globals. Each minigame
// brings its own game loop and only calls into this for truth-of-correctness.

export async function loadQuestionBank(url) {
  const src = url ?? new URL('../data/questions.json', import.meta.url);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`quiz-core: failed to load questions (${res.status})`);
  const raw = await res.json();
  return raw.map(normalizeQuestion);
}

export async function loadExplanations(url) {
  const src = url ?? new URL('../data/explanations.json', import.meta.url);
  try {
    const res = await fetch(src);
    if (!res.ok) return {};
    const arr = await res.json();
    const byId = {};
    for (const e of arr) byId[e.id] = e;
    return byId;
  } catch {
    return {};
  }
}

function normalizeQuestion(q) {
  return {
    id: q.id,
    prompt: q.prompt,
    choices: (q.choices || []).slice(0, 4),
    correctIndex: q.answerIndex ?? q.correctIndex ?? 0,
    explanationId: q.explanationId || null,
    conceptIds: q.conceptIds || [],
    difficulty: q.difficulty || 'intro',
  };
}

// mulberry32 — seeded deterministic RNG so test runs are reproducible.
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

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * createQuiz(bank, opts) → controller
 * opts: { shuffle?, seed?, limit?, explanations? }
 */
export function createQuiz(bank, opts = {}) {
  const {
    shuffle = true,
    seed = Date.now(),
    limit = Infinity,
    explanations = {},
  } = opts;

  const source = bank.slice();
  if (shuffle) shuffleInPlace(source, seededRng(seed));
  const order = source.slice(0, Math.min(limit, source.length));

  let index = 0;
  let answered = 0;
  let correct = 0;
  let wrong = 0;
  let streak = 0;
  let bestStreak = 0;
  const log = [];

  const decorate = (q) => {
    if (!q) return null;
    return { ...q, explanation: q.explanationId ? explanations[q.explanationId] || null : null };
  };

  return {
    current() { return decorate(order[index]); },
    submit(choiceIndex) {
      const q = order[index];
      if (!q) return null;
      const isCorrect = choiceIndex === q.correctIndex;
      answered++;
      if (isCorrect) {
        correct++;
        streak++;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        wrong++;
        streak = 0;
      }
      log.push({ qid: q.id, choiceIndex, correct: isCorrect, at: Date.now() });
      return {
        correct: isCorrect,
        correctIndex: q.correctIndex,
        explanation: q.explanationId ? explanations[q.explanationId] || null : null,
        streak,
        bestStreak,
      };
    },
    next() { index++; return this.current(); },
    score() { return { correct, wrong, streak, bestStreak, answered, total: order.length }; },
    progress() { return { answered, total: order.length, remaining: Math.max(0, order.length - index) }; },
    isDone() { return index >= order.length; },
    reset() { index = 0; answered = 0; correct = 0; wrong = 0; streak = 0; bestStreak = 0; log.length = 0; },
    getLog() { return log.slice(); },
  };
}
