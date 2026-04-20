export {
  ARC_ORDER,
  DEFAULT_PACK_ID,
  QUESTIONS_PER_NODE,
  QUESTIONS_PER_PHASE,
  buildRoadMasterRuntime,
  loadRoadMasterRuntime,
} from "./runtime.js";

import { DEFAULT_PACK_ID, buildRoadMasterRuntime, loadRoadMasterRuntime } from "./runtime.js";

export function buildChapter1Runtime(pack) {
  return buildRoadMasterRuntime(DEFAULT_PACK_ID, pack);
}

export async function loadChapter1Runtime(fetchImpl = globalThis.fetch) {
  return loadRoadMasterRuntime(DEFAULT_PACK_ID, fetchImpl);
}
