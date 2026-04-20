import { PACE_POLICIES } from "./constants.mjs";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

export function createPacingState(overrides = {}) {
  return {
    paceState: "flow",
    questionsSinceRelief: 0,
    consecutiveWrongCount: 0,
    consecutiveCorrectCount: 0,
    repairStepsRemaining: 0,
    lastTransitionReason: "initial",
    lastFrustration: 0,
    ...overrides,
  };
}

export function deriveFrustration(snapshot, state = createPacingState()) {
  const hpRatio = snapshot.maxHp > 0 ? snapshot.hp / snapshot.maxHp : 0;
  const hpPressure = 1 - clamp01(hpRatio);
  const wrongPressure = clamp01(((state.consecutiveWrongCount || 0) + (snapshot.recentWrongCount || 0)) / 3);
  const driftPressure = clamp01((state.questionsSinceRelief || 0) / 4);
  const phasePressure = clamp01(snapshot.bossPhasePressure ?? 0);

  return clamp01(
    0.35 * hpPressure +
      0.3 * wrongPressure +
      0.2 * driftPressure +
      0.15 * phasePressure,
  );
}

function phaseProgress(snapshot) {
  if (typeof snapshot.bossPhaseProgress === "number") {
    return clamp01(snapshot.bossPhaseProgress);
  }

  if (typeof snapshot.turnIndex === "number" && typeof snapshot.clearThreshold === "number" && snapshot.clearThreshold > 0) {
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

  if ((frustration >= 0.75 && snapshot.hp < snapshot.maxHp * 0.35) || (frustration >= 0.6 && state.questionsSinceRelief > 2)) {
    return "recovery";
  }

  if (isNearClear(snapshot) && hpRatio < 0.4) {
    return "clutch";
  }

  if (snapshot.hp <= snapshot.maxHp * 0.25 || state.consecutiveWrongCount >= 2) {
    return "danger";
  }

  if (snapshot.hp <= snapshot.maxHp * 0.55 || state.consecutiveWrongCount >= 1 || (snapshot.bossPhaseIndex ?? 0) > 0) {
    return "pressure";
  }

  return "flow";
}

export function decidePacing(snapshot, state = createPacingState()) {
  const paceState = pickState(snapshot, state);
  const policy = PACE_POLICIES[paceState];
  const frustration = deriveFrustration(snapshot, state);

  return {
    paceState,
    policy,
    reason: paceState,
    injectRecoveryQuestion: policy.injectRecoveryQuestion,
    preferKnownMistake: policy.preferKnownMistake,
    metrics: {
      frustration,
      hpRatio: snapshot.maxHp > 0 ? snapshot.hp / snapshot.maxHp : 0,
      questionsSinceRelief: state.questionsSinceRelief,
      consecutiveWrongCount: state.consecutiveWrongCount,
    },
  };
}

export function advancePacingState(state, event = {}, snapshot = {}) {
  const next = createPacingState(state);

  if (event.kind === "correct") {
    next.consecutiveCorrectCount += 1;
    next.consecutiveWrongCount = 0;
    next.questionsSinceRelief += 1;
  } else if (event.kind === "wrong") {
    next.consecutiveWrongCount += 1;
    next.consecutiveCorrectCount = 0;
    next.questionsSinceRelief += 1;
  } else if (event.kind === "clear") {
    next.consecutiveWrongCount = 0;
    next.consecutiveCorrectCount += 1;
    next.questionsSinceRelief = 0;
  }

  if (event.recovered) {
    next.questionsSinceRelief = 0;
    next.repairStepsRemaining = 0;
  }

  if (event.failed) {
    next.repairStepsRemaining = 2;
    next.questionsSinceRelief = 0;
    next.consecutiveWrongCount = 0;
  } else if (next.repairStepsRemaining > 0) {
    next.repairStepsRemaining -= 1;
  }

  const decision = decidePacing(snapshot, next);
  next.paceState = decision.paceState;
  next.lastTransitionReason = decision.reason;
  next.lastFrustration = decision.metrics.frustration;

  return { state: next, decision };
}

