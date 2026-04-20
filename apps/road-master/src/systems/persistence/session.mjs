import { deepFreeze } from "../../core/contract-utils.mjs";

const DEFAULT_SESSION_RECORD = deepFreeze({
  sessionId: null,
  profileId: null,
  userId: null,
  appVersion: "0.1.0",
  sourceOfTruth: "chatgpt_conv.md",
  createdAtMs: null,
  updatedAtMs: null,
  startedAtMs: null,
  lastSeenAtMs: null,
  currentStage: "boot",
  activeRegionId: null,
  activeSubmapId: null,
  activeNodeId: null,
  checkpointNodeId: null,
  attemptCount: 0,
  questionCount: 0,
  correctCount: 0,
  wrongCount: 0,
  retryCount: 0,
  reclaimCount: 0,
  bossAttemptCount: 0,
  flashbackCount: 0,
  completedRegionIds: [],
  visitedNodeIds: [],
  unlockedScopeIds: [],
  fragileScopeIds: [],
  corruptedScopeIds: [],
  weakRegionIds: [],
  readinessScore: null,
  failRiskScore: null,
  lastEventName: null,
  lastEventAtMs: null,
  metadata: {},
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function normalizeString(value, fallback = null) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item != null);
  }

  if (value instanceof Set) {
    return Array.from(value).filter((item) => item != null);
  }

  return [];
}

function normalizeRecord(value) {
  return isPlainObject(value) ? value : {};
}

function toUniqueArray(value) {
  return Array.from(new Set(normalizeArray(value)));
}

function normalizeMetadata(value) {
  return isPlainObject(value) ? { ...value } : {};
}

function normalizeSessionStage(value) {
  const stage = normalizeString(value, DEFAULT_SESSION_RECORD.currentStage);
  const allowedStages = new Set([
    "boot",
    "campaign",
    "map",
    "encounter",
    "boss",
    "flashback",
    "conquest",
    "repair",
    "failed",
  ]);

  return allowedStages.has(stage) ? stage : DEFAULT_SESSION_RECORD.currentStage;
}

export function normalizeSessionRecord(record = {}, defaults = {}) {
  const current = {
    ...DEFAULT_SESSION_RECORD,
    ...normalizeRecord(defaults),
    ...normalizeRecord(record),
  };
  const createdAtMs = normalizeTimestamp(current.createdAtMs, current.startedAtMs ?? current.updatedAtMs ?? null);
  const startedAtMs = normalizeTimestamp(current.startedAtMs, createdAtMs);
  const updatedAtMs = normalizeTimestamp(current.updatedAtMs, current.lastEventAtMs ?? startedAtMs);
  const lastSeenAtMs = normalizeTimestamp(current.lastSeenAtMs, updatedAtMs);
  const lastEventAtMs = normalizeTimestamp(current.lastEventAtMs, updatedAtMs);

  return {
    ...current,
    sessionId: normalizeString(current.sessionId),
    profileId: normalizeString(current.profileId),
    userId: normalizeString(current.userId),
    createdAtMs,
    startedAtMs,
    updatedAtMs,
    lastSeenAtMs,
    lastEventAtMs,
    appVersion: normalizeString(current.appVersion, DEFAULT_SESSION_RECORD.appVersion),
    sourceOfTruth: normalizeString(current.sourceOfTruth, DEFAULT_SESSION_RECORD.sourceOfTruth),
    currentStage: normalizeSessionStage(current.currentStage),
    activeRegionId: normalizeString(current.activeRegionId),
    activeSubmapId: normalizeString(current.activeSubmapId),
    activeNodeId: normalizeString(current.activeNodeId),
    checkpointNodeId: normalizeString(current.checkpointNodeId),
    attemptCount: Number.isFinite(current.attemptCount) ? current.attemptCount : 0,
    questionCount: Number.isFinite(current.questionCount) ? current.questionCount : 0,
    correctCount: Number.isFinite(current.correctCount) ? current.correctCount : 0,
    wrongCount: Number.isFinite(current.wrongCount) ? current.wrongCount : 0,
    retryCount: Number.isFinite(current.retryCount) ? current.retryCount : 0,
    reclaimCount: Number.isFinite(current.reclaimCount) ? current.reclaimCount : 0,
    bossAttemptCount: Number.isFinite(current.bossAttemptCount) ? current.bossAttemptCount : 0,
    flashbackCount: Number.isFinite(current.flashbackCount) ? current.flashbackCount : 0,
    completedRegionIds: toUniqueArray(current.completedRegionIds),
    visitedNodeIds: toUniqueArray(current.visitedNodeIds),
    unlockedScopeIds: toUniqueArray(current.unlockedScopeIds),
    fragileScopeIds: toUniqueArray(current.fragileScopeIds),
    corruptedScopeIds: toUniqueArray(current.corruptedScopeIds),
    weakRegionIds: toUniqueArray(current.weakRegionIds),
    readinessScore: Number.isFinite(current.readinessScore) ? current.readinessScore : null,
    failRiskScore: Number.isFinite(current.failRiskScore) ? current.failRiskScore : null,
    lastEventName: normalizeString(current.lastEventName),
    metadata: normalizeMetadata(current.metadata),
  };
}

