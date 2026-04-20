import { deriveReadinessDiagnostics } from "../analytics/diagnostics.mjs";
import { normalizeProfileRecord } from "../persistence/profile.mjs";
import { summarizeSessionRecord } from "../persistence/session.mjs";

function toIdList(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function derivePersonalizationSignals({
  profile = null,
  session = null,
  diagnostics = null,
  mapDefinition = null,
  conceptProgressById = {},
  events = [],
} = {}) {
  const profileRecord = normalizeProfileRecord(profile);
  const sessionSummary = summarizeSessionRecord(session);
  const readiness = diagnostics ?? deriveReadinessDiagnostics({
    session,
    profile,
    mapDefinition,
    conceptProgressById,
    events,
  });
  const weakScopeIds = toIdList(readiness.weakScopeIds);
  const focusRegionIds = toIdList([
    profileRecord.homeRegionId,
    ...profileRecord.preferredRegionIds,
    ...weakScopeIds,
  ]);
  const recursionBias = clamp01(profileRecord.recursionBias);
  const challengeBias = clamp01(profileRecord.challengeBias);
  const memoryBias = clamp01(profileRecord.memoryBias);
  const readinessScore = readiness.readinessScore ?? 0;
  const failRiskScore = readiness.failRiskScore ?? 0;
  const recommendedRouteDepth = weakScopeIds.length > 0 || recursionBias >= 0.6 || readinessScore < 65 ? 2 : 1;
  const recommendedCueDensity = profileRecord.audioCuesEnabled
    ? failRiskScore >= 70
      ? "dense"
      : challengeBias >= 0.7
        ? "rich"
        : "balanced"
    : "minimal";

  return {
    profileId: profileRecord.profileId,
    sessionId: sessionSummary.sessionId,
    onboardingComplete: profileRecord.onboardingComplete,
    mentorVoiceMode: profileRecord.mentorVoiceMode,
    audioCuesEnabled: profileRecord.audioCuesEnabled,
    focusRegionIds,
    weakScopeIds,
    recommendedRouteDepth,
    recommendedCueDensity,
    shouldNarrateMentor: !profileRecord.onboardingComplete || readinessScore < 70,
    shouldNarrateBoss: readinessScore >= 70 && failRiskScore < 60,
    shouldSurfaceRecoveryCue: failRiskScore >= 50 || memoryBias >= 0.6,
    shouldSurfaceMemoryRecap: weakScopeIds.length > 0 || memoryBias >= 0.55,
    shouldSurfaceRouteRecap: recursionBias >= 0.5 || focusRegionIds.length > 1,
    shouldPrefetchBossPrep: readinessScore >= 80 && failRiskScore < 50,
    readinessScore,
    failRiskScore,
    narrativeTone: profileRecord.mentorVoiceMode,
    routeBias: challengeBias,
    memoryBias,
    recursionBias,
    recommendedStage: readiness.recommendedStage,
  };
}
