/**
 * Versioned core vocabulary for the Road Master foundations slice.
 *
 * @typedef {'concept' | 'trap' | 'region' | 'boss' | 'submap' | 'encounter'} GraphNodeType
 * @typedef {'prerequisite' | 'exception' | 'confusion' | 'similarity' | 'contains' | 'unlocks' | 'boss_of' | 'submap_of'} GraphEdgeType
 * @typedef {'new' | 'learned' | 'fragile' | 'mastered' | 'corrupted' | 'known_mistake'} MasteryState
 * @typedef {'flow' | 'pressure' | 'danger' | 'recovery' | 'clutch' | 'victory' | 'repair'} PaceState
 * @typedef {'light' | 'heavy' | 'trap' | 'critical'} AttackTier
 * @typedef {'knowledge' | 'exception' | 'visual' | 'anti_trap' | 'mixed'} AttackType
 * @typedef {'locked' | 'visible' | 'unlocked' | 'mastered' | 'fragile' | 'corrupted'} RegionState
 * @typedef {'boot' | 'campaign' | 'map' | 'encounter' | 'boss' | 'flashback' | 'conquest' | 'repair' | 'failed'} RunStage
 */

import { deepFreeze } from "./contract-utils.mjs";

export const FOUNDATION_VERSION = "0.1.0";

export const GRAPH_NODE_TYPES = deepFreeze([
  "concept",
  "trap",
  "region",
  "boss",
  "submap",
  "encounter",
]);

export const GRAPH_EDGE_TYPES = deepFreeze([
  "prerequisite",
  "exception",
  "confusion",
  "similarity",
  "contains",
  "unlocks",
  "boss_of",
  "submap_of",
]);

export const MASTERY_STATES = deepFreeze([
  "new",
  "learned",
  "fragile",
  "mastered",
  "corrupted",
  "known_mistake",
]);

export const PACE_STATES = deepFreeze([
  "flow",
  "pressure",
  "danger",
  "recovery",
  "clutch",
  "victory",
  "repair",
]);

export const ATTACK_TIERS = deepFreeze([
  "light",
  "heavy",
  "trap",
  "critical",
]);

export const ATTACK_TYPES = deepFreeze([
  "knowledge",
  "exception",
  "visual",
  "anti_trap",
  "mixed",
]);

export const REGION_STATES = deepFreeze([
  "locked",
  "visible",
  "unlocked",
  "mastered",
  "fragile",
  "corrupted",
]);

export const RUN_STAGES = deepFreeze([
  "boot",
  "campaign",
  "map",
  "encounter",
  "boss",
  "flashback",
  "conquest",
  "repair",
  "failed",
]);
