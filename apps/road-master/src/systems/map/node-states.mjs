import { buildMapIndex, getAdjacentNodeIds, toIdSet } from "./graph.mjs";

function normalizeProgressRecord(progress) {
  if (!progress || typeof progress !== "object") {
    return null;
  }

  return {
    masteryState: progress.masteryState ?? "new",
    stabilityScore: Number.isFinite(progress.stabilityScore) ? progress.stabilityScore : 0,
  };
}

function resolveStateFromProgressRecords(progressRecords = []) {
  const states = progressRecords.map(normalizeProgressRecord).filter(Boolean);

  if (states.length === 0) {
    return null;
  }

  if (states.some((state) => state.masteryState === "corrupted")) {
    return "corrupted";
  }

  if (states.some((state) => state.masteryState === "fragile")) {
    return "fragile";
  }

  if (states.every((state) => state.masteryState === "mastered")) {
    return "mastered";
  }

  if (states.some((state) => state.masteryState === "learned" || state.masteryState === "mastered")) {
    return "unlocked";
  }

  return null;
}

export function createMapViewState(overrides = {}) {
  return {
    activeScopeId: overrides.activeScopeId ?? null,
    activeNodeId: overrides.activeNodeId ?? null,
    visibleNodeIds: toIdSet(overrides.visibleNodeIds),
    unlockedNodeIds: toIdSet(overrides.unlockedNodeIds),
    masteredNodeIds: toIdSet(overrides.masteredNodeIds),
    fragileNodeIds: toIdSet(overrides.fragileNodeIds),
    corruptedNodeIds: toIdSet(overrides.corruptedNodeIds),
    visibleScopeIds: toIdSet(overrides.visibleScopeIds),
    unlockedScopeIds: toIdSet(overrides.unlockedScopeIds),
    masteredScopeIds: toIdSet(overrides.masteredScopeIds),
    fragileScopeIds: toIdSet(overrides.fragileScopeIds),
    corruptedScopeIds: toIdSet(overrides.corruptedScopeIds),
    conceptProgressById: { ...(overrides.conceptProgressById ?? {}) },
    trapNodeStates: { ...(overrides.trapNodeStates ?? {}) },
    mapIndex: overrides.mapIndex ?? null,
    maxVisibilityDepth: Number.isFinite(overrides.maxVisibilityDepth) ? overrides.maxVisibilityDepth : 2,
  };
}

export function deriveNodeState(node, context = {}) {
  const corruptedNodeIds = toIdSet(context.corruptedNodeIds);
  const fragileNodeIds = toIdSet(context.fragileNodeIds);
  const masteredNodeIds = toIdSet(context.masteredNodeIds);
  const unlockedNodeIds = toIdSet(context.unlockedNodeIds);
  const visibleNodeIds = toIdSet(context.visibleNodeIds);
  const routeNodeIds = toIdSet(context.routeNodeIds);
  const openSubmapIds = toIdSet(context.openSubmapIds);
  const unlockedScopeIds = toIdSet(context.unlockedScopeIds);
  const visibleScopeIds = toIdSet(context.visibleScopeIds);
  const trapNodeStates = context.trapNodeStates ?? {};
  const conceptProgressById = context.conceptProgressById ?? {};

  if (corruptedNodeIds.has(node.id)) {
    return "corrupted";
  }

  if (fragileNodeIds.has(node.id)) {
    return "fragile";
  }

  if (masteredNodeIds.has(node.id)) {
    return "mastered";
  }

  if (unlockedNodeIds.has(node.id)) {
    return "unlocked";
  }

  if (trapNodeStates[node.id] && trapNodeStates[node.id] !== "locked") {
    return trapNodeStates[node.id];
  }

  const conceptStates = Array.isArray(node.conceptIds)
    ? node.conceptIds.map((conceptId) => conceptProgressById[conceptId]).filter(Boolean)
    : [];

  const derivedFromProgress = resolveStateFromProgressRecords(conceptStates);
  if (derivedFromProgress) {
    return derivedFromProgress;
  }

  if (node.type === "submap" && node.opensSubmapId && (openSubmapIds.has(node.opensSubmapId) || unlockedScopeIds.has(node.opensSubmapId))) {
    return "unlocked";
  }

  if (node.type === "region" && (visibleScopeIds.has(node.regionId) || unlockedScopeIds.has(node.regionId))) {
    return unlockedScopeIds.has(node.regionId) ? "unlocked" : "visible";
  }

  if (visibleNodeIds.has(node.id) || routeNodeIds.has(node.id)) {
    return "visible";
  }

  return "locked";
}

