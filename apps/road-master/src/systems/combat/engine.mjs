import { DEFAULT_ATTACK_LIBRARY, DEFAULT_BOSS_PHASE_PLAN } from "./constants.mjs";

function clamp(min, value, max) {
  return Math.min(max, Math.max(min, value));
}

function roundNumber(value) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function normalizePhasePlan(phasePlan = DEFAULT_BOSS_PHASE_PLAN) {
  const phases = phasePlan.map((phase, index) => ({
    index,
    name: phase.name,
    turns: Math.max(1, phase.turns ?? 1),
    damageMultiplier: phase.damageMultiplier ?? 1,
    rewardBonus: phase.rewardBonus ?? 0,
    transitionReward: phase.transitionReward ?? 0,
  }));

  let cursor = 0;
  return phases.map((phase) => {
    const startTurn = cursor;
    const endTurnExclusive = cursor + phase.turns;
    cursor = endTurnExclusive;
    return { ...phase, startTurn, endTurnExclusive };
  });
}

function phaseForTurn(phasePlan, turnIndex) {
  if (phasePlan.length === 0) {
    return {
      index: 0,
      name: "solo encounter",
      turns: 1,
      damageMultiplier: 1,
      rewardBonus: 0,
      transitionReward: 0,
      startTurn: 0,
      endTurnExclusive: 1,
    };
  }

  return phasePlan.find((phase) => turnIndex < phase.endTurnExclusive) ?? phasePlan[phasePlan.length - 1];
}

function telegraphProfile(telegraph) {
  return DEFAULT_ATTACK_LIBRARY[telegraph] ?? DEFAULT_ATTACK_LIBRARY.medium;
}

function clearThresholdFor(config, phasePlan) {
  if (Number.isFinite(config.clearThreshold)) {
    return Math.max(1, config.clearThreshold);
  }

  const derived = phasePlan.reduce((sum, phase) => sum + phase.turns, 0);
  return Math.max(1, derived || 5);
}

export function createCombatEncounter(config = {}) {
  const maxHp = Math.max(1, config.maxHp ?? 100);
  const phasePlan = normalizePhasePlan(config.bossPhasePlan ?? DEFAULT_BOSS_PHASE_PLAN);
  const clearThreshold = clearThresholdFor(config, phasePlan);

  return {
    kind: config.kind ?? "encounter",
    maxHp,
    hp: clamp(0, config.hp ?? maxHp, maxHp),
    clearThreshold,
    turnIndex: Math.max(0, config.turnIndex ?? 0),
    retriesAllowed: Math.max(0, config.retriesAllowed ?? 1),
    retriesUsed: Math.max(0, config.retriesUsed ?? 0),
    checkpointTurn: Math.max(0, config.checkpointTurn ?? 0),
    checkpointHp: clamp(0, config.checkpointHp ?? maxHp, maxHp),
    rewardTotal: Math.max(0, config.rewardTotal ?? 0),
    damageTotal: Math.max(0, config.damageTotal ?? 0),
    status: config.status ?? "active",
    baseReward: Math.max(0, config.baseReward ?? 8),
    phasePlan,
    history: Array.isArray(config.history) ? [...config.history] : [],
    lastOutcome: null,
  };
}

export function getCombatSnapshot(encounter) {
  const currentPhase = phaseForTurn(encounter.phasePlan, encounter.turnIndex);
  const nextPhase = phaseForTurn(encounter.phasePlan, Math.min(encounter.turnIndex + 1, encounter.clearThreshold));
  const turnsRemaining = Math.max(0, encounter.clearThreshold - encounter.turnIndex);

  return {
    hp: encounter.hp,
    maxHp: encounter.maxHp,
    turnIndex: encounter.turnIndex,
    clearThreshold: encounter.clearThreshold,
    turnsRemaining,
    bossPhaseIndex: currentPhase.index,
    bossPhaseCount: encounter.phasePlan.length,
    bossPhaseName: currentPhase.name,
    bossPhaseProgress: encounter.clearThreshold > 0 ? encounter.turnIndex / encounter.clearThreshold : 0,
    bossPhasePressure: encounter.phasePlan.length > 1 ? currentPhase.index / (encounter.phasePlan.length - 1) : 0,
    phaseTurnIndex: encounter.turnIndex - currentPhase.startTurn,
    phaseTurnsRemaining: Math.max(0, currentPhase.endTurnExclusive - encounter.turnIndex),
    nextPhaseName: nextPhase.name,
    isBoss: encounter.kind === "boss",
    status: encounter.status,
  };
}

