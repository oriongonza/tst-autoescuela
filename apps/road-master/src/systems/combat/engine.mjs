import {
  DEFAULT_ATTACK_LIBRARY,
  DEFAULT_BOSS_PHASE_PLAN,
  DEFAULT_DEFENSE_PROFILE,
  DEFAULT_RETRY_PROFILE,
  DEFAULT_TEMPO_TIERS,
} from "./constants.mjs";
import { buildLearningCue } from "../pedagogy/index.mjs";

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
    shieldPierce: Math.max(0, phase.shieldPierce ?? 0),
    tempoDrain: Math.max(0, phase.tempoDrain ?? 0),
    revengeBonus: Math.max(0, phase.revengeBonus ?? 0),
    shieldRestore: Math.max(0, phase.shieldRestore ?? 0),
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
      shieldPierce: 0,
      tempoDrain: 0,
      revengeBonus: 0,
      shieldRestore: 0,
      startTurn: 0,
      endTurnExclusive: 1,
    };
  }

  return phasePlan.find((phase) => turnIndex < phase.endTurnExclusive) ?? phasePlan[phasePlan.length - 1];
}

function telegraphProfile(telegraph) {
  return DEFAULT_ATTACK_LIBRARY[telegraph] ?? DEFAULT_ATTACK_LIBRARY.medium;
}

function tempoTierForCombo(combo = 0) {
  let selected = DEFAULT_TEMPO_TIERS[0];

  for (const tier of DEFAULT_TEMPO_TIERS) {
    if (combo >= tier.minCombo) {
      selected = tier;
    }
  }

  return selected;
}

function clearThresholdFor(config, phasePlan) {
  if (Number.isFinite(config.clearThreshold)) {
    return Math.max(1, config.clearThreshold);
  }

  const derived = phasePlan.reduce((sum, phase) => sum + phase.turns, 0);
  return Math.max(1, derived || 5);
}

function normalizeRevengeState(revenge = {}) {
  const active = Boolean(revenge.active ?? revenge.targetQuestionId ?? revenge.targetTelegraph);

  return {
    active,
    targetQuestionId: revenge.targetQuestionId ?? null,
    targetTelegraph: revenge.targetTelegraph ?? null,
    targetPhaseIndex: Number.isFinite(revenge.targetPhaseIndex) ? revenge.targetPhaseIndex : null,
    targetPhaseName: revenge.targetPhaseName ?? null,
    turnsRemaining: active
      ? Math.max(0, revenge.turnsRemaining ?? DEFAULT_RETRY_PROFILE.revengeTurns)
      : 0,
    rewardBonus: Math.max(0, revenge.rewardBonus ?? DEFAULT_RETRY_PROFILE.revengeRewardBonus),
    shieldRefund: Math.max(0, revenge.shieldRefund ?? DEFAULT_RETRY_PROFILE.revengeShieldRefund),
    label: revenge.label ?? "REVENGE",
    source: revenge.source ?? null,
  };
}

function buildRevengeState({ questionId, telegraph, phase, attack }) {
  return normalizeRevengeState({
    active: true,
    targetQuestionId: questionId ?? null,
    targetTelegraph: telegraph ?? attack.telegraph,
    targetPhaseIndex: phase.index,
    targetPhaseName: phase.name,
    turnsRemaining: DEFAULT_RETRY_PROFILE.revengeTurns,
    rewardBonus: DEFAULT_RETRY_PROFILE.revengeRewardBonus + (attack.revengeBonus ?? 0) + (phase.revengeBonus ?? 0),
    shieldRefund: DEFAULT_RETRY_PROFILE.revengeShieldRefund + (attack.shieldReward ?? 0),
    label: "REVENGE",
    source: "retry",
  });
}

