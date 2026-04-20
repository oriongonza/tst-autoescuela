import { advancePacingState, createPacingState, decidePacing } from "../pacing/index.mjs";
import { createCombatEncounter, getCombatSnapshot, resolveCombatTurn } from "./engine.mjs";

export function runCombatPacingSimulation({
  encounter: encounterConfig = {},
  attempts = [],
  pacing: pacingConfig = {},
} = {}) {
  let encounter = createCombatEncounter(encounterConfig);
  let pacing = createPacingState(pacingConfig);
  const trace = [];

  for (const attempt of attempts) {
    const before = getCombatSnapshot(encounter);
    const decision = decidePacing(before, pacing);
    const resolved = resolveCombatTurn(encounter, attempt, decision);

    encounter = resolved.encounter;

    const after = getCombatSnapshot(encounter);
    const pacingEvent = {
      kind: resolved.outcome.parried
        ? "parry"
        : attempt.correct
          ? "correct"
          : "wrong",
      failed: resolved.outcome.failed,
      recovered: resolved.outcome.retried,
      cleared: resolved.outcome.cleared,
      defused: resolved.outcome.defused,
      revenge: resolved.outcome.revengeTriggered,
      lessonKind: resolved.outcome.lessonCue?.lessonType ?? null,
    };

    const pacingAdvance = advancePacingState(pacing, pacingEvent, after);
    pacing = pacingAdvance.state;

    trace.push({
      before,
      decision,
      resolved,
      after,
      pacing: pacingAdvance.decision,
    });

    if (encounter.status === "cleared" || encounter.status === "failed") {
      break;
    }
  }

  return { encounter, pacing, trace };
}
