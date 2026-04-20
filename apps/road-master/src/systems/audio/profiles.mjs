function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toKey(value, fallback = "title") {
  const key = String(value ?? fallback).trim().toLowerCase();
  return key.length > 0 ? key : fallback;
}

function titleCase(value) {
  return String(value ?? "")
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const AUDIO_SCENE_PROFILES = Object.freeze({
  title: Object.freeze({
    label: "Title",
    intensity: 0.15,
    motion: "opening",
    mood: "briefing",
    tempo: 72,
  }),
  campaign: Object.freeze({
    label: "Campaign",
    intensity: 0.18,
    motion: "steady",
    mood: "focus",
    tempo: 84,
  }),
  boss: Object.freeze({
    label: "Boss",
    intensity: 0.28,
    motion: "pressure",
    mood: "threat",
    tempo: 96,
  }),
  victory: Object.freeze({
    label: "Victory",
    intensity: 0.14,
    motion: "release",
    mood: "conquest",
    tempo: 78,
  }),
  conquest: Object.freeze({
    label: "Conquest",
    intensity: 0.16,
    motion: "release",
    mood: "conquest",
    tempo: 80,
  }),
  failure: Object.freeze({
    label: "Failure",
    intensity: 0.12,
    motion: "repair",
    mood: "recovery",
    tempo: 66,
  }),
  flashback: Object.freeze({
    label: "Flashback",
    intensity: 0.24,
    motion: "memory",
    mood: "recall",
    tempo: 88,
  }),
  social: Object.freeze({
    label: "Social",
    intensity: 0.09,
    motion: "sharing",
    mood: "broadcast",
    tempo: 74,
  }),
  share: Object.freeze({
    label: "Share",
    intensity: 0.09,
    motion: "sharing",
    mood: "broadcast",
    tempo: 74,
  }),
});

export const AUDIO_CUE_PROFILES = Object.freeze({
  title: Object.freeze({
    label: "Title sting",
    scene: "title",
    wave: "triangle",
    duration: 0.18,
    motif: "opening",
  }),
  correct: Object.freeze({
    label: "Correct hit",
    scene: "campaign",
    wave: "triangle",
    duration: 0.16,
    motif: "progress",
  }),
  wrong: Object.freeze({
    label: "Wrong hit",
    scene: "failure",
    wave: "sawtooth",
    duration: 0.18,
    motif: "friction",
  }),
  flashback: Object.freeze({
    label: "Flashback",
    scene: "flashback",
    wave: "triangle",
    duration: 0.2,
    motif: "memory",
  }),
  boss: Object.freeze({
    label: "Boss entrance",
    scene: "boss",
    wave: "sawtooth",
    duration: 0.24,
    motif: "pressure",
  }),
  victory: Object.freeze({
    label: "Victory sting",
    scene: "victory",
    wave: "triangle",
    duration: 0.22,
    motif: "release",
  }),
  repair: Object.freeze({
    label: "Repair",
    scene: "failure",
    wave: "sine",
    duration: 0.18,
    motif: "repair",
  }),
  conquest: Object.freeze({
    label: "Conquest",
    scene: "conquest",
    wave: "triangle",
    duration: 0.2,
    motif: "release",
  }),
  defeat: Object.freeze({
    label: "Defeat",
    scene: "failure",
    wave: "sawtooth",
    duration: 0.18,
    motif: "repair",
  }),
  share: Object.freeze({
    label: "Share",
    scene: "share",
    wave: "triangle",
    duration: 0.16,
    motif: "broadcast",
  }),
});

export function resolveAudioSceneProfile(scene = "title") {
  const sceneName = toKey(scene);
  const profile = AUDIO_SCENE_PROFILES[sceneName] ?? AUDIO_SCENE_PROFILES.title;

  return {
    scene: sceneName,
    label: profile.label ?? titleCase(sceneName),
    ...profile,
  };
}

export function describeAudioCue(name = "title", { scene = null } = {}) {
  const cueName = toKey(name);
  const profile = AUDIO_CUE_PROFILES[cueName] ?? AUDIO_CUE_PROFILES.title;
  const sceneProfile = resolveAudioSceneProfile(scene ?? profile.scene);

  return {
    name: cueName,
    label: profile.label ?? titleCase(cueName),
    motif: profile.motif ?? cueName,
    wave: profile.wave ?? "triangle",
    duration: clamp(profile.duration ?? 0.18, 0.08, 0.5),
    scene: sceneProfile.scene,
    sceneProfile,
    intensity: clamp(sceneProfile.intensity ?? 0.18, 0.05, 0.44),
  };
}

export function listAudioScenes() {
  return Object.keys(AUDIO_SCENE_PROFILES);
}

export function listAudioCues() {
  return Object.keys(AUDIO_CUE_PROFILES);
}

