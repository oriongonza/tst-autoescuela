import { chapter1 } from "./chapter1.js";
import { createNarrativeOracle } from "../systems/narrative/index.js";
import { createAudioDirector } from "../systems/audio/index.js";
import { renderRoadMasterApp } from "../ui/shell.js";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Road Master root element not found.");
}

const narrative = createNarrativeOracle(chapter1);

let state;

const audio = createAudioDirector(() => {
  state = {
    ...state,
    audioStatus: audio.getStatus(),
  };
  sync();
});

function createInitialState(options = {}) {
  const audioEnabled = Boolean(options.audioEnabled);
  const bossNode = chapter1.nodes.find((node) => node.kind === "boss");
  return {
    phase: "title",
    stageIndex: 0,
    promptIndex: 0,
    checkpointIndex: 0,
    selectedNodeId: chapter1.nodes[0].id,
    hp: 10,
    maxHp: 10,
    bossHp: bossNode ? bossNode.prompts.length : 0,
    pendingAdvance: false,
    lastChoiceIndex: null,
    feedback: {
      tone: "neutral",
      title: "Chapter loaded",
      detail: "Enter the Road Master campaign to begin.",
    },
    flashback: null,
    feed: narrative.intro(),
    cues: [],
    mistakes: 0,
    streak: 0,
    momentum: 18,
    pressure: 42,
    readiness: 0,
    shareText: chapter1.shareCard,
    audioEnabled,
    audioStatus: audio.getStatus(),
  };
}

state = createInitialState();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function currentNode() {
  return chapter1.nodes[clamp(state.stageIndex, 0, chapter1.nodes.length - 1)];
}

function currentPrompt() {
  const node = currentNode();
  return node.prompts[clamp(state.promptIndex, 0, node.prompts.length - 1)];
}

function resetFeedback(title, detail, tone = "neutral") {
  state = {
    ...state,
    feedback: { tone, title, detail },
  };
}

function appendFeed(lines) {
  state = {
    ...state,
    feed: [...state.feed, ...lines].slice(-8),
  };
}

function appendCue(name, label) {
  state = {
    ...state,
    cues: [...state.cues, { name, label }].slice(-6),
  };
}

function refreshMetrics() {
  const cleared =
    state.phase === "title"
      ? 0
      : state.phase === "victory"
        ? chapter1.nodes.length
        : Math.min(state.stageIndex, chapter1.nodes.length);
  const readiness = Math.round((cleared / chapter1.nodes.length) * 100);
  const pressure =
    state.phase === "victory"
      ? 0
      : clamp(42 + state.mistakes * 8 + (state.hp < 4 ? 14 : 0) - readiness * 0.3, 0, 100);
  const momentum =
    state.phase === "victory"
      ? 100
      : clamp(18 + readiness * 0.55 + state.streak * 6 - state.mistakes * 4, 0, 100);
  const node = currentNode();
  const bossPhase = node.kind === "boss" ? state.promptIndex + 1 : 0;

  state = {
    ...state,
    readiness,
    pressure,
    momentum,
    bossPhase,
  };
}

function updateSceneAudio(scene) {
  audio.setScene(scene);
  state = {
    ...state,
    audioStatus: audio.getStatus(),
  };
}

function enterStage(nextIndex, { intro = false } = {}) {
  const nextNode = chapter1.nodes[nextIndex];

  if (!nextNode) {
    return;
  }

  state = {
    ...state,
    stageIndex: nextIndex,
    promptIndex: 0,
    checkpointIndex: nextIndex,
    selectedNodeId: nextNode.id,
    pendingAdvance: false,
    lastChoiceIndex: null,
    flashback: null,
    bossHp: nextNode.kind === "boss" ? nextNode.prompts.length : state.bossHp,
  };

  resetFeedback(nextNode.title, nextNode.summary, "neutral");
  refreshMetrics();

  if (intro) {
    appendFeed(narrative.start());
    appendCue("title", "Chapter ignition");
    audio.playCue("title");
  }

  if (nextNode.kind === "boss") {
    appendFeed(narrative.bossIntro());
    appendCue("boss", "Boss enters");
    updateSceneAudio("boss");
    audio.playCue("boss");
  } else {
    updateSceneAudio("campaign");
  }
}

