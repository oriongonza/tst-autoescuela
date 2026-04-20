import {
  buildFlashbackCue,
  collectKnownGroundProgress,
  evaluateKnownGroundSlip,
} from "./known-ground.mjs";

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function toIdList(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

export function deriveMemoryProgressionCue({
  question = null,
  conceptProgressById = {},
  regionTitle = "",
  submapTitle = "",
  nodeTitle = "",
  wasCorrect = false,
  clock = Date.now(),
} = {}) {
  const knownGroundProgress = collectKnownGroundProgress(question, conceptProgressById);
  const slip = evaluateKnownGroundSlip({
    question,
    conceptProgressById,
    wasCorrect,
    clock,
  });
  const severityWeight = {
    mild: 0.18,
    medium: 0.36,
    severe: 0.58,
  };
  const recursionDepth = question?.submapId ? 1 : 0;
  const knownGroundConceptIds = toIdList(knownGroundProgress.map(({ conceptId }) => conceptId));
  const memoryPressure = knownGroundConceptIds.length === 0
    ? 0
    : Math.round(
        clamp01(
          0.28 +
            knownGroundConceptIds.length * 0.12 +
            (severityWeight[slip?.severity ?? "mild"] ?? 0) +
            (recursionDepth > 0 ? 0.08 : 0),
        ) * 100,
      );

  return {
    kind: "memory_progression",
    triggered: Boolean(slip),
    severity: slip?.severity ?? "mild",
    recursionDepth,
    regionId: question?.regionId ?? null,
    submapId: question?.submapId ?? null,
    nodeId: question?.flashbackNodeId ?? null,
    knownGroundCount: knownGroundConceptIds.length,
    knownGroundConceptIds,
    memoryPressure,
    flashbackCue: slip ? buildFlashbackCue(slip, { regionTitle, submapTitle, nodeTitle }) : null,
    reclaimSchedule: slip?.reclaim ?? null,
    stabilitySnapshot: slip?.stabilitySnapshot ?? [],
  };
}
