import {
  applyRecoveryToConceptProgress,
  applySlipToConceptProgress,
  isCorruptedConceptProgress,
  isFragileConceptProgress,
  isLearnedOrBetterConceptProgress,
  isMasteredConceptProgress,
  normalizeConceptProgress,
} from "./state.mjs";

export const KNOWN_GROUND_STABILITY_THRESHOLD = 0.65;
export const KNOWN_GROUND_RECLAIM_BASE_DELAY_MS = 6_000;

function resolveTimestamp(clock = Date.now()) {
  if (clock instanceof Date) {
    return clock.getTime();
  }

  if (typeof clock === "string") {
    const parsed = Date.parse(clock);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }

  if (Number.isFinite(clock)) {
    return clock;
  }

  return Date.now();
}

export function isKnownGroundProgress(progress, threshold = KNOWN_GROUND_STABILITY_THRESHOLD) {
  const normalized = normalizeConceptProgress(progress);
  return isLearnedOrBetterConceptProgress(normalized) && normalized.stabilityScore >= threshold;
}

export function collectKnownGroundProgress(question, conceptProgressById = {}, threshold = KNOWN_GROUND_STABILITY_THRESHOLD) {
  const conceptIds = Array.isArray(question?.conceptIds) ? question.conceptIds : [];
  return conceptIds
    .map((conceptId) => ({
      conceptId,
      progress: normalizeConceptProgress(conceptProgressById[conceptId]),
    }))
    .filter(({ progress }) => isKnownGroundProgress(progress, threshold));
}

export function classifyKnownGroundSeverity(knownGroundProgressRecords, question = {}) {
  if (Array.isArray(question.trapIds) && question.trapIds.includes("known_ground_slip")) {
    return "severe";
  }

  if (
    knownGroundProgressRecords.some(({ progress }) => isMasteredConceptProgress(progress) && progress.stabilityScore >= 0.85)
  ) {
    return "severe";
  }

  if (knownGroundProgressRecords.some(({ progress }) => isMasteredConceptProgress(progress) || progress.stabilityScore >= 0.75)) {
    return "medium";
  }

  return "mild";
}

export function buildReclaimSchedule(trigger, { clock = Date.now(), delayMs = null } = {}) {
  const now = resolveTimestamp(clock);
  const severityDelay = {
    mild: 9_000,
    medium: 6_000,
    severe: 3_000,
  };

  const normalizedDelay = delayMs ?? severityDelay[trigger.severity] ?? KNOWN_GROUND_RECLAIM_BASE_DELAY_MS;

  return {
    id: `reclaim:${trigger.questionId}:${trigger.affectedConceptIds.join(",")}`,
    kind: "reclaim",
    status: "scheduled",
    reason: "known_ground_slip",
    questionId: trigger.questionId,
    conceptIds: [...trigger.affectedConceptIds],
    regionId: trigger.flashback.regionId,
    submapId: trigger.flashback.submapId ?? null,
    nodeId: trigger.flashback.nodeId ?? null,
    priority: trigger.severity === "severe" ? 3 : trigger.severity === "medium" ? 2 : 1,
    afterQuestions: trigger.severity === "severe" ? 1 : 2,
    dueAtMs: now + normalizedDelay,
    createdAtMs: now,
  };
}

export function enqueueReclaim(queue = [], reclaimItem) {
  return [...queue, reclaimItem].sort((left, right) => {
    if (left.dueAtMs !== right.dueAtMs) {
      return left.dueAtMs - right.dueAtMs;
    }

    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    return left.id.localeCompare(right.id);
  });
}

export function buildFlashbackCue(trigger, { regionTitle = "", submapTitle = "", nodeTitle = "" } = {}) {
  return {
    kind: "flashback",
    title: "Known ground slipping",
    message: "Known ground slipping. Reclaim the territory.",
    regionId: trigger.flashback.regionId,
    submapId: trigger.flashback.submapId ?? null,
    focusNodeId: trigger.flashback.nodeId ?? null,
    regionTitle,
    submapTitle,
    nodeTitle,
  };
}

export function evaluateKnownGroundSlip({
  question,
  conceptProgressById = {},
  wasCorrect,
  clock = Date.now(),
  stabilityThreshold = KNOWN_GROUND_STABILITY_THRESHOLD,
}) {
  if (!question || wasCorrect) {
    return null;
  }

  const knownGroundProgress = collectKnownGroundProgress(question, conceptProgressById, stabilityThreshold);
  if (knownGroundProgress.length === 0) {
    return null;
  }

  const severity = classifyKnownGroundSeverity(knownGroundProgress, question);
  const now = resolveTimestamp(clock);
  const affectedConceptIds = knownGroundProgress.map(({ conceptId }) => conceptId);
  const flashback = {
    regionId: question.flashbackRegionId ?? question.regionId ?? null,
    submapId: question.flashbackSubmapId ?? question.submapId ?? null,
    nodeId: question.flashbackNodeId ?? null,
  };

  return {
    kind: "known_ground_slip",
    triggered: true,
    questionId: question.id,
    severity,
    affectedConceptIds,
    flashback,
    stabilitySnapshot: knownGroundProgress.map(({ conceptId, progress }) => ({
      conceptId,
      masteryState: progress.masteryState,
      stabilityScore: progress.stabilityScore,
    })),
    reclaim: question.reclaimEligible === false ? null : buildReclaimSchedule({
      questionId: question.id,
      severity,
      affectedConceptIds,
      flashback,
    }, { clock: now }),
  };
}

export function applyKnownGroundSlipToProgress(conceptProgressById = {}, trigger, { clock = Date.now() } = {}) {
  const next = { ...conceptProgressById };
  const now = resolveTimestamp(clock);

  for (const conceptId of trigger.affectedConceptIds ?? []) {
    next[conceptId] = applySlipToConceptProgress(next[conceptId], {
      severity: trigger.severity,
      now,
    });
  }

  return next;
}

export function applyKnownGroundRecoveryToProgress(conceptProgressById = {}, trigger, { clock = Date.now() } = {}) {
  const next = { ...conceptProgressById };
  const now = resolveTimestamp(clock);

  for (const conceptId of trigger.affectedConceptIds ?? []) {
    next[conceptId] = applyRecoveryToConceptProgress(next[conceptId], {
      now,
      stabilityBoost: trigger.severity === "severe" ? 0.32 : 0.22,
    });
  }

  return next;
}

export function isKnownGroundSlipTrigger(trigger) {
  return Boolean(trigger && trigger.kind === "known_ground_slip" && trigger.triggered);
}

export function hasFragileOrCorruptedProgress(progress) {
  return isFragileConceptProgress(progress) || isCorruptedConceptProgress(progress);
}
