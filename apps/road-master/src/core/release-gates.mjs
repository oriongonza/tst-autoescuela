import { deepFreeze, indexBy } from "./contract-utils.mjs";
import { FOUNDATION_VERSION } from "./types.mjs";

export const RELEASE_GATES = deepFreeze([
  {
    id: "gate-0-1-0",
    version: "0.1.0",
    name: "MVP vertical slice",
    summary: "Prove the thesis publicly or in a real beta with one coherent chapter.",
    mustHave: [
      "Contracts are frozen for the chapter-facing data model.",
      "The map, combat, pacing, memory, narrative, and telemetry loops are integrated.",
      "One region and one boss can be played end to end.",
      "Known mistakes trigger flashbacks and reclaim loops.",
    ],
    mustNotHave: [
      "Broad curriculum sprawl.",
      "Social and B2B surfaces that distract from the proof.",
      "Chapter-specific engine code paths that cannot generalize.",
    ],
    rationale: "This is the smallest release that can falsify or prove the product thesis.",
  },
  {
    id: "gate-0-3-0",
    version: "0.3.0",
    name: "Combat depth",
    summary: "The loop must feel richer, more game-like, and less repetitive.",
    mustHave: [
      "Combat depth beyond a flat question loop.",
      "Phase or tempo design that changes the emotional rhythm.",
      "A retry loop that feels like a revenge attempt rather than a reset.",
    ],
    mustNotHave: ["Shallow repetition that only looks game-like."],
    rationale: "If combat does not deepen, the product reads as a dressed-up quiz app.",
  },
  {
    id: "gate-0-5-0",
    version: "0.5.0",
    name: "Memory palace proof",
    summary: "The map must be obviously doing memory work, not just decorating content.",
    mustHave: [
      "Recursive submaps or nested spatial identity.",
      "Concepts bound to places strongly enough that users can recall them spatially.",
      "Flashbacks and reclaim loops that reinforce remembered mistakes.",
    ],
    mustNotHave: ["Map surfaces that are purely cosmetic."],
    rationale: "This gate proves the product has a differentiated learning mechanic.",
  },
  {
    id: "gate-0-8-0",
    version: "0.8.0",
    name: "Predictive and institutional layer",
    summary: "The data layer must be useful enough to sell to schools and instructors.",
    mustHave: [
      "Reliable fail-risk signals.",
      "Readiness and weak-region diagnostics.",
      "Cohort or school-level reporting primitives.",
    ],
    mustNotHave: ["Prediction surfaces that are not calibrated or not actionable."],
    rationale: "This is the first moment where the product can become a serious B2B wedge.",
  },
  {
    id: "gate-1-0-0",
    version: "1.0.0",
    name: "Full product",
    summary: "The system feels complete, coherent, and durable enough to scale.",
    mustHave: [
      "Broad curriculum coverage.",
      "Multiple regions and bosses.",
      "A full narrative arc and stable progression vocabulary.",
      "Polished retention, analytics, and social surfaces that do not weaken the core loop.",
    ],
    mustNotHave: ["Loose collections of features without a unifying thesis."],
    rationale: "1.0.0 means the product is an integrated system, not a stitched-together prototype.",
  },
]);

export const RELEASE_GATE_BY_VERSION = deepFreeze(indexBy(RELEASE_GATES, "version", "release gates"));

export const ROADMAP_MILESTONE_SEQUENCE = deepFreeze([
  "0.1.0",
  "0.3.0",
  "0.5.0",
  "0.8.0",
  "1.0.0",
]);

export const RELEASE_GATES_CONTEXT = deepFreeze({
  version: FOUNDATION_VERSION,
  note: "Capability gates, not calendar dates.",
  sequence: ROADMAP_MILESTONE_SEQUENCE,
});
