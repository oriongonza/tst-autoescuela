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
  buildContrastCase,
  buildLearningCue,
} from "../../src/systems/pedagogy/index.mjs";
import {
  BOSS_PHASE_PLAN,
  COMBAT_PACING_RUN,
  NONLINEAR_DAMAGE_CASES,
} from "./fixtures.mjs";

test("pedagogy helpers build contrast cases, anti-trap lessons, and analogy resurfacing", () => {
  const contrastCase = buildContrastCase({
    conceptTitle: "Right of way",
    trapLabel: "false obvious",
    correctAnswer: "yield to the sign",
    temptingAnswer: "trust the first car",
    analogyTitle: "traffic cop",
  });

  assert.equal(contrastCase.kind, "contrast_case");
  assert.match(contrastCase.summary, /trust the first car/);
  assert.match(contrastCase.contrast, /Right of way/);

  const cue = buildLearningCue({
    correct: false,
    question: {
      id: "q-contrast",
      prompt: "Who goes first at the crossroads?",
      conceptTitle: "Right of way",
      correctAnswer: "yield to the sign",
      temptingAnswer: "trust the first car",
      trapLabel: "false obvious",
      analogyTitle: "traffic cop",
    },
    attack: {
      telegraph: "trap",
      lessonTag: "anti-trap",
    },
    lesson: {
      conceptTitle: "Right of way",
      correctAnswer: "yield to the sign",
      temptingAnswer: "trust the first car",
      trapLabel: "false obvious",
      analogyTitle: "traffic cop",
    },
  });

  assert.equal(cue.kind, "learning_cue");
  assert.equal(cue.lessonType, "repair");
  assert.equal(cue.antiTrapMicroLesson.kind, "micro_lesson");
  assert.equal(cue.antiTrapMicroLesson.lessonType, "anti_trap");
  assert.equal(cue.analogyResurface.kind, "analogy_resurface");
});

test("shield, armor, and tempo make damage nonlinear while parries build tempo", () => {
  const highHpEncounter = createCombatEncounter(NONLINEAR_DAMAGE_CASES.highHp);
  const lowHpEncounter = createCombatEncounter(NONLINEAR_DAMAGE_CASES.lowHp);

  const highHpHit = resolveCombatTurn(
    highHpEncounter,
    { telegraph: "heavy", correct: false },
    { policy: { damageMultiplier: 1, rewardMultiplier: 1, shieldGainMultiplier: 1, tempoGainMultiplier: 1 } },
  );
  const lowHpHit = resolveCombatTurn(
    lowHpEncounter,
    { telegraph: "heavy", correct: false },
    { policy: { damageMultiplier: 1, rewardMultiplier: 1, shieldGainMultiplier: 1, tempoGainMultiplier: 1 } },
  );

  assert.ok(lowHpHit.outcome.hpLost > highHpHit.outcome.hpLost);
  assert.equal(highHpHit.outcome.damage > 0, true);
  assert.equal(lowHpHit.outcome.damage > highHpHit.outcome.damage, true);

  const tempoEncounter = createCombatEncounter(NONLINEAR_DAMAGE_CASES.tempoBoss);
  const parryTurn = resolveCombatTurn(
    tempoEncounter,
    {
      questionId: "q-parry",
      telegraph: "trap",
      correct: true,
      correctAnswer: "yield to the sign",
      temptingAnswer: "trust the obvious rule",
      conceptTitle: "Trap defuse",
      trapLabel: "false obvious",
      analogyTitle: "crossroads drill",
      nodeTitle: "Four-Way Labyrinth",
      lesson: {
        conceptTitle: "Trap defuse",
        correctAnswer: "yield to the sign",
        temptingAnswer: "trust the obvious rule",
        trapLabel: "false obvious",
        analogyTitle: "crossroads drill",
        nodeTitle: "Four-Way Labyrinth",
      },
    },
    { policy: { damageMultiplier: 1, rewardMultiplier: 1, shieldGainMultiplier: 1, tempoGainMultiplier: 1 } },
  );

  const tempoSnapshot = getCombatSnapshot(parryTurn.encounter);

  assert.equal(parryTurn.outcome.parried, true);
  assert.equal(parryTurn.outcome.defused, true);
  assert.ok(parryTurn.outcome.shieldRestored > 0);
  assert.equal(parryTurn.outcome.lessonCue.antiTrapMicroLesson.lessonType, "anti_trap");
  assert.equal(parryTurn.outcome.lessonCue.analogyResurface.kind, "analogy_resurface");
  assert.equal(tempoSnapshot.tempoState, "tempo");
  assert.ok(tempoSnapshot.tempoCombo >= 3);
});

