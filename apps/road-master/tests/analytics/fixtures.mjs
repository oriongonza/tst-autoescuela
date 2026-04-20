import { createProfileRecord } from "../../src/systems/persistence/profile.mjs";
import { createSessionRecord } from "../../src/systems/persistence/session.mjs";

export const sampleAnalyticsSession = createSessionRecord({
  sessionId: "session-analytics",
  profileId: "profile-analytics",
  userId: "driver-7",
  appVersion: "0.1.0",
  currentStage: "campaign",
  activeRegionId: "crossing_fields",
  activeSubmapId: "four_way_labyrinth",
  questionCount: 8,
  correctCount: 2,
  wrongCount: 6,
  attemptCount: 8,
  reclaimCount: 1,
  bossAttemptCount: 1,
  flashbackCount: 2,
  completedRegionIds: ["crossing_fields"],
  weakRegionIds: ["four_way_labyrinth"],
  readinessScore: 38,
  failRiskScore: 86,
  now: 1_000,
});

export const sampleAnalyticsProfile = createProfileRecord({
  profileId: "profile-analytics",
  userId: "driver-7",
  displayName: "Scout",
  onboardingComplete: true,
  onboardingStep: "complete",
  mentorVoiceMode: "steady",
  audioCuesEnabled: true,
  homeRegionId: "crossing_fields",
  preferredRegionIds: ["crossing_fields", "four_way_labyrinth"],
  weakRegionIds: ["four_way_labyrinth"],
  masteredRegionIds: ["crossing_fields"],
  challengeBias: 0.2,
  pacingBias: 0.4,
  memoryBias: 0.65,
  recursionBias: 0.68,
  readinessScore: 38,
  failRiskScore: 86,
  now: 1_000,
});

export const sampleAnalyticsEvents = [
  { name: "session_started", sessionId: "session-analytics", atMs: 1_000 },
  { name: "map_opened", sessionId: "session-analytics", atMs: 1_010 },
  { name: "flashback_triggered", sessionId: "session-analytics", atMs: 1_020 },
  { name: "boss_failed", sessionId: "session-analytics", atMs: 1_030 },
  { name: "region_conquered", sessionId: "session-analytics", atMs: 1_040 },
];
