const CUES = {
  title: [
    [247, 330, 392],
    [262, 349, 440],
  ],
  correct: [
    [523, 659],
    [659, 784],
  ],
  wrong: [
    [196, 156],
    [174, 146],
  ],
  flashback: [
    [392, 311, 247],
    [330, 277, 220],
  ],
  boss: [
    [98, 123, 147],
    [110, 138, 164],
  ],
  victory: [
    [392, 494, 587, 784],
    [440, 554, 659, 880],
  ],
  repair: [
    [220, 196, 174],
  ],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createTone(ctx, destination, frequency, duration, wave = "sine", gainValue = 0.06) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = wave;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.0001;

  oscillator.connect(gain);
  gain.connect(destination);

  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.04);
}

export function createAudioDirector(onStatus = () => {}) {
  let context = null;
  let master = null;
  let muted = false;
  let scene = "title";
  let intensity = 0.22;
  let ready = false;

  function emit() {
    onStatus({
      ready,
      muted,
      scene,
      intensity,
    });
  }

  function ensureContext() {
    if (typeof window === "undefined") {
      return null;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return null;
    }
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : intensity;
      master.connect(context.destination);
      ready = true;
      emit();
    }
    return context;
  }

  function setMasterLevel(value) {
    intensity = clamp(value, 0.04, 0.44);
    if (master) {
      master.gain.value = muted ? 0 : intensity;
    }
    emit();
  }

  function setScene(nextScene) {
    scene = nextScene;
    const sceneLevel = {
      title: 0.15,
      campaign: 0.18,
      boss: 0.28,
      victory: 0.14,
      failure: 0.12,
      flashback: 0.24,
    }[nextScene] ?? 0.18;
    setMasterLevel(sceneLevel);
    emit();
  }

  function playPattern(name) {
    const ctx = ensureContext();
    if (!ctx || muted) {
      return;
    }
    const notes = CUES[name] ?? CUES.title;
    const duration = name === "boss" ? 0.24 : 0.18;
    const wave = name === "wrong" || name === "boss" ? "sawtooth" : "triangle";
    notes.forEach((frequency, index) => {
      createTone(ctx, master, frequency, duration + index * 0.05, wave, 0.05 + index * 0.01);
    });
    emit();
  }

  function unlock() {
    const ctx = ensureContext();
    if (ctx && ctx.state === "suspended") {
      return ctx.resume().then(() => {
        ready = true;
        emit();
      });
    }
    ready = Boolean(ctx);
    emit();
    return Promise.resolve();
  }

  function toggleMute(force) {
    muted = typeof force === "boolean" ? force : !muted;
    if (master) {
      master.gain.value = muted ? 0 : intensity;
    }
    emit();
    return muted;
  }

  return {
    unlock,
    setScene,
    setMasterLevel,
    playCue(name) {
      playPattern(name);
    },
    toggleMute,
    getStatus() {
      return {
        ready,
        muted,
        scene,
        intensity,
      };
    },
  };
}
