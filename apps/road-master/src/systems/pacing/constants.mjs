export const PACE_STATES = Object.freeze([
  "flow",
  "pressure",
  "danger",
  "recovery",
  "clutch",
  "repair",
]);

export const PACE_POLICIES = Object.freeze({
  flow: {
    damageMultiplier: 1.0,
    rewardMultiplier: 1.0,
    telegraphTone: "calm",
    injectRecoveryQuestion: false,
    preferKnownMistake: false,
  },
  pressure: {
    damageMultiplier: 1.1,
    rewardMultiplier: 1.05,
    telegraphTone: "active",
    injectRecoveryQuestion: false,
    preferKnownMistake: false,
  },
  danger: {
    damageMultiplier: 1.25,
    rewardMultiplier: 1.1,
    telegraphTone: "sharp",
    injectRecoveryQuestion: true,
    preferKnownMistake: true,
  },
  recovery: {
    damageMultiplier: 0.75,
    rewardMultiplier: 0.95,
    telegraphTone: "soft",
    injectRecoveryQuestion: true,
    preferKnownMistake: true,
  },
  clutch: {
    damageMultiplier: 1.35,
    rewardMultiplier: 1.25,
    telegraphTone: "focused",
    injectRecoveryQuestion: false,
    preferKnownMistake: false,
  },
  repair: {
    damageMultiplier: 0.6,
    rewardMultiplier: 0.9,
    telegraphTone: "gentle",
    injectRecoveryQuestion: true,
    preferKnownMistake: true,
  },
});