export function deriveScopeState(scopeId, context = {}) {
  const corruptedScopeIds = toIdSet(context.corruptedScopeIds);
  const fragileScopeIds = toIdSet(context.fragileScopeIds);
  const masteredScopeIds = toIdSet(context.masteredScopeIds);
  const unlockedScopeIds = toIdSet(context.unlockedScopeIds);
  const visibleScopeIds = toIdSet(context.visibleScopeIds);

  if (corruptedScopeIds.has(scopeId)) {
    return "corrupted";
  }

  if (fragileScopeIds.has(scopeId)) {
    return "fragile";
  }

  if (masteredScopeIds.has(scopeId)) {
    return "mastered";
  }

  if (unlockedScopeIds.has(scopeId)) {
    return "unlocked";
  }

  if (visibleScopeIds.has(scopeId)) {
    return "visible";
  }

  return "locked";
}

export function deriveMapView(definition, context = {}) {
  const mapIndex = context.mapIndex ?? buildMapIndex(definition);
  const activeScopeId = context.activeScopeId ?? definition.region.id;
  const graph = activeScopeId === definition.region.id ? mapIndex.main : mapIndex.submaps[activeScopeId] ?? mapIndex.main;
  const activeNodeId = context.activeNodeId ?? graph.entryNodeId;
  const route = activeNodeId ? [graph.entryNodeId, ...deriveRouteTail(graph, graph.entryNodeId, activeNodeId)] : [];
  const routeNodeIds = toIdSet(route);
  const reachableNodeIds = context.maxVisibilityDepth === Infinity
    ? routeNodeIds
    : new Set([
        ...routeNodeIds,
        ...Array.from(routeNodeIds).flatMap((nodeId) => getAdjacentNodeIds(graph, nodeId)),
      ]);
  const visibleNodeIds = new Set([
    ...toIdSet(context.visibleNodeIds),
    ...reachableNodeIds,
  ]);

  const nodeViews = graph.nodes.map((node) => ({
    ...node,
    state: deriveNodeState(node, {
      ...context,
      activeScopeId,
      activeNodeId,
      visibleNodeIds,
      routeNodeIds,
    }),
    isCurrent: node.id === activeNodeId,
    isOnRoute: routeNodeIds.has(node.id),
    nextNodeIds: getAdjacentNodeIds(graph, node.id),
  }));

  const edgeViews = graph.edges.map((edge) => ({
    ...edge,
    isOnRoute: routeNodeIds.has(edge.from) && routeNodeIds.has(edge.to),
  }));

  const submapViews = (definition.submaps ?? []).map((submap) => ({
    id: submap.id,
    title: submap.title,
    purpose: submap.purpose,
    state: deriveScopeState(submap.id, context),
    entryNodeId: submap.entryNodeId,
    nodeCount: submap.nodes.length,
  }));

  return {
    region: definition.region,
    activeScopeId,
    activeNodeId,
    routeNodeIds: route,
    scopeState: deriveScopeState(activeScopeId, context),
    regionState: deriveScopeState(definition.region.id, context),
    nodeViews,
    edgeViews,
    submapViews,
    mapIndex,
  };
}

export function buildMapView(definition, context = {}) {
  return deriveMapView(definition, context);
}

export function deriveRouteTail(graph, startNodeId, targetNodeId) {
  if (!startNodeId || !targetNodeId || startNodeId === targetNodeId) {
    return [];
  }

  const queue = [[startNodeId]];
  const visited = new Set([startNodeId]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    const neighbors = graph.outgoingByNodeId.get(current) ?? [];

    for (const edge of neighbors) {
      const nextNodeId = edge.to;
      if (visited.has(nextNodeId)) {
        continue;
      }

      const nextPath = [...path, nextNodeId];
      if (nextNodeId === targetNodeId) {
        return nextPath.slice(1);
      }

      visited.add(nextNodeId);
      queue.push(nextPath);
    }
  }

  return [];
}
