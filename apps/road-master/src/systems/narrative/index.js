export {
  buildBossTitle,
  buildChapterTitle,
  buildConquestTitle,
  buildFailureTitle,
  buildNarrativeSignals,
  formatRankTitle,
} from "./titles.mjs";

import {
  buildBossTitle,
  buildChapterTitle,
  buildConquestTitle,
  buildFailureTitle,
  buildNarrativeSignals,
} from "./titles.mjs";
import {
  buildCohortComparison,
  buildGhostRun,
  buildShareCard,
} from "../social/index.mjs";

const mentorLines = {
  intro: [
    "The road is a hierarchy. Learn who yields.",
    "Crossing Fields opens. The first law is discipline.",
    "The map is not decoration. It is memory laid out as terrain.",
  ],
  correct: [
    "Good. The road yielded.",
    "Correct. The rule hierarchy held.",
    "You read the lane before you moved.",
  ],
  wrong: [
    "Damage. The trap counted on haste.",
    "You moved before the signal was clear.",
    "The road punished the obvious answer.",
  ],
  flashback: [
    "Known ground is slipping. Reclaim it immediately.",
    "The Four-Way Labyrinth remembers this mistake.",
    "Return to the map. The scar must be named before it fades.",
  ],
  clear: [
    "This ground is conquered.",
    "You reclaimed the road cleanly.",
    "The chapter remembers your discipline.",
  ],
  victory: [
    "The Gate opens. Have you become the Road Master?",
    "Crossing Fields is yours. The Beast fell to the hierarchy.",
    "Victory is stable mastery made visible.",
  ],
  failure: [
    "Repair. Return cleaner.",
    "The Beast found a gap in your discipline.",
    "Failure is damage, not judgment. Retry with clearer reading.",
  ],
};

const bossLines = {
  intro: [
    "Claim the lane if you can.",
    "I punish speed without structure.",
    "The obvious answer is a wound I am about to reopen.",
  ],
  phase: [
    "I shift again. Read the lane.",
    "The Beast tightens the crossing.",
    "Your confidence is not the same as mastery.",
    "The final claim belongs to whoever reads deeper.",
  ],
  hit: [
    "The Beast found the seam.",
    "That answer looked safe. It was not.",
    "A weak exception collapsed the whole line.",
  ],
};

const conquestLines = {
  intro: [
    "The road is now a map of proven moves.",
    "The lane is conquered because the rule held.",
    "Victory must leave a trail the cohort can read.",
  ],
  share: [
    "Broadcast the run.",
    "Share the conquest while the memory is fresh.",
    "A stable run is stronger when it is named.",
  ],
};

function pick(pool, key = 0) {
  return pool[Math.abs(key) % pool.length];
}
function line(speaker, tone, text, meta = {}) {
  return { speaker, tone, text, ...meta };
}

function signalMeta(signal = {}) {
  return {
    signalKind: signal.kind ?? null,
    signalTitle: signal.title ?? null,
    signalSubtitle: signal.subtitle ?? null,
    signalRank: signal.rank ?? null,
    signalRankTitle: signal.rankTitle ?? null,
    signalBadge: signal.badge ?? null,
    signalSummary: signal.summary ?? null,
  };
}

