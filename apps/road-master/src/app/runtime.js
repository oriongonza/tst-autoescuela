import { getFoundationContractSnapshot } from "../core/contracts.mjs";
import {
  attachDefaultEdgeWeights,
  buildMapIndex,
  buildRoute,
  chapter1MapDefinition,
  chapter1MapIndex,
} from "../systems/map/index.mjs";
import { createConceptProgress, normalizeConceptProgress } from "../systems/memory/index.mjs";
import { loadContentPack } from "../content/index.mjs";

export const DEFAULT_PACK_ID = "chapter-1-crossing-fields";
export const ARC_ORDER = Object.freeze(["gate", "labyrinth", "boss", "reclaim"]);
export const QUESTIONS_PER_NODE = 3;
export const QUESTIONS_PER_PHASE = 6;

const DEFAULT_DOCTRINE = Object.freeze([
  "The road is a hierarchy. Learn who yields.",
  "Obvious answers are where traps hide.",
  "Known ground can slip if you stop defending it.",
  "Every close call should leave a scar and a lesson.",
]);

function indexBy(items = []) {
  return Object.fromEntries(
    items
      .filter((item) => item && typeof item.id === "string")
      .map((item) => [item.id, item]),
  );
}

function cloneProgressMap(progressById = {}) {
  const next = Object.create(null);
  for (const [conceptId, progress] of Object.entries(progressById)) {
    next[conceptId] = normalizeConceptProgress(progress);
  }
  return next;
}

