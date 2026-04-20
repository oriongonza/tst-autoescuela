import assert from "node:assert/strict";
import test from "node:test";

import {
  applyKnownGroundRecoveryToProgress,
  applyKnownGroundSlipToProgress,
  buildFlashbackCue,
  enqueueReclaim,
  evaluateKnownGroundSlip,
  isCorruptedConceptProgress,
  isFragileConceptProgress,
  isKnownGroundProgress,
  normalizeConceptProgress,
} from "../../src/systems/memory/index.mjs";
import {
  sampleConceptProgressById,
  sampleFreshQuestion,
  sampleKnownGroundQuestion,
} from "./fixtures.mjs";

test("known-ground slips trigger flashback and reclaim scheduling on a wrong answer", () => {
  const trigger = evaluateKnownGroundSlip({
    question: sampleKnownGroundQuestion,
    conceptProgressById: sampleConceptProgressById,
    wasCorrect: false,
    clock: 1_000_000,
  });

  assert.equal(trigger.kind, "known_ground_slip");
  assert.equal(trigger.triggered, true);
  assert.equal(trigger.severity, "severe");
  assert.deepEqual(trigger.affectedConceptIds, ["initiative-order", "priority-basics"]);
  assert.equal(trigger.flashback.regionId, "crossing_fields");
  assert.equal(trigger.flashback.submapId, "four_way_labyrinth");
  assert.equal(trigger.reclaim.afterQuestions, 1);
  assert.equal(trigger.reclaim.dueAtMs, 1_003_000);

  const cue = buildFlashbackCue(trigger, {
    regionTitle: "Crossing Fields",
    submapTitle: "The Four-Way Labyrinth",
    nodeTitle: "Known Ground Slip",
  });

  assert.equal(cue.kind, "flashback");
  assert.match(cue.message, /Known ground slipping/);

  const nextProgress = applyKnownGroundSlipToProgress(sampleConceptProgressById, trigger, {
    clock: 1_000_500,
  });

  assert.equal(nextProgress["initiative-order"].masteryState, "corrupted");
  assert.equal(nextProgress["priority-basics"].masteryState, "fragile");
  assert.equal(isCorruptedConceptProgress(nextProgress["initiative-order"]), true);
  assert.equal(isFragileConceptProgress(nextProgress["priority-basics"]), true);
});

test("fresh concepts do not trigger known-ground flashbacks", () => {
  const trigger = evaluateKnownGroundSlip({
    question: sampleFreshQuestion,
    conceptProgressById: sampleConceptProgressById,
    wasCorrect: false,
    clock: 2_000_000,
  });

  assert.equal(trigger, null);
});

test("reclaim queues sort by due time and priority, and recovery softens corrupted concepts", () => {
  const severeTrigger = evaluateKnownGroundSlip({
    question: sampleKnownGroundQuestion,
    conceptProgressById: sampleConceptProgressById,
    wasCorrect: false,
    clock: 3_000_000,
  });

  const mediumTrigger = {
    ...severeTrigger,
    severity: "medium",
    reclaim: {
      ...severeTrigger.reclaim,
      dueAtMs: 3_010_000,
      priority: 2,
    },
  };

  const queue = enqueueReclaim([], severeTrigger.reclaim);
  const sortedQueue = enqueueReclaim(queue, mediumTrigger.reclaim);

  assert.equal(sortedQueue[0].id, severeTrigger.reclaim.id);
  assert.equal(sortedQueue[1].priority, 2);

  const recovered = applyKnownGroundRecoveryToProgress(
    applyKnownGroundSlipToProgress(sampleConceptProgressById, severeTrigger, { clock: 3_000_500 }),
    severeTrigger,
    { clock: 3_001_000 },
  );

  assert.equal(isKnownGroundProgress(normalizeConceptProgress(recovered["initiative-order"])), true);
  assert.equal(recovered["initiative-order"].recoveryCount > 0, true);
});
