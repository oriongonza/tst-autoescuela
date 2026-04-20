function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function metric(label, value, tone = "") {
  return `
    <div class="metric ${tone ? `metric--${tone}` : ""}">
      <span class="metric__label">${escapeHtml(label)}</span>
      <strong class="metric__value">${escapeHtml(value)}</strong>
    </div>
  `;
}

function nodeState(index, state) {
  if (state.phase === "title" && index === 0) {
    return "preview";
  }
  if (state.phase === "victory") {
    return "cleared";
  }
  if (index < state.stageIndex) {
    return "cleared";
  }
  if (index === state.stageIndex) {
    return state.phase === "failure" ? "faulted" : "active";
  }
  return "locked";
}

function renderNode(node, index, state) {
  const status = nodeState(index, state);
  return `
    <button
      class="node node--${status} node--${node.color}"
      data-action="focus-node"
      data-node-id="${escapeHtml(node.id)}"
      type="button"
      aria-pressed="${state.selectedNodeId === node.id ? "true" : "false"}"
    >
      <span class="node__badge">${escapeHtml(node.badge)}</span>
      <span class="node__title">${escapeHtml(node.title)}</span>
      <span class="node__subtitle">${escapeHtml(node.subtitle)}</span>
      <span class="node__status">${escapeHtml(status)}</span>
    </button>
  `;
}

function renderFeed(feed) {
  return feed
    .map(
      (entry) => `
      <article class="feed-entry feed-entry--${escapeHtml(entry.tone)}">
        <div class="feed-entry__speaker">${escapeHtml(entry.speaker)}</div>
        <p>${escapeHtml(entry.text)}</p>
      </article>
    `
    )
    .join("");
}

function renderCues(cues) {
  return cues
    .map(
      (cue) => `
      <span class="cue-pill cue-pill--${escapeHtml(cue.name)}">${escapeHtml(cue.label)}</span>
    `
    )
    .join("");
}

