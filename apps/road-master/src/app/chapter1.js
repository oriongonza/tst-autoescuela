import { getFoundationContractSnapshot } from "../core/contracts.mjs";
import { chapter1MapDefinition, chapter1MapIndex, buildRoute } from "../systems/map/index.mjs";
import { createConceptProgress, normalizeConceptProgress } from "../systems/memory/index.mjs";
import { loadChapter1CrossingFields } from "../content/chapter-1-crossing-fields.mjs";

export const ARC_ORDER = Object.freeze(["gate", "labyrinth", "boss", "reclaim"]);
export const QUESTIONS_PER_NODE = 3;
export const QUESTIONS_PER_PHASE = 6;

export const chapter1Shell = Object.freeze({
  id: "chapter-1-crossing-fields",
  title: "Road Master",
  chapter: "Chapter I",
  region: "Crossing Fields",
  subtitle:
    "A data-driven vertical slice where the map route, content pack, combat loop, and known-ground flashbacks share one runtime.",
  mentor: "The Instructor",
  boss: "The Right-of-Way Beast",
  submap: "The Four-Way Labyrinth",
  hook: Object.freeze([
    "Map route built from the graph.",
    "Questions loaded from the chapter pack.",
    "Combat resolved by the engine.",
    "Flashbacks triggered by known-ground slips.",
    "Victory earned through the boss phase plan.",
  ]),
  doctrine: Object.freeze([
    "The road is a hierarchy. Learn who yields.",
    "Obvious answers are where traps hide.",
    "Known ground can slip if you stop defending it.",
    "Every close call should leave a scar and a lesson.",
  ]),
  shareCard: "I conquered Crossing Fields in Road Master: Chapter I.",
});

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

export function buildChapter1Runtime(pack) {
  const questions = Array.isArray(pack.questions) ? [...pack.questions] : [];
  const boss = Array.isArray(pack.bosses) ? pack.bosses[0] ?? null : null;
  const questionsByArc = buildQuestionsByArc(questions);
  const bossPhasePlan = buildBossPhasePlan(questionsByArc, boss);
  const route = buildRoute(
    chapter1MapIndex.main,
    chapter1MapDefinition.entryNodeId,
    chapter1MapDefinition.bossNodeId,
  );
  const reclaimRoute = buildRoute(
    chapter1MapIndex.submaps.four_way_labyrinth,
    "labyrinth-entry",
    "labyrinth-exit",
  );

  return {
    ...chapter1Shell,
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
    mapDefinition: chapter1MapDefinition,
    mapIndex: chapter1MapIndex,
    route,
    reclaimRoute,
    questionsPerNode: QUESTIONS_PER_NODE,
    questionsPerPhase: QUESTIONS_PER_PHASE,
    arcOrder: ARC_ORDER,
    questionsByArc,
    bossPhasePlan,
    encounterConfig: {
      kind: "boss",
      bossId: boss?.id ?? "right-of-way-beast",
      bossName: boss?.name ?? chapter1Shell.boss,
      maxHp: Math.max(96, questions.length * 4),
      baseReward: 10,
      bossPhasePlan,
    },
    seedConceptProgressById: buildSeedConceptProgressById(questions),
    getRouteIndexForQuestionIndex(questionIndex) {
      return Math.min(route.length - 1, Math.max(0, Math.floor(questionIndex / QUESTIONS_PER_NODE)));
    },
    getPhaseIndexForQuestionIndex(questionIndex) {
      return Math.min(ARC_ORDER.length - 1, Math.max(0, Math.floor(questionIndex / QUESTIONS_PER_PHASE)));
    },
    getQuestionByIndex(questionIndex) {
      return questions[Math.max(0, Math.min(questions.length - 1, questionIndex))] ?? null;
    },
    getRouteNodeByQuestionIndex(questionIndex) {
      const routeIndex = Math.min(route.length - 1, Math.max(0, Math.floor(questionIndex / QUESTIONS_PER_NODE)));
      const nodeId = route[routeIndex] ?? route[0];
      return chapter1MapIndex.main.nodesById.get(nodeId) ?? null;
    },
    getPhaseNameByQuestionIndex(questionIndex) {
      return ARC_ORDER[Math.min(ARC_ORDER.length - 1, Math.max(0, Math.floor(questionIndex / QUESTIONS_PER_PHASE)))] ?? ARC_ORDER[0];
    },
    cloneProgressMap,
  };
}

export async function loadChapter1Runtime(fetchImpl = globalThis.fetch) {
  const pack = await loadChapter1CrossingFields(fetchImpl);
  return buildChapter1Runtime(pack);
}
