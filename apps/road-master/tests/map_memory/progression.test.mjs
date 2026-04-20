import assert from "node:assert/strict";
import test from "node:test";

import { chapter1MapDefinition, deriveMapProgressionCue } from "../../src/systems/map/index.mjs";
import { deriveMemoryProgressionCue } from "../../src/systems/memory/index.mjs";
import {
  createProfileRecord,
  deriveOnboardingDefaults,
  markOnboardingComplete,
  updateProfileRecord,
} from "../../src/systems/persistence/index.mjs";
import { derivePersonalizationSignals } from "../../src/systems/personalization/index.mjs";
import {
  sampleConceptProgressById,
  sampleKnownGroundQuestion,
  sampleMapState,
} from "./fixtures.mjs";

test("onboarding defaults seed linked profile and session records", () => {
  const { profile, session } = deriveOnboardingDefaults({
    profileId: "profile-001",
    userId: "driver-001",
    displayName: "Northbound",
    mentorVoiceMode: "steady",
    now: 1_500,
  });

  assert.equal(profile.profileId, "profile-001");
  assert.equal(profile.onboardingComplete, false);
  assert.deepEqual(profile.preferredRegionIds, ["crossing_fields"]);
  assert.equal(session.profileId, "profile-001");
  assert.equal(session.activeRegionId, "crossing_fields");
  assert.equal(session.currentStage, "boot");

  const completed = markOnboardingComplete(profile, {
    lastSessionId: session.sessionId,
    lastRegionId: "crossing_fields",
    now: 1_600,
  });

  assert.equal(completed.onboardingComplete, true);
  assert.equal(completed.onboardingStep, "complete");
  assert.equal(completed.lastSessionId, session.sessionId);
});

test("map progression cue exposes recursive route pressure toward the boss", () => {
  const cue = deriveMapProgressionCue(chapter1MapDefinition, sampleMapState);

  assert.equal(cue.regionId, "crossing_fields");
  assert.equal(cue.recursionDepth, 1);
  assert.deepEqual(cue.unlockedSubmapIds, ["four_way_labyrinth"]);
  assert.equal(cue.nextGateNodeId, "exception-bastion");
  assert.equal(cue.bossNodeId, "right-of-way-beast");
  assert.ok(cue.remainingDistance > 0);
  assert.match(cue.memoryCue, /folds inward|stays flat/);
});

test("memory progression cue emits flashback and reclaim metadata on known-ground slips", () => {
  const cue = deriveMemoryProgressionCue({
    question: sampleKnownGroundQuestion,
    conceptProgressById: sampleConceptProgressById,
    regionTitle: "Crossing Fields",
    submapTitle: "The Four-Way Labyrinth",
    nodeTitle: "Known Ground Slip",
    clock: 1_000_000,
  });

  assert.equal(cue.triggered, true);
  assert.equal(cue.severity, "severe");
  assert.equal(cue.recursionDepth, 1);
  assert.deepEqual(cue.knownGroundConceptIds, ["initiative-order", "priority-basics"]);
  assert.equal(cue.flashbackCue.regionId, "crossing_fields");
  assert.equal(cue.flashbackCue.submapId, "four_way_labyrinth");
  assert.equal(cue.reclaimSchedule.afterQuestions, 1);
  assert.ok(cue.memoryPressure > 0);
});

test("personalization signals react to readiness and weak regions", () => {
  const profile = updateProfileRecord(
    createProfileRecord({
      profileId: "profile-001",
      challengeBias: 0.82,
      memoryBias: 0.74,
      recursionBias: 0.7,
      audioCuesEnabled: true,
    }),
    {
      onboardingComplete: true,
      weakRegionIds: ["four_way_labyrinth"],
      lastRegionId: "crossing_fields",
      now: 1_700,
    },
  );

  const signals = derivePersonalizationSignals({
    profile,
    diagnostics: {
      readinessScore: 58,
      failRiskScore: 74,
      weakScopeIds: ["four_way_labyrinth"],
      recommendedStage: "repair",
    },
  });

  assert.equal(signals.recommendedRouteDepth, 2);
  assert.equal(signals.recommendedCueDensity, "dense");
  assert.equal(signals.shouldSurfaceMemoryRecap, true);
  assert.equal(signals.shouldPrefetchBossPrep, false);
  assert.equal(signals.recommendedStage, "repair");
});
