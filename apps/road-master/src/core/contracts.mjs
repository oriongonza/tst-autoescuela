import { deepFreeze, indexBy } from "./contract-utils.mjs";
import { DOCTRINE } from "./doctrine.mjs";
import { GRAPH_GRAMMAR } from "./graph-grammar.mjs";
import { ONTOLOGY } from "./ontology.mjs";
import {
  RELEASE_GATE_BY_VERSION,
  RELEASE_GATES,
  RELEASE_GATES_CONTEXT,
  ROADMAP_MILESTONE_SEQUENCE,
} from "./release-gates.mjs";
import { createPlayerState, createRunState, RUN_STATE_TEMPLATE } from "./state.mjs";
import { FOUNDATION_VERSION } from "./types.mjs";
import { TELEMETRY_EVENT_CATALOG, TELEMETRY_EVENT_BY_NAME } from "../systems/telemetry/catalog.mjs";

export const CONTRACT_FREEZE = deepFreeze({
  version: FOUNDATION_VERSION,
  status: "frozen",
  frozenSurfaces: [
    "doctrine",
    "ontology",
    "graph grammar",
    "run state",
    "player state",
    "telemetry catalog",
    "release gates",
  ],
  rules: [
    "Do not rename frozen nouns without a version bump and a migration note.",
    "Do not repurpose an existing event name or enum value for a new meaning.",
    "Do not hardcode Chapter I into engine code when the content pack can carry the data.",
    "Additive changes are preferred; breaking changes must be explicit and documented.",
    "Unknown content may be extended, but unknown core contracts should not silently drift.",
  ],
});

export const FOUNDATION_CONTRACTS = deepFreeze({
  product: {
    id: "road-master",
    name: "Road Master",
    slice: "Crossing Fields",
    version: FOUNDATION_VERSION,
  },
  doctrine: DOCTRINE,
  ontology: ONTOLOGY,
  graphGrammar: GRAPH_GRAMMAR,
  state: {
    runTemplate: RUN_STATE_TEMPLATE,
    createPlayerState,
    createRunState,
  },
  telemetry: {
    catalog: TELEMETRY_EVENT_CATALOG,
    byName: TELEMETRY_EVENT_BY_NAME,
  },
  releaseGates: RELEASE_GATES,
  releaseGateByVersion: RELEASE_GATE_BY_VERSION,
  releaseGateContext: RELEASE_GATES_CONTEXT,
  roadmapMilestoneSequence: ROADMAP_MILESTONE_SEQUENCE,
  contractFreeze: CONTRACT_FREEZE,
});

/**
 * @returns {typeof FOUNDATION_CONTRACTS}
 */
export function getFoundationContractSnapshot() {
  return FOUNDATION_CONTRACTS;
}

/**
 * @returns {Record<string, unknown>}
 */
export function getFoundationCatalogIndex() {
  return {
    releaseGates: indexBy(RELEASE_GATES, "id", "release gates"),
    telemetryEvents: indexBy(TELEMETRY_EVENT_CATALOG, "name", "telemetry events"),
  };
}