function renderChoices(state, prompt) {
  return prompt.choices
    .map((choice, index) => {
      const isPicked = state.lastChoiceIndex === index;
      const isCorrect = prompt.correctIndex === index;
      const classes = [
        "choice",
        isPicked ? "choice--picked" : "",
        state.pendingAdvance && isCorrect ? "choice--correct" : "",
        state.pendingAdvance && isPicked && !isCorrect ? "choice--missed" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
        <button
          class="${classes}"
          data-action="answer-choice"
          data-choice-index="${index}"
          type="button"
          ${state.pendingAdvance ? "disabled" : ""}
        >
          <span class="choice__index">${index + 1}</span>
          <span class="choice__text">${escapeHtml(choice)}</span>
        </button>
      `;
    })
    .join("");
}

function renderBattle(state, currentNode, prompt) {
  const progress = `${state.promptIndex + 1}/${currentNode.prompts.length}`;
  const bossLine = currentNode.kind === "boss" ? `<span class="pill pill--danger">Boss phase ${state.bossPhase || 1}</span>` : "";
  const hpWidth = `${Math.max(6, Math.min(100, (state.hp / state.maxHp) * 100))}%`;
  const bossWidth = currentNode.kind === "boss" ? `${Math.max(0, Math.min(100, (state.bossHp / currentNode.prompts.length) * 100))}%` : "0%";

  return `
    <article class="card battle">
      <div class="section-head">
        <div>
          <p class="eyebrow">Campaign pressure</p>
          <h2>${escapeHtml(currentNode.title)}</h2>
        </div>
        <div class="battle-head__meta">
          <span class="pill">${escapeHtml(progress)}</span>
          ${bossLine}
        </div>
      </div>

      <div class="battle-stats">
        <div class="meter">
          <div class="meter__label">HP</div>
          <div class="meter__bar"><span style="width:${hpWidth}"></span></div>
          <div class="meter__value">${state.hp}/${state.maxHp}</div>
        </div>
        <div class="meter">
          <div class="meter__label">Readiness</div>
          <div class="meter__bar meter__bar--readiness"><span style="width:${state.readiness}%"></span></div>
          <div class="meter__value">${state.readiness}%</div>
        </div>
        <div class="meter">
          <div class="meter__label">Boss pressure</div>
          <div class="meter__bar meter__bar--boss"><span style="width:${bossWidth}"></span></div>
          <div class="meter__value">${currentNode.kind === "boss" ? state.bossHp : "—"}</div>
        </div>
      </div>

      <div class="prompt-card prompt-card--${escapeHtml(currentNode.kind)}">
        <div class="prompt-card__move">${escapeHtml(prompt.move || currentNode.subtitle)}</div>
        <h3>${escapeHtml(prompt.question)}</h3>
        <div class="choices">${renderChoices(state, prompt)}</div>
        <div class="prompt-card__explanation prompt-card__explanation--${escapeHtml(state.feedback.tone)}">
          <strong>${escapeHtml(state.feedback.title)}</strong>
          <span>${escapeHtml(state.feedback.detail)}</span>
        </div>
        <div class="prompt-card__actions">
          ${
            state.pendingAdvance
              ? `<button class="primary" data-action="continue" type="button">Continue</button>`
              : `<button class="secondary" data-action="retry-checkpoint" type="button">Retry checkpoint</button>`
          }
        </div>
      </div>

      ${
        state.flashback
          ? `
            <aside class="flashback">
              <span class="flashback__tag">Flashback</span>
              <strong>${escapeHtml(state.flashback.title)}</strong>
              <p>${escapeHtml(state.flashback.detail)}</p>
            </aside>
          `
          : ""
      }
    </article>
  `;
}

function renderMap(state, chapter) {
  const selectedNode = chapter.nodes.find((node) => node.id === state.selectedNodeId) || chapter.nodes[state.stageIndex];
  const statusLabel = state.phase === "title" ? "Briefing preview" : state.phase === "victory" ? "Region conquered" : state.phase === "failure" ? "Repair path" : "Active route";

  return `
    <article class="card map-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Campaign map</p>
          <h2>${escapeHtml(chapter.region)}</h2>
        </div>
        <span class="pill">${escapeHtml(statusLabel)}</span>
      </div>

      <div class="map-path">
        ${chapter.nodes.map((node, index) => renderNode(node, index, state)).join("")}
      </div>

      <div class="selected-node">
        <div class="selected-node__title">
          <p class="eyebrow">Selected node</p>
          <h3>${escapeHtml(selectedNode.title)}</h3>
        </div>
        <p>${escapeHtml(selectedNode.summary)}</p>
        <dl class="selected-node__facts">
          <div>
            <dt>Kind</dt>
            <dd>${escapeHtml(selectedNode.kind)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>${escapeHtml(nodeState(chapter.nodes.findIndex((item) => item.id === selectedNode.id), state))}</dd>
          </div>
          <div>
            <dt>Prompts</dt>
            <dd>${selectedNode.prompts.length}</dd>
          </div>
        </dl>
      </div>
    </article>
  `;
}

function renderNarrative(state, chapter) {
  const mentorFeed = state.feed.filter((entry) => entry.speaker === chapter.mentor).slice(-3);
  const bossFeed = state.feed.filter((entry) => entry.speaker === chapter.boss).slice(-3);
  return `
    <article class="card narrative">
      <div class="section-head">
        <div>
          <p class="eyebrow">Mentor / boss shell</p>
          <h2>Voice, doctrine, and tension</h2>
        </div>
        <span class="pill">Story runtime</span>
      </div>

      <div class="voice-stack">
        <section class="voice-panel voice-panel--mentor">
          <div class="voice-panel__label">${escapeHtml(chapter.mentor)}</div>
          ${mentorFeed.length
            ? mentorFeed
                .map(
                  (entry) => `
                  <p class="voice-line">${escapeHtml(entry.text)}</p>
                `
                )
                .join("")
            : `<p class="voice-line">The mentor is waiting for the first breach.</p>`}
        </section>

        <section class="voice-panel voice-panel--boss">
          <div class="voice-panel__label">${escapeHtml(chapter.boss)}</div>
          ${bossFeed.length
            ? bossFeed
                .map(
                  (entry) => `
                  <p class="voice-line">${escapeHtml(entry.text)}</p>
                `
                )
                .join("")
            : `<p class="voice-line">The Beast waits behind the map.</p>`}
        </section>
      </div>

      <section class="doctrine">
        <h3>Chapter doctrine</h3>
        <div class="doctrine__list">
          ${chapter.doctrine
            .map(
              (line) => `
              <div class="doctrine__item">${escapeHtml(line)}</div>
            `
            )
            .join("")}
        </div>
      </section>

      <section class="event-log">
        <h3>Story feed</h3>
        <div class="feed-list">${renderFeed(state.feed)}</div>
      </section>
    </article>
  `;
}

function renderAudio(state) {
  const audioStatus = state.audioStatus || {};
  const scene = audioStatus.scene || "title";
  const intensity = Math.round((audioStatus.intensity ?? 0.2) * 100);
  const readyLabel = audioStatus.ready ? "Ready" : "Locked";
  const mutedLabel = audioStatus.muted ? "Muted" : "Live";

  return `
    <article class="card audio-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Audiovisual triggers</p>
          <h2>Audio system stubs</h2>
        </div>
        <button class="pill pill--toggle" data-action="toggle-audio" type="button">
          ${state.audioEnabled ? "Mute audio" : "Enable audio"}
        </button>
      </div>

      <div class="audio-status">
        <span class="pill">Scene: ${escapeHtml(scene)}</span>
        <span class="pill">${escapeHtml(readyLabel)}</span>
        <span class="pill">${escapeHtml(mutedLabel)}</span>
        <span class="pill">Intensity: ${intensity}%</span>
      </div>

      <div class="audio-visualizer" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>

      <div class="cue-grid">
        <button class="cue-button" data-action="play-cue" data-cue="title" data-label="Title sting" type="button">Title sting</button>
        <button class="cue-button" data-action="play-cue" data-cue="correct" data-label="Correct hit" type="button">Correct hit</button>
        <button class="cue-button" data-action="play-cue" data-cue="wrong" data-label="Wrong hit" type="button">Wrong hit</button>
        <button class="cue-button" data-action="play-cue" data-cue="flashback" data-label="Flashback" type="button">Flashback</button>
        <button class="cue-button" data-action="play-cue" data-cue="boss" data-label="Boss entrance" type="button">Boss entrance</button>
        <button class="cue-button" data-action="play-cue" data-cue="victory" data-label="Victory sting" type="button">Victory sting</button>
      </div>

      <div class="cue-log">
        <h3>Cue log</h3>
        <div class="cue-list">${renderCues(state.cues)}</div>
      </div>
    </article>
  `;
}

function renderHero(state, chapter) {
  const current = chapter.nodes[clamp(state.stageIndex, 0, chapter.nodes.length - 1)];
  return `
    <section class="hero card">
      <div class="hero__mark">
        <img src="./assets/road-master-crest.svg" alt="" />
      </div>
      <div class="hero__copy">
        <p class="eyebrow">0.1.0 vertical slice</p>
        <h1>${escapeHtml(chapter.title)}</h1>
        <p class="hero__lead">
          ${escapeHtml(chapter.subtitle)}
        </p>
        <div class="hero__hooks">
          ${chapter.hook
            .map(
              (item) => `
              <span class="hook-chip">${escapeHtml(item)}</span>
            `
            )
            .join("")}
        </div>
      </div>
      <div class="hero__stats">
        ${metric("Region", chapter.region, "amber")}
        ${metric("Checkpoint", chapter.nodes[state.checkpointIndex]?.title || current.title, "teal")}
        ${metric("Readiness", `${state.readiness}%`, "mint")}
        ${metric("Risk", `${Math.round(state.pressure)}%`, "danger")}
      </div>
      <div class="hero__actions">
        ${
          state.phase === "title"
            ? `<button class="primary" data-action="start-chapter" type="button">Enter Chapter I</button>`
            : `<button class="primary" data-action="retry-checkpoint" type="button">Retry checkpoint</button>`
        }
        <button class="secondary" data-action="toggle-audio" type="button">${state.audioEnabled ? "Mute audio" : "Enable audio"}</button>
        <button class="secondary" data-action="restart-chapter" type="button">Restart chapter</button>
      </div>
    </section>
  `;
}

function renderOverlay(state, chapter) {
  if (state.phase === "title") {
    return `
      <div class="overlay overlay--title">
        <div class="overlay__backdrop"></div>
        <section class="overlay__card card card--hero">
          <img class="overlay__crest" src="./assets/road-master-crest.svg" alt="" />
          <p class="eyebrow">Road Master campaign shell</p>
          <h2>Crossing Fields</h2>
          <p class="overlay__lede">
            One region. One boss. One retry loop. The shell is ready for the core systems.
          </p>
          <div class="overlay__actions">
            <button class="primary" data-action="start-chapter" type="button">Enter Chapter I</button>
            <button class="secondary" data-action="toggle-audio" type="button">${state.audioEnabled ? "Mute audio" : "Enable audio"}</button>
          </div>
          <div class="overlay__stack">
            <div class="overlay__item">Mentor voice: severe guide</div>
            <div class="overlay__item">Boss: The Right-of-Way Beast</div>
            <div class="overlay__item">Failure: instant repair flow</div>
            <div class="overlay__item">Victory: conquest ritual and share card</div>
          </div>
        </section>
      </div>
    `;
  }

  if (state.phase === "victory") {
    return `
      <div class="overlay overlay--victory">
        <div class="overlay__backdrop"></div>
        <section class="overlay__card card card--hero">
          <p class="eyebrow">Chapter clear</p>
          <h2>Crossing Fields conquered</h2>
          <p class="overlay__lede">${escapeHtml(chapter.shareCard)}</p>
          <div class="overlay__stack">
            <div class="overlay__item">The Beast fell to structure.</div>
            <div class="overlay__item">The map now reads as memory.</div>
            <div class="overlay__item">The next region silhouette is ready for Chapter II.</div>
          </div>
          <div class="overlay__actions">
            <button class="primary" data-action="share-card" type="button">Copy victory card</button>
            <button class="secondary" data-action="restart-chapter" type="button">Replay chapter</button>
            <button class="secondary" data-action="return-title" type="button">Return to title</button>
          </div>
        </section>
      </div>
    `;
  }

  if (state.phase === "failure") {
    return `
      <div class="overlay overlay--failure">
        <div class="overlay__backdrop"></div>
        <section class="overlay__card card card--hero">
          <p class="eyebrow">Repair mode</p>
          <h2>Retry from the checkpoint</h2>
          <p class="overlay__lede">${escapeHtml(state.feedback.detail)}</p>
          <div class="overlay__stack">
            <div class="overlay__item">Known ground slips are part of the chapter.</div>
            <div class="overlay__item">The road expects a cleaner read on retry.</div>
            <div class="overlay__item">The Beast is still waiting.</div>
          </div>
          <div class="overlay__actions">
            <button class="primary" data-action="retry-checkpoint" type="button">Retry checkpoint</button>
            <button class="secondary" data-action="restart-chapter" type="button">Restart chapter</button>
            <button class="secondary" data-action="return-title" type="button">Return to title</button>
          </div>
        </section>
      </div>
    `;
  }

  return "";
}

export function renderRoadMasterApp(state, chapter) {
  const currentNode = chapter.nodes[clamp(state.stageIndex, 0, chapter.nodes.length - 1)];
  const prompt = currentNode.prompts[clamp(state.promptIndex, 0, currentNode.prompts.length - 1)];

  return `
    <div class="shell shell--${escapeHtml(state.phase)} shell--${escapeHtml(currentNode.kind)}">
      <header class="topbar">
        <div class="brand">
          <img class="brand__mark" src="./assets/road-master-crest.svg" alt="" />
          <div>
            <div class="brand__name">Road Master</div>
            <div class="brand__sub">${escapeHtml(chapter.chapter)} · ${escapeHtml(chapter.region)}</div>
          </div>
        </div>
        <div class="topbar__status">
          <span class="pill">Stage ${Math.min(state.stageIndex + 1, chapter.nodes.length)}/${chapter.nodes.length}</span>
          <span class="pill">HP ${state.hp}/${state.maxHp}</span>
          <span class="pill">Momentum ${Math.round(state.momentum)}%</span>
          <span class="pill">Risk ${Math.round(state.pressure)}%</span>
          <button class="pill pill--toggle" data-action="toggle-audio" type="button">
            ${state.audioEnabled ? "Mute audio" : "Enable audio"}
          </button>
        </div>
      </header>

      <main class="stage">
        ${renderHero(state, chapter)}

        <section class="grid">
          ${renderMap(state, chapter)}
          ${
            state.phase === "title"
              ? `
                <article class="card intro-card">
                  <div class="section-head">
                    <div>
                      <p class="eyebrow">Title screen</p>
                      <h2>Prepare the chapter</h2>
                    </div>
                    <span class="pill">Static shell</span>
                  </div>
                  <p>
                    The shell is already wired for mentor doctrine, boss pressure, retry flow, and audiovisual triggers.
                    Enter Chapter I to step into Crossing Fields.
                  </p>
                  <div class="intro-card__list">
                    ${chapter.hook
                      .map(
                        (item) => `
                        <div class="intro-chip">${escapeHtml(item)}</div>
                      `
                      )
                      .join("")}
                  </div>
                </article>
              `
              : renderBattle(state, currentNode, prompt)
          }
          ${renderNarrative(state, chapter)}
          ${renderAudio(state)}
        </section>
      </main>

      ${renderOverlay(state, chapter)}
    </div>
  `;
}
