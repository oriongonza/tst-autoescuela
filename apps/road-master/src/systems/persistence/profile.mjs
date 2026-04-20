import { deepFreeze } from "../../core/contract-utils.mjs";
import { createSessionRecord } from "./session.mjs";

const DEFAULT_PROFILE_RECORD = deepFreeze({
  profileId: null,
  userId: null,
  displayName: null,
  appVersion: "0.1.0",
  sourceOfTruth: "chatgpt_conv.md",
  createdAtMs: null,
  updatedAtMs: null,
  onboardingComplete: false,
  onboardingStep: "welcome",
  onboardingCompletedAtMs: null,
  mentorVoiceMode: "stern",
  audioCuesEnabled: true,
  homeRegionId: "crossing_fields",
  homeSubmapId: null,
  preferredRegionIds: [],
  preferredSubmapIds: [],
  preferredConceptIds: [],
  weakRegionIds: [],
  masteredRegionIds: [],
  lastSessionId: null,
  lastRegionId: null,
  lastSubmapId: null,
  lastNodeId: null,
  challengeBias: 0.5,
  pacingBias: 0.5,
  memoryBias: 0.5,
  recursionBias: 0.5,
  readinessScore: null,
  failRiskScore: null,
  metadata: {},
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecord(value) {
  return isPlainObject(value) ? value : {};
}

function normalizeString(value, fallback = null) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeTimestamp(value, fallback = null) {
  if (Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return fallback;
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function toUniqueArray(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.filter((item) => item != null)));
  }

  if (value instanceof Set) {
    return Array.from(new Set(Array.from(value).filter((item) => item != null)));
  }

  return [];
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeMentorVoiceMode(value) {
  const allowed = new Set(["stern", "steady", "calm", "warm", "mythic"]);
  const voice = normalizeString(value, DEFAULT_PROFILE_RECORD.mentorVoiceMode);
  return allowed.has(voice) ? voice : DEFAULT_PROFILE_RECORD.mentorVoiceMode;
}

function normalizeMetadata(value) {
  return isPlainObject(value) ? { ...value } : {};
}

function normalizeProfileStage(value) {
  const step = normalizeString(value, DEFAULT_PROFILE_RECORD.onboardingStep);
  const allowed = new Set([
    "welcome",
    "mentor",
    "region",
    "route",
    "boss",
    "repair",
    "complete",
  ]);

  return allowed.has(step) ? step : DEFAULT_PROFILE_RECORD.onboardingStep;
}

export function normalizeProfileRecord(record = {}, defaults = {}) {
  const current = {
    ...DEFAULT_PROFILE_RECORD,
    ...normalizeRecord(defaults),
    ...normalizeRecord(record),
  };
  const createdAtMs = normalizeTimestamp(current.createdAtMs, current.updatedAtMs ?? null);
  const updatedAtMs = normalizeTimestamp(current.updatedAtMs, createdAtMs);

  return {
    ...current,
    profileId: normalizeString(current.profileId),
    userId: normalizeString(current.userId),
    displayName: normalizeString(current.displayName),
    appVersion: normalizeString(current.appVersion, DEFAULT_PROFILE_RECORD.appVersion),
    sourceOfTruth: normalizeString(current.sourceOfTruth, DEFAULT_PROFILE_RECORD.sourceOfTruth),
    createdAtMs,
    updatedAtMs,
    onboardingComplete: normalizeBoolean(current.onboardingComplete, DEFAULT_PROFILE_RECORD.onboardingComplete),
    onboardingStep: normalizeProfileStage(current.onboardingStep),
    onboardingCompletedAtMs: normalizeTimestamp(current.onboardingCompletedAtMs, null),
    mentorVoiceMode: normalizeMentorVoiceMode(current.mentorVoiceMode),
    audioCuesEnabled: normalizeBoolean(current.audioCuesEnabled, DEFAULT_PROFILE_RECORD.audioCuesEnabled),
    homeRegionId: normalizeString(current.homeRegionId, DEFAULT_PROFILE_RECORD.homeRegionId),
    homeSubmapId: normalizeString(current.homeSubmapId),
    preferredRegionIds: toUniqueArray(current.preferredRegionIds),
    preferredSubmapIds: toUniqueArray(current.preferredSubmapIds),
    preferredConceptIds: toUniqueArray(current.preferredConceptIds),
    weakRegionIds: toUniqueArray(current.weakRegionIds),
    masteredRegionIds: toUniqueArray(current.masteredRegionIds),
    lastSessionId: normalizeString(current.lastSessionId),
    lastRegionId: normalizeString(current.lastRegionId),
    lastSubmapId: normalizeString(current.lastSubmapId),
    lastNodeId: normalizeString(current.lastNodeId),
    challengeBias: clamp01(current.challengeBias ?? DEFAULT_PROFILE_RECORD.challengeBias),
    pacingBias: clamp01(current.pacingBias ?? DEFAULT_PROFILE_RECORD.pacingBias),
    memoryBias: clamp01(current.memoryBias ?? DEFAULT_PROFILE_RECORD.memoryBias),
    recursionBias: clamp01(current.recursionBias ?? DEFAULT_PROFILE_RECORD.recursionBias),
    readinessScore: Number.isFinite(current.readinessScore) ? current.readinessScore : null,
    failRiskScore: Number.isFinite(current.failRiskScore) ? current.failRiskScore : null,
    metadata: normalizeMetadata(current.metadata),
  };
}

export function createProfileRecord(overrides = {}) {
  const now = normalizeTimestamp(overrides.now, Date.now());
  return normalizeProfileRecord(overrides, {
    createdAtMs: now,
    updatedAtMs: now,
  });
}

export function updateProfileRecord(profile, patch = {}) {
  const now = normalizeTimestamp(patch.now, Date.now());
  return normalizeProfileRecord(
    {
      ...normalizeProfileRecord(profile),
      ...normalizeRecord(patch),
      updatedAtMs: now,
    },
  );
}

export function markOnboardingComplete(profile, patch = {}) {
  const now = normalizeTimestamp(patch.now, Date.now());
  return normalizeProfileRecord({
    ...normalizeProfileRecord(profile),
    ...normalizeRecord(patch),
    onboardingComplete: true,
    onboardingStep: "complete",
    onboardingCompletedAtMs: now,
    updatedAtMs: now,
  });
}

export function deriveOnboardingDefaults({
  profileId = null,
  userId = null,
  displayName = null,
  homeRegionId = DEFAULT_PROFILE_RECORD.homeRegionId,
  homeSubmapId = null,
  mentorVoiceMode = DEFAULT_PROFILE_RECORD.mentorVoiceMode,
  appVersion = DEFAULT_PROFILE_RECORD.appVersion,
  now = Date.now(),
} = {}) {
  const timestamp = normalizeTimestamp(now, Date.now());
  const profile = createProfileRecord({
    profileId,
    userId,
    displayName,
    homeRegionId,
    homeSubmapId,
    mentorVoiceMode,
    appVersion,
    onboardingComplete: false,
    onboardingStep: "welcome",
    preferredRegionIds: homeRegionId ? [homeRegionId] : [],
    weakRegionIds: [],
    masteredRegionIds: [],
    challengeBias: 0.45,
    pacingBias: 0.5,
    memoryBias: 0.55,
    recursionBias: 0.4,
    now: timestamp,
  });

  const session = createSessionRecord({
    profileId,
    userId,
    appVersion,
    activeRegionId: homeRegionId,
    activeSubmapId: homeSubmapId,
    currentStage: "boot",
    now: timestamp,
  });

  return { profile, session };
}
