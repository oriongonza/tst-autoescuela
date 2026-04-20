import { chapter1MapDefinition } from "../../src/systems/map/chapter1.mjs";
import { createMapState } from "../../src/systems/map/navigation.mjs";
import { createConceptProgress } from "../../src/systems/memory/state.mjs";

export const sampleConceptProgressById = {
  "initiative-order": createConceptProgress({
    masteryState: "mastered",
    learnedScore: 0.96,
    understoodScore: 0.9,
    comprehendedScore: 0.88,
    stabilityScore: 0.92,
    slipCount: 0,
  }),
  "priority-basics": createConceptProgress({
    masteryState: "learned",
    learnedScore: 0.82,
    understoodScore: 0.77,
    comprehendedScore: 0.71,
    stabilityScore: 0.78,
    slipCount: 1,
  }),
  "default-yield": createConceptProgress({
    masteryState: "new",
    learnedScore: 0.12,
    understoodScore: 0.1,
    comprehendedScore: 0.08,
    stabilityScore: 0.18,
  }),
  "stop-command": createConceptProgress({
    masteryState: "mastered",
    learnedScore: 0.98,
    understoodScore: 0.95,
    comprehendedScore: 0.91,
    stabilityScore: 0.95,
  }),
  "yield-command": createConceptProgress({
    masteryState: "learned",
    learnedScore: 0.78,
    understoodScore: 0.74,
    comprehendedScore: 0.69,
    stabilityScore: 0.73,
  }),
  "signal-hierarchy": createConceptProgress({
    masteryState: "learned",
    learnedScore: 0.74,
    understoodScore: 0.7,
    comprehendedScore: 0.66,
    stabilityScore: 0.7,
  }),
  "temporary-override": createConceptProgress({
    masteryState: "fragile",
    learnedScore: 0.6,
    understoodScore: 0.54,
    comprehendedScore: 0.5,
    stabilityScore: 0.52,
    slipCount: 1,
  }),
  "sign-overrides-intuition": createConceptProgress({
    masteryState: "new",
    learnedScore: 0.08,
    understoodScore: 0.05,
    comprehendedScore: 0.02,
    stabilityScore: 0.12,
  }),
  "false-obvious": createConceptProgress({
    masteryState: "fragile",
    learnedScore: 0.58,
    understoodScore: 0.51,
    comprehendedScore: 0.48,
    stabilityScore: 0.46,
    slipCount: 2,
  }),
  "tiny-override": createConceptProgress({
    masteryState: "corrupted",
    learnedScore: 0.44,
    understoodScore: 0.4,
    comprehendedScore: 0.36,
    stabilityScore: 0.24,
    slipCount: 3,
  }),
  "last-word-trap": createConceptProgress({
    masteryState: "learned",
    learnedScore: 0.67,
    understoodScore: 0.61,
    comprehendedScore: 0.57,
    stabilityScore: 0.66,
    slipCount: 1,
  }),
};

export const sampleMapState = createMapState({
  activeScopeId: "crossing_fields",
  activeNodeId: "signal-command-post",
  visitedNodeIds: ["crossing-fields-gate", "initiative-ridge", "signal-command-post"],
  visibleNodeIds: [
    "crossing-fields-gate",
    "initiative-ridge",
    "signal-command-post",
    "exception-bastion",
    "observer-post",
    "trap-archive",
    "four-way-labyrinth-gate",
  ],
  unlockedNodeIds: ["initiative-ridge", "signal-command-post", "exception-bastion"],
  masteredNodeIds: ["crossing-fields-gate"],
  fragileNodeIds: ["trap-archive"],
  corruptedNodeIds: ["labyrinth-known-ground-slip"],
  visibleScopeIds: ["crossing_fields", "four_way_labyrinth"],
  unlockedScopeIds: ["crossing_fields", "four_way_labyrinth"],
  masteredScopeIds: [],
  conceptProgressById: sampleConceptProgressById,
  trapNodeStates: {
    "trap-archive": "fragile",
    "labyrinth-known-ground-slip": "corrupted",
  },
});

export const sampleKnownGroundQuestion = {
  id: "q-known-ground-slip",
  prompt: "Who goes first at the crossroads when the sign says yield?",
  answers: ["The first car to arrive", "The vehicle already on the road", "Anyone with the loudest horn"],
  correctIndex: 1,
  conceptIds: ["initiative-order", "priority-basics"],
  trapIds: ["known_ground_slip", "false_obvious"],
  difficulty: 0.61,
  tier: "trap",
  attackType: "mixed",
  regionId: "crossing_fields",
  submapId: "four_way_labyrinth",
  flashbackRegionId: "crossing_fields",
  flashbackSubmapId: "four_way_labyrinth",
  flashbackNodeId: "labyrinth-known-ground-slip",
  reclaimEligible: true,
};

export const sampleFreshQuestion = {
  id: "q-fresh-concept",
  prompt: "What should you do first at an unfamiliar junction?",
  answers: ["Read the road", "Guess fast", "Ignore signs"],
  correctIndex: 0,
  conceptIds: ["sign-overrides-intuition"],
  trapIds: ["visual_decoy"],
  difficulty: 0.35,
  tier: "light",
  attackType: "visual",
  regionId: "crossing_fields",
};

export const sampleChapter1Map = chapter1MapDefinition;
