import { createNarrativeOracle } from "../systems/narrative/index.js";
import { createAudioDirector } from "../systems/audio/index.js";
import {
  buildDashboardSnapshot,
  deriveReadinessDiagnostics,
} from "../systems/analytics/index.mjs";
import {
  advancePacingState,
  createPacingState,
  decidePacing,
} from "../systems/pacing/index.mjs";
import {
  applySessionEvent,
  createSessionRecord,
  markOnboardingComplete,
  updateProfileRecord,
  touchSessionRecord,
} from "../systems/persistence/index.mjs";
import {
  applyKnownGroundRecoveryToProgress,
  applyKnownGroundSlipToProgress,
  applySlipToConceptProgress,
  buildFlashbackCue,
  enqueueReclaim,
  evaluateKnownGroundSlip,
  normalizeConceptProgress,
  createConceptProgress,
} from "../systems/memory/index.mjs";
import { repairConceptProgress } from "../systems/memory/state.mjs";
import {
  createCombatEncounter,
  getCombatSnapshot,
  resolveCombatTurn,
} from "../systems/combat/index.mjs";
import { buildMapView, createMapState } from "../systems/map/index.mjs";
import { loadContentCatalog } from "../content/index.mjs";
import { TELEMETRY_EVENT_BY_NAME } from "../systems/telemetry/catalog.mjs";
import { DEFAULT_PACK_ID, loadRoadMasterRuntime } from "./chapter1.js";
import {
  buildCohortBaseline,
  buildRunMetrics,
  createExperienceRecords,
  deriveStageFromState,
  loadBrowserExperience,
  saveBrowserExperience,
} from "./experience.js";
import { renderRoadMasterApp } from "../ui/shell.js";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Road Master root element not found.");
}

let runtime;
let narrative;
let state;

const DEFAULT_PLAYER_ID = "guest-road-master";
const MAX_TELEMETRY_EVENTS = 300;

const audio = createAudioDirector(() => {
  if (!state) {
    return;
  }

  state = {
    ...state,
    audioStatus: audio.getStatus(),
  };

  sync();
});

function cloneProgressMap(progressById = {}) {
  if (typeof structuredClone === "function") {
    return structuredClone(progressById);
  }

  return JSON.parse(JSON.stringify(progressById));
}

