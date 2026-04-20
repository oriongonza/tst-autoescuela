import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMapView,
  buildRoute,
  chapter1MapDefinition,
  chapter1MapIndex,
  deriveNodeState,
  deriveScopeState,
} from "../../src/systems/map/index.mjs";
import { sampleMapState } from "./fixtures.mjs";

test("chapter 1 map exposes the Crossing Fields region and the recursive submap", () => {
  assert.equal(chapter1MapDefinition.region.id, "crossing_fields");
  assert.equal(chapter1MapDefinition.submaps[0].id, "four_way_labyrinth");
  assert.equal(chapter1MapDefinition.bossNodeId, "right-of-way-beast");
  assert.equal(chapter1MapDefinition.conceptCatalog.length, 24);
  assert.equal(chapter1MapDefinition.trapPatterns.length, 10);
  assert.equal(chapter1MapIndex.main.scopeId, "crossing_fields");
  assert.equal(chapter1MapIndex.submaps.four_way_labyrinth.scopeId, "four_way_labyrinth");
});

test("chapter 1 route traverses the region spine and enters the submap before the boss", () => {
  const route = buildRoute(chapter1MapIndex.main, "crossing-fields-gate", "right-of-way-beast");

  assert.deepEqual(route, [
    "crossing-fields-gate",
    "initiative-ridge",
    "signal-command-post",
    "exception-bastion",
    "observer-post",
    "trap-archive",
    "four-way-labyrinth-gate",
    "right-of-way-beast",
  ]);
});

test("map view derives node and scope states from navigation and concept progress", () => {
  const view = buildMapView(chapter1MapDefinition, sampleMapState);

  const regionGate = view.nodeViews.find((node) => node.id === "crossing-fields-gate");
  const signalPost = view.nodeViews.find((node) => node.id === "signal-command-post");
  const trapArchive = view.nodeViews.find((node) => node.id === "trap-archive");
  const labyrinthGate = view.nodeViews.find((node) => node.id === "four-way-labyrinth-gate");
  const labyrinthSlip = chapter1MapIndex.submaps.four_way_labyrinth.nodesById.get("labyrinth-known-ground-slip");

  assert.equal(view.regionState, "unlocked");
  assert.equal(view.scopeState, "unlocked");
  assert.equal(regionGate.state, "mastered");
  assert.equal(signalPost.state, "unlocked");
  assert.equal(trapArchive.state, "fragile");
  assert.equal(labyrinthGate.state, "unlocked");
  assert.equal(deriveNodeState(labyrinthSlip, sampleMapState), "corrupted");
  assert.equal(deriveScopeState("four_way_labyrinth", sampleMapState), "unlocked");
  assert.equal(view.routeNodeIds[0], "crossing-fields-gate");
  assert.equal(view.routeNodeIds.at(-1), "signal-command-post");
});
