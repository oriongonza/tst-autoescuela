import { bfsRoute, collectReachableNodeIds, getAdjacentNodeIds, toIdSet } from "./graph.mjs";

export function createMapState(overrides = {}) {
  return {
    activeScopeId: overrides.activeScopeId ?? null,
    activeNodeId: overrides.activeNodeId ?? null,
    visitedNodeIds: Array.from(toIdSet(overrides.visitedNodeIds)),
    visibleNodeIds: Array.from(toIdSet(overrides.visibleNodeIds)),
    unlockedNodeIds: Array.from(toIdSet(overrides.unlockedNodeIds)),
    masteredNodeIds: Array.from(toIdSet(overrides.masteredNodeIds)),
    fragileNodeIds: Array.from(toIdSet(overrides.fragileNodeIds)),
    corruptedNodeIds: Array.from(toIdSet(overrides.corruptedNodeIds)),
    visibleScopeIds: Array.from(toIdSet(overrides.visibleScopeIds)),
    unlockedScopeIds: Array.from(toIdSet(overrides.unlockedScopeIds)),
    masteredScopeIds: Array.from(toIdSet(overrides.masteredScopeIds)),
    fragileScopeIds: Array.from(toIdSet(overrides.fragileScopeIds)),
    corruptedScopeIds: Array.from(toIdSet(overrides.corruptedScopeIds)),
    conceptProgressById: { ...(overrides.conceptProgressById ?? {}) },
    trapNodeStates: { ...(overrides.trapNodeStates ?? {}) },
  };
}

export function openNode(mapState, nodeId, { scopeId = mapState.activeScopeId } = {}) {
  return {
    ...mapState,
    activeNodeId: nodeId,
    activeScopeId: scopeId,
    visitedNodeIds: Array.from(new Set([...mapState.visitedNodeIds, nodeId])),
  };
}

export function openSubmap(mapState, submapId, entryNodeId) {
  return {
    ...mapState,
    activeScopeId: submapId,
    activeNodeId: entryNodeId ?? mapState.activeNodeId,
    visibleScopeIds: Array.from(new Set([...mapState.visibleScopeIds, submapId])),
    unlockedScopeIds: Array.from(new Set([...mapState.unlockedScopeIds, submapId])),
    visitedNodeIds: Array.from(new Set([...mapState.visitedNodeIds, entryNodeId].filter(Boolean))),
  };
}

export function closeSubmap(mapState, regionScopeId, returnNodeId) {
  return {
    ...mapState,
    activeScopeId: regionScopeId,
    activeNodeId: returnNodeId ?? mapState.activeNodeId,
    visitedNodeIds: Array.from(new Set([...mapState.visitedNodeIds, returnNodeId].filter(Boolean))),
  };
}

export function buildRoute(graphIndex, startNodeId, targetNodeId) {
  return bfsRoute(graphIndex, startNodeId, targetNodeId);
}

export function getActiveRoute(graphIndex, mapState, { startNodeId = null } = {}) {
  const entryNodeId = startNodeId ?? graphIndex.entryNodeId;
  return bfsRoute(graphIndex, entryNodeId, mapState.activeNodeId ?? entryNodeId);
}

export function getReachableNodeIds(graphIndex, startNodeId, maxDepth = Infinity) {
  return collectReachableNodeIds(graphIndex, startNodeId, { maxDepth });
}

export function getNextNodeIds(graphIndex, nodeId) {
  return getAdjacentNodeIds(graphIndex, nodeId);
}