function createLoadingMarkup(title, detail) {
  return `
    <div class="shell shell--title">
      <main class="stage">
        <section class="hero card">
          <div class="hero__copy">
            <p class="eyebrow">Road Master</p>
            <h1>${escapeHtml(title)}</h1>
            <p class="hero__lead">${escapeHtml(detail)}</p>
          </div>
        </section>
      </main>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createTelemetryState() {
  return {
    sessionId: createSessionId(),
    playerId: DEFAULT_PLAYER_ID,
    startedAtMs: Date.now(),
    events: [],
    mapOpened: false,
    openedSubmapIds: [],
    lastNodeId: null,
    lastQuestionIdShown: null,
    questionShownAtMs: null,
    bossEntered: false,
    bossAttemptNumber: 0,
    sessionStarted: false,
  };
}

function appendTelemetryEvent(name, payload = {}) {
  if (!state?.telemetry) {
    return null;
  }

  const definition = TELEMETRY_EVENT_BY_NAME[name];
  const atMs = Date.now();
  const event = {
    name,
    group: definition?.group ?? "unknown",
    ...payload,
  };
  const sessionRecord = state.sessionRecord
    ? applySessionEvent(state.sessionRecord, {
        name,
        atMs,
        ...payload,
        payload,
      })
    : null;

  state = {
    ...state,
    telemetry: {
      ...state.telemetry,
      events: [...state.telemetry.events, event].slice(-MAX_TELEMETRY_EVENTS),
    },
    sessionRecord: sessionRecord ?? state.sessionRecord,
  };

  return event;
}

function patchTelemetry(patch = {}) {
  if (!state?.telemetry) {
    return;
  }

  state = {
    ...state,
    telemetry: {
      ...state.telemetry,
      ...patch,
    },
  };
}

function recordSessionStarted() {
  if (!state?.telemetry || state.telemetry.sessionStarted) {
    return;
  }

  appendTelemetryEvent("session_started", {
    sessionId: state.telemetry.sessionId,
    playerId: state.telemetry.playerId,
    startedAt: new Date(state.telemetry.startedAtMs).toISOString(),
    entryPoint: "browser",
    appVersion: runtime?.foundation?.product?.version ?? "0.1.0",
  });
  patchTelemetry({ sessionStarted: true });
}

function syncDerivedTelemetry(previousState = null) {
  if (!state?.telemetry || state.phase !== "campaign") {
    return;
  }

  const telemetry = state.telemetry;
  const now = Date.now();
  const currentNode = state.currentRouteNode ?? null;
  const currentQuestion = state.currentQuestion ?? null;

  if (!telemetry.mapOpened) {
    appendTelemetryEvent("map_opened", {
      sessionId: telemetry.sessionId,
      regionId: runtime.mapDefinition.region.id,
      openedAt: new Date(now).toISOString(),
    });
    patchTelemetry({ mapOpened: true });
  }

  if (currentNode?.id && telemetry.lastNodeId !== currentNode.id) {
    appendTelemetryEvent("node_opened", {
      sessionId: telemetry.sessionId,
      nodeId: currentNode.id,
      nodeType: currentNode.type,
      openedAt: new Date(now).toISOString(),
      regionId: currentNode.regionId ?? runtime.mapDefinition.region.id,
      submapId: currentNode.submapId ?? null,
    });
    patchTelemetry({ lastNodeId: currentNode.id });
  }

  if (currentQuestion?.submapId && !telemetry.openedSubmapIds.includes(currentQuestion.submapId)) {
    appendTelemetryEvent("submap_opened", {
      sessionId: telemetry.sessionId,
      submapId: currentQuestion.submapId,
      regionId: currentQuestion.regionId ?? runtime.mapDefinition.region.id,
      openedAt: new Date(now).toISOString(),
      parentNodeId: currentNode?.id ?? null,
    });
    patchTelemetry({
      openedSubmapIds: [...telemetry.openedSubmapIds, currentQuestion.submapId],
    });
  }

  if (currentQuestion?.id && telemetry.lastQuestionIdShown !== currentQuestion.id) {
    const shownAt = new Date(now).toISOString();
    const trapIds = [currentQuestion.trapId].filter(Boolean);

    appendTelemetryEvent("question_shown", {
      sessionId: telemetry.sessionId,
      questionId: currentQuestion.id,
      conceptIds: currentQuestion.conceptIds ?? [],
      trapIds,
      attackTier: currentQuestion.attackTier ?? 1,
      shownAt,
      regionId: currentQuestion.regionId ?? runtime.mapDefinition.region.id,
      submapId: currentQuestion.submapId ?? null,
      bossId: currentQuestion.arc === "boss" ? runtime.boss?.id ?? null : null,
      paceState: state.currentPaceState ?? "flow",
    });
    appendTelemetryEvent("attack_shown", {
      sessionId: telemetry.sessionId,
      attackId: `attack:${currentQuestion.id}`,
      questionId: currentQuestion.id,
      attackTier: currentQuestion.attackTier ?? 1,
      attackType:
        currentQuestion.arc === "reclaim"
          ? "anti_trap"
          : currentQuestion.arc === "boss"
            ? "mixed"
            : "knowledge",
      shownAt,
      bossId: currentQuestion.arc === "boss" ? runtime.boss?.id ?? null : null,
      phase: state.currentPhaseName ?? currentQuestion.arc ?? "gate",
    });
    patchTelemetry({
      lastQuestionIdShown: currentQuestion.id,
      questionShownAtMs: now,
    });
  }

  if (
    previousState?.currentPaceState &&
    previousState.currentPaceState !== state.currentPaceState
  ) {
    appendTelemetryEvent("pace_state_changed", {
      sessionId: telemetry.sessionId,
      previousState: previousState.currentPaceState,
      nextState: state.currentPaceState,
      changedAt: new Date(now).toISOString(),
      reason: `phase:${state.currentPhaseName ?? "gate"}`,
      questionsSinceRelief: state.streak ?? 0,
    });
  }

  if (state.currentPhaseName === "boss" && !telemetry.bossEntered) {
    const attemptNumber = telemetry.bossAttemptNumber + 1;

    appendTelemetryEvent("boss_entered", {
      sessionId: telemetry.sessionId,
      bossId: runtime.boss?.id ?? runtime.encounterConfig?.bossId ?? "boss",
      regionId: runtime.mapDefinition.region.id,
      enteredAt: new Date(now).toISOString(),
      attemptNumber,
      hp: state.encounter.hp,
    });
    appendTelemetryEvent("boss_attempted", {
      sessionId: telemetry.sessionId,
      bossId: runtime.boss?.id ?? runtime.encounterConfig?.bossId ?? "boss",
      regionId: runtime.mapDefinition.region.id,
      attemptNumber,
      attemptedAt: new Date(now).toISOString(),
      hp: state.encounter.hp,
      bossPhase: state.bossPhaseLabel ?? "False lead",
    });
    patchTelemetry({
      bossEntered: true,
      bossAttemptNumber: attemptNumber,
    });
  }

  if (
    state.currentPhaseName === "boss" &&
    previousState?.bossPhaseLabel &&
    previousState.bossPhaseLabel !== state.bossPhaseLabel
  ) {
    appendTelemetryEvent("boss_phase_changed", {
      sessionId: telemetry.sessionId,
      bossId: runtime.boss?.id ?? runtime.encounterConfig?.bossId ?? "boss",
      previousPhase: previousState.bossPhaseLabel,
      nextPhase: state.bossPhaseLabel,
      changedAt: new Date(now).toISOString(),
      hp: state.encounter.hp,
      reason: "phase_transition",
    });
  }
}

function persistExperience() {
  if (!state?.profile || !state?.sessionRecord) {
    return;
  }

  saveBrowserExperience({
    selectedPackId: state.selectedPackId,
    profile: state.profile,
    session: state.sessionRecord,
  });
}

function refreshExperienceState() {
  if (!runtime || !state?.profile || !state?.sessionRecord) {
    return;
  }

  const diagnostics = deriveReadinessDiagnostics({
    session: state.sessionRecord,
    profile: state.profile,
    mapDefinition: runtime.mapDefinition,
    conceptProgressById: state.conceptProgressById,
    events: state.telemetry?.events ?? [],
  });
  const nextProfile = updateProfileRecord(state.profile, {
    lastSessionId: state.sessionRecord.sessionId,
    lastRegionId: runtime.mapDefinition.region.id,
    lastSubmapId: state.currentQuestion?.submapId ?? null,
    lastNodeId: state.currentRouteNode?.id ?? null,
    weakRegionIds: diagnostics.weakScopeIds,
    readinessScore: diagnostics.readinessScore,
    failRiskScore: diagnostics.failRiskScore,
    masteredRegionIds:
      state.phase === "victory"
        ? [...(state.profile.masteredRegionIds ?? []), runtime.mapDefinition.region.id]
        : state.profile.masteredRegionIds,
    now: Date.now(),
  });
  const nextSession = touchSessionRecord(state.sessionRecord, {
    currentStage: deriveStageFromState(state),
    activeRegionId: runtime.mapDefinition.region.id,
    activeSubmapId: state.currentQuestion?.submapId ?? null,
    activeNodeId: state.currentRouteNode?.id ?? null,
    checkpointNodeId: state.checkpointNodeId ?? null,
    weakRegionIds: diagnostics.weakScopeIds,
    readinessScore: diagnostics.readinessScore,
    failRiskScore: diagnostics.failRiskScore,
    now: Date.now(),
  });
  const runMetrics = buildRunMetrics(
    {
      ...state,
      profile: nextProfile,
      sessionRecord: nextSession,
    },
    runtime,
  );
  const social = {
    shareCard: narrative.shareCard(runMetrics),
    ghostRun: narrative.ghostRun(runMetrics),
    cohortComparison: narrative.cohortComparison(
      runMetrics,
      buildCohortBaseline(runMetrics, diagnostics),
      { cohortLabel: "Road Master cohort" },
    ),
  };
  const dashboard = buildDashboardSnapshot({
    sessions: [nextSession],
    profiles: [nextProfile],
    events: state.telemetry?.events ?? [],
    mapDefinition: runtime.mapDefinition,
    conceptProgressById: state.conceptProgressById,
  });

  state = {
    ...state,
    profile: nextProfile,
    sessionRecord: nextSession,
    diagnostics,
    dashboard,
    social,
    onboarding: {
      pending: !nextProfile.onboardingComplete,
      step: nextProfile.onboardingStep,
    },
  };

  persistExperience();
}

function createStoryNode(chapter, question, routeNode) {
  const conceptId = Array.isArray(question.conceptIds) ? question.conceptIds[0] : null;

  return {
    kind: question.arc === "boss" ? "boss" : question.arc === "reclaim" ? "submap" : "road",
    title: routeNode?.title ?? chapter.region,
    prompts: [
      {
        concept: chapter.conceptsById[conceptId]?.name ?? conceptId ?? question.prompt,
      },
    ],
  };
}

function buildPromptFeedback(chapter, question) {
  const explanation = chapter.explanationsById[question.explanationId];
  const trap = chapter.trapsById[question.trapId];
  const analogy = chapter.analogiesById[question.analogyId];
  const lines = [];

  if (explanation?.body?.length) {
    lines.push(explanation.body.join(" "));
  } else if (explanation?.summary) {
    lines.push(explanation.summary);
  }
  if (trap?.summary) {
    lines.push(trap.summary);
  }
  if (trap?.countermeasure) {
    lines.push(`Countermeasure: ${trap.countermeasure}`);
  }
  if (analogy?.memoryHook) {
    lines.push(`Hook: ${analogy.memoryHook}`);
  }

  return {
    title: explanation?.title ?? "Answer logged",
    detail: lines.join(" ") || question.prompt,
  };
}

function createInitialState(chapter, options = {}) {
  const encounter = createCombatEncounter(chapter.encounterConfig);
  const progressById = cloneProgressMap(chapter.seedConceptProgressById);

  return {
    phase: "title",
    encounter,
    pacing: createPacingState(),
    conceptProgressById: progressById,
    mapState: createMapState({
      activeScopeId: chapter.mapDefinition.region.id,
      activeNodeId: chapter.route[0],
      visibleNodeIds: [chapter.route[0]],
      unlockedNodeIds: [chapter.route[0]],
      conceptProgressById: progressById,
      visibleScopeIds: [chapter.mapDefinition.region.id],
      unlockedScopeIds: [chapter.mapDefinition.region.id],
    }),
    mapView: buildMapView(chapter.mapDefinition, {
      activeScopeId: chapter.mapDefinition.region.id,
      activeNodeId: chapter.route[0],
      visibleNodeIds: [chapter.route[0]],
      unlockedNodeIds: [chapter.route[0]],
      conceptProgressById: progressById,
      maxVisibilityDepth: 2,
    }),
    questionIndex: 0,
    selectedNodeId: chapter.route[0],
    activeNodeId: chapter.route[0],
    currentRouteNode: chapter.mapIndex.main.nodesById.get(chapter.route[0]) ?? null,
    currentQuestion: chapter.questions[0] ?? null,
    currentStoryNode: chapter.questions[0]
      ? createStoryNode(chapter, chapter.questions[0], chapter.mapIndex.main.nodesById.get(chapter.route[0]) ?? null)
      : null,
    currentPromptMeta: chapter.questions[0]
      ? {
          trap: chapter.trapsById[chapter.questions[0].trapId] ?? null,
          analogy: chapter.analogiesById[chapter.questions[0].analogyId] ?? null,
          explanation: chapter.explanationsById[chapter.questions[0].explanationId] ?? null,
          knownMistake: Boolean(chapter.questions[0].knownMistake),
          phaseName: chapter.getPhaseNameByQuestionIndex(0),
        }
      : null,
    checkpointEncounter: createCombatEncounter(encounter),
    checkpointProgressById: cloneProgressMap(progressById),
    checkpointQuestionIndex: 0,
    checkpointNodeId: chapter.route[0],
    pendingAdvance: false,
    lastChoiceIndex: null,
    pendingKnownGroundTrigger: null,
    reclaimQueue: [],
    feedback: {
      tone: "neutral",
      title: "Chapter loaded",
      detail: `Enter ${chapter.chapter ?? "the chapter"} to begin the campaign.`,
    },
    flashback: null,
    feed: narrative.intro(),
    cues: [],
    mistakes: 0,
    streak: 0,
    shareText: chapter.shareCard,
    audioEnabled: false,
    audioStatus: audio.getStatus(),
    readiness: 0,
    pressure: 0,
    momentum: 0,
    bossPhaseLabel: encounter.phasePlan[0]?.name ?? "False lead",
    currentPaceState: "flow",
    currentPacingMetrics: {
      frustration: 0,
      hpRatio: 1,
    },
    combatSnapshot: getCombatSnapshot(encounter),
    currentPhaseIndex: 0,
    currentPhaseName: "gate",
    telemetry: createTelemetryState(),
    packCatalog: options.packCatalog ?? [],
    selectedPackId: options.selectedPackId ?? DEFAULT_PACK_ID,
    profile: options.profile ?? null,
    sessionRecord: options.sessionRecord ?? null,
    diagnostics: null,
    dashboard: null,
    social: null,
    onboarding: {
      pending: !(options.profile?.onboardingComplete ?? false),
      step: options.profile?.onboardingStep ?? "welcome",
    },
  };
}

function updateSceneAudio(scene) {
  audio.setScene(scene);
  state = {
    ...state,
    audioStatus: audio.getStatus(),
  };
}

function playCue(name) {
  try {
    audio.playCue(name);
  } catch (error) {
    void error;
  }
}

function appendFeed(lines) {
  state = {
    ...state,
    feed: [...state.feed, ...lines].slice(-10),
  };
}

function appendCue(name, label) {
  state = {
    ...state,
    cues: [...state.cues, { name, label }].slice(-8),
  };
}

function resetFeedback(title, detail, tone = "neutral") {
  state = {
    ...state,
    feedback: { tone, title, detail },
  };
}

function refreshDerivedState() {
  if (!runtime || !state) {
    return;
  }

  const previousState = state;

  const questionIndex = Math.min(
    runtime.questions.length - 1,
    Math.max(0, state.questionIndex),
  );
  const currentQuestion = runtime.questions[questionIndex] ?? runtime.questions[0] ?? null;
  const routeIndex = runtime.getRouteIndexForQuestionIndex(questionIndex);
  const activeNodeId = runtime.route[routeIndex] ?? runtime.route[0];
  const currentRouteNode = runtime.mapIndex.main.nodesById.get(activeNodeId) ?? null;
  const selectedRouteNode =
    runtime.mapIndex.main.nodesById.get(state.selectedNodeId ?? activeNodeId) ?? currentRouteNode;
  const currentPhaseIndex = runtime.getPhaseIndexForQuestionIndex(questionIndex);
  const currentPhaseName = runtime.arcOrder[currentPhaseIndex] ?? currentQuestion?.arc ?? "gate";
  const mapState = createMapState({
    ...state.mapState,
    activeScopeId: runtime.mapDefinition.region.id,
    activeNodeId,
    visibleNodeIds: runtime.route.slice(0, routeIndex + 1),
    unlockedNodeIds: runtime.route.slice(0, routeIndex + 1),
    masteredNodeIds: runtime.route.slice(0, routeIndex),
    conceptProgressById: state.conceptProgressById,
    visibleScopeIds: routeIndex >= 5
      ? [runtime.mapDefinition.region.id, runtime.mapDefinition.submaps[0].id]
      : [runtime.mapDefinition.region.id],
    unlockedScopeIds: routeIndex >= 5
      ? [runtime.mapDefinition.region.id, runtime.mapDefinition.submaps[0].id]
      : [runtime.mapDefinition.region.id],
  });
  const mapView = buildMapView(runtime.mapDefinition, {
    ...mapState,
    conceptProgressById: state.conceptProgressById,
    activeScopeId: runtime.mapDefinition.region.id,
    activeNodeId,
    maxVisibilityDepth: 2,
  });
  const combatSnapshot = getCombatSnapshot(state.encounter);
  const pacingDecision = decidePacing(combatSnapshot, state.pacing);
  const readiness = Math.round(
    (combatSnapshot.turnIndex / Math.max(1, combatSnapshot.clearThreshold)) * 100,
  );
  const pressure = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        34 +
          pacingDecision.metrics.frustration * 45 +
          (1 - combatSnapshot.hp / combatSnapshot.maxHp) * 35 +
          state.mistakes * 3,
      ),
    ),
  );
  const momentum = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        16 + (state.encounter.rewardTotal ?? 0) * 1.8 + state.streak * 7 + readiness * 0.3 - state.mistakes * 5,
      ),
    ),
  );

  state = {
    ...state,
    questionIndex,
    currentQuestion,
    currentRouteNode,
    activeNodeId,
    selectedRouteNode,
    mapState,
    mapView,
    combatSnapshot,
    pacingDecision,
    readiness,
    pressure,
    momentum,
    bossPhaseLabel: combatSnapshot.bossPhaseName,
    currentPaceState: pacingDecision.paceState,
    currentPacingMetrics: pacingDecision.metrics,
    currentStoryNode: currentQuestion ? createStoryNode(runtime, currentQuestion, currentRouteNode) : null,
    currentPromptMeta: currentQuestion
      ? {
          trap: runtime.trapsById[currentQuestion.trapId] ?? null,
          analogy: runtime.analogiesById[currentQuestion.analogyId] ?? null,
          explanation: runtime.explanationsById[currentQuestion.explanationId] ?? null,
          knownMistake: Boolean(currentQuestion.knownMistake),
          phaseName: currentPhaseName,
        }
      : null,
    currentPhaseIndex,
    currentPhaseName,
  };

  syncDerivedTelemetry(previousState);
  refreshExperienceState();
}

function promoteQuestionConcepts(question, now) {
  const next = { ...state.conceptProgressById };
  const conceptIds = Array.isArray(question.conceptIds) ? question.conceptIds : [];

  for (const conceptId of conceptIds) {
    const current = normalizeConceptProgress(next[conceptId]);
    if (current.masteryState === "new") {
      next[conceptId] = createConceptProgress({
        masteryState: "learned",
        learnedScore: 0.72,
        understoodScore: 0.68,
        comprehendedScore: 0.62,
        stabilityScore: 0.78,
        lastSeenAt: new Date(now).toISOString(),
      });
      continue;
    }

    next[conceptId] = repairConceptProgress(current, {
      now,
      stabilityBoost: question.knownMistake ? 0.14 : 0.1,
    });
  }

  return next;
}

function applyQuestionSlip(question, now, trigger) {
  const conceptIds = Array.isArray(question.conceptIds) ? question.conceptIds : [];
  const severity =
    question.difficulty === "boss"
      ? "severe"
      : question.difficulty === "pressure"
        ? "medium"
        : "mild";
  let next = { ...state.conceptProgressById };

  for (const conceptId of conceptIds) {
    next[conceptId] = applySlipToConceptProgress(next[conceptId], { severity, now });
  }

  if (trigger) {
    next = applyKnownGroundSlipToProgress(next, trigger, { clock: now });
  }

  return next;
}

function buildTelegraph(question, pacingDecision) {
  const tiers = ["light", "medium", "heavy", "critical"];
  const baseIndex = Math.max(0, Math.min(3, (question.attackTier ?? 1) - 1));

  if (pacingDecision.paceState === "danger" || pacingDecision.paceState === "repair") {
    return tiers[Math.min(3, baseIndex + 1)];
  }

  if (pacingDecision.paceState === "recovery") {
    return tiers[Math.max(0, baseIndex - 1)];
  }

  return tiers[baseIndex];
}

function saveCheckpoint(questionIndex) {
  state = {
    ...state,
    checkpointEncounter: createCombatEncounter(state.encounter),
    checkpointProgressById: cloneProgressMap(state.conceptProgressById),
    checkpointQuestionIndex: questionIndex,
    checkpointNodeId: runtime.route[runtime.getRouteIndexForQuestionIndex(questionIndex)] ?? runtime.route[0],
  };
}

function enterChapter() {
  if (state.phase !== "title") {
    return;
  }

  if (state.onboarding?.pending) {
    completeOnboarding();
  }

  state = {
    ...state,
    phase: "campaign",
    questionIndex: 0,
    pendingAdvance: false,
    lastChoiceIndex: null,
    pendingKnownGroundTrigger: null,
    flashback: null,
  };
  updateSceneAudio("campaign");
  appendFeed(narrative.start());
  appendCue("title", "Chapter ignition");
  playCue("title");
  refreshDerivedState();
  sync();
}

function finishChapter() {
  const defeatedAt = new Date().toISOString();

  state = {
    ...state,
    phase: "victory",
    pendingAdvance: false,
    lastChoiceIndex: null,
    pendingKnownGroundTrigger: null,
    flashback: null,
    selectedNodeId: runtime.route[runtime.route.length - 1] ?? state.selectedNodeId,
    feedback: {
      tone: "victory",
      title: "Crossing Fields conquered",
      detail: "The Beast fell to structure, not luck.",
    },
    shareText: runtime.shareCard,
  };
  appendFeed(narrative.victory());
  appendCue("victory", "Chapter clear");
  updateSceneAudio("victory");
  playCue("victory");
  appendTelemetryEvent("boss_defeated", {
    sessionId: state.telemetry.sessionId,
    bossId: runtime.boss?.id ?? runtime.encounterConfig?.bossId ?? "boss",
    regionId: runtime.mapDefinition.region.id,
    defeatedAt,
    attemptNumber: state.telemetry.bossAttemptNumber || 1,
    hpRemaining: state.encounter.hp,
    clearTimeSeconds: Math.round((Date.now() - state.telemetry.startedAtMs) / 1000),
  });
  appendTelemetryEvent("region_conquered", {
    sessionId: state.telemetry.sessionId,
    regionId: runtime.mapDefinition.region.id,
    conqueredAt: defeatedAt,
    bossId: runtime.boss?.id ?? runtime.encounterConfig?.bossId ?? "boss",
    attemptNumber: state.telemetry.bossAttemptNumber || 1,
    clearTimeSeconds: Math.round((Date.now() - state.telemetry.startedAtMs) / 1000),
  });
  refreshDerivedState();
  sync();
}

function markFailure(reason) {
  const failedAt = new Date().toISOString();

  state = {
    ...state,
    phase: "failure",
    pendingAdvance: false,
    lastChoiceIndex: null,
    flashback: null,
    pendingKnownGroundTrigger: null,
    feedback: {
      tone: "failure",
      title: "Retry from the checkpoint",
      detail: reason,
    },
    selectedNodeId: state.checkpointNodeId ?? state.selectedNodeId,
  };
  appendFeed(narrative.failure());
  appendCue("repair", "Repair path");
  updateSceneAudio("failure");
  playCue("repair");
  appendTelemetryEvent("run_failed", {
    sessionId: state.telemetry.sessionId,
    regionId: runtime.mapDefinition.region.id,
    failedAt,
    reason,
    bossId: runtime.boss?.id ?? runtime.encounterConfig?.bossId ?? "boss",
    hp: state.encounter.hp,
    phase: state.currentPhaseName ?? "gate",
  });
  if (state.currentPhaseName === "boss" || state.telemetry.bossEntered) {
    appendTelemetryEvent("boss_failed", {
      sessionId: state.telemetry.sessionId,
      bossId: runtime.boss?.id ?? runtime.encounterConfig?.bossId ?? "boss",
      regionId: runtime.mapDefinition.region.id,
      failedAt,
      attemptNumber: state.telemetry.bossAttemptNumber || 1,
      reason,
      hp: state.encounter.hp,
    });
  }
  refreshDerivedState();
  sync();
}

function replayFromCheckpoint() {
  state = {
    ...state,
    phase: "campaign",
    encounter: createCombatEncounter(state.checkpointEncounter),
    pacing: createPacingState(),
    conceptProgressById: cloneProgressMap(state.checkpointProgressById),
    questionIndex: state.checkpointQuestionIndex,
    selectedNodeId: state.checkpointNodeId,
    pendingAdvance: false,
    lastChoiceIndex: null,
    pendingKnownGroundTrigger: null,
    flashback: null,
    reclaimQueue: [],
    feedback: {
      tone: "repair",
      title: "Checkpoint restored",
      detail: `Returned to ${runtime.mapIndex.main.nodesById.get(state.checkpointNodeId)?.title ?? runtime.region}.`,
    },
    telemetry: {
      ...state.telemetry,
      bossEntered: false,
    },
  };
  appendCue("repair", "Checkpoint restore");
  updateSceneAudio(state.checkpointNodeId === runtime.route[runtime.route.length - 1] ? "boss" : "campaign");
  playCue("repair");
  refreshDerivedState();
  sync();
}

function toggleAudio() {
  const nextEnabled = !state.audioEnabled;
  state = {
    ...state,
    audioEnabled: nextEnabled,
  };

  if (nextEnabled) {
    void audio.unlock();
    audio.toggleMute(false);
    playCue("title");
  } else {
    audio.toggleMute(true);
  }

  state = {
    ...state,
    audioStatus: audio.getStatus(),
  };
  sync();
}

function completeOnboarding() {
  if (!state?.profile || state.profile.onboardingComplete) {
    return;
  }

  const now = Date.now();
  state = {
    ...state,
    profile: markOnboardingComplete(state.profile, {
      lastSessionId: state.sessionRecord?.sessionId ?? null,
      lastRegionId: runtime.mapDefinition.region.id,
      now,
    }),
  };
  appendTelemetryEvent("onboarding_completed", {
    sessionId: state.sessionRecord?.sessionId ?? state.telemetry?.sessionId ?? null,
    profileId: state.profile.profileId,
    completedAt: new Date(now).toISOString(),
  });
  refreshExperienceState();
  sync();
}

async function switchPack(packId) {
  const targetPackId = typeof packId === "string" && packId.length > 0 ? packId : DEFAULT_PACK_ID;
  const previousProfile = state?.profile ?? null;
  const previousCatalog = state?.packCatalog ?? [];
  const audioEnabled = state?.audioEnabled ?? false;

  root.innerHTML = createLoadingMarkup(
    "Switching chapter",
    "Loading the selected content pack, map projection, and runtime contracts.",
  );

  const nextRuntime = await loadRoadMasterRuntime(targetPackId);
  runtime = nextRuntime;
  narrative = createNarrativeOracle(runtime);

  const sessionRecord = createSessionRecord({
    profileId: previousProfile?.profileId ?? null,
    userId: previousProfile?.userId ?? DEFAULT_PLAYER_ID,
    appVersion: runtime.foundation?.product?.version ?? "0.1.0",
    activeRegionId: runtime.mapDefinition.region.id,
    currentStage: "boot",
    now: Date.now(),
  });

  state = createInitialState(runtime, {
    packCatalog: previousCatalog,
    selectedPackId: targetPackId,
    profile: previousProfile,
    sessionRecord,
  });
  state.audioEnabled = audioEnabled;
  state.audioStatus = audio.getStatus();

  if (audioEnabled) {
    audio.toggleMute(false);
  }

  recordSessionStarted();
  refreshDerivedState();
  sync();
}

function focusNode(nodeId) {
  const node = runtime.mapIndex.main.nodesById.get(nodeId);
  if (!node) {
    return;
  }

  state = {
    ...state,
    selectedNodeId: nodeId,
    feedback: {
      tone: node.type === "boss" ? "danger" : "neutral",
      title: node.title,
      detail: node.flavor || node.summary || node.type,
    },
  };
  appendTelemetryEvent("node_opened", {
    sessionId: state.telemetry.sessionId,
    nodeId: node.id,
    nodeType: node.type,
    openedAt: new Date().toISOString(),
    regionId: node.regionId ?? runtime.mapDefinition.region.id,
    submapId: node.submapId ?? null,
  });
  refreshDerivedState();
  sync();
}

function shareVictory() {
  const text =
    state.social?.shareCard?.shareText ??
    `${runtime.shareCard} (${state.mistakes} mistakes, ${state.encounter.hp} HP left, ${state.cues.length} cues).`;
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
  }
  state = {
    ...state,
    shareText: text,
  };
  appendFeed([{ speaker: "System", tone: "share", text: "Victory card copied to the clipboard." }]);
  sync();
}

function advanceAfterAnswer({ reclaimed = false } = {}) {
  if (!state.pendingAdvance || state.phase !== "campaign") {
    return;
  }

  const answeredQuestion = state.currentQuestion;
  const answeredRouteIndex = runtime.getRouteIndexForQuestionIndex(state.questionIndex);
  const nextQuestionIndex = state.encounter.turnIndex;
  let nextProgress = state.conceptProgressById;

  if (reclaimed && state.pendingKnownGroundTrigger) {
    const succeededAt = new Date().toISOString();

    nextProgress = applyKnownGroundRecoveryToProgress(nextProgress, state.pendingKnownGroundTrigger, {
      clock: Date.now(),
    });
    state = {
      ...state,
      reclaimQueue: state.reclaimQueue.filter((item) => item.id !== state.pendingKnownGroundTrigger.reclaim?.id),
    };
    appendFeed([
      {
        speaker: "System",
        tone: "memory",
        text: "Known ground reclaimed.",
      },
    ]);
    appendCue("flashback", "Reclaim");
    playCue("flashback");
    for (const conceptId of state.pendingKnownGroundTrigger.affectedConceptIds ?? []) {
      appendTelemetryEvent("reclaim_succeeded", {
        sessionId: state.telemetry.sessionId,
        conceptId,
        succeededAt,
        regionId: state.pendingKnownGroundTrigger.flashback?.regionId ?? runtime.mapDefinition.region.id,
        submapId: state.pendingKnownGroundTrigger.flashback?.submapId ?? null,
        questionId: state.pendingKnownGroundTrigger.questionId,
      });
    }
  }

  if (state.encounter.status === "cleared" || nextQuestionIndex >= runtime.questions.length) {
    state = {
      ...state,
      conceptProgressById: nextProgress,
    };
    finishChapter();
    return;
  }

  const nextQuestion = runtime.questions[nextQuestionIndex];
  const nextRouteIndex = runtime.getRouteIndexForQuestionIndex(nextQuestionIndex);

  if (nextRouteIndex !== answeredRouteIndex) {
    const clearedNode = runtime.mapIndex.main.nodesById.get(runtime.route[answeredRouteIndex]);
    if (clearedNode) {
      appendFeed(narrative.clear(createStoryNode(runtime, answeredQuestion, clearedNode)));
    }
    saveCheckpoint(nextQuestionIndex);
  }

  state = {
    ...state,
    conceptProgressById: nextProgress,
    questionIndex: nextQuestionIndex,
    pendingAdvance: false,
    lastChoiceIndex: null,
    pendingKnownGroundTrigger: null,
    flashback: null,
    feedback: {
      tone: "progress",
      title: nextQuestion ? runtime.explanationsById[nextQuestion.explanationId]?.title ?? nextQuestion.prompt : "Advance",
      detail: nextQuestion ? nextQuestion.prompt : "Continue the chapter.",
    },
    selectedNodeId: runtime.route[nextRouteIndex] ?? state.selectedNodeId,
  };

  const previousArc = answeredQuestion?.arc ?? null;
  const nextArc = nextQuestion?.arc ?? null;
  if (nextArc === "boss" && previousArc !== "boss") {
    appendFeed(narrative.bossIntro());
    appendCue("boss", "Boss enters");
    updateSceneAudio("boss");
    playCue("boss");
  } else {
    updateSceneAudio(nextArc === "boss" ? "boss" : "campaign");
  }

  refreshDerivedState();
  sync();
}

function answerChoice(choiceIndex) {
  if (state.phase !== "campaign" || state.pendingAdvance) {
    return;
  }

  const question = state.currentQuestion;
  if (!question) {
    return;
  }

  const now = Date.now();
  const questionShownAtMs = state.telemetry?.questionShownAtMs ?? now;
  const before = getCombatSnapshot(state.encounter);
  const pacingDecision = decidePacing(before, state.pacing);
  const telegraph = buildTelegraph(question, pacingDecision);
  const isCorrect = choiceIndex === question.answerIndex;
  const resolved = resolveCombatTurn(
    state.encounter,
    { telegraph, correct: isCorrect },
    pacingDecision,
  );
  const after = getCombatSnapshot(resolved.encounter);
  const pacingAdvance = advancePacingState(
    state.pacing,
    {
      kind: isCorrect ? "correct" : "wrong",
      failed: resolved.outcome.failed,
      recovered: resolved.outcome.retried,
      cleared: resolved.outcome.cleared,
    },
    after,
  );
  const trigger = isCorrect
    ? null
    : evaluateKnownGroundSlip({
        question,
        conceptProgressById: state.conceptProgressById,
        wasCorrect: false,
        clock: now,
      });

  let nextProgress = isCorrect
    ? promoteQuestionConcepts(question, now)
    : applyQuestionSlip(question, now, trigger);

  if (trigger) {
    nextProgress = applyKnownGroundSlipToProgress(nextProgress, trigger, { clock: now });
  }

  appendTelemetryEvent("answer_submitted", {
    sessionId: state.telemetry.sessionId,
    questionId: question.id,
    selectedIndex: choiceIndex,
    submittedAt: new Date(now).toISOString(),
    timeToAnswerMs: Math.max(0, now - questionShownAtMs),
    inputMode: "mouse",
  });
  appendTelemetryEvent("answer_evaluated", {
    sessionId: state.telemetry.sessionId,
    questionId: question.id,
    correct: isCorrect,
    selectedIndex: choiceIndex,
    correctIndex: question.answerIndex,
    conceptIds: question.conceptIds ?? [],
    trapIds: [question.trapId].filter(Boolean),
    explanationId: question.explanationId ?? null,
  });
  appendTelemetryEvent("attack_resolved", {
    sessionId: state.telemetry.sessionId,
    questionId: question.id,
    damageTaken: resolved.outcome.damage,
    hpBefore: before.hp,
    hpAfter: after.hp,
    attackTier: question.attackTier ?? 1,
    paceState: pacingDecision.paceState,
    wasCritical: telegraph === "critical",
  });
  if (before.hp !== after.hp) {
    appendTelemetryEvent("hp_changed", {
      sessionId: state.telemetry.sessionId,
      hpBefore: before.hp,
      hpAfter: after.hp,
      changedAt: new Date(now).toISOString(),
      sourceEvent: "attack_resolved",
    });
  }

  state = {
    ...state,
    encounter: resolved.encounter,
    pacing: pacingAdvance.state,
    conceptProgressById: nextProgress,
    pendingAdvance: !resolved.outcome.failed,
    lastChoiceIndex: choiceIndex,
    mistakes: isCorrect ? state.mistakes : state.mistakes + 1,
    streak: isCorrect ? state.streak + 1 : 0,
    feedback: isCorrect
      ? {
          tone: "correct",
          title: buildPromptFeedback(runtime, question).title,
          detail: buildPromptFeedback(runtime, question).detail,
        }
      : trigger
        ? {
            tone: "memory",
            title: "Known ground slipping",
            detail: `${buildPromptFeedback(runtime, question).detail} Reclaim due after ${trigger.reclaim?.afterQuestions ?? 0} question(s).`,
          }
        : {
            tone: "wrong",
            title: buildPromptFeedback(runtime, question).title,
            detail: buildPromptFeedback(runtime, question).detail,
          },
    flashback: trigger
      ? {
          ...buildFlashbackCue(trigger, {
            regionTitle: runtime.region,
            submapTitle: runtime.submap,
            nodeTitle: state.currentRouteNode?.title ?? runtime.region,
          }),
          reclaim: trigger.reclaim,
        }
      : null,
    pendingKnownGroundTrigger: trigger,
    reclaimQueue: trigger?.reclaim ? enqueueReclaim(state.reclaimQueue, trigger.reclaim) : state.reclaimQueue,
  };

  appendFeed(
    isCorrect
      ? narrative.correct(state.questionIndex, 0, createStoryNode(runtime, question, state.currentRouteNode))
      : narrative.wrong(state.questionIndex, 0, createStoryNode(runtime, question, state.currentRouteNode)),
  );
  appendCue(isCorrect ? "correct" : "wrong", isCorrect ? "Correct answer" : "Wrong answer");
  playCue(isCorrect ? "correct" : "wrong");

  if (trigger) {
    appendTelemetryEvent("flashback_triggered", {
      sessionId: state.telemetry.sessionId,
      conceptIds: trigger.affectedConceptIds,
      regionId: trigger.flashback?.regionId ?? runtime.mapDefinition.region.id,
      triggeredAt: new Date(now).toISOString(),
      reason: "known_ground_slip",
      submapId: trigger.flashback?.submapId ?? null,
      trapIds: [question.trapId].filter(Boolean),
      reclaimQuestionId: trigger.reclaim?.questionId ?? trigger.questionId,
    });
    for (const conceptId of trigger.affectedConceptIds ?? []) {
      appendTelemetryEvent("reclaim_scheduled", {
        sessionId: state.telemetry.sessionId,
        conceptId,
        scheduledAt: new Date(now).toISOString(),
        regionId: trigger.flashback?.regionId ?? runtime.mapDefinition.region.id,
        submapId: trigger.flashback?.submapId ?? null,
        questionId: trigger.questionId,
      });
    }
    appendFeed(narrative.flashback(createStoryNode(runtime, question, state.currentRouteNode)));
    appendCue("flashback", "Known ground");
    playCue("flashback");
  }

  if (resolved.outcome.failed) {
    markFailure("The run collapsed before the Beast did.");
    return;
  }

  refreshDerivedState();
  if (resolved.outcome.cleared) {
    finishChapter();
    return;
  }

  sync();
}

function continueFromAnswer() {
  advanceAfterAnswer({ reclaimed: Boolean(state.pendingKnownGroundTrigger) });
}

function reclaimGround() {
  advanceAfterAnswer({ reclaimed: true });
}

function restartChapter() {
  const audioEnabled = state?.audioEnabled ?? false;
  state = createInitialState(runtime, {
    packCatalog: state?.packCatalog ?? [],
    selectedPackId: state?.selectedPackId ?? DEFAULT_PACK_ID,
    profile: state?.profile ?? null,
    sessionRecord: createSessionRecord({
      profileId: state?.profile?.profileId ?? null,
      userId: state?.profile?.userId ?? DEFAULT_PLAYER_ID,
      appVersion: runtime.foundation?.product?.version ?? "0.1.0",
      activeRegionId: runtime.mapDefinition.region.id,
      currentStage: "boot",
      now: Date.now(),
    }),
  });
  state.audioEnabled = audioEnabled;
  state.audioStatus = audio.getStatus();
  updateSceneAudio("title");
  appendCue("title", "Restart chapter");
  recordSessionStarted();
  sync();
}

function goToTitle() {
  restartChapter();
}

function handleAction(action, payload) {
  switch (action) {
    case "start-chapter":
      enterChapter();
      break;
    case "toggle-audio":
      toggleAudio();
      break;
    case "complete-onboarding":
      completeOnboarding();
      break;
    case "select-pack":
      void switchPack(payload.packId);
      return;
    case "focus-node":
      focusNode(payload.nodeId);
      break;
    case "answer-choice":
      answerChoice(payload.choiceIndex);
      break;
    case "continue":
      continueFromAnswer();
      break;
    case "reclaim-ground":
      reclaimGround();
      break;
    case "retry-checkpoint":
      replayFromCheckpoint();
      break;
    case "restart-chapter":
      restartChapter();
      break;
    case "return-title":
      goToTitle();
      break;
    case "play-cue":
      appendCue(payload.cue, payload.label);
      playCue(payload.cue);
      sync();
      break;
    case "share-card":
      shareVictory();
      break;
    default:
      break;
  }

  refreshDerivedState();
  sync();
}

function sync() {
  if (!runtime || !state) {
    return;
  }

  root.dataset.phase = state.phase;
  root.dataset.scene =
    state.phase === "campaign" && (state.currentPhaseName === "boss" || state.currentPhaseName === "reclaim")
      ? "boss"
      : state.phase;
  root.dataset.arc = state.currentQuestion?.arc ?? "title";
  root.innerHTML = renderRoadMasterApp(state, runtime);
}

root.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || !root.contains(button)) {
    return;
  }

  const payload = {
    nodeId: button.dataset.nodeId,
    packId: button.dataset.packId,
    choiceIndex:
      button.dataset.choiceIndex !== undefined ? Number(button.dataset.choiceIndex) : undefined,
    cue: button.dataset.cue,
    label: button.dataset.label,
  };

  handleAction(button.dataset.action, payload);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state?.phase && state.phase !== "title") {
    handleAction("return-title", {});
  }
});

async function boot() {
  try {
    root.innerHTML = createLoadingMarkup(
      "Loading Road Master",
      "Opening the content catalog, contracts, map graph, and combat loop.",
    );
    const browserExperience = loadBrowserExperience();
    const catalog = await loadContentCatalog();
    const selectedPackId = browserExperience?.selectedPackId ?? DEFAULT_PACK_ID;
    const experience = createExperienceRecords({
      savedProfile: browserExperience?.profile,
      savedSession: browserExperience?.session,
      selectedPackId,
      now: Date.now(),
    });

    runtime = await loadRoadMasterRuntime(selectedPackId);
    narrative = createNarrativeOracle(runtime);
    state = createInitialState(runtime, {
      packCatalog: catalog.packs ?? [],
      selectedPackId,
      profile: experience.profile,
      sessionRecord: createSessionRecord({
        ...experience.session,
        activeRegionId: runtime.mapDefinition.region.id,
        currentStage: "boot",
        now: Date.now(),
      }),
    });
    recordSessionStarted();
    refreshDerivedState();
    sync();
  } catch (error) {
    console.error(error?.stack || error);
    root.innerHTML = createLoadingMarkup(
      "Failed to load Road Master",
      "The browser runner could not start the selected chapter. Check the console for details.",
    );
  }
}

void boot();
