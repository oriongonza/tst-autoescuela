import { deepFreeze } from "./contract-utils.mjs";
import { FOUNDATION_VERSION } from "./types.mjs";

export const DOCTRINE = deepFreeze({
  version: FOUNDATION_VERSION,
  productName: "Road Master",
  chapterName: "Crossing Fields",
  thesis:
    "Driving theory can be transformed into a graph-structured narrative combat world that acts as a memory palace, improving engagement, memory, and performance.",
  objectiveFunction:
    "Maximize learning, long-term retention, readiness, perceived progress, and high-quality product data while penalizing frustration, fatigue, and empty gamification.",
  pillars: [
    "The unit of progress is the concept, not the raw question.",
    "The map is a memory palace and must feel spatially legible.",
    "Mistakes must sting, but recovery must be possible and meaningful.",
    "The product should show progress clearly and predict risk honestly.",
    "All chapter content must be data, not hardcoded engine logic.",
  ],
  nonGoals: [
    "Fake Duolingo breadth before the vertical slice is proven.",
    "Global leaderboards that punish users for being early learners.",
    "Social, B2B, and personalization features before the foundations contract is stable.",
    "Procedural complexity that weakens content clarity.",
  ],
  voiceRules: {
    mentorTone: "severe, sparse, ceremonial",
    rewardTone: "earned, restrained, visible",
    failureTone: "direct, corrective, non-shaming",
    doctrineStyle: "short lines that can be repeated and remembered",
  },
  proofCriteria: [
    "The system can be described in precise entities and flows instead of vibes.",
    "A static chapter pack can drive map, combat, pacing, memory, and telemetry without engine changes.",
    "The MVP can prove the thesis without broad curriculum coverage.",
  ],
  sourceOfTruth: "chatgpt_conv.md",
});
