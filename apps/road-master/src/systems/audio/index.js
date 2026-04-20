export {
  AUDIO_CUE_PROFILES,
  AUDIO_SCENE_PROFILES,
  describeAudioCue,
  listAudioCues,
  listAudioScenes,
  resolveAudioSceneProfile,
} from "./profiles.mjs";

import {
  AUDIO_CUE_PROFILES,
  AUDIO_SCENE_PROFILES,
  describeAudioCue,
  resolveAudioSceneProfile,
} from "./profiles.mjs";

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
  conquest: [
    [330, 392, 523],
    [349, 440, 587],
  ],
  defeat: [
    [174, 146, 130],
    [196, 164, 146],
  ],
  share: [
    [262, 392, 523],
    [294, 440, 587],
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
  let intensity = resolveAudioSceneProfile("title").intensity;
  let ready = false;

  function emit(extra = {}) {
    const sceneProfile = resolveAudioSceneProfile(scene);
    onStatus({
      ready,
      muted,
      scene,
      intensity,
      sceneProfile,
      ...extra,
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
    const profile = resolveAudioSceneProfile(nextScene);
    scene = profile.scene;
    setMasterLevel(profile.intensity);
    emit({ sceneProfile: profile });
  }

  function playPattern(name) {
    const ctx = ensureContext();
    if (!ctx || muted) {
      return;
    }

    const cue = describeAudioCue(name, { scene });
    const notes = CUES[cue.name] ?? CUES[cue.scene] ?? CUES.title;
    const wave = cue.wave === "sawtooth" ? "sawtooth" : cue.wave === "sine" ? "sine" : "triangle";

    notes.forEach((frequency, index) => {
      const duration = cue.duration + index * 0.05;
      createTone(ctx, master, frequency, duration, wave, 0.05 + index * 0.01);
    });

    emit({ cueProfile: cue });
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
        sceneProfile: resolveAudioSceneProfile(scene),
      };
    },
    getSceneProfile() {
      return resolveAudioSceneProfile(scene);
    },
    getCueProfile(name) {
      return describeAudioCue(name, { scene });
    },
    getCatalog() {
      return {
        scenes: AUDIO_SCENE_PROFILES,
        cues: AUDIO_CUE_PROFILES,
      };
    },
  };
}
