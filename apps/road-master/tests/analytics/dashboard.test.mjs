import assert from "node:assert/strict";
import test from "node:test";

import {
  averageBy,
  buildDashboardSnapshot,
  countBy,
  deriveReadinessDiagnostics,
  deriveWeakRegionDiagnostics,
  groupBy,
  scoreConceptWeakness,
  sumBy,
} from "../../src/systems/analytics/index.mjs";
import { chapter1MapDefinition } from "../../src/systems/map/index.mjs";
import {
  sampleAnalyticsEvents,
  sampleAnalyticsProfile,
  sampleAnalyticsSession,
} from "./fixtures.mjs";
import { sampleConceptProgressById } from "../map_memory/fixtures.mjs";

test("query helpers aggregate data for dashboard slices", () => {
  const grouped = groupBy(sampleAnalyticsEvents, (event) => event.name);
  const counts = countBy(sampleAnalyticsEvents, (event) => event.name);

  assert.equal(sumBy([1, 2, 3], (value) => value), 6);
  assert.equal(averageBy([1, 2, 3], (value) => value), 2);
  assert.equal(grouped.session_started.length, 1);
  assert.equal(counts.region_conquered, 1);
});

test("weak region diagnostics rank the recursive submap as the highest-risk scope", () => {
  const diagnostics = deriveWeakRegionDiagnostics({
    mapDefinition: chapter1MapDefinition,
    conceptProgressById: sampleConceptProgressById,
  });

  assert.equal(diagnostics.dominantWeakScopeId, "four_way_labyrinth");
  assert.ok(diagnostics.weakScopeIds.includes("four_way_labyrinth"));
  assert.ok(scoreConceptWeakness(sampleConceptProgressById["tiny-override"]) > scoreConceptWeakness(sampleConceptProgressById["initiative-order"]));
});

test("readiness diagnostics fold session, profile and map weakness into a repair recommendation", () => {
  const readiness = deriveReadinessDiagnostics({
    session: sampleAnalyticsSession,
    profile: sampleAnalyticsProfile,
    mapDefinition: chapter1MapDefinition,
    conceptProgressById: sampleConceptProgressById,
    events: sampleAnalyticsEvents,
  });

  assert.equal(readiness.profileId, "profile-analytics");
  assert.equal(readiness.recommendedStage, "repair");
  assert.ok(readiness.readinessScore >= 0);
  assert.ok(readiness.failRiskScore >= 70);
  assert.ok(readiness.weakRegionIds.includes("crossing_fields") || readiness.weakScopeIds.includes("four_way_labyrinth"));
  assert.ok(readiness.reasons.length > 0);
});

test("dashboard snapshots summarize the small public slice", () => {
  const dashboard = buildDashboardSnapshot({
    sessions: [sampleAnalyticsSession],
    profiles: [sampleAnalyticsProfile],
    events: sampleAnalyticsEvents,
    mapDefinition: chapter1MapDefinition,
    conceptProgressById: sampleConceptProgressById,
  });

  assert.equal(dashboard.sessionCount, 1);
  assert.equal(dashboard.profileCount, 1);
  assert.equal(dashboard.eventCount, sampleAnalyticsEvents.length);
  assert.equal(dashboard.stageCounts.campaign, 1);
  assert.equal(dashboard.topSessionStage, "campaign");
  assert.ok(dashboard.weakScopeIds.includes("four_way_labyrinth"));
  assert.ok(dashboard.averageSessionFailRiskScore >= 0);
});
