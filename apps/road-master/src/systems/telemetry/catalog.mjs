import { deepFreeze, indexBy } from "../../core/contract-utils.mjs";
import { FOUNDATION_VERSION } from "../../core/types.mjs";
import { TELEMETRY_EVENT_NAMES } from "./events.mjs";

/**
 * @typedef {Object} TelemetryEventDefinition
 * @property {string} name
 * @property {string} group
 * @property {string} summary
 * @property {readonly string[]} requiredFields
 * @property {readonly string[]} optionalFields
 * @property {string} emittedBy
 */

export const TELEMETRY_EVENT_CATALOG = deepFreeze([
  {
    name: "session_started",
    group: "session",
    summary: "A player session begins.",
    requiredFields: ["sessionId", "playerId", "startedAt"],
    optionalFields: ["entryPoint", "appVersion"],
    emittedBy: "app bootstrap",
  },
  {
    name: "session_ended",
    group: "session",
    summary: "A player session ends.",
    requiredFields: ["sessionId", "playerId", "endedAt", "durationSeconds"],
    optionalFields: ["exitReason"],
    emittedBy: "session teardown",
  },
  {
    name: "map_opened",
    group: "navigation",
    summary: "The player opens the region map.",
    requiredFields: ["sessionId", "regionId", "openedAt"],
    optionalFields: ["submapId"],
    emittedBy: "map system",
  },
  {
    name: "node_opened",
    group: "navigation",
    summary: "The player opens a node on the map.",
    requiredFields: ["sessionId", "nodeId", "nodeType", "openedAt"],
    optionalFields: ["regionId", "submapId"],
    emittedBy: "map system",
  },
  {
    name: "submap_opened",
    group: "navigation",
    summary: "The player enters a recursive submap.",
    requiredFields: ["sessionId", "submapId", "regionId", "openedAt"],
    optionalFields: ["parentNodeId"],
    emittedBy: "map system",
  },
  {
    name: "question_shown",
    group: "combat",
    summary: "A question is shown as an attack telegraph.",
    requiredFields: ["sessionId", "questionId", "conceptIds", "trapIds", "attackTier", "shownAt"],
    optionalFields: ["regionId", "submapId", "bossId", "paceState"],
    emittedBy: "combat system",
  },
  {
    name: "attack_shown",
    group: "combat",
    summary: "A combat attack telegraph is visible to the player.",
    requiredFields: ["sessionId", "attackId", "questionId", "attackTier", "attackType", "shownAt"],
    optionalFields: ["bossId", "phase"],
    emittedBy: "combat system",
  },
  {
    name: "answer_submitted",
    group: "combat",
    summary: "The player submits an answer.",
    requiredFields: ["sessionId", "questionId", "selectedIndex", "submittedAt", "timeToAnswerMs"],
    optionalFields: ["inputMode"],
    emittedBy: "combat system",
  },
  {
    name: "answer_evaluated",
    group: "combat",
    summary: "The answer is scored against the question contract.",
    requiredFields: ["sessionId", "questionId", "correct", "selectedIndex", "correctIndex"],
    optionalFields: ["conceptIds", "trapIds", "explanationId"],
    emittedBy: "combat system",
  },
  {
    name: "attack_resolved",
    group: "combat",
    summary: "Damage or reward is applied after evaluation.",
    requiredFields: ["sessionId", "questionId", "damageTaken", "hpBefore", "hpAfter"],
    optionalFields: ["attackTier", "paceState", "wasCritical"],
    emittedBy: "combat system",
  },
  {
    name: "hp_changed",
    group: "combat",
    summary: "HP or shield changes after an action.",
    requiredFields: ["sessionId", "hpBefore", "hpAfter", "changedAt"],
    optionalFields: ["shieldBefore", "shieldAfter", "sourceEvent"],
    emittedBy: "combat or recovery system",
  },
  {
    name: "pace_state_changed",
    group: "progression",
    summary: "The run pacing state changes.",
    requiredFields: ["sessionId", "previousState", "nextState", "changedAt"],
    optionalFields: ["reason", "questionsSinceRelief"],
    emittedBy: "pacing system",
  },
  {
    name: "flashback_triggered",
    group: "memory",
    summary: "A known-ground slip reactivates spatial memory.",
    requiredFields: ["sessionId", "conceptIds", "regionId", "triggeredAt", "reason"],
    optionalFields: ["submapId", "trapIds", "reclaimQuestionId"],
    emittedBy: "memory system",
  },
  {
    name: "reclaim_scheduled",
    group: "memory",
    summary: "The system schedules a follow-up question to reclaim lost ground.",
    requiredFields: ["sessionId", "conceptId", "scheduledAt"],
    optionalFields: ["regionId", "submapId", "questionId"],
    emittedBy: "memory system",
  },
  {
    name: "reclaim_succeeded",
    group: "memory",
    summary: "A reclaim question restores stability.",
    requiredFields: ["sessionId", "conceptId", "succeededAt"],
    optionalFields: ["regionId", "submapId", "questionId"],
    emittedBy: "memory system",
  },
  {
    name: "boss_entered",
    group: "combat",
    summary: "The player enters a boss encounter.",
    requiredFields: ["sessionId", "bossId", "regionId", "enteredAt"],
    optionalFields: ["attemptNumber", "hp"],
    emittedBy: "boss system",
  },
  {
    name: "boss_attempted",
    group: "combat",
    summary: "The player makes a boss attempt.",
    requiredFields: ["sessionId", "bossId", "regionId", "attemptNumber", "attemptedAt"],
    optionalFields: ["hp", "bossPhase"],
    emittedBy: "boss system",
  },
  {
    name: "boss_phase_changed",
    group: "combat",
    summary: "The boss changes phase.",
    requiredFields: ["sessionId", "bossId", "previousPhase", "nextPhase", "changedAt"],
    optionalFields: ["hp", "reason"],
    emittedBy: "boss system",
  },
  {
    name: "boss_defeated",
    group: "combat",
    summary: "The boss is cleared.",
    requiredFields: ["sessionId", "bossId", "regionId", "defeatedAt", "attemptNumber"],
    optionalFields: ["hpRemaining", "clearTimeSeconds"],
    emittedBy: "boss system",
  },
  {
    name: "boss_failed",
    group: "combat",
    summary: "The boss fight ends in failure.",
    requiredFields: ["sessionId", "bossId", "regionId", "failedAt", "attemptNumber"],
    optionalFields: ["reason", "hp"],
    emittedBy: "boss system",
  },
  {
    name: "run_failed",
    group: "combat",
    summary: "The run ends before the player clears the gate.",
    requiredFields: ["sessionId", "regionId", "failedAt", "reason"],
    optionalFields: ["bossId", "hp", "phase"],
    emittedBy: "combat or pacing system",
  },
  {
    name: "region_conquered",
    group: "navigation",
    summary: "The player conquers the region after the boss clear.",
    requiredFields: ["sessionId", "regionId", "conqueredAt"],
    optionalFields: ["bossId", "attemptNumber", "clearTimeSeconds"],
    emittedBy: "region progression",
  },
]);

export const TELEMETRY_EVENT_BY_NAME = deepFreeze(indexBy(TELEMETRY_EVENT_CATALOG, "name", "telemetry events"));

export const TELEMETRY_EVENT_CATALOG_CONTEXT = deepFreeze({
  version: FOUNDATION_VERSION,
  eventCount: TELEMETRY_EVENT_NAMES.length,
  mandatorySignals: [
    "question shown",
    "answer submitted",
    "correctness",
    "time to answer",
    "concept ids",
    "trap ids",
    "attack tier",
    "damage taken",
    "hp before and after",
    "pace state",
    "flashback triggered",
    "reclaim success",
    "session start and end",
    "boss attempt",
    "boss clear or fail",
  ],
});
