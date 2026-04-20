function cleanText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function defaultAnswerLabel(value, fallback) {
  return cleanText(value) ?? fallback;
}

export function buildContrastCase(input = {}) {
  const conceptTitle = defaultAnswerLabel(input.conceptTitle, "Concept");
  const trapLabel = defaultAnswerLabel(input.trapLabel, "trap");
  const correctAnswer = defaultAnswerLabel(input.correctAnswer, "the correct answer");
  const temptingAnswer = defaultAnswerLabel(input.temptingAnswer, "the tempting answer");

  return {
    kind: "contrast_case",
    conceptTitle,
    trapLabel,
    correctAnswer,
    temptingAnswer,
    summary:
      cleanText(input.summary) ??
      `${temptingAnswer} looks plausible, but ${correctAnswer} survives the rule.`,
    contrast:
      cleanText(input.contrast) ??
      `This trap is about ${trapLabel}; the correct move follows ${conceptTitle}.`,
    antiTrapRule:
      cleanText(input.antiTrapRule) ??
      `Reject the obvious answer when a sign, exception, or override changes the rule.`,
    exceptionNote: cleanText(input.exceptionNote),
    analogyId: cleanText(input.analogyId),
    analogyTitle: cleanText(input.analogyTitle),
    regionTitle: cleanText(input.regionTitle),
    nodeTitle: cleanText(input.nodeTitle),
    questionId: cleanText(input.questionId),
  };
}

export function buildAntiTrapMicroLesson(input = {}) {
  const trapLabel = defaultAnswerLabel(input.trapLabel, "trap");
  const conceptTitle = defaultAnswerLabel(input.conceptTitle, "the concept");
  const correctAnswer = defaultAnswerLabel(input.correctAnswer, "the correct answer");
  const temptingAnswer = defaultAnswerLabel(input.temptingAnswer, "the tempting answer");

  const contrastCase = input.contrastCase ?? buildContrastCase(input);

  return {
    kind: "micro_lesson",
    lessonType: "anti_trap",
    title: cleanText(input.title) ?? `Anti-trap: ${trapLabel}`,
    summary:
      cleanText(input.summary) ??
      `Use ${conceptTitle} to reject ${temptingAnswer} and land on ${correctAnswer}.`,
    steps: Array.isArray(input.steps) && input.steps.length > 0
      ? [...input.steps]
      : [
          `Notice the trap: ${trapLabel}.`,
          `Name the real rule: ${conceptTitle}.`,
          `Choose the answer that still works under pressure.`,
        ],
    contrastCase,
    recoveryHint:
      cleanText(input.recoveryHint) ??
      `Next time, look for the override before answering.`,
  };
}

export function resurfaceAnalogy(input = {}) {
  const analogyTitle = defaultAnswerLabel(input.analogyTitle, "analogy");
  const contrastCase = input.contrastCase ?? buildContrastCase(input);

  return {
    kind: "analogy_resurface",
    analogyId: cleanText(input.analogyId),
    analogyTitle,
    title: cleanText(input.title) ?? `Analogy resurfacing: ${analogyTitle}`,
    prompt:
      cleanText(input.prompt) ??
      `Remember how ${analogyTitle} explained this rule.`,
    bridge:
      cleanText(input.bridge) ??
      `This situation maps back to ${analogyTitle}; the trap is the wrong side of that analogy.`,
    contrastCase,
  };
}

export function buildLearningCue(input = {}) {
  const hasLessonData =
    Boolean(input.lesson) ||
    Boolean(input.question) ||
    Boolean(input.attack) ||
    Boolean(input.correct) ||
    Boolean(input.revengeTriggered) ||
    Boolean(input.parried);

  if (!hasLessonData) {
    return null;
  }

  const lesson = input.lesson ?? {};
  const question = input.question ?? {};
  const attack = input.attack ?? {};
  const correctAnswer =
    lesson.correctAnswer ??
    question.correctAnswer ??
    question.correctAnswerText ??
    question.answer ??
    attack.correctAnswer ??
    null;
  const temptingAnswer =
    lesson.temptingAnswer ??
    question.temptingAnswer ??
    question.wrongAnswer ??
    attack.temptingAnswer ??
    null;
  const trapLabel =
    lesson.trapLabel ??
    question.trapLabel ??
    attack.lessonTag ??
    attack.telegraph ??
    "trap";

  const contrastCase = buildContrastCase({
    conceptTitle: lesson.conceptTitle ?? question.conceptTitle ?? question.prompt,
    trapLabel,
    correctAnswer,
    temptingAnswer,
    summary: lesson.contrastSummary,
    contrast: lesson.contrast,
    antiTrapRule: lesson.antiTrapRule,
    exceptionNote: lesson.exceptionNote,
    analogyId: lesson.analogyId ?? question.analogyId,
    analogyTitle: lesson.analogyTitle ?? question.analogyTitle,
    regionTitle: lesson.regionTitle ?? question.regionTitle,
    nodeTitle: lesson.nodeTitle ?? question.nodeTitle,
    questionId: question.id ?? lesson.questionId,
  });

  const antiTrapMicroLesson = buildAntiTrapMicroLesson({
    trapLabel,
    conceptTitle: lesson.conceptTitle ?? question.conceptTitle ?? question.prompt,
    correctAnswer,
    temptingAnswer,
    summary: lesson.microLessonSummary,
    steps: lesson.microLessonSteps,
    recoveryHint: lesson.recoveryHint,
    contrastCase,
  });

  const analogyResurface =
    lesson.analogyId || lesson.analogyTitle || question.analogyId || question.analogyTitle
      ? resurfaceAnalogy({
          analogyId: lesson.analogyId ?? question.analogyId,
          analogyTitle: lesson.analogyTitle ?? question.analogyTitle,
          prompt: lesson.analogyPrompt,
          bridge: lesson.analogyBridge,
          contrastCase,
        })
      : null;

  const labels = new Set();
  if (input.parried || input.defused) {
    labels.add("trap_defused");
  }
  if (input.correct) {
    labels.add("reinforcement");
  }
  if (!input.correct) {
    labels.add("repair");
  }
  if (input.revengeTriggered) {
    labels.add("revenge");
  }

  return {
    kind: "learning_cue",
    lessonType:
      input.revengeTriggered ? "revenge" : input.parried || input.defused ? "trap_defused" : input.correct ? "reinforcement" : "repair",
    labels: Array.from(labels),
    contrastCase,
    antiTrapMicroLesson,
    analogyResurface,
  };
}
