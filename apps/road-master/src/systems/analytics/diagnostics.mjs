import { buildMapIndex } from "../map/graph.mjs";
import { normalizeProfileRecord } from "../persistence/profile.mjs";
import { summarizeSessionRecord } from "../persistence/session.mjs";
import { normalizeConceptProgress } from "../memory/state.mjs";
import { averageBy, countBy, groupBy, sumBy } from "./queries.mjs";

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function toPercent(value) {
  return Math.round(clamp01(value) * 100);
}

function toIdList(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

const WEAKNESS_BY_STATE = {
  new: 0.58,
  learned: 0.28,
  fragile: 0.74,
  mastered: 0.08,
  corrupted: 0.96,
  known_mistake: 0.84,
};

export function scoreConceptWeakness(progress) {
  const current = normalizeConceptProgress(progress);
  const base = WEAKNESS_BY_STATE[current.masteryState] ?? 0.5;
  const stabilityPenalty = 1 - current.stabilityScore;
  const learningPenalty = 1 - current.learnedScore;
  const understandingPenalty = 1 - current.understoodScore;
  const slipPenalty = Math.min(0.12, (Number.isFinite(current.slipCount) ? current.slipCount : 0) * 0.025);

  return clamp01(
    base * 0.58 +
      stabilityPenalty * 0.22 +
      learningPenalty * 0.12 +
      understandingPenalty * 0.06 +
      slipPenalty,
  );
}

function collectScopeConceptIds(nodes = []) {
  const conceptIds = [];

  for (const node of Array.isArray(nodes) ? nodes : []) {
    for (const conceptId of node.conceptIds ?? []) {
      if (typeof conceptId === "string" && conceptId.length > 0) {
        conceptIds.push(conceptId);
      }
    }
  }

  return toIdList(conceptIds);
}

function summarizeScopeDiagnostics(scope, conceptProgressById = {}) {
  const conceptIds = collectScopeConceptIds(scope.nodes);
  const conceptProgress = conceptIds.map((conceptId) => normalizeConceptProgress(conceptProgressById[conceptId]));
  const weaknessScores = conceptProgress.map((progress) => scoreConceptWeakness(progress));
  const averageWeakness = weaknessScores.length > 0 ? averageBy(weaknessScores, (value) => value) ?? 0 : 0;
  const weakConceptIds = conceptIds.filter((conceptId, index) => weaknessScores[index] >= 0.45);
  const fragileConceptIds = conceptIds.filter((conceptId) => normalizeConceptProgress(conceptProgressById[conceptId]).masteryState === "fragile");
  const corruptedConceptIds = conceptIds.filter((conceptId) => normalizeConceptProgress(conceptProgressById[conceptId]).masteryState === "corrupted");
  const masteredConceptIds = conceptIds.filter((conceptId) => normalizeConceptProgress(conceptProgressById[conceptId]).masteryState === "mastered");
  const readyConceptCount = conceptProgress.filter((progress) => progress.masteryState === "learned" || progress.masteryState === "mastered").length;
  const readinessScore = conceptIds.length > 0 ? 1 - averageWeakness : 0.5;
  const failRiskScore = conceptIds.length > 0
    ? clamp01(averageWeakness * 0.8 + (corruptedConceptIds.length / conceptIds.length) * 0.15 + (fragileConceptIds.length / conceptIds.length) * 0.05)
    : 0;

  return {
    scopeId: scope.id,
    scopeType: scope.scopeType,
    title: scope.title,
    conceptCount: conceptIds.length,
    readyConceptCount,
    weakConceptCount: weakConceptIds.length,
    fragileConceptCount: fragileConceptIds.length,
    corruptedConceptCount: corruptedConceptIds.length,
    masteredConceptCount: masteredConceptIds.length,
    weakConceptIds,
    fragileConceptIds,
    corruptedConceptIds,
    masteredConceptIds,
    averageWeakness,
    readinessScore: toPercent(readinessScore),
    failRiskScore: toPercent(failRiskScore),
  };
}

export function deriveWeakRegionDiagnostics({ mapDefinition, conceptProgressById = {}, session = null, profile = null } = {}) {
  if (!mapDefinition) {
    return {
      scopeSummaries: [],
      weakScopeIds: [],
      weakRegionIds: [],
      weakSubmapIds: [],
      dominantWeakScopeId: null,
      dominantWeakScopeTitle: null,
      sessionStage: summarizeSessionRecord(session).currentStage ?? null,
      sessionReadinessScore: summarizeSessionRecord(session).readinessScore ?? null,
      sessionFailRiskScore: summarizeSessionRecord(session).failRiskScore ?? null,
    };
  }

  const mapIndex = buildMapIndex(mapDefinition);
  const scopeSummaries = [
    summarizeScopeDiagnostics({
      id: mapDefinition.region.id,
      scopeType: "region",
      title: mapDefinition.region.title,
      nodes: mapIndex.main.nodes,
    }, conceptProgressById),
    ...(mapDefinition.submaps ?? []).map((submap) =>
      summarizeScopeDiagnostics({
        id: submap.id,
        scopeType: "submap",
        title: submap.title,
        nodes: submap.nodes,
      }, conceptProgressById)),
  ].sort((left, right) => right.averageWeakness - left.averageWeakness || right.conceptCount - left.conceptCount);

  const weakScopeSummaries = scopeSummaries.filter((scope) => scope.averageWeakness >= 0.35 || scope.weakConceptCount > 0);
  const sessionSummary = summarizeSessionRecord(session);

  return {
    scopeSummaries,
    weakScopeIds: weakScopeSummaries.map((scope) => scope.scopeId),
    weakRegionIds: weakScopeSummaries.filter((scope) => scope.scopeType === "region").map((scope) => scope.scopeId),
    weakSubmapIds: weakScopeSummaries.filter((scope) => scope.scopeType === "submap").map((scope) => scope.scopeId),
    dominantWeakScopeId: scopeSummaries[0]?.scopeId ?? null,
    dominantWeakScopeTitle: scopeSummaries[0]?.title ?? null,
    sessionStage: sessionSummary.currentStage,
    sessionReadinessScore: sessionSummary.readinessScore,
    sessionFailRiskScore: sessionSummary.failRiskScore,
    profileId: profile?.profileId ?? null,
  };
}

export function deriveReadinessDiagnostics({
  session = null,
  profile = null,
  mapDefinition = null,
  conceptProgressById = {},
  events = [],
} = {}) {
  const sessionSummary = summarizeSessionRecord(session);
  const profileRecord = normalizeProfileRecord(profile);
  const weakRegionDiagnostics = deriveWeakRegionDiagnostics({
    mapDefinition,
    conceptProgressById,
    session,
    profile,
  });
  const conceptProgress = Object.values(conceptProgressById ?? {}).map((progress) => normalizeConceptProgress(progress));
  const conceptReadiness = conceptProgress.length > 0
    ? 1 - (averageBy(conceptProgress, (progress) => scoreConceptWeakness(progress)) ?? 0)
    : 0.5;
  const scopeReadiness = weakRegionDiagnostics.scopeSummaries.length > 0
    ? 1 - (averageBy(weakRegionDiagnostics.scopeSummaries, (scope) => scope.averageWeakness) ?? 0)
    : 0.5;
  const sessionReadinessFromCounts = sessionSummary.questionCount > 0
    ? clamp01(
        (sessionSummary.accuracy ?? 0.5) * 0.6 +
          (sessionSummary.recoveryRate ?? 0) * 0.25 +
          (sessionSummary.completionRate ?? 0) * 0.15,
      )
    : 0.35;
  const sessionReadiness = Number.isFinite(sessionSummary.readinessScore)
    ? sessionSummary.readinessScore / 100
    : sessionReadinessFromCounts;
  const profileReadiness = profileRecord.onboardingComplete ? 1 : 0.3 + profileRecord.recursionBias * 0.1;
  const readinessScore = toPercent(
    Math.max(
      (conceptReadiness * 0.4) +
        (scopeReadiness * 0.2) +
        (sessionReadiness * 0.25) +
        (profileReadiness * 0.15),
      sessionReadiness,
    ),
  );
  const failRiskFromSession = Number.isFinite(sessionSummary.failRiskScore) ? sessionSummary.failRiskScore / 100 : 0;
  const failRiskScore = toPercent(
    Math.max(
      clamp01(
        (weakRegionDiagnostics.scopeSummaries[0]?.averageWeakness ?? 0) * 0.45 +
          (sessionSummary.wrongRate ?? 0.2) * 0.25 +
          Math.min(1, (sessionSummary.flashbackCount ?? 0) * 0.15) +
          (1 - profileRecord.challengeBias) * 0.15,
      ),
      failRiskFromSession,
    ),
  );
  const reasons = [];

  if (!profileRecord.onboardingComplete) {
    reasons.push("Onboarding incomplete");
  }

  if (weakRegionDiagnostics.weakScopeIds.length > 0) {
    reasons.push(`Weak scopes: ${weakRegionDiagnostics.weakScopeIds.join(", ")}`);
  }

  if (sessionSummary.questionCount > 0 && (sessionSummary.wrongRate ?? 0) >= 0.25) {
    reasons.push(`Wrong rate ${(sessionSummary.wrongRate * 100).toFixed(0)}%`);
  }

  if (sessionSummary.recoveryRate != null && sessionSummary.recoveryRate < 0.5) {
    reasons.push("Recovery loop is underused");
  }

  const recommendedStage = !profileRecord.onboardingComplete
    ? "campaign"
    : failRiskScore >= 70
      ? "repair"
      : readinessScore >= 82
        ? "boss"
        : weakRegionDiagnostics.weakScopeIds.length > 0
          ? "map"
          : "campaign";

  return {
    readinessScore,
    failRiskScore,
    recommendedStage,
    reasons,
    weakScopeIds: weakRegionDiagnostics.weakScopeIds,
    weakRegionIds: weakRegionDiagnostics.weakRegionIds,
    weakSubmapIds: weakRegionDiagnostics.weakSubmapIds,
    dominantWeakScopeId: weakRegionDiagnostics.dominantWeakScopeId,
    dominantWeakScopeTitle: weakRegionDiagnostics.dominantWeakScopeTitle,
    sessionSummary,
    profileId: profileRecord.profileId,
    eventCount: Array.isArray(events) ? events.length : 0,
  };
}

export function buildDashboardSnapshot({
  sessions = [],
  profiles = [],
  events = [],
  mapDefinition = null,
  conceptProgressById = {},
} = {}) {
  const sessionSummaries = (Array.isArray(sessions) ? sessions : []).map((session) => summarizeSessionRecord(session));
  const profileRecords = (Array.isArray(profiles) ? profiles : []).map((profile) => normalizeProfileRecord(profile));
  const readinessDiagnostics = deriveReadinessDiagnostics({
    session: sessionSummaries[0] ?? null,
    profile: profileRecords[0] ?? null,
    mapDefinition,
    conceptProgressById,
    events,
  });
  const stageCounts = countBy(sessionSummaries, (session) => session.currentStage);
  const eventCounts = countBy(events, (event) => event.name ?? event.kind ?? "unknown");
  const profileReadinessAverage = averageBy(profileRecords, (profile) => profile.readinessScore);
  const profileFailRiskAverage = averageBy(profileRecords, (profile) => profile.failRiskScore);
  const sessionReadinessAverage = averageBy(sessionSummaries, (session) => session.readinessScore);
  const sessionFailRiskAverage = averageBy(sessionSummaries, (session) => session.failRiskScore);
  const profileGroups = groupBy(profileRecords, (profile) => profile.onboardingComplete ? "onboarded" : "new");

  return {
    sessionCount: sessionSummaries.length,
    profileCount: profileRecords.length,
    eventCount: Array.isArray(events) ? events.length : 0,
    stageCounts,
    eventCounts,
    profileGroups,
    readinessDiagnostics,
    weakScopeIds: readinessDiagnostics.weakScopeIds,
    dominantWeakScopeId: readinessDiagnostics.dominantWeakScopeId,
    averageSessionReadinessScore: sessionReadinessAverage,
    averageSessionFailRiskScore: sessionFailRiskAverage,
    averageProfileReadinessScore: profileReadinessAverage,
    averageProfileFailRiskScore: profileFailRiskAverage,
    sessionIds: sessionSummaries.map((session) => session.sessionId).filter(Boolean),
    profileIds: profileRecords.map((profile) => profile.profileId).filter(Boolean),
    sessionSummaryByStage: sessionSummaries.reduce((acc, session) => {
      const stage = session.currentStage ?? "unknown";
      acc[stage] = acc[stage] ?? [];
      acc[stage].push(session);
      return acc;
    }, Object.create(null)),
    eventSummaryByName: Array.isArray(events) ? groupBy(events, (event) => event.name ?? event.kind ?? "unknown") : Object.create(null),
    topSessionStage: Object.entries(stageCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null,
  };
}
