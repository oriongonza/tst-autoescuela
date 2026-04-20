import { formatRankTitle } from "../narrative/titles.mjs";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toText(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

function asNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeOutcome(outcome) {
  const key = toText(outcome, "in-progress").toLowerCase();
  return key === "victory" || key === "failure" || key === "ghost" || key === "live"
    ? key
    : "in-progress";
}

export function normalizeRunMetrics(run = {}) {
  const totalQuestions = Math.max(
    0,
    asNumber(run.totalQuestions ?? run.questionCount ?? run.questionsTotal, 0),
  );
  const correctCount = Math.max(
    0,
    asNumber(run.correctCount ?? run.correctAnswers ?? run.clearedCount, 0),
  );
  const wrongCount = Math.max(
    0,
    asNumber(run.wrongCount ?? run.mistakes ?? run.failedAnswers, 0),
  );
  const questionsAnswered = Math.max(
    0,
    asNumber(run.questionsAnswered ?? correctCount + wrongCount, correctCount + wrongCount),
  );
  const routeNodes = Math.max(0, asNumber(run.routeNodes ?? run.routeLength ?? 0, 0));
  const clearedNodes = Math.max(0, asNumber(run.clearedNodes ?? run.completedNodes ?? 0, 0));
  const hpLeft = Math.max(0, asNumber(run.hpLeft ?? run.hp ?? 0, 0));
  const maxHp = Math.max(1, asNumber(run.maxHp ?? 100, 100));
  const rewardTotal = Math.max(0, asNumber(run.rewardTotal ?? 0, 0));
  const streak = Math.max(0, asNumber(run.streak ?? 0, 0));
  const pressure = clamp(asNumber(run.pressure ?? 0, 0), 0, 100);
  const momentum = clamp(asNumber(run.momentum ?? 0, 0), 0, 100);
  const accuracy = questionsAnswered > 0 ? correctCount / questionsAnswered : 1;
  const hpRatio = maxHp > 0 ? hpLeft / maxHp : 0;
  const routeProgress = routeNodes > 0 ? clearedNodes / routeNodes : 0;

  return {
    chapterTitle: toText(run.chapterTitle ?? run.chapter ?? run.title, "Crossing Fields"),
    regionTitle: toText(run.regionTitle ?? run.region ?? "Road Master", "Road Master"),
    playerName: toText(run.playerName ?? run.driver ?? run.name, "Anonymous"),
    cohortLabel: toText(run.cohortLabel ?? run.cohort ?? run.group, ""),
    totalQuestions,
    correctCount,
    wrongCount,
    questionsAnswered,
    routeNodes,
    clearedNodes,
    hpLeft,
    maxHp,
    rewardTotal,
    streak,
    pressure,
    momentum,
    accuracy,
    hpRatio,
    routeProgress,
    scoreHint: asNumber(run.scoreHint ?? run.score ?? 0, 0),
    outcome: normalizeOutcome(run.outcome ?? (run.victory ? "victory" : run.failed ? "failure" : "in-progress")),
    rank: toText(run.rank ?? "", ""),
  };
}

export function scoreRun(run = {}) {
  const metrics = normalizeRunMetrics(run);
  const accuracyScore = metrics.accuracy * 50;
  const progressScore = metrics.routeProgress * 20 + metrics.clearedNodes * 1.5;
  const enduranceScore = metrics.hpRatio * 12;
  const momentumScore = metrics.momentum * 0.08;
  const rewardScore = clamp(metrics.rewardTotal / 12, 0, 10);
  const streakScore = Math.min(12, metrics.streak * 2);
  const mistakePenalty = metrics.wrongCount * 3.5;
  const pressurePenalty = metrics.pressure * 0.05;
  const failurePenalty = metrics.outcome === "failure" ? 10 : 0;

  return Math.round(
    clamp(
      accuracyScore +
        progressScore +
        enduranceScore +
        momentumScore +
        rewardScore +
        streakScore -
        mistakePenalty -
        pressurePenalty -
        failurePenalty,
      0,
      100,
    ),
  );
}

export function classifyRunRank(run = {}) {
  const score = Number.isFinite(run) ? run : scoreRun(run);

  if (score >= 92) {
    return "S";
  }
  if (score >= 80) {
    return "A";
  }
  if (score >= 68) {
    return "B";
  }
  if (score >= 56) {
    return "C";
  }
  if (score >= 40) {
    return "D";
  }
  return "F";
}

export function buildShareCard(run = {}, context = {}) {
  const metrics = normalizeRunMetrics(run);
  const score = scoreRun(metrics);
  const rank = normalizeRunMetrics({ rank: context.rank ?? metrics.rank }).rank || classifyRunRank(score);
  const rankTitle = formatRankTitle(rank, {
    scope: metrics.outcome === "failure" ? "failure" : "conquest",
  });
  const chapterTitle = toText(context.chapterTitle ?? metrics.chapterTitle, "Crossing Fields");
  const regionTitle = toText(context.regionTitle ?? metrics.regionTitle, "Road Master");
  const title = toText(
    context.title,
    metrics.outcome === "failure" ? `${chapterTitle} needs repair` : `${chapterTitle} conquered`,
  );
  const subtitle = toText(context.subtitle, `${regionTitle} · ${rankTitle}`);
  const summary = toText(
    context.summary,
    metrics.outcome === "failure"
      ? "Retry from the checkpoint."
      : "The road yielded to discipline.",
  );
  const lines = [
    title,
    subtitle,
    summary,
    `Score ${score}/100`,
    `Accuracy ${Math.round(metrics.accuracy * 100)}%`,
    `Mistakes ${metrics.wrongCount} · HP ${metrics.hpLeft}/${metrics.maxHp}`,
  ];

  if (metrics.routeNodes > 0) {
    lines.push(`Route ${metrics.clearedNodes}/${metrics.routeNodes}`);
  }

  if (metrics.cohortLabel) {
    lines.push(`Cohort ${metrics.cohortLabel}`);
  }

  return {
    kind: "share-card",
    rank,
    rankTitle,
    score,
    title,
    subtitle,
    summary,
    lines,
    text: lines.join("\n"),
    shareText: lines.join(" | "),
    metrics,
    tags: [rankTitle, metrics.outcome, regionTitle].filter(Boolean),
    shareUrl: context.shareUrl ?? null,
    artwork: {
      crest: context.crest ?? "assets/road-master-crest.svg",
    },
  };
}

export function buildGhostRun(run = {}, context = {}) {
  const metrics = normalizeRunMetrics(run);
  const score = scoreRun(metrics);
  const rank = classifyRunRank(score);
  const rankTitle = formatRankTitle(rank, { scope: "memory" });
  const title = toText(context.title, `${metrics.playerName} ghost run`);
  const subtitle = toText(
    context.subtitle,
    `${metrics.chapterTitle} · ${rankTitle}`,
  );
  const shareCard = buildShareCard(metrics, {
    ...context,
    chapterTitle: metrics.chapterTitle,
    regionTitle: metrics.regionTitle,
    rank,
    title: context.shareTitle ?? `${metrics.chapterTitle} ghost card`,
  });

  return {
    kind: "ghost-run",
    rank,
    rankTitle,
    score,
    title,
    subtitle,
    summary: toText(
      context.summary,
      `A ghost of ${metrics.playerName} at ${metrics.clearedNodes}/${metrics.routeNodes || "?"} nodes.`,
    ),
    trail: {
      routeProgress: metrics.routeProgress,
      wrongCount: metrics.wrongCount,
      hpLeft: metrics.hpLeft,
      pressure: metrics.pressure,
      momentum: metrics.momentum,
      outcome: metrics.outcome,
    },
    shareCard,
    text: shareCard.text,
    label: toText(context.label, `${metrics.playerName} ghost`),
  };
}

export function buildCohortComparison(playerRun = {}, cohortRun = {}, context = {}) {
  const player = normalizeRunMetrics(playerRun);
  const cohort = normalizeRunMetrics(cohortRun);
  const playerScore = scoreRun(player);
  const cohortScore = scoreRun(cohort);
  const deltaScore = playerScore - cohortScore;
  const deltaAccuracy = Math.round((player.accuracy - cohort.accuracy) * 100);
  const deltaMistakes = player.wrongCount - cohort.wrongCount;
  const deltaHp = player.hpLeft - cohort.hpLeft;
  const deltaReward = player.rewardTotal - cohort.rewardTotal;
  const deltaRoute = Math.round((player.routeProgress - cohort.routeProgress) * 100);
  const verdict =
    deltaScore >= 8
      ? "ahead"
      : deltaScore <= -8
        ? "behind"
        : "level";
  const title = toText(context.title, `${toText(context.cohortLabel, cohort.cohortLabel || "Cohort")} comparison`);
  const subtitle = toText(
    context.subtitle,
    `${player.playerName} vs ${toText(context.cohortLabel, cohort.cohortLabel || "the cohort")}`,
  );
  const summary =
    verdict === "ahead"
      ? `${player.playerName} is ahead of ${toText(context.cohortLabel, cohort.cohortLabel || "the cohort")} by ${Math.abs(deltaScore)} points.`
      : verdict === "behind"
        ? `${player.playerName} trails ${toText(context.cohortLabel, cohort.cohortLabel || "the cohort")} by ${Math.abs(deltaScore)} points.`
        : `${player.playerName} is within the same band as ${toText(context.cohortLabel, cohort.cohortLabel || "the cohort")}.`;

  return {
    kind: "cohort-comparison",
    title,
    subtitle,
    summary,
    verdict,
    player,
    cohort,
    playerScore,
    cohortScore,
    delta: {
      score: deltaScore,
      accuracy: deltaAccuracy,
      mistakes: deltaMistakes,
      hp: deltaHp,
      reward: deltaReward,
      route: deltaRoute,
    },
    ranking: {
      player: classifyRunRank(playerScore),
      cohort: classifyRunRank(cohortScore),
    },
    text: [
      title,
      subtitle,
      summary,
      `Score delta ${deltaScore >= 0 ? "+" : ""}${deltaScore}`,
      `Accuracy delta ${deltaAccuracy >= 0 ? "+" : ""}${deltaAccuracy}%`,
      `Mistakes delta ${deltaMistakes >= 0 ? "+" : ""}${deltaMistakes}`,
    ].join("\n"),
    tags: [verdict, formatRankTitle(classifyRunRank(playerScore), { scope: "chapter" })].filter(Boolean),
  };
}

export function compareRuns(playerRun = {}, cohortRun = {}, context = {}) {
  return buildCohortComparison(playerRun, cohortRun, context);
}

