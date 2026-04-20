import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBossTitle,
  buildChapterTitle,
  buildConquestTitle,
  buildFailureTitle,
  buildNarrativeSignals,
  formatRankTitle,
} from "../../src/systems/narrative/titles.mjs";
import {
  buildCohortComparison,
  buildGhostRun,
  buildShareCard,
  classifyRunRank,
  scoreRun,
} from "../../src/systems/social/index.mjs";
import {
  describeAudioCue,
  resolveAudioSceneProfile,
} from "../../src/systems/audio/profiles.mjs";
import { createNarrativeOracle as createNarrativeOracleRuntime } from "../../src/systems/narrative/index.js";

test("narrative title helpers expose chapter, boss, conquest, and failure signals", () => {
  const chapter = {
    chapter: "Chapter I",
    region: "Crossing Fields",
    subtitle: "A disciplined chapter at the first crossing.",
    boss: "The Right-of-Way Beast",
  };

  const chapterSignal = buildChapterTitle(chapter, { rank: "A", phase: "intro" });
  const bossSignal = buildBossTitle(chapter.boss, { rank: "B", phase: "pressure", phaseIndex: 1 });
  const conquestSignal = buildConquestTitle(chapter, { rank: "S", runLabel: "Clean conquest" });
  const failureSignal = buildFailureTitle(chapter, { rank: "F", reason: "Retry from the checkpoint." });
  const signals = buildNarrativeSignals(chapter, {
    chapterRank: "A",
    bossRank: "B",
    conquestRank: "S",
    failureRank: "F",
  });

  assert.equal(formatRankTitle("A", { scope: "boss" }), "Road Ace Boss");
  assert.equal(chapterSignal.kind, "chapter-title");
  assert.equal(chapterSignal.title, "Chapter I: Crossing Fields");
  assert.equal(chapterSignal.rankTitle, "Road Ace Chapter");
  assert.equal(bossSignal.title, "The Right-of-Way Beast");
  assert.match(bossSignal.subtitle, /Field Marshal Boss/);
  assert.equal(conquestSignal.kind, "conquest-title");
  assert.match(conquestSignal.subtitle, /Road Master Conquest/);
  assert.equal(failureSignal.kind, "failure-title");
  assert.match(failureSignal.summary, /contested/);
  assert.equal(signals.chapter.rankTitle, "Road Ace Chapter");
  assert.equal(signals.boss.rankTitle, "Field Marshal Boss");
});

test("social primitives build share cards, ghost runs, and cohort comparisons", () => {
  const playerRun = {
    chapterTitle: "Chapter I",
    regionTitle: "Crossing Fields",
    playerName: "Ava",
    totalQuestions: 24,
    correctCount: 20,
    wrongCount: 4,
    routeNodes: 8,
    clearedNodes: 8,
    hpLeft: 74,
    maxHp: 96,
    rewardTotal: 38,
    streak: 5,
    pressure: 18,
    momentum: 60,
    outcome: "victory",
  };
  const cohortRun = {
    chapterTitle: "Chapter I",
    regionTitle: "Crossing Fields",
    playerName: "Cohort",
    totalQuestions: 24,
    correctCount: 16,
    wrongCount: 8,
    routeNodes: 8,
    clearedNodes: 6,
    hpLeft: 42,
    maxHp: 96,
    rewardTotal: 24,
    streak: 2,
    pressure: 32,
    momentum: 34,
    outcome: "live",
  };

  const score = scoreRun(playerRun);
  const shareCard = buildShareCard(playerRun, {
    chapterTitle: "Chapter I",
    regionTitle: "Crossing Fields",
    shareUrl: "https://example.test/share",
  });
  const ghostRun = buildGhostRun(playerRun, {
    chapterTitle: "Chapter I",
    regionTitle: "Crossing Fields",
  });
  const comparison = buildCohortComparison(playerRun, cohortRun, {
    cohortLabel: "Night Cohort",
  });

  assert.equal(shareCard.kind, "share-card");
  assert.equal(shareCard.rank, classifyRunRank(score));
  assert.match(shareCard.text, /Chapter I conquered/);
  assert.match(shareCard.text, /Crossing Fields · Road Ace Conquest/);
  assert.match(shareCard.text, /Score/);
  assert.equal(ghostRun.kind, "ghost-run");
  assert.equal(ghostRun.shareCard.kind, "share-card");
  assert.match(ghostRun.summary, /ghost of Ava/i);
  assert.equal(comparison.kind, "cohort-comparison");
  assert.equal(comparison.verdict, "ahead");
  assert.match(comparison.text, /Night Cohort/);
});

test("audio profiles resolve scene and cue metadata for richer signaling", () => {
  const bossScene = resolveAudioSceneProfile("boss");
  const shareCue = describeAudioCue("share", { scene: "social" });
  const conquestCue = describeAudioCue("conquest");

  assert.equal(bossScene.label, "Boss");
  assert.equal(bossScene.scene, "boss");
  assert.equal(shareCue.sceneProfile.scene, "social");
  assert.equal(shareCue.label, "Share");
  assert.equal(conquestCue.sceneProfile.scene, "conquest");
  assert.ok(conquestCue.duration > 0);
});

test("narrative oracle exposes structured signals and social share primitives", () => {
  const oracle = createNarrativeOracleRuntime({
    chapter: "Chapter I",
    region: "Crossing Fields",
    subtitle: "A disciplined chapter at the first crossing.",
    mentor: "The Instructor",
    boss: "The Right-of-Way Beast",
    shareCard: "I conquered Crossing Fields in Road Master: Chapter I.",
  });

  const intro = oracle.intro();
  const failure = oracle.failure({ reason: "Retry from the checkpoint." });
  const victory = oracle.victory({
    chapterTitle: "Chapter I",
    regionTitle: "Crossing Fields",
    totalQuestions: 24,
    correctCount: 21,
    wrongCount: 3,
    routeNodes: 8,
    clearedNodes: 8,
    hpLeft: 70,
    maxHp: 96,
    outcome: "victory",
  });
  const ghost = oracle.ghostRun({
    chapterTitle: "Chapter I",
    regionTitle: "Crossing Fields",
    playerName: "Ava",
    totalQuestions: 24,
    correctCount: 20,
    wrongCount: 4,
    routeNodes: 8,
    clearedNodes: 8,
    hpLeft: 74,
    maxHp: 96,
    outcome: "victory",
  });
  const cohort = oracle.cohortComparison(
    {
      chapterTitle: "Chapter I",
      regionTitle: "Crossing Fields",
      playerName: "Ava",
      totalQuestions: 24,
      correctCount: 20,
      wrongCount: 4,
      routeNodes: 8,
      clearedNodes: 8,
      hpLeft: 74,
      maxHp: 96,
      outcome: "victory",
    },
    {
      chapterTitle: "Chapter I",
      regionTitle: "Crossing Fields",
      playerName: "Cohort",
      totalQuestions: 24,
      correctCount: 16,
      wrongCount: 8,
      routeNodes: 8,
      clearedNodes: 6,
      hpLeft: 42,
      maxHp: 96,
      outcome: "live",
    },
    { cohortLabel: "Night Cohort" },
  );

  assert.equal(intro[0].signalKind, "chapter-title");
  assert.equal(failure[0].signalKind, "failure-title");
  assert.match(victory[1].text, /Chapter I conquered/);
  assert.equal(ghost.kind, "ghost-run");
  assert.equal(cohort.kind, "cohort-comparison");
  assert.match(cohort.text, /Night Cohort/);
  assert.equal(typeof oracle.shareCard().shareText, "string");
});
