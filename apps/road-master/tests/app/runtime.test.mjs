import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { buildRoadMasterRuntime } from "../../src/app/runtime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.resolve(__dirname, "../../data");

async function readJson(...parts) {
  const filePath = path.join(dataRoot, ...parts);
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loadPack(packDir) {
  return {
    manifest: await readJson(packDir, "pack.json"),
    concepts: await readJson(packDir, "concepts.json"),
    traps: await readJson(packDir, "trap-taxonomy.json"),
    bosses: await readJson(packDir, "bosses.json"),
    analogies: await readJson(packDir, "analogies.json"),
    explanations: await readJson(packDir, "explanations.json"),
    templates: await readJson(packDir, "templates.json"),
    questions: await readJson(packDir, "questions.json"),
  };
}

test("chapter II pack builds a generated runtime with region, submap, and boss route", async () => {
  const pack = await loadPack("chapter-2-switchback-ridge");
  const runtime = buildRoadMasterRuntime("chapter-2-switchback-ridge", pack);

  assert.equal(runtime.chapter, "Chapter II");
  assert.equal(runtime.region, "Switchback Ridge");
  assert.equal(runtime.route.length, 7);
  assert.equal(runtime.reclaimRoute.length >= 2, true);
  assert.equal(runtime.mapDefinition.region.id, "switchback_ridge");
  assert.equal(runtime.questions.length, 14);
  assert.equal(runtime.bossData.title, "The Warden of the Folded Road");
  assert.equal(runtime.mapIndex.main.nodesById.get(runtime.route.at(-1)).type, "boss");
});

test("chapter III pack builds a generated runtime with catalog-driven shell data", async () => {
  const pack = await loadPack("chapter-3-lantern-docks");
  const runtime = buildRoadMasterRuntime("chapter-3-lantern-docks", pack);

  assert.equal(runtime.chapter, "Chapter III");
  assert.equal(runtime.region, "Lantern Docks");
  assert.equal(runtime.submap, "Fog Quay");
  assert.equal(runtime.questionsByArc.boss.length > 0, true);
  assert.equal(runtime.encounterConfig.bossId, "lantern-warden");
  assert.equal(runtime.mapDefinition.submaps[0].title, "Fog Quay");
  assert.equal(runtime.getQuestionByIndex(0).id, "ld-q-001");
});
