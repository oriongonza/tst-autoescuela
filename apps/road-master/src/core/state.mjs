import { deepFreeze } from "./contract-utils.mjs";
import { FOUNDATION_VERSION, MASTERY_STATES, PACE_STATES, REGION_STATES, RUN_STAGES } from "./types.mjs";

/**
 * @typedef {Object} ConceptProgress
 * @property {string} conceptId
 * @property {import("./types.mjs").MasteryState} masteryState
 * @property {number} learnedScore
 * @property {number} understoodScore
 * @property {number} comprehendedScore
 * @property {number} stabilityScore
 * @property {string | null} firstLearnedAt
 * @property {string | null} masteredAt
 * @property {string | null} lastSeenAt
 * @property {number} knownMistakeCount
 */

/**
 * @typedef {Object} PlayerState
 * @property {string} playerId
 * @property {string[]} unlockedRegionIds
 * @property {string[]} visibleRegionIds
 * @property {string[]} masteredRegionIds
 * @property {Record<string, ConceptProgress>} conceptProgress
 * @property {string[]} defeatedBossIds
 * @property {string | undefined} lastRunId
 */

/**
 * @typedef {Object} RunState
 * @property {string} runId
 * @property {string} regionId
 * @property {string | undefined} bossId
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} shield
 * @property {number} maxShield
 * @property {import("./types.mjs").PaceState} paceState
 * @property {number} bossPhase
 * @property {number} streak
 * @property {boolean[]} recentAnswers
 * @property {number} recentDamageTaken
 * @property {number} recentKnownMistakes
 * @property {number} recentTrapFails
 * @property {number} recentTrapWins
 * @property {number} frustration
 * @property {number} boredom
 * @property {number} momentum
 * @property {number} sessionSeconds
 * @property {number} questionsSinceRelief
 * @property {number} questionsSinceSpike
 * @property {boolean} nearVictory
 * @property {boolean} justUnlocked
 * @property {string | undefined} lastQuestionId
 */

export const DEFAULT_MAX_HP = 12;
export const DEFAULT_MAX_SHIELD = 0;

export const RUN_STATE_TEMPLATE = deepFreeze({
  stage: "boot",
  stageOrder: RUN_STAGES,
  paceStates: PACE_STATES,
  regionStates: REGION_STATES,
  masteryStates: MASTERY_STATES,
});

/**
 * @param {string} conceptId
 * @param {Partial<ConceptProgress>} [overrides]
 * @returns {ConceptProgress}
 */
export function createConceptProgress(conceptId, overrides = {}) {
  return {
    conceptId,
    masteryState: "new",
    learnedScore: 0,
    understoodScore: 0,
    comprehendedScore: 0,
    stabilityScore: 0,
    firstLearnedAt: null,
    masteredAt: null,
    lastSeenAt: null,
    knownMistakeCount: 0,
    ...overrides,
  };
}

/**
 * @param {string} playerId
 * @param {Partial<PlayerState>} [overrides]
 * @returns {PlayerState}
 */
export function createPlayerState(playerId, overrides = {}) {
  return {
    playerId,
    unlockedRegionIds: [],
    visibleRegionIds: [],
    masteredRegionIds: [],
    conceptProgress: Object.create(null),
    defeatedBossIds: [],
    lastRunId: undefined,
    ...overrides,
  };
}

/**
 * @param {string} runId
 * @param {string} regionId
 * @param {Partial<RunState>} [overrides]
 * @returns {RunState}
 */
export function createRunState(runId, regionId, overrides = {}) {
  return {
    runId,
    regionId,
    bossId: undefined,
    hp: DEFAULT_MAX_HP,
    maxHp: DEFAULT_MAX_HP,
    shield: DEFAULT_MAX_SHIELD,
    maxShield: DEFAULT_MAX_SHIELD,
    paceState: "flow",
    bossPhase: 0,
    streak: 0,
    recentAnswers: [],
    recentDamageTaken: 0,
    recentKnownMistakes: 0,
    recentTrapFails: 0,
    recentTrapWins: 0,
    frustration: 0,
    boredom: 0,
    momentum: 0,
    sessionSeconds: 0,
    questionsSinceRelief: 0,
    questionsSinceSpike: 0,
    nearVictory: false,
    justUnlocked: false,
    lastQuestionId: undefined,
    ...overrides,
  };
}
