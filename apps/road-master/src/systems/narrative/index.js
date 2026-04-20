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

function pick(pool, key = 0) {
  return pool[Math.abs(key) % pool.length];
}

function line(speaker, tone, text) {
  return { speaker, tone, text };
}

export function createNarrativeOracle(chapter) {
  return {
    intro() {
      return [
        line(chapter.mentor, "doctrine", pick(mentorLines.intro, 0)),
        line("System", "briefing", "Chapter I loads. Crossing Fields is waiting."),
      ];
    },
    start() {
      return [
        line(chapter.mentor, "doctrine", pick(mentorLines.intro, 1)),
        line("System", "briefing", `Vertical slice: ${chapter.region}.`),
      ];
    },
    correct(stepIndex, promptIndex, node) {
      return [
        line(chapter.mentor, "approval", pick(mentorLines.correct, stepIndex + promptIndex)),
        line(node.kind === "boss" ? chapter.boss : "System", node.kind === "boss" ? "pressure" : "progress", node.kind === "boss" ? pick(bossLines.phase, promptIndex) : `Concept locked: ${node.prompts[promptIndex].concept}.`),
      ];
    },
    wrong(stepIndex, promptIndex, node) {
      const lines = [line(chapter.mentor, "warning", pick(mentorLines.wrong, stepIndex + promptIndex))];
      if (node.kind === "boss") {
        lines.push(line(chapter.boss, "pressure", pick(bossLines.hit, stepIndex + promptIndex)));
      }
      return lines;
    },
    flashback(node) {
      return [
        line(chapter.mentor, "memory", pick(mentorLines.flashback, node.id.length)),
        line("System", "memory", `Flashback anchored to ${node.title}.`),
      ];
    },
    clear(node) {
      return [
        line(chapter.mentor, "approval", pick(mentorLines.clear, node.prompts.length)),
        line("System", "progress", `${node.title} cleared.`),
      ];
    },
    bossIntro() {
      return [
        line(chapter.boss, "pressure", pick(bossLines.intro, 0)),
        line(chapter.mentor, "doctrine", "Boss fights are tests of discipline under pressure."),
      ];
    },
    bossPhase(stepIndex) {
      return [line(chapter.boss, "pressure", pick(bossLines.phase, stepIndex))];
    },
    victory() {
      return [
        line(chapter.mentor, "victory", pick(mentorLines.victory, 0)),
        line("System", "victory", chapter.shareCard),
      ];
    },
    failure() {
      return [
        line(chapter.mentor, "repair", pick(mentorLines.failure, 0)),
        line("System", "repair", "Retry from the checkpoint or restart the chapter."),
      ];
    },
  };
}
