const RANK_TITLES = Object.freeze({
  S: "Road Master",
  A: "Road Ace",
  B: "Field Marshal",
  C: "Lane Captain",
  D: "Cadet",
  F: "Repair",
});

const SCOPE_TITLES = Object.freeze({
  chapter: "Chapter",
  boss: "Boss",
  conquest: "Conquest",
  failure: "Failure",
  memory: "Memory",
});

function toText(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

function normalizeRank(rank = "C") {
  const candidate = toText(rank, "C").toUpperCase();
  return Object.prototype.hasOwnProperty.call(RANK_TITLES, candidate) ? candidate : "C";
}

function normalizeScope(scope = "chapter") {
  const candidate = toText(scope, "chapter").toLowerCase();
  return Object.prototype.hasOwnProperty.call(SCOPE_TITLES, candidate) ? candidate : "chapter";
}

function titleCase(value) {
  return toText(value, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRankTitle(rank = "C", { scope = "chapter" } = {}) {
  const normalizedRank = normalizeRank(rank);
  const normalizedScope = normalizeScope(scope);
  return `${RANK_TITLES[normalizedRank]} ${SCOPE_TITLES[normalizedScope]}`;
}

export function buildChapterTitle(chapter = {}, { rank = "C", phase = "intro" } = {}) {
  const normalizedRank = normalizeRank(rank);
  const phaseLabel = titleCase(phase || "intro");
  const chapterLabel = toText(chapter.chapter, "Chapter");
  const regionLabel = toText(chapter.region, "Unknown Region");
  const title = `${chapterLabel}: ${regionLabel}`;
  const rankTitle = formatRankTitle(normalizedRank, { scope: "chapter" });

  return {
    kind: "chapter-title",
    phase: toText(phase, "intro"),
    rank: normalizedRank,
    rankTitle,
    title,
    subtitle: toText(chapter.subtitle, `${phaseLabel} signal`),
    badge: rankTitle,
    summary: `${regionLabel} opens in ${phaseLabel.toLowerCase()} mode.`,
    chapter: chapterLabel,
    region: regionLabel,
  };
}

export function buildBossTitle(boss = {}, { rank = "B", phase = "pressure", phaseIndex = 0 } = {}) {
  const normalizedRank = normalizeRank(rank);
  const bossLabel =
    typeof boss === "string"
      ? toText(boss, "Boss")
      : toText(boss.title ?? boss.name ?? boss.boss, "Boss");
  const phaseLabel = titleCase(phase || "pressure");
  const rankTitle = formatRankTitle(normalizedRank, { scope: "boss" });

  return {
    kind: "boss-title",
    phase: toText(phase, "pressure"),
    phaseIndex: Number.isFinite(phaseIndex) ? phaseIndex : 0,
    rank: normalizedRank,
    rankTitle,
    title: bossLabel,
    subtitle: `${phaseLabel} · ${rankTitle}`,
    badge: rankTitle,
    summary: `${bossLabel} holds the crossing under ${phaseLabel.toLowerCase()}.`,
  };
}

export function buildConquestTitle(chapter = {}, { rank = "A", runLabel = "" } = {}) {
  const normalizedRank = normalizeRank(rank);
  const regionLabel = toText(chapter.region, "Unknown Region");
  const rankTitle = formatRankTitle(normalizedRank, { scope: "conquest" });
  const conquestLabel = toText(runLabel, "Conquest");

  return {
    kind: "conquest-title",
    phase: "conquest",
    rank: normalizedRank,
    rankTitle,
    title: `${regionLabel} conquered`,
    subtitle: `${conquestLabel} · ${rankTitle}`,
    badge: rankTitle,
    summary: `${regionLabel} has been taken cleanly.`,
  };
}

export function buildFailureTitle(chapter = {}, { rank = "F", reason = "" } = {}) {
  const normalizedRank = normalizeRank(rank);
  const regionLabel = toText(chapter.region, "Unknown Region");
  const rankTitle = formatRankTitle(normalizedRank, { scope: "failure" });

  return {
    kind: "failure-title",
    phase: "failure",
    rank: normalizedRank,
    rankTitle,
    title: `${regionLabel} needs repair`,
    subtitle: reason ? toText(reason) : rankTitle,
    badge: rankTitle,
    summary: `${regionLabel} remains contested.`,
  };
}

export function buildNarrativeSignals(chapter = {}, options = {}) {
  const boss = options.boss ?? chapter.boss ?? chapter.bossData ?? {};
  const chapterRank = options.chapterRank ?? "C";
  const bossRank = options.bossRank ?? "B";
  const conquestRank = options.conquestRank ?? "A";
  const failureRank = options.failureRank ?? "F";

  return {
    chapter: buildChapterTitle(chapter, { rank: chapterRank, phase: options.chapterPhase ?? "intro" }),
    boss: buildBossTitle(boss, {
      rank: bossRank,
      phase: options.bossPhase ?? "pressure",
      phaseIndex: options.bossPhaseIndex ?? 0,
    }),
    conquest: buildConquestTitle(chapter, {
      rank: conquestRank,
      runLabel: options.runLabel ?? "Conquest",
    }),
    failure: buildFailureTitle(chapter, {
      rank: failureRank,
      reason: options.failureReason ?? "Retry from the checkpoint.",
    }),
  };
}
