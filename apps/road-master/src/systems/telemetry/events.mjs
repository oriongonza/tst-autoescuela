import { deepFreeze } from "../../core/contract-utils.mjs";
import { FOUNDATION_VERSION } from "../../core/types.mjs";

/**
 * @typedef {'session_started' | 'session_ended' | 'map_opened' | 'node_opened' | 'submap_opened' | 'question_shown' | 'attack_shown' | 'answer_submitted' | 'answer_evaluated' | 'attack_resolved' | 'hp_changed' | 'pace_state_changed' | 'flashback_triggered' | 'reclaim_scheduled' | 'reclaim_succeeded' | 'boss_entered' | 'boss_attempted' | 'boss_phase_changed' | 'boss_defeated' | 'boss_failed' | 'run_failed' | 'region_conquered'} TelemetryEventName
 */

export const TELEMETRY_EVENT_NAMES = deepFreeze([
  "session_started",
  "session_ended",
  "map_opened",
  "node_opened",
  "submap_opened",
  "question_shown",
  "attack_shown",
  "answer_submitted",
  "answer_evaluated",
  "attack_resolved",
  "hp_changed",
  "pace_state_changed",
  "flashback_triggered",
  "reclaim_scheduled",
  "reclaim_succeeded",
  "boss_entered",
  "boss_attempted",
  "boss_phase_changed",
  "boss_defeated",
  "boss_failed",
  "run_failed",
  "region_conquered",
]);

export const TELEMETRY_EVENT_GROUPS = deepFreeze({
  session: ["session_started", "session_ended"],
  navigation: ["map_opened", "node_opened", "submap_opened", "region_conquered"],
  combat: [
    "question_shown",
    "attack_shown",
    "answer_submitted",
    "answer_evaluated",
    "attack_resolved",
    "hp_changed",
    "boss_entered",
    "boss_attempted",
    "boss_phase_changed",
    "boss_defeated",
    "boss_failed",
    "run_failed",
  ],
  memory: ["flashback_triggered", "reclaim_scheduled", "reclaim_succeeded"],
  progression: ["pace_state_changed"],
});

export const TELEMETRY_EVENT_CONTEXT = deepFreeze({
  version: FOUNDATION_VERSION,
  sourceOfTruth: "chatgpt_conv.md",
  note: "The catalog is intentionally small and structured so it can be logged from a static app without a build tool.",
});
