import assert from "node:assert/strict";
import test from "node:test";

import {
  createCombatEncounter,
  getCombatSnapshot,
  resolveCombatTurn,
  runCombatPacingSimulation,
} from "../../src/systems/combat/index.mjs";
import {
  advancePacingState,
  createPacingState,
  decidePacing,
} from "../../src/systems/pacing/index.mjs";
import {
  BOSS_PHASE_PLAN,
  COMBAT_PACING_RUN,
} from "./fixtures.mjs";

test("pacing state machine escalates deterministically across the vertical slice", () => {
  const baseState = createPacingState();

  assert.equal(
    decidePacing({
      hp: 100,
      maxHp: 100,
      questionsSinceRelief: 0,
      bossPhaseIndex: 0,
      clearThreshold: 6,
      turnIndex: 0,
      turnsRemaining: 6,
    }, baseState).paceState,
    "flow",
  );

  const afterWrong = advancePacingState(baseState, { kind: "wrong" }, {
    hp: 85,
    maxHp: 100,
    questionsSinceRelief: 1,
    bossPhaseIndex: 0,
    clearThreshold: 6,
    turnIndex: 1,
    turnsRemaining: 5,
  }).state;

  assert.equal(afterWrong.consecutiveWrongCount, 1);
  assert.equal(
    decidePacing({
      hp: 85,
      maxHp: 100,
      questionsSinceRelief: afterWrong.questionsSinceRelief,
      bossPhaseIndex: 0,
      clearThreshold: 6,
      turnIndex: 1,
      turnsRemaining: 5,
    }, afterWrong).paceState,
    "pressure",
  );

  const dangerState = advancePacingState(afterWrong, { kind: "wrong" }, {
    hp: 64,
    maxHp: 100,
    questionsSinceRelief: 2,
    bossPhaseIndex: 0,
    clearThreshold: 6,
    turnIndex: 2,
    turnsRemaining: 4,
  }).state;

  assert.equal(
    decidePacing({
      hp: 64,
      maxHp: 100,
      questionsSinceRelief: dangerState.questionsSinceRelief,
      bossPhaseIndex: 0,
      clearThreshold: 6,
      turnIndex: 2,
      turnsRemaining: 4,
    }, dangerState).paceState,
    "danger",
  );

  const recoveryState = advancePacingState(dangerState, { kind: "wrong" }, {
    hp: 28,
    maxHp: 100,
    questionsSinceRelief: 3,
    bossPhaseIndex: 1,
    clearThreshold: 6,
    turnIndex: 4,
    turnsRemaining: 2,
  }).state;

  assert.equal(
    decidePacing({
      hp: 28,
      maxHp: 100,
      questionsSinceRelief: recoveryState.questionsSinceRelief,
      bossPhaseIndex: 1,
      clearThreshold: 6,
      turnIndex: 4,
      turnsRemaining: 2,
    }, recoveryState).paceState,
    "recovery",
  );

  assert.equal(
    decidePacing({
      hp: 24,
      maxHp: 100,
      questionsSinceRelief: 0,
      bossPhaseIndex: 2,
      clearThreshold: 6,
      turnIndex: 5,
      turnsRemaining: 1,
    }, createPacingState({ consecutiveWrongCount: 0, questionsSinceRelief: 0 })).paceState,
    "clutch",
  );
});

test("combat resolution applies telegraphed damage, rewards, and retry logic", () => {
  const encounter = createCombatEncounter({
    kind: "boss",
    maxHp: 24,
    retriesAllowed: 1,
    bossPhasePlan: BOSS_PHASE_PLAN,
  });

  const correctTurn = resolveCombatTurn(encounter, { telegraph: "light", correct: true }, {
    policy: { damageMultiplier: 1, rewardMultiplier: 1 },
  });

  assert.equal(correctTurn.outcome.damage, 0);
  assert.ok(correctTurn.outcome.reward > 0);
  assert.equal(correctTurn.encounter.hp, 24);

  const punished = resolveCombatTurn(correctTurn.encounter, { telegraph: "critical", correct: false }, {
    policy: { damageMultiplier: 1.25, rewardMultiplier: 1 },
  });

  assert.equal(punished.outcome.damage, 25);
  assert.equal(punished.outcome.retried, true);
  assert.equal(punished.encounter.status, "active");
  assert.equal(punished.encounter.hp, 24);
  assert.equal(punished.encounter.turnIndex, 2);
  assert.equal(punished.outcome.phaseTransition.checkpointHp, 24);
});

test("integrated simulation produces phase transitions and a clean clear", () => {
  const run = runCombatPacingSimulation(COMBAT_PACING_RUN);

  assert.equal(run.encounter.status, "cleared");
  assert.ok(run.encounter.rewardTotal > 0);
  assert.ok(run.trace.length >= 6);

  const phaseTransitions = run.trace
    .map((step) => step.resolved.outcome.phaseTransition)
    .filter(Boolean);

  assert.equal(phaseTransitions.length >= 2, true);
  assert.deepEqual(phaseTransitions[0], {
    from: "opening pressure",
    to: "midgame pressure",
    checkpointTurn: 2,
    checkpointHp: 100,
  });

  const paceStates = run.trace.map((step) => step.pacing.paceState);
  assert.ok(paceStates.includes("recovery"));
  assert.ok(paceStates.includes("danger"));
});
