import { buildMapIndex } from "./graph.mjs";
import { buildMapView, deriveRouteTail } from "./node-states.mjs";

function countRecursiveSubmaps(submaps = []) {
  if (!Array.isArray(submaps) || submaps.length === 0) {
    return 0;
  }

  let deepest = 0;

  for (const submap of submaps) {
    const nestedDepth = countRecursiveSubmaps(submap.submaps ?? []);
    deepest = Math.max(deepest, 1 + nestedDepth);
  }

  return deepest;
}

function toIdList(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

export function deriveMapProgressionCue(definition, context = {}) {
  const mapIndex = context.mapIndex ?? buildMapIndex(definition);
  const mapView = buildMapView(definition, {
    ...context,
    mapIndex,
  });
  const activeGraph =
    mapView.activeScopeId === definition.region.id
      ? mapIndex.main
      : mapIndex.submaps[mapView.activeScopeId] ?? mapIndex.main;
  const bossNode = mapIndex.main.nodesById.get(definition.bossNodeId) ?? null;
  const bossPath = deriveRouteTail(
    mapIndex.main,
    mapIndex.main.entryNodeId,
    bossNode?.id ?? definition.bossNodeId ?? null,
  );
  const remainingRoute = deriveRouteTail(
    activeGraph,
    mapView.activeNodeId ?? activeGraph.entryNodeId,
    bossNode?.id ?? definition.bossNodeId ?? null,
  );
  const submapViews = mapView.submapViews ?? [];
  const unlockedSubmapIds = submapViews.filter((submap) => submap.state !== "locked").map((submap) => submap.id);
  const visibleSubmapIds = submapViews
    .filter((submap) => ["visible", "unlocked", "mastered", "fragile", "corrupted"].includes(submap.state))
    .map((submap) => submap.id);
  const lockedSubmapIds = submapViews.filter((submap) => submap.state === "locked").map((submap) => submap.id);
  const recursionDepth = countRecursiveSubmaps(definition.submaps ?? []);

  return {
    kind: "map_progression",
    regionId: definition.region.id,
    regionTitle: definition.region.title,
    activeScopeId: mapView.activeScopeId,
    activeNodeId: mapView.activeNodeId,
    bossNodeId: bossNode?.id ?? definition.bossNodeId ?? null,
    bossPathNodeIds: bossPath,
    remainingRouteNodeIds: remainingRoute,
    nextGateNodeId: remainingRoute[0] ?? bossNode?.id ?? null,
    recursionDepth,
    routeLength: bossPath.length,
    remainingDistance: remainingRoute.length,
    routeProgressPercent: bossPath.length > 0 ? Math.round(((bossPath.length - remainingRoute.length) / bossPath.length) * 100) : 0,
    routePressure: remainingRoute.length <= 1 ? "high" : remainingRoute.length <= 3 ? "medium" : "low",
    submapCount: submapViews.length,
    unlockedSubmapIds: toIdList(unlockedSubmapIds),
    visibleSubmapIds: toIdList(visibleSubmapIds),
    lockedSubmapIds: toIdList(lockedSubmapIds),
    bossReached: Boolean(mapView.routeNodeIds.includes(bossNode?.id ?? definition.bossNodeId ?? "")),
    memoryCue: recursionDepth > 0 ? "The road folds inward." : "The road stays flat.",
  };
}