export function createSessionRecord(overrides = {}) {
  const now = normalizeTimestamp(overrides.now, Date.now());
  return normalizeSessionRecord(overrides, {
    createdAtMs: now,
    startedAtMs: now,
    updatedAtMs: now,
    lastSeenAtMs: now,
  });
}

export function touchSessionRecord(session, patch = {}) {
  const now = normalizeTimestamp(patch.now, Date.now());
  return normalizeSessionRecord(
    {
      ...normalizeSessionRecord(session),
      ...normalizeRecord(patch),
      updatedAtMs: now,
      lastSeenAtMs: now,
      lastEventAtMs: patch.lastEventAtMs ?? now,
    },
  );
}

export function applySessionEvent(session, event = {}) {
  const current = normalizeSessionRecord(session);
  const payload = normalizeRecord(event.payload);
  const name = normalizeString(event.name ?? event.kind, current.lastEventName);
  const atMs = normalizeTimestamp(event.atMs ?? event.timestamp ?? payload.atMs, Date.now());
  const next = {
    ...current,
    lastEventName: name,
    lastEventAtMs: atMs,
    updatedAtMs: atMs,
    lastSeenAtMs: atMs,
  };

  if (name === "session_started") {
    next.currentStage = "boot";
    next.startedAtMs = current.startedAtMs ?? atMs;
  }

  if (name === "profile_selected" || name === "profile_loaded") {
    next.profileId = normalizeString(payload.profileId ?? event.profileId, next.profileId);
    next.userId = normalizeString(payload.userId ?? event.userId, next.userId);
  }

  if (name === "map_opened") {
    next.currentStage = "map";
    next.activeRegionId = normalizeString(payload.regionId ?? event.regionId, next.activeRegionId);
    next.activeSubmapId = normalizeString(payload.submapId ?? event.submapId, next.activeSubmapId);
  }

  if (name === "node_opened") {
    next.currentStage = "map";
    next.activeNodeId = normalizeString(payload.nodeId ?? event.nodeId, next.activeNodeId);
    next.activeRegionId = normalizeString(payload.regionId ?? event.regionId, next.activeRegionId);
    next.activeSubmapId = normalizeString(payload.submapId ?? event.submapId, next.activeSubmapId);
    next.visitedNodeIds = toUniqueArray([...next.visitedNodeIds, next.activeNodeId].filter(Boolean));
  }

  if (name === "submap_opened") {
    next.currentStage = "map";
    next.activeSubmapId = normalizeString(payload.submapId ?? event.submapId, next.activeSubmapId);
    next.activeRegionId = normalizeString(payload.regionId ?? event.regionId, next.activeRegionId);
  }

  if (name === "question_shown" || name === "attack_shown" || name === "answer_submitted") {
    next.currentStage = "encounter";
    next.questionCount += 1;
  }

  if (name === "answer_submitted") {
    next.attemptCount += 1;
  }

  if (name === "answer_evaluated") {
    if (payload.correct === true || event.correct === true) {
      next.correctCount += 1;
    } else if (payload.correct === false || event.correct === false) {
      next.wrongCount += 1;
    }
  }

  if (name === "attack_resolved" && Number.isFinite(payload.damageTaken ?? event.damageTaken) && (payload.damageTaken ?? event.damageTaken) > 0) {
    next.wrongCount += 1;
  }

  if (name === "flashback_triggered") {
    next.currentStage = "flashback";
    next.flashbackCount += 1;
  }

  if (name === "reclaim_scheduled") {
    next.reclaimCount += 1;
  }

  if (name === "reclaim_succeeded") {
    next.reclaimCount += 1;
    next.currentStage = "campaign";
  }

  if (name === "boss_entered" || name === "boss_attempted" || name === "boss_phase_changed") {
    next.currentStage = "boss";
    if (name !== "boss_phase_changed") {
      next.bossAttemptCount += 1;
    }
  }

  if (name === "boss_defeated") {
    next.currentStage = "conquest";
    next.completedRegionIds = toUniqueArray([...next.completedRegionIds, normalizeString(payload.regionId ?? event.regionId)].filter(Boolean));
  }

  if (name === "boss_failed" || name === "run_failed") {
    next.currentStage = "failed";
  }

  if (name === "onboarding_completed") {
    next.currentStage = "campaign";
  }

  if (name === "region_conquered") {
    next.currentStage = "conquest";
    next.completedRegionIds = toUniqueArray([...next.completedRegionIds, normalizeString(payload.regionId ?? event.regionId)].filter(Boolean));
  }

  if (Array.isArray(payload.completedRegionIds) || Array.isArray(event.completedRegionIds)) {
    next.completedRegionIds = toUniqueArray([
      ...next.completedRegionIds,
      ...(payload.completedRegionIds ?? event.completedRegionIds ?? []),
    ]);
  }

  if (Array.isArray(payload.weakRegionIds) || Array.isArray(event.weakRegionIds)) {
    next.weakRegionIds = toUniqueArray([
      ...next.weakRegionIds,
      ...(payload.weakRegionIds ?? event.weakRegionIds ?? []),
    ]);
  }

  if (typeof payload.readinessScore === "number" || typeof event.readinessScore === "number") {
    next.readinessScore = payload.readinessScore ?? event.readinessScore ?? next.readinessScore;
  }

  if (typeof payload.failRiskScore === "number" || typeof event.failRiskScore === "number") {
    next.failRiskScore = payload.failRiskScore ?? event.failRiskScore ?? next.failRiskScore;
  }

  if (payload.activeRegionId || event.activeRegionId) {
    next.activeRegionId = normalizeString(payload.activeRegionId ?? event.activeRegionId, next.activeRegionId);
  }

  if (payload.activeSubmapId || event.activeSubmapId) {
    next.activeSubmapId = normalizeString(payload.activeSubmapId ?? event.activeSubmapId, next.activeSubmapId);
  }

  if (payload.activeNodeId || event.activeNodeId) {
    next.activeNodeId = normalizeString(payload.activeNodeId ?? event.activeNodeId, next.activeNodeId);
  }

  if (payload.checkpointNodeId || event.checkpointNodeId) {
    next.checkpointNodeId = normalizeString(payload.checkpointNodeId ?? event.checkpointNodeId, next.checkpointNodeId);
  }

  return normalizeSessionRecord(next);
}

export function summarizeSessionRecord(session) {
  const current = normalizeSessionRecord(session);
  const completionRate = current.completedRegionIds.length > 0 ? 1 : 0;
  const accuracy = current.questionCount > 0 ? current.correctCount / current.questionCount : null;
  const wrongRate = current.questionCount > 0 ? current.wrongCount / current.questionCount : null;
  const recoveryRate = current.attemptCount > 0 ? current.reclaimCount / current.attemptCount : null;

  return {
    sessionId: current.sessionId,
    profileId: current.profileId,
    userId: current.userId,
    currentStage: current.currentStage,
    activeRegionId: current.activeRegionId,
    activeSubmapId: current.activeSubmapId,
    activeNodeId: current.activeNodeId,
    checkpointNodeId: current.checkpointNodeId,
    questionCount: current.questionCount,
    correctCount: current.correctCount,
    wrongCount: current.wrongCount,
    attemptCount: current.attemptCount,
    completionRate,
    accuracy,
    wrongRate,
    recoveryRate,
    readinessScore: current.readinessScore,
    failRiskScore: current.failRiskScore,
    weakRegionIds: current.weakRegionIds,
    readyForDashboard: Boolean(current.sessionId && (current.userId || current.profileId)),
  };
}
