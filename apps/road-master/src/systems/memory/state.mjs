export function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

const DEFAULT_CONCEPT_PROGRESS = {
  masteryState: "new",
  learnedScore: 0,
  understoodScore: 0,
  comprehendedScore: 0,
  stabilityScore: 0,
  slipCount: 0,
  recoveryCount: 0,
  lastSeenAt: null,
  lastSlipAt: null,
  lastRecoveryAt: null,
};

export function normalizeConceptProgress(progress = {}) {
  return {
    ...DEFAULT_CONCEPT_PROGRESS,
    ...progress,
    masteryState: progress.masteryState ?? DEFAULT_CONCEPT_PROGRESS.masteryState,
    learnedScore: clamp01(progress.learnedScore ?? DEFAULT_CONCEPT_PROGRESS.learnedScore),
    understoodScore: clamp01(progress.understoodScore ?? DEFAULT_CONCEPT_PROGRESS.understoodScore),
    comprehendedScore: clamp01(progress.comprehendedScore ?? DEFAULT_CONCEPT_PROGRESS.comprehendedScore),
    stabilityScore: clamp01(progress.stabilityScore ?? DEFAULT_CONCEPT_PROGRESS.stabilityScore),
    slipCount: Number.isFinite(progress.slipCount) ? progress.slipCount : DEFAULT_CONCEPT_PROGRESS.slipCount,
    recoveryCount: Number.isFinite(progress.recoveryCount) ? progress.recoveryCount : DEFAULT_CONCEPT_PROGRESS.recoveryCount,
  };
}

export function createConceptProgress(progress = {}) {
  return normalizeConceptProgress(progress);
}

export function isFragileConceptProgress(progress) {
  return normalizeConceptProgress(progress).masteryState === "fragile";
}

export function isCorruptedConceptProgress(progress) {
  return normalizeConceptProgress(progress).masteryState === "corrupted";
}

export function isMasteredConceptProgress(progress) {
  return normalizeConceptProgress(progress).masteryState === "mastered";
}

export function isLearnedOrBetterConceptProgress(progress) {
  const masteryState = normalizeConceptProgress(progress).masteryState;
  return masteryState === "learned" || masteryState === "fragile" || masteryState === "mastered";
}

export function toFragileConceptProgress(progress, patch = {}) {
  const current = normalizeConceptProgress(progress);
  return {
    ...current,
    ...patch,
    masteryState: "fragile",
    learnedScore: clamp01(patch.learnedScore ?? current.learnedScore),
    understoodScore: clamp01(patch.understoodScore ?? current.understoodScore),
    comprehendedScore: clamp01(patch.comprehendedScore ?? current.comprehendedScore),
    stabilityScore: clamp01(
      patch.stabilityScore ?? current.stabilityScore - (patch.stabilityDrop ?? 0.18),
    ),
    slipCount: current.slipCount + 1,
    lastSlipAt: patch.now ?? current.lastSlipAt,
  };
}

export function toCorruptedConceptProgress(progress, patch = {}) {
  const current = normalizeConceptProgress(progress);
  return {
    ...current,
    ...patch,
    masteryState: "corrupted",
    learnedScore: clamp01(patch.learnedScore ?? current.learnedScore * 0.9),
    understoodScore: clamp01(patch.understoodScore ?? current.understoodScore * 0.85),
    comprehendedScore: clamp01(patch.comprehendedScore ?? current.comprehendedScore * 0.8),
    stabilityScore: clamp01(
      patch.stabilityScore ?? current.stabilityScore - (patch.stabilityDrop ?? 0.32),
    ),
    slipCount: current.slipCount + 1,
    lastSlipAt: patch.now ?? current.lastSlipAt,
  };
}

export function repairConceptProgress(progress, patch = {}) {
  const current = normalizeConceptProgress(progress);
  const nextStability = clamp01(current.stabilityScore + (patch.stabilityBoost ?? 0.22));

  let masteryState = current.masteryState;
  if (current.masteryState === "corrupted") {
    masteryState = nextStability >= 0.7 ? "learned" : "fragile";
  } else if (current.masteryState === "fragile") {
    masteryState = nextStability >= 0.8 ? "learned" : "fragile";
  } else if (current.masteryState === "learned" && nextStability >= 0.9) {
    masteryState = "mastered";
  }

  return {
    ...current,
    ...patch,
    masteryState,
    stabilityScore: nextStability,
    recoveryCount: current.recoveryCount + 1,
    lastRecoveryAt: patch.now ?? current.lastRecoveryAt,
  };
}

export function applySlipToConceptProgress(progress, { severity = "medium", now = null } = {}) {
  const current = normalizeConceptProgress(progress);
  const slipPatch = { now };

  if (current.masteryState === "corrupted") {
    return toCorruptedConceptProgress(current, {
      ...slipPatch,
      stabilityDrop: severity === "severe" ? 0.22 : 0.12,
    });
  }

  if (current.masteryState === "fragile" && severity !== "mild") {
    return toCorruptedConceptProgress(current, {
      ...slipPatch,
      stabilityDrop: severity === "severe" ? 0.28 : 0.2,
    });
  }

  if (current.masteryState === "mastered" && severity === "severe") {
    return toCorruptedConceptProgress(current, {
      ...slipPatch,
      stabilityDrop: 0.26,
    });
  }

  return toFragileConceptProgress(current, {
    ...slipPatch,
    stabilityDrop: severity === "severe" ? 0.24 : severity === "mild" ? 0.12 : 0.18,
  });
}

export function applyRecoveryToConceptProgress(progress, { now = null, stabilityBoost = 0.22 } = {}) {
  return repairConceptProgress(progress, { now, stabilityBoost });
}