function finishChapter() {
  state = {
    ...state,
    phase: "victory",
    pendingAdvance: false,
    selectedNodeId: chapter1.nodes[chapter1.nodes.length - 1].id,
    flashback: null,
    feedback: {
      tone: "victory",
      title: "Crossing Fields conquered",
      detail: "The Beast fell to structure, not luck.",
    },
    shareText: chapter1.shareCard,
  };
  appendFeed(narrative.victory());
  appendCue("victory", "Chapter clear");
  updateSceneAudio("victory");
  audio.playCue("victory");
  refreshMetrics();
}

function markFailure(reason) {
  state = {
    ...state,
    phase: "failure",
    pendingAdvance: false,
    flashback: null,
    feedback: {
      tone: "failure",
      title: "Retry from the checkpoint",
      detail: reason,
    },
  };
  appendFeed(narrative.failure());
  appendCue("repair", "Repair path");
  updateSceneAudio("failure");
  audio.playCue("repair");
  refreshMetrics();
}

function goToTitle() {
  const audioEnabled = state.audioEnabled;
  if (audioEnabled) {
    audio.toggleMute(false);
  } else {
    audio.toggleMute(true);
  }
  state = createInitialState({ audioEnabled });
  updateSceneAudio("title");
  appendCue("title", "Return to title");
}

function submitAnswer(choiceIndex) {
  if (state.phase !== "campaign" || state.pendingAdvance) {
    return;
  }

  const node = currentNode();
  const prompt = currentPrompt();
  const isCorrect = choiceIndex === prompt.correctIndex;

  state = {
    ...state,
    lastChoiceIndex: choiceIndex,
  };

  if (isCorrect) {
    state = {
      ...state,
      pendingAdvance: true,
      streak: state.streak + 1,
      mistakes: state.mistakes,
      hp: state.hp,
      bossHp: node.kind === "boss" ? Math.max(0, state.bossHp - 1) : state.bossHp,
      feedback: {
        tone: "correct",
        title: "Correct",
        detail: prompt.explanation,
      },
    };
    appendFeed(narrative.correct(state.stageIndex, state.promptIndex, node));
    appendCue("correct", "Correct answer");
    audio.playCue("correct");
  } else {
    const nextHp = state.hp - (node.kind === "boss" ? 2 : 1);
    state = {
      ...state,
      pendingAdvance: false,
      streak: 0,
      mistakes: state.mistakes + 1,
      hp: nextHp,
      feedback: {
        tone: "wrong",
        title: "The Beast found a gap",
        detail: prompt.explanation,
      },
      flashback:
        node.kind === "submap" || node.kind === "boss" || prompt.flashback
          ? {
              title: "Known ground slipping",
              detail: prompt.flashback || `Revisit ${node.title} and reclaim the rule.`,
              nodeId: node.id,
            }
          : null,
    };
    appendFeed(narrative.wrong(state.stageIndex, state.promptIndex, node));
    appendCue("wrong", "Wrong answer");
    audio.playCue("wrong");
    if (state.flashback) {
      appendFeed(narrative.flashback(node));
      appendCue("flashback", "Flashback");
      audio.playCue("flashback");
    }
    if (nextHp <= 0) {
      markFailure("The run collapsed before the Beast did.");
      return;
    }
  }

  refreshMetrics();
}

function continueFromAnswer() {
  if (!state.pendingAdvance || state.phase !== "campaign") {
    return;
  }

  const node = currentNode();
  const nextPromptIndex = state.promptIndex + 1;

  state = {
    ...state,
    pendingAdvance: false,
    lastChoiceIndex: null,
    flashback: null,
  };

  if (nextPromptIndex < node.prompts.length) {
    state = {
      ...state,
      promptIndex: nextPromptIndex,
    };
    resetFeedback(node.title, node.summary, "neutral");
    appendCue("correct", `Advance to ${node.title}`);
    audio.playCue("correct");
    refreshMetrics();
    return;
  }

  appendFeed(narrative.clear(node));
  appendCue("correct", `${node.title} cleared`);

  const nextStageIndex = state.stageIndex + 1;
  if (nextStageIndex >= chapter1.nodes.length) {
    finishChapter();
    return;
  }

  state = {
    ...state,
    stageIndex: nextStageIndex,
    promptIndex: 0,
    checkpointIndex: nextStageIndex,
    selectedNodeId: chapter1.nodes[nextStageIndex].id,
    bossHp:
      chapter1.nodes[nextStageIndex].kind === "boss"
        ? chapter1.nodes[nextStageIndex].prompts.length
        : state.bossHp,
  };
  resetFeedback(
    chapter1.nodes[nextStageIndex].title,
    chapter1.nodes[nextStageIndex].summary,
    "progress"
  );
  refreshMetrics();

  if (chapter1.nodes[nextStageIndex].kind === "boss") {
    appendFeed(narrative.bossIntro());
    appendCue("boss", "Boss enters");
    updateSceneAudio("boss");
    audio.playCue("boss");
  } else {
    updateSceneAudio("campaign");
    audio.playCue("correct");
  }
}

