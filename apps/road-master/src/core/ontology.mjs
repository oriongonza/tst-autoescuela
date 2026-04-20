import { deepFreeze } from "./contract-utils.mjs";
import {
  ATTACK_TIERS,
  ATTACK_TYPES,
  FOUNDATION_VERSION,
  GRAPH_EDGE_TYPES,
  GRAPH_NODE_TYPES,
  MASTERY_STATES,
  PACE_STATES,
  REGION_STATES,
} from "./types.mjs";

export const ONTOLOGY = deepFreeze({
  version: FOUNDATION_VERSION,
  name: "Road Master Ontology v0",
  description:
    "The canonical entity model for concepts, traps, regions, bosses, questions, attacks, mastery state, and pace state.",
  states: {
    mastery: MASTERY_STATES,
    pace: PACE_STATES,
    attackTier: ATTACK_TIERS,
    attackType: ATTACK_TYPES,
    region: REGION_STATES,
  },
  entities: {
    concept: {
      purpose: "Atomic unit of learning and mastery.",
      requiredFields: ["id", "title", "summary", "regionId", "masteryState"],
      optionalFields: ["trapPatternIds", "parentConceptIds", "analogyId", "difficulty"],
      relationships: ["prerequisite", "exception", "confusion", "similarity"],
    },
    trapPattern: {
      purpose: "A repeatable failure mode or distractor family.",
      requiredFields: ["id", "title", "summary", "failureMode", "counterplay"],
      optionalFields: ["examples", "conceptIds", "regionId"],
      relationships: ["confusion", "similarity"],
    },
    region: {
      purpose: "A spatial cluster of related concepts and encounters.",
      requiredFields: ["id", "title", "theme", "state", "conceptIds"],
      optionalFields: ["bossId", "submapIds", "trapPatternIds", "audioTheme", "visualTheme"],
      relationships: ["contains", "boss_of", "submap_of"],
    },
    boss: {
      purpose: "The guardian encounter that tests a region spine.",
      requiredFields: ["id", "title", "regionId", "phaseIds", "introLineId", "defeatLineId"],
      optionalFields: ["signatureAttackIds", "victoryRitualId"],
      relationships: ["boss_of"],
    },
    submap: {
      purpose: "A nested spatial recursion inside a region.",
      requiredFields: ["id", "title", "regionId", "conceptIds"],
      optionalFields: ["parentSubmapId", "bossId", "entryLineId"],
      relationships: ["submap_of", "contains"],
    },
    question: {
      purpose: "The answerable unit that becomes a combat attack.",
      requiredFields: [
        "id",
        "prompt",
        "answers",
        "correctIndex",
        "conceptIds",
        "trapIds",
        "difficulty",
        "tier",
        "attackType",
        "regionId",
      ],
      optionalFields: ["submapId", "explanationId", "analogyId", "damageOverride", "flashbackRegionId"],
      relationships: ["prerequisite", "exception", "confusion"],
    },
    attack: {
      purpose: "The combat presentation of a question.",
      requiredFields: ["id", "questionId", "tier", "attackType", "baseDamage", "phase"],
      optionalFields: ["telegraphLabel", "bossId"],
      relationships: ["contains"],
    },
    masteryState: {
      purpose: "The progress snapshot for a concept.",
      requiredFields: ["conceptId", "masteryState", "learnedScore", "stabilityScore"],
      optionalFields: ["firstLearnedAt", "masteredAt", "lastSeenAt", "knownMistakeCount"],
      relationships: ["contains"],
    },
    paceState: {
      purpose: "The current emotional and mechanical rhythm of a run.",
      requiredFields: ["state", "hp", "maxHp", "momentum", "frustration", "boredom"],
      optionalFields: ["shield", "bossPhase", "questionsSinceRelief", "nearVictory"],
      relationships: [],
    },
    flashbackEvent: {
      purpose: "A known-ground slip that should reactivate spatial memory.",
      requiredFields: ["conceptIds", "regionId", "reason", "triggeredAt"],
      optionalFields: ["submapId", "trapIds", "reclaimQuestionId"],
      relationships: ["exception", "confusion"],
    },
  },
  graphNodeTypes: GRAPH_NODE_TYPES,
  graphEdgeTypes: GRAPH_EDGE_TYPES,
  contractNotes: [
    "Chapter content must attach to these entities instead of inventing new foundation nouns.",
    "Question data, combat data, and spatial data should share identifiers so telemetry can join them later.",
    "The engine should stay chapter-agnostic and consume data packs by contract only.",
  ],
});
