export const DEFAULT_ATTACK_LIBRARY = Object.freeze({
  light: { telegraph: "light", damage: 6, reward: 3 },
  medium: { telegraph: "medium", damage: 10, reward: 5 },
  heavy: { telegraph: "heavy", damage: 15, reward: 8 },
  trap: { telegraph: "trap", damage: 12, reward: 6 },
  critical: { telegraph: "critical", damage: 20, reward: 10 },
});

export const DEFAULT_BOSS_PHASE_PLAN = Object.freeze([
  { name: "opening pressure", turns: 2, damageMultiplier: 1.0, rewardBonus: 0, transitionReward: 4 },
  { name: "midgame pressure", turns: 2, damageMultiplier: 1.15, rewardBonus: 2, transitionReward: 6 },
  { name: "final push", turns: 2, damageMultiplier: 1.35, rewardBonus: 4, transitionReward: 10 },
]);