function retryFromCheckpoint() {
  const retryIndex = clamp(state.checkpointIndex, 0, chapter1.nodes.length - 1);
  const node = chapter1.nodes[retryIndex];

  state = {
    ...state,
    phase: "campaign",
    stageIndex: retryIndex,
    promptIndex: 0,
    selectedNodeId: node.id,
    pendingAdvance: false,
    lastChoiceIndex: null,
    hp: 10,
    bossHp: node.kind === "boss" ? node.prompts.length : state.bossHp,
    flashback: null,
  };

  resetFeedback("Retry path", `Checkpoint restored at ${node.title}.`, "repair");
  appendCue("repair", "Checkpoint restore");
  updateSceneAudio(node.kind === "boss" ? "boss" : "campaign");
  audio.playCue("repair");
  refreshMetrics();
}

function restartChapter() {
  const audioEnabled = state.audioEnabled;
  if (audioEnabled) {
    audio.toggleMute(false);
  } else {
    audio.toggleMute(true);
  }
  state = createInitialState({ audioEnabled });
  appendCue("title", "Restart chapter");
  updateSceneAudio("title");
  audio.playCue("title");
}

function toggleAudio() {
  const nextEnabled = !state.audioEnabled;
  state = {
    ...state,
    audioEnabled: nextEnabled,
  };

  if (nextEnabled) {
    void audio.unlock();
    audio.toggleMute(false);
    audio.playCue("title");
  } else {
    audio.toggleMute(true);
  }

  state = {
    ...state,
    audioStatus: audio.getStatus(),
  };
}

function focusNode(nodeId) {
  const node = chapter1.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return;
  }
  state = {
    ...state,
    selectedNodeId: nodeId,
  };
  resetFeedback(node.title, node.summary, node.kind === "boss" ? "danger" : "neutral");
}

function shareVictory() {
  const text = `${chapter1.shareCard} ${state.mistakes ? `(${state.mistakes} mistakes, ${state.hp} HP left)` : ""}`.trim();
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
  }
  state = {
    ...state,
    shareText: text,
  };
  appendFeed([{ speaker: "System", tone: "share", text: "Victory card copied to the clipboard." }]);
}

function handleAction(action, payload) {
  switch (action) {
    case "start-chapter":
      if (state.phase === "title") {
        state = {
          ...state,
          phase: "campaign",
        };
        enterStage(0, { intro: true });
      }
      break;
    case "toggle-audio":
      toggleAudio();
      break;
    case "focus-node":
      focusNode(payload.nodeId);
      break;
    case "answer-choice":
      submitAnswer(payload.choiceIndex);
      break;
    case "continue":
      continueFromAnswer();
      break;
    case "retry-checkpoint":
      retryFromCheckpoint();
      break;
    case "restart-chapter":
      restartChapter();
      break;
    case "return-title":
      goToTitle();
      break;
    case "play-cue":
      appendCue(payload.cue, payload.label);
      audio.playCue(payload.cue);
      break;
    case "share-card":
      shareVictory();
      break;
    default:
      break;
  }

  refreshMetrics();
  sync();
}

function sync() {
  root.dataset.phase = state.phase;
  root.dataset.scene = currentNode().kind;
  root.innerHTML = renderRoadMasterApp(state, chapter1);
}

root.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || !root.contains(button)) {
    return;
  }

  const payload = {
    nodeId: button.dataset.nodeId,
    choiceIndex:
      button.dataset.choiceIndex !== undefined ? Number(button.dataset.choiceIndex) : undefined,
    cue: button.dataset.cue,
    label: button.dataset.label,
  };

  handleAction(button.dataset.action, payload);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.phase !== "title") {
    handleAction("return-title", {});
  }
});

refreshMetrics();
sync();