export function resolveCombatTurn(encounter, attempt = {}, pacingDecision = {}) {
  if (encounter.status !== "active") {
    return {
      encounter,
      outcome: {
        correct: Boolean(attempt.correct),
        telegraph: attempt.telegraph ?? "medium",
        damage: 0,
        reward: 0,
        phaseName: phaseForTurn(encounter.phasePlan, encounter.turnIndex).name,
        phaseIndex: phaseForTurn(encounter.phasePlan, encounter.turnIndex).index,
        status: encounter.status,
        retried: false,
        cleared: encounter.status === "cleared",
        failed: encounter.status === "failed",
      },
    };
  }

  const currentPhase = phaseForTurn(encounter.phasePlan, encounter.turnIndex);
  const attack = telegraphProfile(attempt.telegraph ?? currentPhase.telegraph ?? "medium");
  const policy = pacingDecision.policy ?? {};
  const paceDamageMultiplier = policy.damageMultiplier ?? 1;
  const rewardMultiplier = policy.rewardMultiplier ?? 1;

  const next = createCombatEncounter(encounter);
  const outcome = {
    correct: Boolean(attempt.correct),
    telegraph: attack.telegraph,
    damage: 0,
    reward: 0,
    phaseName: currentPhase.name,
    phaseIndex: currentPhase.index,
    phaseTransition: null,
    retried: false,
    cleared: false,
    failed: false,
  };

  if (attempt.correct) {
    const rewardBase = next.baseReward + attack.reward + currentPhase.rewardBonus;
    outcome.reward = roundNumber(rewardBase * rewardMultiplier);
    next.rewardTotal += outcome.reward;
  } else {
    outcome.damage = roundNumber(attack.damage * currentPhase.damageMultiplier * paceDamageMultiplier);
    next.hp = clamp(0, next.hp - outcome.damage, next.maxHp);
    next.damageTotal += outcome.damage;
  }

  next.turnIndex += 1;
  next.history = [...next.history, outcome];

  const nextPhase = phaseForTurn(next.phasePlan, next.turnIndex);
  if (nextPhase.index !== currentPhase.index) {
    outcome.phaseTransition = {
      from: currentPhase.name,
      to: nextPhase.name,
      checkpointTurn: next.turnIndex,
      checkpointHp: Math.max(next.checkpointHp, next.hp),
    };
    next.checkpointTurn = next.turnIndex;
    next.checkpointHp = Math.max(next.checkpointHp, next.hp);
    outcome.reward += nextPhase.transitionReward;
    next.rewardTotal += nextPhase.transitionReward;
  }

  if (next.turnIndex >= next.clearThreshold) {
    outcome.cleared = true;
    next.status = "cleared";
    outcome.reward += next.baseReward + nextPhase.transitionReward;
    next.rewardTotal += next.baseReward + nextPhase.transitionReward;
    next.checkpointTurn = next.turnIndex;
    next.checkpointHp = Math.max(next.checkpointHp, next.hp);
  }

  if (!outcome.cleared && next.hp <= 0) {
    if (next.retriesUsed < next.retriesAllowed) {
      next.retriesUsed += 1;
      next.turnIndex = next.checkpointTurn;
      next.hp = next.checkpointHp;
      next.status = "active";
      outcome.retried = true;
    } else {
      next.status = "failed";
      outcome.failed = true;
    }
  }

  next.lastOutcome = outcome;
  return { encounter: next, outcome };
}
