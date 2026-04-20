import { PACE_POLICIES } from "./constants.mjs";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function tempoStateForCombo(combo = 0) {
  if (combo >= 8) {
    return "dominating";
  }

  if (combo >= 5) {
    return "flow";
  }

  if (combo >= 3) {
    return "tempo";
  }

  if (combo >= 1) {
    return "warming";
  }

  return "cold";
}

export function createPacingState(overrides = {}) {
  return {
    paceState: "flow",
    tempoState: "cold",
    tempoCombo: 0,
    questionsSinceRelief: 0,
    consecutiveWrongCount: 0,
    consecutiveCorrectCount: 0,
    repairStepsRemaining: 0,
    parryCount: 0,
    trapDefuseStreak: 0,
    revengeWins: 0,
    antiTrapLessons: 0,
    contrastCasesSeen: 0,
    analogyResurfaces: 0,
    lastTransitionReason: "initial",
    lastFrustration: 0,
    lastLessonKind: null,
    ...overrides,
  };
}

export function deriveFrustration(snapshot, state = createPacingState()) {
  const hpRatio = snapshot.maxHp > 0 ? snapshot.hp / snapshot.maxHp : 0;
  const shieldRatio = snapshot.maxShield > 0 ? snapshot.shield / snapshot.maxShield : 0;
  const wrongPressure = clamp01(((state.consecutiveWrongCount || 0) + (snapshot.recentWrongCount || 0)) / 3);
  const driftPressure = clamp01((state.questionsSinceRelief || 0) / 4);
  const phasePressure = clamp01(snapshot.bossPhasePressure ?? 0);
  const tempoPressure = 1 - clamp01((snapshot.tempoCombo ?? state.tempoCombo ?? 0) / 8);
  const revengePressure = snapshot.revengeActive ? 0.08 : 0;

  return clamp01(
    0.24 * (1 - hpRatio) +
      0.16 * (1 - shieldRatio) +
      0.2 * wrongPressure +
      0.14 * driftPressure +
      0.12 * phasePressure +
      0.1 * tempoPressure +
      revengePressure,
  );
}

function phaseProgress(snapshot) {
  if (typeof snapshot.bossPhaseProgress === "number") {
    return clamp01(snapshot.bossPhaseProgress);
  }

  if (
    typeof snapshot.turnIndex === "number" &&
    typeof snapshot.clearThreshold === "number" &&
    snapshot.clearThreshold > 0
  ) {
    return clamp01(snapshot.turnIndex / snapshot.clearThreshold);
  }

  return 0;
}

function isNearClear(snapshot) {
  if (snapshot.turnsRemaining != null) {
    return snapshot.turnsRemaining <= 1;
  }

  return phaseProgress(snapshot) >= 0.75;
}

function pickState(snapshot, state) {
  if (state.repairStepsRemaining > 0 || snapshot.justFailed) {
    return "repair";
  }

  const frustration = deriveFrustration(snapshot, state);
  const hpRatio = snapshot.maxHp > 0 ? snapshot.hp / snapshot.maxHp : 0;

  if (frustration >= 0.78 && hpRatio < 0.35) {
    return "recovery";
  }

  if (isNearClear(snapshot) && hpRatio < 0.45) {
    return "clutch";
  }

  if (snapshot.hp <= snapshot.maxHp * 0.25 || state.consecutiveWrongCount >= 2) {
    return "danger";
  }

  if (
    snapshot.hp <= snapshot.maxHp * 0.55 ||
    state.consecutiveWrongCount >= 1 ||
    (snapshot.bossPhaseIndex ?? 0) > 0 ||
    snapshot.revengeActive
  ) {
    return "pressure";
  }

  return "flow";
}

function enrichPolicy(basePolicy, state, snapshot, tempoState) {
  return {
    ...basePolicy,
    tempoState,
    tempoGainMultiplier:
      (basePolicy.tempoGainMultiplier ?? 1) *
      (tempoState === "dominating" ? 1.15 : tempoState === "flow" ? 1.08 : 1),
    preferTrapDefuse: basePolicy.preferKnownMistake || state.trapDefuseStreak > 0,
    preferContrastCase: basePolicy.preferContrastCase || state.contrastCasesSeen > 0,
    preferAnalogyResurface: basePolicy.preferAnalogyResurface || state.analogyResurfaces > 0,
    revengeFocus: basePolicy.lessonMode === "revenge" || snapshot.revengeActive || state.revengeWins > 0,
  };
}