function resolveDamageProfile(encounter, attack, currentPhase, pacingDecision) {
  const policy = pacingDecision.policy ?? {};
  const rawDamage = roundNumber(
    (attack.damage ?? 0) *
      (currentPhase.damageMultiplier ?? 1) *
      (policy.damageMultiplier ?? 1),
  );
  const armorMitigation = clamp(
    (encounter.armor ?? 0) * DEFAULT_DEFENSE_PROFILE.armorMitigationPerPoint,
    0,
    0.4,
  );
  const armoredDamage = Math.max(1, roundNumber(rawDamage * (1 - armorMitigation)));
  const shieldPierce = Math.max(0, roundNumber((attack.shieldPierce ?? 0) + (currentPhase.shieldPierce ?? 0)));
  const shieldDamage = Math.min(encounter.shield, armoredDamage);
  const hpPressure = 1 + (1 - encounter.hp / encounter.maxHp) * DEFAULT_DEFENSE_PROFILE.lowHpAmplifier;
  const hpDamage = Math.max(0, roundNumber((Math.max(0, armoredDamage - shieldDamage) + shieldPierce) * hpPressure));

  return {
    rawDamage,
    armoredDamage,
    shieldDamage,
    hpDamage,
    shieldPierce,
    armorMitigation,
    hpPressure,
    totalDamage: hpDamage,
  };
}

function isParryEligible(attack, attempt) {
  if (attempt.parry != null) {
    return Boolean(attempt.parry);
  }

  return Boolean(attack.parryEligible || attack.telegraph === "trap" || attack.telegraph === "critical");
}

function buildLessonCue({ attempt, attack, outcome, currentPhase }) {
  return buildLearningCue({
    correct: outcome.correct,
    parried: outcome.parried,
    defused: outcome.defused,
    revengeTriggered: outcome.revengeTriggered,
    question: {
      id: attempt.questionId ?? attempt.id ?? null,
      prompt: attempt.prompt ?? attempt.question ?? attack.telegraph,
      correctAnswer: attempt.correctAnswer ?? attempt.answer ?? null,
      temptingAnswer: attempt.temptingAnswer ?? null,
      conceptTitle: attempt.conceptTitle ?? null,
      analogyId: attempt.analogyId ?? null,
      analogyTitle: attempt.analogyTitle ?? null,
      trapLabel: attempt.trapLabel ?? attack.lessonTag ?? attack.telegraph,
      regionTitle: attempt.regionTitle ?? null,
      nodeTitle: attempt.nodeTitle ?? currentPhase.name,
    },
    attack: {
      telegraph: attack.telegraph,
      lessonTag: attack.lessonTag,
      correctAnswer: attempt.correctAnswer ?? null,
      temptingAnswer: attempt.temptingAnswer ?? null,
    },
    lesson: attempt.lesson ?? {},
  });
}

export function createCombatEncounter(config = {}) {
  const maxHp = Math.max(1, config.maxHp ?? 100);
  const maxShield = Math.max(0, config.maxShield ?? DEFAULT_DEFENSE_PROFILE.maxShield);
  const maxArmor = Math.max(0, config.maxArmor ?? DEFAULT_DEFENSE_PROFILE.maxArmor);
  const phasePlan = normalizePhasePlan(config.bossPhasePlan ?? DEFAULT_BOSS_PHASE_PLAN);
  const clearThreshold = clearThresholdFor(config, phasePlan);
  const shield = clamp(0, config.shield ?? maxShield, maxShield);
  const armor = clamp(0, config.armor ?? Math.min(maxArmor, Math.ceil(maxArmor / 2)), maxArmor);
  const tempoCombo = Math.max(0, config.tempoCombo ?? config.combo ?? 0);

  return {
    kind: config.kind ?? "encounter",
    maxHp,
    hp: clamp(0, config.hp ?? maxHp, maxHp),
    maxShield,
    shield,
    maxArmor,
    armor,
    clearThreshold,
    turnIndex: Math.max(0, config.turnIndex ?? 0),
    retriesAllowed: Math.max(0, config.retriesAllowed ?? DEFAULT_RETRY_PROFILE.retriesAllowed),
    retriesUsed: Math.max(0, config.retriesUsed ?? 0),
    checkpointTurn: Math.max(0, config.checkpointTurn ?? 0),
    checkpointHp: clamp(0, config.checkpointHp ?? maxHp, maxHp),
    checkpointShield: clamp(0, config.checkpointShield ?? shield, maxShield),
    checkpointArmor: clamp(0, config.checkpointArmor ?? armor, maxArmor),
    rewardTotal: Math.max(0, config.rewardTotal ?? 0),
    damageTotal: Math.max(0, config.damageTotal ?? 0),
    status: config.status ?? "active",
    baseReward: Math.max(0, config.baseReward ?? 8),
    phasePlan,
    tempoCombo,
    tempoBreaks: Math.max(0, config.tempoBreaks ?? 0),
    parryCount: Math.max(0, config.parryCount ?? 0),
    trapDefuseCount: Math.max(0, config.trapDefuseCount ?? 0),
    revengeCount: Math.max(0, config.revengeCount ?? 0),
    revenge: normalizeRevengeState(config.revenge ?? {}),
    history: Array.isArray(config.history) ? [...config.history] : [],
    lastOutcome: null,
  };
}