test("retries arm revenge and pay off the rematch", () => {
  const openingEncounter = createCombatEncounter({
    kind: "boss",
    maxHp: 12,
    hp: 12,
    shield: 0,
    armor: 0,
    maxShield: 8,
    maxArmor: 4,
    retriesAllowed: 1,
    bossPhasePlan: BOSS_PHASE_PLAN,
  });

  const failedTurn = resolveCombatTurn(
    openingEncounter,
    {
      questionId: "boss-fall",
      telegraph: "critical",
      correct: false,
      correctAnswer: "check the sign first",
      temptingAnswer: "trust the first car",
      conceptTitle: "Known ground slip",
      trapLabel: "known ground slip",
      analogyTitle: "guard post",
      nodeTitle: "Crossing Fields",
      lesson: {
        conceptTitle: "Known ground slip",
        correctAnswer: "check the sign first",
        temptingAnswer: "trust the first car",
        trapLabel: "known ground slip",
        analogyTitle: "guard post",
        nodeTitle: "Crossing Fields",
      },
    },
    { policy: { damageMultiplier: 1.25, rewardMultiplier: 1, shieldGainMultiplier: 1, tempoGainMultiplier: 1 } },
  );

  assert.equal(failedTurn.outcome.retried, true);
  assert.equal(failedTurn.encounter.status, "active");
  assert.equal(failedTurn.encounter.revenge.active, true);
  assert.equal(failedTurn.encounter.revenge.targetQuestionId, "boss-fall");
  assert.ok(failedTurn.encounter.shield >= 4);

  const revengeTurn = resolveCombatTurn(
    failedTurn.encounter,
    {
      questionId: "boss-fall",
      telegraph: "critical",
      correct: true,
      correctAnswer: "check the sign first",
      temptingAnswer: "trust the first car",
      conceptTitle: "Known ground slip",
      trapLabel: "known ground slip",
      analogyTitle: "guard post",
      nodeTitle: "Crossing Fields",
      lesson: {
        conceptTitle: "Known ground slip",
        correctAnswer: "check the sign first",
        temptingAnswer: "trust the first car",
        trapLabel: "known ground slip",
        analogyTitle: "guard post",
        nodeTitle: "Crossing Fields",
      },
    },
    { policy: { damageMultiplier: 1, rewardMultiplier: 1, shieldGainMultiplier: 1, tempoGainMultiplier: 1 } },
  );

  const normalCorrect = resolveCombatTurn(
    createCombatEncounter({
      kind: "boss",
      maxHp: 12,
      hp: 12,
      shield: 0,
      armor: 0,
      maxShield: 8,
      maxArmor: 4,
      retriesAllowed: 0,
      bossPhasePlan: BOSS_PHASE_PLAN,
    }),
    {
      questionId: "boss-fall",
      telegraph: "critical",
      correct: true,
      correctAnswer: "check the sign first",
      temptingAnswer: "trust the first car",
      conceptTitle: "Known ground slip",
      trapLabel: "known ground slip",
      analogyTitle: "guard post",
      nodeTitle: "Crossing Fields",
      lesson: {
        conceptTitle: "Known ground slip",
        correctAnswer: "check the sign first",
        temptingAnswer: "trust the first car",
        trapLabel: "known ground slip",
        analogyTitle: "guard post",
        nodeTitle: "Crossing Fields",
      },
    },
    { policy: { damageMultiplier: 1, rewardMultiplier: 1, shieldGainMultiplier: 1, tempoGainMultiplier: 1 } },
  );

  assert.equal(revengeTurn.outcome.revengeTriggered, true);
  assert.equal(revengeTurn.outcome.lessonCue.lessonType, "revenge");
  assert.ok(revengeTurn.outcome.reward > normalCorrect.outcome.reward);
  assert.ok(revengeTurn.outcome.shieldRestored > normalCorrect.outcome.shieldRestored);
});

test("pacing favors repair, contrast cases, and a stronger tempo state under strain", () => {
  const repairState = createPacingState({
    repairStepsRemaining: 1,
    tempoCombo: 8,
    contrastCasesSeen: 1,
    analogyResurfaces: 1,
    trapDefuseStreak: 1,
  });

  const decision = decidePacing(
    {
      hp: 6,
      maxHp: 24,
      shield: 1,
      maxShield: 10,
      bossPhasePressure: 0.8,
      bossPhaseIndex: 2,
      revengeActive: true,
      tempoCombo: 8,
    },
    repairState,
  );

  assert.equal(decision.paceState, "repair");
  assert.equal(decision.tempoState, "dominating");
  assert.equal(decision.preferContrastCase, true);
  assert.equal(decision.preferAnalogyResurface, true);
  assert.equal(decision.preferTrapDefuse, true);

  const advanced = advancePacingState(
    repairState,
    { kind: "parry", defused: true, revenge: true, lessonKind: "analogy_resurface" },
    {
      hp: 18,
      maxHp: 24,
      shield: 5,
      maxShield: 10,
      bossPhasePressure: 0.25,
      bossPhaseIndex: 0,
      tempoCombo: 4,
    },
  );

  assert.ok(advanced.state.parryCount > repairState.parryCount);
  assert.ok(advanced.state.tempoCombo >= repairState.tempoCombo);
  assert.equal(advanced.state.analogyResurfaces > repairState.analogyResurfaces, true);
  assert.equal(advanced.decision.tempoState, "dominating");
});

test("the integrated combat and pacing run clears the boss with repair and revenge signals", () => {
  const run = runCombatPacingSimulation(COMBAT_PACING_RUN);

  assert.equal(run.encounter.status, "cleared");
  assert.ok(run.encounter.rewardTotal > 0);
  assert.ok(run.trace.length >= 6);

  const phases = run.trace.map((step) => step.resolved.outcome.phaseName);
  assert.ok(phases.includes("opening pressure"));
  assert.ok(phases.includes("midgame pressure"));
  assert.ok(phases.includes("final push"));

  const lessonTypes = run.trace.map((step) => step.resolved.outcome.lessonCue?.lessonType);
  assert.ok(lessonTypes.includes("trap_defused"));
  assert.ok(lessonTypes.includes("repair"));
  assert.ok(lessonTypes.includes("revenge"));

  const paceStates = run.trace.map((step) => step.pacing.paceState);
  assert.ok(paceStates.includes("repair"));
  assert.ok(paceStates.includes("pressure") || paceStates.includes("clutch"));

  assert.ok(run.pacing.antiTrapLessons > 0);
  assert.ok(run.pacing.contrastCasesSeen > 0);
  assert.ok(run.pacing.analogyResurfaces > 0);
  assert.ok(run.pacing.revengeWins > 0);
});