export function decidePacing(snapshot, state = createPacingState()) {
  const paceState = pickState(snapshot, state);
  const tempoState = tempoStateForCombo(state.tempoCombo ?? snapshot.tempoCombo ?? 0);
  const policy = enrichPolicy(PACE_POLICIES[paceState], state, snapshot, tempoState);
  const frustration = deriveFrustration(snapshot, state);

  return {
    paceState,
    tempoState,
    policy,
    reason: paceState,
    injectRecoveryQuestion: policy.injectRecoveryQuestion,
    preferKnownMistake: policy.preferKnownMistake,
    preferContrastCase: policy.preferContrastCase,
    preferAnalogyResurface: policy.preferAnalogyResurface,
    preferTrapDefuse: policy.preferTrapDefuse,
    metrics: {
      frustration,
      hpRatio: snapshot.maxHp > 0 ? snapshot.hp / snapshot.maxHp : 0,
      shieldRatio: snapshot.maxShield > 0 ? snapshot.shield / snapshot.maxShield : 0,
      tempoCombo: snapshot.tempoCombo ?? state.tempoCombo ?? 0,
      questionsSinceRelief: state.questionsSinceRelief,
      consecutiveWrongCount: state.consecutiveWrongCount,
      trapDefuseStreak: state.trapDefuseStreak,
    },
  };
}

export function advancePacingState(state, event = {}, snapshot = {}) {
  const next = createPacingState(state);
  const lessonKind = event.lessonKind ?? null;

  if (event.kind === "parry" || event.defused) {
    next.consecutiveCorrectCount += 1;
    next.consecutiveWrongCount = 0;
    next.questionsSinceRelief = 0;
    next.tempoCombo += 2;
    next.parryCount += 1;
    next.trapDefuseStreak += 1;
    next.antiTrapLessons += 1;
    next.contrastCasesSeen += 1;
    next.analogyResurfaces += 1;
  } else if (event.kind === "correct") {
    next.consecutiveCorrectCount += 1;
    next.consecutiveWrongCount = 0;
    next.questionsSinceRelief += 1;
    next.tempoCombo += 1;
    next.trapDefuseStreak = 0;
  } else if (event.kind === "wrong") {
    next.consecutiveWrongCount += 1;
    next.consecutiveCorrectCount = 0;
    next.questionsSinceRelief += 1;
    next.tempoCombo = 0;
    next.trapDefuseStreak = 0;
    next.contrastCasesSeen += 1;
    next.analogyResurfaces += 1;
  } else if (event.kind === "clear") {
    next.consecutiveWrongCount = 0;
    next.consecutiveCorrectCount += 1;
    next.questionsSinceRelief = 0;
    next.tempoCombo += 1;
  } else if (event.kind === "lesson") {
    next.questionsSinceRelief += 1;
  }

  if (event.revenge) {
    next.revengeWins += 1;
    next.questionsSinceRelief = 0;
    next.tempoCombo += 1;
  }

  if (event.recovered) {
    next.questionsSinceRelief = 0;
    next.repairStepsRemaining = Math.max(next.repairStepsRemaining, event.kind === "wrong" ? 2 : 0);
  }

  if (event.failed) {
    next.repairStepsRemaining = 2;
    next.questionsSinceRelief = 0;
    next.consecutiveWrongCount = 0;
    next.tempoCombo = 0;
  } else if (next.repairStepsRemaining > 0) {
    next.repairStepsRemaining -= 1;
  }

  if (lessonKind === "micro_lesson") {
    next.antiTrapLessons += 1;
  }

  if (lessonKind === "contrast_case") {
    next.contrastCasesSeen += 1;
  }

  if (lessonKind === "analogy_resurface") {
    next.analogyResurfaces += 1;
  }

  const decision = decidePacing(snapshot, next);
  next.paceState = decision.paceState;
  next.tempoState = decision.tempoState;
  next.lastTransitionReason = decision.reason;
  next.lastFrustration = decision.metrics.frustration;
  next.lastLessonKind = lessonKind ?? next.lastLessonKind;

  return { state: next, decision };
}