export function getCombatSnapshot(encounter) {
  const currentPhase = phaseForTurn(encounter.phasePlan, encounter.turnIndex);
  const nextPhase = phaseForTurn(encounter.phasePlan, Math.min(encounter.turnIndex + 1, encounter.clearThreshold));
  const turnsRemaining = Math.max(0, encounter.clearThreshold - encounter.turnIndex);
  const tempoTier = tempoTierForCombo(encounter.tempoCombo);

  return {
    hp: encounter.hp,
    maxHp: encounter.maxHp,
    hpRatio: encounter.maxHp > 0 ? encounter.hp / encounter.maxHp : 0,
    shield: encounter.shield,
    maxShield: encounter.maxShield,
    shieldRatio: encounter.maxShield > 0 ? encounter.shield / encounter.maxShield : 0,
    armor: encounter.armor,
    maxArmor: encounter.maxArmor,
    armorRatio: encounter.maxArmor > 0 ? encounter.armor / encounter.maxArmor : 0,
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
    tempoCombo: encounter.tempoCombo,
    tempoState: tempoTier.name,
    tempoRewardMultiplier: tempoTier.rewardMultiplier,
    tempoDamageReduction: tempoTier.damageReduction,
    tempoShieldRefund: tempoTier.shieldRefund,
    parryCount: encounter.parryCount,
    trapDefuseCount: encounter.trapDefuseCount,
    revengeCount: encounter.revengeCount,
    revengeActive: encounter.revenge.active,
    revengeTargetQuestionId: encounter.revenge.targetQuestionId,
    revengeTargetTelegraph: encounter.revenge.targetTelegraph,
    revengeTurnsRemaining: encounter.revenge.turnsRemaining,
    lastOutcomeKind: encounter.lastOutcome?.kind ?? null,
    lastLessonKind: encounter.lastOutcome?.lessonCue?.kind ?? null,
  };
}

function applyCheckpoint(next, { keepHealth = true } = {}) {
  next.checkpointTurn = next.turnIndex;
  next.checkpointHp = keepHealth ? Math.max(next.checkpointHp, next.hp) : next.hp;
  next.checkpointShield = Math.max(next.checkpointShield, next.shield);
  next.checkpointArmor = Math.max(next.checkpointArmor, next.armor);
}

function applyPhaseTransition(next, currentPhase, nextPhase, outcome) {
  if (nextPhase.index === currentPhase.index) {
    return;
  }

  outcome.phaseTransition = {
    from: currentPhase.name,
    to: nextPhase.name,
    checkpointTurn: next.turnIndex,
    checkpointHp: Math.max(next.checkpointHp, next.hp),
    checkpointShield: Math.max(next.checkpointShield, next.shield),
    checkpointArmor: Math.max(next.checkpointArmor, next.armor),
  };

  applyCheckpoint(next, { keepHealth: true });
  next.tempoCombo = Math.max(0, next.tempoCombo - (nextPhase.tempoDrain ?? 0));
  next.shield = clamp(
    0,
    next.shield + (nextPhase.shieldRestore ?? 0),
    next.maxShield,
  );
  outcome.reward += nextPhase.transitionReward ?? 0;
  next.rewardTotal += nextPhase.transitionReward ?? 0;
}

