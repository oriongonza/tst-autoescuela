import {
  createSessionRecord,
  deriveOnboardingDefaults,
  normalizeProfileRecord,
  normalizeSessionRecord,
} from "../systems/persistence/index.mjs";

export const ROAD_MASTER_STORAGE_KEY = "road-master.browser-state.v1";

export function loadBrowserExperience(storage = globalThis.localStorage) {
  if (!storage?.getItem) {
    return null;
  }

  try {
    const raw = storage.getItem(ROAD_MASTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Unable to load Road Master browser state.", error);
    return null;
  }
}

export function saveBrowserExperience(snapshot, storage = globalThis.localStorage) {
  if (!storage?.setItem) {
    return;
  }

  try {
    storage.setItem(ROAD_MASTER_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Unable to save Road Master browser state.", error);
  }
}

export function createExperienceRecords({
  savedProfile = null,
  savedSession = null,
  selectedPackId = "chapter-1-crossing-fields",
  appVersion = "0.1.0",
  now = Date.now(),
} = {}) {
  const savedProfileRecord = savedProfile ? normalizeProfileRecord(savedProfile) : null;
  const savedSessionRecord = savedSession ? normalizeSessionRecord(savedSession) : null;

  if (savedProfileRecord?.profileId) {
    return {
      profile: savedProfileRecord,
      session: savedSessionRecord?.sessionId
        ? normalizeSessionRecord(savedSessionRecord, {
            activeRegionId: savedSessionRecord.activeRegionId ?? selectedPackId,
          })
        : createSessionRecord({
            profileId: savedProfileRecord.profileId,
            userId: savedProfileRecord.userId,
            appVersion,
            activeRegionId: selectedPackId,
            currentStage: "boot",
            now,
          }),
    };
  }

  const fallbackId = `profile-${String(now).slice(-8)}`;
  return deriveOnboardingDefaults({
    profileId: fallbackId,
    userId: fallbackId,
    displayName: "Road Cadet",
    homeRegionId: selectedPackId,
    appVersion,
    now,
  });
}

export function deriveStageFromState(state) {
  if (!state) {
    return "boot";
  }

  if (state.phase === "victory") {
    return "conquest";
  }

  if (state.phase === "failure") {
    return "failed";
  }

  if (state.pendingKnownGroundTrigger || state.flashback) {
    return "flashback";
  }

  if (state.currentPhaseName === "boss") {
    return "boss";
  }

  if (state.phase === "campaign") {
    return "campaign";
  }

  return "boot";
}

export function buildRunMetrics(state, chapter) {
  const telemetryEvents = state?.telemetry?.events ?? [];
  const routeNodes = Array.isArray(chapter?.route) ? chapter.route.length : 0;
  const routeIndex = chapter?.route?.findIndex((nodeId) => nodeId === state?.currentRouteNode?.id) ?? -1;

  return {
    chapterTitle: chapter?.chapter ?? chapter?.title ?? "Road Master",
    regionTitle: chapter?.region ?? chapter?.title ?? "Unknown Region",
    playerName: state?.profile?.displayName ?? "Road Cadet",
    cohortLabel: "Road Master cohort",
    totalQuestions: chapter?.questions?.length ?? 0,
    correctCount: Math.max(0, (state?.sessionRecord?.correctCount ?? 0)),
    wrongCount: Math.max(0, state?.mistakes ?? state?.sessionRecord?.wrongCount ?? 0),
    questionsAnswered: telemetryEvents.filter((event) => event.name === "answer_submitted").length,
    routeNodes,
    clearedNodes: Math.max(0, routeIndex >= 0 ? routeIndex : 0),
    hpLeft: state?.encounter?.hp ?? 0,
    maxHp: state?.encounter?.maxHp ?? 100,
    rewardTotal: state?.encounter?.rewardTotal ?? 0,
    streak: state?.streak ?? 0,
    pressure: state?.pressure ?? 0,
    momentum: state?.momentum ?? 0,
    outcome:
      state?.phase === "victory"
        ? "victory"
        : state?.phase === "failure"
          ? "failure"
          : "live",
  };
}

export function buildCohortBaseline(runMetrics, diagnostics = null) {
  return {
    ...runMetrics,
    playerName: "Cohort average",
    correctCount: Math.max(0, Math.round((runMetrics.correctCount ?? 0) * 0.82)),
    wrongCount: Math.max(0, Math.round((runMetrics.wrongCount ?? 0) * 0.9)),
    hpLeft: Math.max(0, Math.round((runMetrics.hpLeft ?? 0) * 0.75)),
    rewardTotal: Math.max(0, Math.round((runMetrics.rewardTotal ?? 0) * 0.8)),
    pressure: Math.min(100, Math.round((runMetrics.pressure ?? 0) + 8)),
    momentum: Math.max(0, Math.round((runMetrics.momentum ?? 0) * 0.85)),
    routeNodes: runMetrics.routeNodes ?? 0,
    clearedNodes: Math.max(
      0,
      Math.min(
        runMetrics.routeNodes ?? 0,
        Math.round((runMetrics.clearedNodes ?? 0) * (diagnostics?.recommendedStage === "repair" ? 0.7 : 0.9)),
      ),
    ),
    cohortLabel: "Road Master cohort",
    outcome: diagnostics?.recommendedStage === "repair" ? "failure" : "ghost",
  };
}
