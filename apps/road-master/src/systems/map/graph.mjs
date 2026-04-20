const DEFAULT_EDGE_WEIGHT = 1;

export function cloneArray(value = []) {
  return Array.isArray(value) ? [...value] : [];
}

export function toIdSet(value = []) {
  if (value instanceof Set) {
    return new Set(value);
  }

  if (Array.isArray(value)) {
    return new Set(value.filter(Boolean));
  }

  if (value && typeof value === "object") {
    return new Set(
      Object.entries(value)
        .filter(([, flag]) => Boolean(flag))
        .map(([key]) => key),
    );
  }

  return new Set();
}

export function indexById(items, label) {
  const index = new Map();

  for (const item of items) {
    if (!item || typeof item.id !== "string" || item.id.length === 0) {
      throw new Error(`Invalid ${label} entry without an id`);
    }

    if (index.has(item.id)) {
      throw new Error(`Duplicate ${label} id: ${item.id}`);
    }

    index.set(item.id, item);
  }

  return index;
}

export function buildGraphIndex({ scopeId, nodes = [], edges = [], entryNodeId = null }) {
  const nodesById = indexById(nodes, `nodes in scope ${scopeId ?? "unknown"}`);
  const edgesById = indexById(edges, `edges in scope ${scopeId ?? "unknown"}`);
  const outgoingByNodeId = new Map();
  const incomingByNodeId = new Map();

  for (const edge of edges) {
    if (!nodesById.has(edge.from)) {
      throw new Error(`Edge ${edge.id} points from missing node ${edge.from}`);
    }

    if (!nodesById.has(edge.to)) {
      throw new Error(`Edge ${edge.id} points to missing node ${edge.to}`);
    }

    const outgoing = outgoingByNodeId.get(edge.from) ?? [];
    outgoing.push(edge);
    outgoingByNodeId.set(edge.from, outgoing);

    const incoming = incomingByNodeId.get(edge.to) ?? [];
    incoming.push(edge);
    incomingByNodeId.set(edge.to, incoming);
  }

  return {
    scopeId,
    entryNodeId: entryNodeId ?? nodes[0]?.id ?? null,
    nodes: cloneArray(nodes),
    edges: cloneArray(edges),
    nodesById,
    edgesById,
    outgoingByNodeId,
    incomingByNodeId,
  };
}

export function buildMapIndex(definition) {
  const main = buildGraphIndex({
    scopeId: definition.region.id,
    nodes: definition.nodes,
    edges: definition.edges,
    entryNodeId: definition.entryNodeId,
  });

  const submaps = {};
  const allNodes = [...definition.nodes];
  const allEdges = [...definition.edges];

  for (const submap of definition.submaps ?? []) {
    const graph = buildGraphIndex({
      scopeId: submap.id,
      nodes: submap.nodes,
      edges: submap.edges,
      entryNodeId: submap.entryNodeId,
    });

    submaps[submap.id] = graph;
    allNodes.push(...submap.nodes);
    allEdges.push(...submap.edges);
  }

  return {
    definition,
    main,
    submaps,
    allNodesById: indexById(allNodes, "all nodes"),
    allEdgesById: indexById(allEdges, "all edges"),
  };
}

export function bfsRoute(graph, startNodeId, targetNodeId, { allowedNodeIds = null } = {}) {
  if (!startNodeId || !targetNodeId) {
    return [];
  }

  if (startNodeId === targetNodeId) {
    return [startNodeId];
  }

  const allowed = allowedNodeIds ? toIdSet(allowedNodeIds) : null;
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

      if (allowed && !allowed.has(nextNodeId) && nextNodeId !== targetNodeId) {
        continue;
      }

      const nextPath = [...path, nextNodeId];
      if (nextNodeId === targetNodeId) {
        return nextPath;
      }

      visited.add(nextNodeId);
      queue.push(nextPath);
    }
  }

  return [];
}

export function getAdjacentNodeIds(graph, nodeId) {
  const outgoing = graph.outgoingByNodeId.get(nodeId) ?? [];
  return outgoing.map((edge) => edge.to);
}

export function collectReachableNodeIds(graph, startNodeId, { maxDepth = Infinity } = {}) {
  if (!startNodeId) {
    return new Set();
  }

  const reachable = new Set([startNodeId]);
  const queue = [{ nodeId: startNodeId, depth: 0 }];

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift();
    if (depth >= maxDepth) {
      continue;
    }

    for (const nextNodeId of getAdjacentNodeIds(graph, nodeId)) {
      if (reachable.has(nextNodeId)) {
        continue;
      }

      reachable.add(nextNodeId);
      queue.push({ nodeId: nextNodeId, depth: depth + 1 });
    }
  }

  return reachable;
}

export function attachDefaultEdgeWeights(edges) {
  return edges.map((edge) => ({
    weight: DEFAULT_EDGE_WEIGHT,
    ...edge,
  }));
}