function restoreOnRetry(next) {
  const retryShieldFloor = Math.max(
    DEFAULT_RETRY_PROFILE.minimalRetryShield,
    roundNumber(next.maxShield * DEFAULT_DEFENSE_PROFILE.shieldRestoreOnRetryRatio),
  );
  const retryArmorFloor = Math.max(
    DEFAULT_RETRY_PROFILE.minimalRetryArmor,
    roundNumber(next.maxArmor * DEFAULT_DEFENSE_PROFILE.armorRestoreOnRetryRatio),
  );

  next.hp = next.checkpointHp;
  next.shield = clamp(0, Math.max(next.checkpointShield, retryShieldFloor), next.maxShield);
  next.armor = clamp(0, Math.max(next.checkpointArmor, retryArmorFloor), next.maxArmor);
  next.tempoCombo = Math.max(0, Math.floor(next.tempoCombo / 2));
}

export function resolveCombatTurn(encounter, attempt = {}, pacingDecision = {}) {
  if (encounter.status !== "active") {
    return {
      encounter,
      outcome: {
        kind: "inactive",
        correct: Boolean(attempt.correct),
        telegraph: attempt.telegraph ?? "medium",
        damage: 0,
        reward: 0,
        shieldRestored: 0,
        phaseName: phaseForTurn(encounter.phasePlan, encounter.turnIndex).name,
        phaseIndex: phaseForTurn(encounter.phasePlan, encounter.turnIndex).index,
        status: encounter.status,
        retried: false,
        cleared: encounter.status === "cleared",
        failed: encounter.status === "failed",
        lessonCue: null,
      },
    };
  }

  const currentPhase = phaseForTurn(encounter.phasePlan, encounter.turnIndex);
  const attack = telegraphProfile(attempt.telegraph ?? currentPhase.telegraph ?? "medium");
  const policy = pacingDecision.policy ?? {};
  const correct = Boolean(attempt.correct);
  const tempoBefore = tempoTierForCombo(encounter.tempoCombo);
  const next = createCombatEncounter(encounter);
  const outcome = {
    kind: "resolved",
    correct,
    telegraph: attack.telegraph,
    damage: 0,
    reward: 0,
    shieldRestored: 0,
    shieldLost: 0,
    hpLost: 0,
    armorBlocked: 0,
    parried: false,
    defused: false,
    revengeTriggered: false,
    phaseName: currentPhase.name,
    phaseIndex: currentPhase.index,
    phaseTransition: null,
    retried: false,
    cleared: false,
    failed: false,
    tempoBefore: tempoBefore.name,
    tempoAfter: tempoBefore.name,
    comboBefore: next.tempoCombo,
    comboAfter: next.tempoCombo,
    lessonCue: null,
  };

  if (correct) {
    const parried = isParryEligible(attack, attempt);
    const revengeTriggered =
      next.revenge.active &&
      (attempt.questionId ?? null) !== null &&
      attempt.questionId === next.revenge.targetQuestionId &&
      (next.revenge.turnsRemaining > 0 || next.revenge.targetTelegraph === attack.telegraph);

    const tempoGain = Math.max(1, attack.tempoGain ?? 1) + (parried ? 1 : 0) + (revengeTriggered ? 1 : 0);
    const rewardBase = next.baseReward + (attack.reward ?? 0) + (currentPhase.rewardBonus ?? 0);
    const rewardMultiplier = (policy.rewardMultiplier ?? 1) * tempoBefore.rewardMultiplier;
    const shieldMultiplier = policy.shieldGainMultiplier ?? 1;
    let reward = roundNumber(rewardBase * rewardMultiplier);
    let shieldGain = roundNumber(
      ((attack.shieldReward ?? 0) + tempoBefore.shieldRefund + (parried ? 3 : 0) + (currentPhase.shieldRestore ?? 0)) *
        shieldMultiplier,
    );

    if (parried) {
      reward += attack.trapDefuseBonus ?? 0;
      next.parryCount += 1;
      next.trapDefuseCount += 1;
    }

    if (revengeTriggered) {
      reward += next.revenge.rewardBonus;
      shieldGain += next.revenge.shieldRefund;
      next.revengeCount += 1;
      next.revenge = normalizeRevengeState();
    } else if (next.revenge.active && next.revenge.turnsRemaining > 0) {
      next.revenge.turnsRemaining -= 1;
    }

    next.rewardTotal += reward;
    next.shield = clamp(0, next.shield + shieldGain, next.maxShield);
    next.armor = clamp(0, next.armor + (parried ? 1 : 0), next.maxArmor);
    next.tempoCombo += tempoGain;
    next.turnIndex += 1;
    next.history = [...next.history, outcome];

    outcome.reward = reward;
    outcome.shieldRestored = shieldGain;
    outcome.parried = parried;
    outcome.defused = parried;
    outcome.revengeTriggered = revengeTriggered;
    outcome.tempoAfter = tempoTierForCombo(next.tempoCombo).name;
    outcome.comboAfter = next.tempoCombo;
    outcome.lessonCue = buildLessonCue({
      attempt,
      attack,
      outcome,
      currentPhase,
    });

    const nextPhase = phaseForTurn(next.phasePlan, next.turnIndex);
    applyPhaseTransition(next, currentPhase, nextPhase, outcome);

    if (next.turnIndex >= next.clearThreshold) {
      outcome.cleared = true;
      next.status = "cleared";
      const clearBonus = next.baseReward + nextPhase.transitionReward + (next.tempoCombo >= 5 ? 4 : 0);
      outcome.reward += clearBonus;
      next.rewardTotal += clearBonus;
      applyCheckpoint(next, { keepHealth: true });
    }
  } else {
    const damagePacket = resolveDamageProfile(next, attack, currentPhase, pacingDecision);
    next.hp = clamp(0, next.hp - damagePacket.hpDamage, next.maxHp);
    next.shield = clamp(0, next.shield - damagePacket.shieldDamage, next.maxShield);
    next.damageTotal += damagePacket.totalDamage;
    next.tempoCombo = 0;
    next.tempoBreaks += 1;
    next.turnIndex += 1;
    next.history = [...next.history, outcome];

    outcome.damage = damagePacket.totalDamage;
    outcome.shieldLost = damagePacket.shieldDamage;
    outcome.hpLost = damagePacket.hpDamage;
    outcome.armorBlocked = damagePacket.rawDamage - damagePacket.armoredDamage;
    outcome.comboAfter = next.tempoCombo;
    outcome.tempoAfter = tempoTierForCombo(next.tempoCombo).name;
    outcome.lessonCue = buildLessonCue({
      attempt,
      attack,
      outcome,
      currentPhase,
    });

    const nextPhase = phaseForTurn(next.phasePlan, next.turnIndex);
    applyPhaseTransition(next, currentPhase, nextPhase, outcome);

    if (next.hp <= 0) {
      if (next.retriesUsed < next.retriesAllowed) {
        next.retriesUsed += 1;
        restoreOnRetry(next);
        next.status = "active";
        next.revenge = buildRevengeState({
          questionId: attempt.questionId ?? attempt.id ?? null,
          telegraph: attack.telegraph,
          phase: currentPhase,
          attack,
        });
        outcome.retried = true;
        outcome.shieldRestored += next.shield - next.checkpointShield;
      } else {
        next.status = "failed";
        outcome.failed = true;
      }
    }
  }

  next.lastOutcome = outcome;
  return { encounter: next, outcome };
}