function toUniqueList(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

function toTitle(value, fallback = "") {
  if (value == null) {
    return fallback;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

function toSlug(value, fallback = "road-master") {
  const base = toTitle(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || fallback;
}

function toUnderscoreId(value, fallback = "road_master") {
  return toSlug(value, fallback).replace(/-/g, "_");
}

function chunkArray(items = [], size = 1) {
  const normalized = Math.max(1, size);
  const chunks = [];

  for (let index = 0; index < items.length; index += normalized) {
    chunks.push(items.slice(index, index + normalized));
  }

  return chunks;
}

function firstDefined(...values) {
  return values.find((value) => value != null);
}

function buildQuestionsByArc(questions = []) {
  return ARC_ORDER.reduce((acc, arc) => {
    acc[arc] = questions.filter((question) => question.arc === arc);
    return acc;
  }, Object.create(null));
}

function buildBossPhasePlan(questionsByArc, boss) {
  return ARC_ORDER.map((arc, index) => ({
    name: boss?.phases?.[index]?.name ?? arc,
    turns: Math.max(1, questionsByArc[arc]?.length ?? QUESTIONS_PER_PHASE),
    damageMultiplier: 1 + index * 0.15,
    rewardBonus: index * 2,
    transitionReward: index === 0 ? 4 : 6,
  }));
}

function buildSeedConceptProgressById(questions = []) {
  const progressById = Object.create(null);

  for (const question of questions) {
    const conceptIds = Array.isArray(question.conceptIds) ? question.conceptIds : [];
    const shouldSeed = Boolean(question.knownMistake || question.arc === "gate" || question.difficulty === "intro");
    const seedProgress = shouldSeed
      ? createConceptProgress({
          masteryState: "learned",
          learnedScore: 0.72,
          understoodScore: 0.66,
          comprehendedScore: 0.6,
          stabilityScore: 0.8,
        })
      : createConceptProgress({
          masteryState: "new",
          learnedScore: 0.16,
          understoodScore: 0.12,
          comprehendedScore: 0.08,
          stabilityScore: 0.28,
        });

    for (const conceptId of conceptIds) {
      if (!progressById[conceptId] || (shouldSeed && progressById[conceptId].masteryState === "new")) {
        progressById[conceptId] = seedProgress;
      }
    }
  }

  return progressById;
}

function collectConceptSequence(questions = []) {
  const conceptIds = [];

  for (const question of questions) {
    for (const conceptId of question.conceptIds ?? []) {
      if (typeof conceptId === "string" && conceptId.length > 0) {
        conceptIds.push(conceptId);
      }
    }
  }

  return toUniqueList(conceptIds);
}

function summarizeConceptBucket(conceptIds = [], conceptsById = {}, fallbackTitle, fallbackSummary) {
  const concepts = conceptIds
    .map((conceptId) => conceptsById[conceptId])
    .filter(Boolean);

  return {
    title:
      concepts.slice(0, 2).map((concept) => concept.name ?? concept.title).filter(Boolean).join(" / ") ||
      fallbackTitle,
    summary:
      concepts.slice(0, 2).map((concept) => concept.summary).filter(Boolean).join(" ") ||
      fallbackSummary,
  };
}

function buildChapterLabel(manifest = {}, packId = DEFAULT_PACK_ID) {
  const manifestTitle = toTitle(manifest.title);
  if (manifestTitle.includes(":")) {
    return manifestTitle.split(":")[0].trim();
  }

  const match = manifestTitle.match(/chapter\s+[ivx0-9]+/i);
  if (match) {
    return match[0];
  }

  const fallbackSlug = packId.replace(/^chapter-/, "").split("-")[0];
  return `Chapter ${fallbackSlug.toUpperCase()}`;
}

function buildShellForPack(packId, pack, boss, mapDefinition) {
  const manifest = pack.manifest ?? {};
  const regionTitle = toTitle(manifest.region?.name, boss?.arena?.regionId ?? "Unknown Region");
  const chapterLabel = buildChapterLabel(manifest, packId);
  const bossTitle = toTitle(boss?.title ?? boss?.name, manifest.bossId ?? "Regional Boss");
  const submapTitle = toTitle(manifest.submap?.name, "Memory Fold");
  const regionSummary = toTitle(
    manifest.region?.summary,
    "A data-driven Road Master region where map, combat, memory, and narrative share one runtime.",
  );

  return {
    id: packId,
    title: "Road Master",
    chapter: chapterLabel,
    region: regionTitle,
    subtitle: regionSummary,
    mentor: "The Instructor",
    boss: bossTitle,
    submap: submapTitle,
    hook: Object.freeze([
      `${chapterLabel} is loaded from the content catalog.`,
      `Map nodes are projected from the pack into ${regionTitle}.`,
      `Combat, pacing, memory, and telemetry share one runtime.`,
      `${bossTitle} uses phase data from the pack.`,
      `Victory now contributes to readiness, social cards, and cohort comparisons.`,
    ]),
    doctrine: DEFAULT_DOCTRINE,
    shareCard: `I conquered ${regionTitle} in Road Master: ${chapterLabel}.`,
    shareUrl: null,
    crest: "./assets/road-master-crest.svg",
    regionSummary,
    theme: manifest.region?.theme ?? null,
    mapDefinition,
  };
}

function buildGeneratedMapDefinition(packId, pack, boss) {
  const manifest = pack.manifest ?? {};
  const questions = Array.isArray(pack.questions) ? pack.questions : [];
  const conceptsById = indexBy(pack.concepts ?? []);
  const traps = Array.isArray(pack.traps) ? pack.traps : [];
  const regionId = toUnderscoreId(
    firstDefined(questions[0]?.regionId, boss?.arena?.regionId, manifest.region?.id, packId),
    "region",
  );
  const submapId = toUnderscoreId(
    firstDefined(
      questions.find((question) => question.submapId)?.submapId,
      boss?.arena?.submapId,
      manifest.submap?.id,
      `${regionId}-memory-fold`,
    ),
    `${regionId}_memory_fold`,
  );
  const regionTitle = toTitle(manifest.region?.name, manifest.title ?? packId);
  const submapTitle = toTitle(manifest.submap?.name, "Memory Fold");
  const mainQuestions = questions.filter((question) => question.arc !== "reclaim");
  const nonBossQuestions = mainQuestions.filter((question) => question.arc !== "boss");
  const mainConceptIds = collectConceptSequence(nonBossQuestions);
  const mainBucketCount = Math.max(3, Math.min(5, Math.ceil(mainQuestions.length / QUESTIONS_PER_NODE)));
  const mainBucketSize = Math.max(1, Math.ceil(mainConceptIds.length / Math.max(1, mainBucketCount - 2)));
  const mainBuckets = chunkArray(mainConceptIds, mainBucketSize).slice(0, mainBucketCount - 1);
  const trapConceptIds = toUniqueList(traps.flatMap((trap) => trap.conceptIds ?? []));
  const trapSummary = summarizeConceptBucket(
    trapConceptIds,
    conceptsById,
    "Trap Archive",
    "The road punishes obvious answers first.",
  );
  const nodePrefix = toSlug(packId, "region");

  const entryNodeId = `${nodePrefix}-gate`;
  const conceptNodes = mainBuckets.map((bucket, index) => {
    const summary = summarizeConceptBucket(
      bucket,
      conceptsById,
      `Region Node ${index + 1}`,
      regionTitle,
    );

    return {
      id: `${nodePrefix}-concept-${index + 1}`,
      type: "concept",
      title: summary.title,
      summary: summary.summary,
      flavor: summary.summary,
      position: { x: index + 1, y: index % 2 === 0 ? -1 : 1 },
      scopeId: regionId,
      regionId,
      conceptIds: bucket,
      tags: ["generated", "concept"],
    };
  });

  const trapNodeId = `${nodePrefix}-trap-archive`;
  const submapGateId = `${nodePrefix}-submap-gate`;
  const bossNodeId = boss?.id ? toSlug(boss.id, `${nodePrefix}-boss`) : `${nodePrefix}-boss`;
  const mainNodes = [
    {
      id: entryNodeId,
      type: "region",
      title: regionTitle,
      summary: regionTitle,
      flavor: manifest.region?.summary ?? "The road is laid out as a memory palace.",
      position: { x: 0, y: 0 },
      scopeId: regionId,
      regionId,
      tags: ["entry", "region"],
    },
    ...conceptNodes,
    {
      id: trapNodeId,
      type: "trap",
      title: trapSummary.title,
      summary: trapSummary.summary,
      flavor: trapSummary.summary,
      position: { x: conceptNodes.length + 1, y: 1 },
      scopeId: regionId,
      regionId,
      trapPatternIds: traps.map((trap) => trap.id).filter(Boolean),
      tags: ["trap", "generated"],
    },
    {
      id: submapGateId,
      type: "submap",
      title: submapTitle,
      summary: manifest.submap?.summary ?? "A recursive fold of the region.",
      flavor: manifest.submap?.summary ?? "A recursive fold of the region.",
      position: { x: conceptNodes.length + 2, y: 0 },
      scopeId: regionId,
      regionId,
      submapId,
      opensSubmapId: submapId,
      tags: ["submap", "generated"],
    },
    {
      id: bossNodeId,
      type: "boss",
      title: toTitle(boss?.title ?? boss?.name, "Regional Boss"),
      summary: boss?.arena?.summary ?? "The regional gatekeeper.",
      flavor: boss?.arena?.summary ?? "The regional gatekeeper.",
      position: { x: conceptNodes.length + 3, y: 0 },
      scopeId: regionId,
      regionId,
      bossId: boss?.id ?? `${nodePrefix}-boss`,
      tags: ["boss", "generated"],
    },
  ];

  const mainEdges = attachDefaultEdgeWeights(
    mainNodes.slice(0, -1).map((node, index) => ({
      id: `${nodePrefix}-edge-${index + 1}`,
      from: mainNodes[index].id,
      to: mainNodes[index + 1].id,
      type: mainNodes[index + 1].type === "trap" ? "confusion" : "unlocks",
    })),
  );

  const submapConceptIds = collectConceptSequence(
    questions.filter((question) => question.arc === "labyrinth" || question.arc === "reclaim"),
  );
  const submapBucketSize = Math.max(1, Math.ceil(Math.max(1, submapConceptIds.length) / 3));
  const submapBuckets = chunkArray(submapConceptIds, submapBucketSize).slice(0, 3);
  const submapEntryId = `${toSlug(submapId, submapId)}-entry`;
  const submapExitId = `${toSlug(submapId, submapId)}-exit`;
  const submapNodes = [
    {
      id: submapEntryId,
      type: "concept",
      title: `${submapTitle} Entry`,
      summary: manifest.submap?.summary ?? "The submap opens under pressure.",
      flavor: manifest.submap?.summary ?? "The submap opens under pressure.",
      position: { x: 0, y: 0 },
      scopeId: submapId,
      regionId,
      submapId,
      conceptIds: submapBuckets[0] ?? [],
      tags: ["submap-entry", "generated"],
    },
    ...submapBuckets.slice(1).map((bucket, index) => {
      const summary = summarizeConceptBucket(
        bucket,
        conceptsById,
        `${submapTitle} Node ${index + 1}`,
        submapTitle,
      );

      return {
        id: `${toSlug(submapId, submapId)}-node-${index + 1}`,
        type: bucket.some((conceptId) => trapConceptIds.includes(conceptId)) ? "trap" : "concept",
        title: summary.title,
        summary: summary.summary,
        flavor: summary.summary,
        position: { x: index + 1, y: index % 2 === 0 ? -1 : 1 },
        scopeId: submapId,
        regionId,
        submapId,
        conceptIds: bucket,
        trapPatternIds: traps.map((trap) => trap.id).filter(Boolean),
        tags: ["submap", "generated"],
      };
    }),
    {
      id: submapExitId,
      type: "submap",
      title: `${submapTitle} Exit`,
      summary: `Return to ${regionTitle}.`,
      flavor: `Return to ${regionTitle}.`,
      position: { x: Math.max(2, submapBuckets.length), y: 0 },
      scopeId: submapId,
      regionId,
      submapId,
      opensSubmapId: null,
      tags: ["exit", "generated"],
    },
  ];

  const submapEdges = attachDefaultEdgeWeights(
    submapNodes.slice(0, -1).map((node, index) => ({
      id: `${toSlug(submapId, submapId)}-edge-${index + 1}`,
      from: submapNodes[index].id,
      to: submapNodes[index + 1].id,
      type: submapNodes[index + 1].type === "trap" ? "confusion" : "prerequisite",
    })),
  );

  return {
    region: {
      id: regionId,
      title: regionTitle,
      summary: manifest.region?.summary ?? regionTitle,
      theme: manifest.region?.theme ?? null,
    },
    nodes: mainNodes,
    edges: mainEdges,
    submaps: [
      {
        id: submapId,
        title: submapTitle,
        purpose: manifest.submap?.summary ?? "A recursive memory fold.",
        nodes: submapNodes,
        edges: submapEdges,
        entryNodeId: submapEntryId,
      },
    ],
    entryNodeId,
    bossNodeId,
  };
}

function resolveMapRuntime(packId, pack, boss) {
  if (packId === DEFAULT_PACK_ID) {
    return {
      mapDefinition: chapter1MapDefinition,
      mapIndex: chapter1MapIndex,
      route: buildRoute(
        chapter1MapIndex.main,
        chapter1MapDefinition.entryNodeId,
        chapter1MapDefinition.bossNodeId,
      ),
      reclaimRoute: buildRoute(
        chapter1MapIndex.submaps.four_way_labyrinth,
        "labyrinth-entry",
        "labyrinth-exit",
      ),
    };
  }

  const mapDefinition = buildGeneratedMapDefinition(packId, pack, boss);
  const mapIndex = buildMapIndex(mapDefinition);
  const firstSubmap = mapDefinition.submaps?.[0] ?? null;
  const reclaimRoute = firstSubmap
    ? buildRoute(mapIndex.submaps[firstSubmap.id], firstSubmap.entryNodeId, `${toSlug(firstSubmap.id, firstSubmap.id)}-exit`)
    : [];

  return {
    mapDefinition,
    mapIndex,
    route: buildRoute(mapIndex.main, mapDefinition.entryNodeId, mapDefinition.bossNodeId),
    reclaimRoute,
  };
}

export function buildRoadMasterRuntime(packId = DEFAULT_PACK_ID, pack) {
  const questions = Array.isArray(pack.questions) ? [...pack.questions] : [];
  const boss = Array.isArray(pack.bosses) ? pack.bosses[0] ?? null : null;
  const questionsByArc = buildQuestionsByArc(questions);
  const bossPhasePlan = buildBossPhasePlan(questionsByArc, boss);
  const mapRuntime = resolveMapRuntime(packId, pack, boss);
  const shell = buildShellForPack(packId, pack, boss, mapRuntime.mapDefinition);

  return {
    ...shell,
    foundation: getFoundationContractSnapshot(),
    pack,
    questions,
    questionsById: indexBy(questions),
    conceptsById: indexBy(pack.concepts ?? []),
    trapsById: indexBy(pack.traps ?? []),
    analogiesById: indexBy(pack.analogies ?? []),
    explanationsById: indexBy(pack.explanations ?? []),
    templatesById: indexBy(pack.templates ?? []),
    bossById: indexBy(pack.bosses ?? []),
    bossData: boss,
    mapDefinition: mapRuntime.mapDefinition,
    mapIndex: mapRuntime.mapIndex,
    route: mapRuntime.route,
    reclaimRoute: mapRuntime.reclaimRoute,
    questionsPerNode: QUESTIONS_PER_NODE,
    questionsPerPhase: QUESTIONS_PER_PHASE,
    arcOrder: ARC_ORDER,
    questionsByArc,
    bossPhasePlan,
    encounterConfig: {
      kind: "boss",
      bossId: boss?.id ?? `${toSlug(packId, "boss")}-boss`,
      bossName: boss?.title ?? boss?.name ?? shell.boss,
      maxHp: Math.max(96, questions.length * 4),
      baseReward: 10,
      bossPhasePlan,
    },
    seedConceptProgressById: buildSeedConceptProgressById(questions),
    getRouteIndexForQuestionIndex(questionIndex) {
      return Math.min(mapRuntime.route.length - 1, Math.max(0, Math.floor(questionIndex / QUESTIONS_PER_NODE)));
    },
    getPhaseIndexForQuestionIndex(questionIndex) {
      return Math.min(ARC_ORDER.length - 1, Math.max(0, Math.floor(questionIndex / QUESTIONS_PER_PHASE)));
    },
    getQuestionByIndex(questionIndex) {
      return questions[Math.max(0, Math.min(questions.length - 1, questionIndex))] ?? null;
    },
    getRouteNodeByQuestionIndex(questionIndex) {
      const routeIndex = Math.min(
        mapRuntime.route.length - 1,
        Math.max(0, Math.floor(questionIndex / QUESTIONS_PER_NODE)),
      );
      const nodeId = mapRuntime.route[routeIndex] ?? mapRuntime.route[0];
      return mapRuntime.mapIndex.main.nodesById.get(nodeId) ?? null;
    },
    getPhaseNameByQuestionIndex(questionIndex) {
      return (
        ARC_ORDER[
          Math.min(ARC_ORDER.length - 1, Math.max(0, Math.floor(questionIndex / QUESTIONS_PER_PHASE)))
        ] ?? ARC_ORDER[0]
      );
    },
    cloneProgressMap,
  };
}

export async function loadRoadMasterRuntime(packId = DEFAULT_PACK_ID, fetchImpl = globalThis.fetch) {
  const pack = await loadContentPack(packId, fetchImpl);
  return buildRoadMasterRuntime(packId, pack);
}
