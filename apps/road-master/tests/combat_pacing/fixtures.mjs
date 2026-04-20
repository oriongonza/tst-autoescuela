export const BOSS_PHASE_PLAN = [
  { name: "opening pressure", turns: 2, damageMultiplier: 1.0, rewardBonus: 0, transitionReward: 4 },
  { name: "midgame pressure", turns: 2, damageMultiplier: 1.15, rewardBonus: 2, transitionReward: 6 },
  { name: "final push", turns: 2, damageMultiplier: 1.35, rewardBonus: 4, transitionReward: 10 },
];

export const COMBAT_PACING_SEQUENCE = [
  { telegraph: "light", correct: true },
  { telegraph: "heavy", correct: false },
  { telegraph: "trap", correct: false },
  { telegraph: "medium", correct: true },
  { telegraph: "critical", correct: false },
  { telegraph: "heavy", correct: true },
];

export const COMBAT_PACING_RUN = {
  encounter: {
    kind: "boss",
    maxHp: 100,
    retriesAllowed: 1,
    bossPhasePlan: BOSS_PHASE_PLAN,
  },
  attempts: COMBAT_PACING_SEQUENCE,
};