export function createNarrativeOracle(chapter = {}) {
  const signals = buildNarrativeSignals(chapter, {
    boss: chapter.bossData ?? chapter.boss ?? {},
    chapterPhase: "intro",
    bossPhase: "pressure",
    runLabel: chapter.shareCard ?? "Conquest",
    failureReason: "Retry from the checkpoint.",
  });

  const memorySignal = buildChapterTitle(chapter, { phase: "memory", rank: "C" });
  const shareSignals = {
    conquest: buildConquestTitle(chapter, { rank: "A", runLabel: chapter.shareCard ?? "Conquest" }),
    failure: buildFailureTitle(chapter, {
      rank: "F",
      reason: "Retry from the checkpoint or restart the chapter.",
    }),
  };

  return {
    signals,
    chapterSignal(options = {}) {
      return buildChapterTitle(chapter, options);
    },
    bossSignal(options = {}) {
      return buildBossTitle(chapter.bossData ?? chapter.boss ?? {}, options);
    },
    conquestSignal(options = {}) {
      return buildConquestTitle(chapter, options);
    },
    failureSignal(options = {}) {
      return buildFailureTitle(chapter, options);
    },
    shareCard(run = {}) {
      return buildShareCard(run, {
        chapterTitle: chapter.chapter ?? chapter.title,
        regionTitle: chapter.region ?? chapter.title,
        shareUrl: chapter.shareUrl ?? null,
        crest: chapter.crest ?? "assets/road-master-crest.svg",
      });
    },
    ghostRun(run = {}) {
      return buildGhostRun(run, {
        chapterTitle: chapter.chapter ?? chapter.title,
        regionTitle: chapter.region ?? chapter.title,
      });
    },
    cohortComparison(playerRun = {}, cohortRun = {}, context = {}) {
      return buildCohortComparison(playerRun, cohortRun, {
        ...context,
        chapterTitle: chapter.chapter ?? chapter.title,
        regionTitle: chapter.region ?? chapter.title,
      });
    },
    intro() {
      return [
        line(chapter.mentor, "doctrine", pick(mentorLines.intro, 0), signalMeta(signals.chapter)),
        line("System", "briefing", `${signals.chapter.title} is live.`, signalMeta(signals.chapter)),
      ];
    },
    start() {
      const signal = buildChapterTitle(chapter, { phase: "briefing", rank: "C" });
      return [
        line(chapter.mentor, "doctrine", pick(mentorLines.intro, 1), signalMeta(signal)),
        line("System", "briefing", signal.subtitle, signalMeta(signal)),
      ];
    },
    correct(stepIndex, promptIndex, node) {
      const chapterSignal = signals.chapter;
      if (node.kind === "boss") {
        const bossSignal = buildBossTitle(chapter.bossData ?? chapter.boss ?? {}, {
          rank: promptIndex >= 2 ? "A" : "B",
          phase: "pressure",
          phaseIndex: promptIndex,
        });
        return [
          line(chapter.mentor, "approval", pick(mentorLines.correct, stepIndex + promptIndex), signalMeta(chapterSignal)),
          line(
            chapter.boss,
            "pressure",
            pick(bossLines.phase, promptIndex),
            {
              ...signalMeta(bossSignal),
              nodeKind: "boss",
            },
          ),
        ];
      }

      return [
        line(chapter.mentor, "approval", pick(mentorLines.correct, stepIndex + promptIndex), signalMeta(chapterSignal)),
        line(
          "System",
          "progress",
          `Concept locked: ${node.prompts[promptIndex].concept}.`,
          signalMeta(chapterSignal),
        ),
      ];
    },
    wrong(stepIndex, promptIndex, node) {
      const lines = [
        line(chapter.mentor, "warning", pick(mentorLines.wrong, stepIndex + promptIndex), signalMeta(signals.failure)),
      ];

      if (node.kind === "boss") {
        const bossSignal = buildBossTitle(chapter.bossData ?? chapter.boss ?? {}, {
          rank: promptIndex >= 2 ? "B" : "C",
          phase: "pressure",
          phaseIndex: promptIndex,
        });
        lines.push(
          line(
            chapter.boss,
            "pressure",
            pick(bossLines.hit, stepIndex + promptIndex),
            {
              ...signalMeta(bossSignal),
              nodeKind: "boss",
            },
          ),
        );
      }

      return lines;
    },
    flashback(node) {
      return [
        line(chapter.mentor, "memory", pick(mentorLines.flashback, node.id.length), signalMeta(memorySignal)),
        line("System", "memory", `Flashback anchored to ${node.title}.`, signalMeta(memorySignal)),
      ];
    },
    clear(node) {
      return [
        line(chapter.mentor, "approval", pick(mentorLines.clear, node.prompts.length), signalMeta(signals.conquest)),
        line("System", "progress", `${node.title} cleared.`, signalMeta(signals.conquest)),
      ];
    },
    bossIntro() {
      return [
        line(chapter.boss, "pressure", pick(bossLines.intro, 0), signalMeta(signals.boss)),
        line(chapter.mentor, "doctrine", "Boss fights are tests of discipline under pressure.", signalMeta(signals.boss)),
      ];
    },
    bossPhase(stepIndex) {
      return [
        line(
          chapter.boss,
          "pressure",
          pick(bossLines.phase, stepIndex),
          {
            ...signalMeta(signals.boss),
            phaseIndex: stepIndex,
          },
        ),
      ];
    },
    conquest(run = {}) {
      const shareCard = this.shareCard(run);
      return [
        line(chapter.mentor, "victory", pick(conquestLines.intro, 0), signalMeta(signals.conquest)),
        line("System", "victory", shareCard.title, {
          ...signalMeta(signals.conquest),
          shareCard,
        }),
      ];
    },
    victory(run = {}) {
      const shareCard = this.shareCard(run);
      return [
        line(chapter.mentor, "victory", pick(mentorLines.victory, 0), signalMeta(signals.conquest)),
        line("System", "victory", shareCard.text, {
          ...signalMeta(signals.conquest),
          shareCard,
        }),
      ];
    },
    failure(run = {}) {
      const failureSignal = this.failureSignal({
        reason: run.reason ?? "Retry from the checkpoint or restart the chapter.",
      });
      return [
        line(chapter.mentor, "repair", pick(mentorLines.failure, 0), signalMeta(failureSignal)),
        line("System", "repair", failureSignal.subtitle, signalMeta(failureSignal)),
      ];
    },
    defeat(run = {}) {
      return this.failure(run);
    },
    share(run = {}) {
      const card = this.shareCard(run);
      return [
        line("System", "share", card.text, {
          ...signalMeta(signals.conquest),
          shareCard: card,
        }),
      ];
    },
  };
}
