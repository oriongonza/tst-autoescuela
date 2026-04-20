import { deepFreeze } from "./contract-utils.mjs";
import { FOUNDATION_VERSION, GRAPH_EDGE_TYPES, GRAPH_NODE_TYPES } from "./types.mjs";

export const GRAPH_GRAMMAR = deepFreeze({
  version: FOUNDATION_VERSION,
  name: "Road Master Graph Grammar v0",
  nodeFamilies: GRAPH_NODE_TYPES,
  edgeFamilies: GRAPH_EDGE_TYPES,
  projectionRules: [
    "A region is the primary visible plane.",
    "A submap is a nested recursive plane inside exactly one parent region.",
    "Boss nodes are region guards, not free-floating encounters.",
    "Encounter nodes may be projected as pressure points along the region path.",
    "Concept nodes should appear as place-linked landmarks wherever possible.",
  ],
  clusteringRules: [
    "Every region groups related concepts, trap patterns, and at most one mandatory boss for the slice.",
    "Every question must resolve to one canonical region and may optionally resolve to one submap.",
    "Trap patterns belong to the same region as the concepts they confuse.",
    "Similarity and confusion edges are lateral and must not unlock content by themselves.",
  ],
  recursionRules: [
    "Only submap nodes create recursion.",
    "A submap can reuse the same node families as its parent region but must keep distinct identifiers.",
    "Recursive depth should stay shallow in the foundations slice so the player reads the structure at a glance.",
  ],
  edgeSemantics: {
    prerequisite: "Directional dependency from easier or earlier concept to later concept.",
    exception: "A rule override or special-case relationship.",
    confusion: "A likely mistake or trap relationship.",
    similarity: "A mnemonic or contrast relationship.",
    contains: "Structural containment for regions, submaps, concepts, or encounters.",
    unlocks: "Progression linkage that reveals downstream content.",
    boss_of: "Structural ownership from boss to region.",
    submap_of: "Structural ownership from submap to region.",
  },
  contractFields: {
    node: ["id", "type", "title", "regionId", "tags"],
    edge: ["id", "from", "to", "type", "weight"],
  },
  antiPatterns: [
    "Hardcoding Chapter I into engine code.",
    "Using similarity edges as if they were prerequisites.",
    "Creating a region with no spatial identity.",
    "Creating recursive maps that are not visually legible in the foundations slice.",
  ],
});
