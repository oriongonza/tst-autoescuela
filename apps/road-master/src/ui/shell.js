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

function nodeTone(node) {
  if (node.isCurrent) {
    return "current";
  }

  switch (node.state) {
    case "mastered":
      return "mastered";
    case "unlocked":
      return "unlocked";
    case "fragile":
      return "fragile";
    case "corrupted":
      return "corrupted";
    case "visible":
      return "visible";
    default:
      return "locked";
  }
}

function nodeStateLabel(node) {
  if (node.isCurrent) {
    return "current";
  }

  return node.state ?? "locked";
}

function renderNode(node) {
  const summary = node.summary ?? node.flavor ?? node.title;
  return `
    <button
      class="node node--${escapeHtml(nodeTone(node))} node--${escapeHtml(node.type)}"
      data-action="focus-node"
      data-node-id="${escapeHtml(node.id)}"
      type="button"
      aria-pressed="${node.isCurrent ? "true" : "false"}"
      title="${escapeHtml(summary)}"
    >
      <span class="node__badge">${escapeHtml(node.type)}</span>
      <span class="node__title">${escapeHtml(node.title)}</span>
      <span class="node__subtitle">${escapeHtml(summary)}</span>
      <span class="node__status">${escapeHtml(nodeStateLabel(node))}</span>
    </button>
  `;
}

function renderFeed(feed = []) {
  return feed
    .map(
      (entry) => `
      <article class="feed-entry feed-entry--${escapeHtml(entry.tone)}">
        <div class="feed-entry__speaker">${escapeHtml(entry.speaker)}</div>
        <p>${escapeHtml(entry.text)}</p>
      </article>
    `,
    )
    .join("");
}

function renderCues(cues = []) {
  return cues
    .map(
      (cue) => `
      <span class="cue-pill cue-pill--${escapeHtml(cue.name)}">${escapeHtml(cue.label)}</span>
    `,
    )
    .join("");
}

function renderChoices(state, question) {
  return (question?.choices ?? [])
    .map((choice, index) => {
      const isPicked = state.lastChoiceIndex === index;
      const isCorrect = question.correctIndex === index;
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

function renderKnowledgePanel(state, chapter) {
  const meta = state.currentPromptMeta ?? {};
  const explanation = meta.explanation ?? null;
  const trap = meta.trap ?? null;
  const analogy = meta.analogy ?? null;
  const explanationBody = Array.isArray(explanation?.body) ? explanation.body : [];

  return `
    <section class="knowledge-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Pack intelligence</p>
          <h3>${escapeHtml(explanation?.title ?? state.currentQuestion?.prompt ?? chapter.subtitle)}</h3>
        </div>
        <span class="pill">${escapeHtml(meta.phaseName ?? state.currentPhaseName ?? "gate")}</span>
      </div>

      <p class="knowledge-panel__lede">
        ${escapeHtml(explanation?.summary ?? state.currentQuestion?.prompt ?? "The pack has loaded.")}
      </p>

      ${
        explanationBody.length
          ? `
            <div class="knowledge-panel__body">
              ${explanationBody
                .map(
                  (line) => `
                    <p>${escapeHtml(line)}</p>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }

      <dl class="knowledge-panel__facts">
        <div>
          <dt>Trap</dt>
          <dd>${escapeHtml(trap?.summary ?? "No trap annotated")}</dd>
        </div>
        <div>
          <dt>Countermeasure</dt>
          <dd>${escapeHtml(trap?.countermeasure ?? "Restate the rule and compare the signal.")}</dd>
        </div>
        <div>
          <dt>Memory hook</dt>
          <dd>${escapeHtml(analogy?.memoryHook ?? analogy?.summary ?? "The road is a memory palace.")}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderBattle(state, chapter) {
  const question = state.currentQuestion;
  const routeNode = state.currentRouteNode;
  const storyNode = state.currentStoryNode;
  const promptMeta = state.currentPromptMeta ?? {};
  const pendingReclaim = Boolean(state.pendingKnownGroundTrigger);
  const progress = `${Math.min(state.questionIndex + 1, chapter.questions.length)}/${chapter.questions.length}`;
  const routeNodeIds = Array.isArray(chapter.route) ? chapter.route : [];
  const currentRouteIndex = Math.max(0, routeNodeIds.findIndex((nodeId) => nodeId === state.currentRouteNode?.id));
  const routeProgress = `${currentRouteIndex + 1}/${Math.max(1, routeNodeIds.length)}`;
  const pace = state.currentPaceState ?? "flow";
  const readiness = clamp(state.readiness ?? 0, 0, 100);
  const pressure = clamp(state.pressure ?? 0, 0, 100);
  const momentum = clamp(state.momentum ?? 0, 0, 100);
  const promptTitle = question?.prompt ?? "Campaign briefing";

  return `
    <article class="card battle">
      <div class="section-head">
        <div>
          <p class="eyebrow">Campaign pressure</p>
          <h2>${escapeHtml(routeNode?.title ?? chapter.region)}</h2>
        </div>
        <div class="battle-head__meta">
          <span class="pill">${escapeHtml(progress)}</span>
          <span class="pill">${escapeHtml(routeProgress)}</span>
          <span class="pill">${escapeHtml(pace)}</span>
          <span class="pill">${escapeHtml(state.bossPhaseLabel ?? "False lead")}</span>
        </div>
      </div>

      <div class="battle-stats">
        ${metric("Readiness", `${readiness}%`, "mint")}
        ${metric("Risk", `${pressure}%`, "danger")}
        ${metric("Momentum", `${momentum}%`, "teal")}
      </div>

      <div class="prompt-card prompt-card--${escapeHtml(state.currentStoryNode?.kind ?? "road")}">
        <div class="prompt-card__move">${escapeHtml(routeNode?.flavor ?? routeNode?.summary ?? chapter.subtitle)}</div>
        <h3>${escapeHtml(promptTitle)}</h3>
        ${
          question
            ? `<div class="choices">${renderChoices(state, question)}</div>`
            : `<p class="prompt-card__question">Enter Chapter I to start the route.</p>`
        }
        <div class="prompt-card__explanation prompt-card__explanation--${escapeHtml(state.feedback?.tone ?? "neutral")}">
          <strong>${escapeHtml(state.feedback?.title ?? "Chapter loaded")}</strong>
          <span>${escapeHtml(state.feedback?.detail ?? "Enter the campaign to begin.")}</span>
        </div>
        <div class="prompt-card__actions">
          ${
            state.phase === "campaign" && state.pendingAdvance
              ? `<button class="primary" data-action="continue" type="button">${pendingReclaim ? "Reclaim and continue" : "Continue"}</button>`
              : state.phase === "campaign"
                ? `<button class="secondary" data-action="retry-checkpoint" type="button">Retry checkpoint</button>`
                : `<button class="primary" data-action="start-chapter" type="button">Enter Chapter I</button>`
          }
          ${
            state.phase === "campaign" && pendingReclaim
              ? `<button class="secondary" data-action="reclaim-ground" type="button">Reclaim known ground</button>`
              : ""
          }
        </div>
      </div>

      ${
        pendingReclaim
          ? `
            <aside class="flashback">
              <span class="flashback__tag">Flashback</span>
              <strong>${escapeHtml(state.flashback?.title ?? "Known ground slipping")}</strong>
              <p>${escapeHtml(state.flashback?.detail ?? "The road remembers this mistake.")}</p>
              <div class="flashback__meta">
                <span class="pill">Reclaim due ${escapeHtml(String(state.pendingKnownGroundTrigger?.reclaim?.afterQuestions ?? 0))} question(s)</span>
                <span class="pill">Queue ${escapeHtml(String(state.reclaimQueue?.length ?? 0))}</span>
                <span class="pill">${escapeHtml(promptMeta.trap?.name ?? promptMeta.trap?.summary ?? "Trap state")}</span>
              </div>
            </aside>
          `
          : ""
      }

      <div class="battle-footer">
        <div class="battle-footer__item">
          <span class="eyebrow">Route node</span>
          <strong>${escapeHtml(routeNode?.title ?? chapter.region)}</strong>
        </div>
        <div class="battle-footer__item">
          <span class="eyebrow">Story node</span>
          <strong>${escapeHtml(storyNode?.title ?? chapter.title)}</strong>
        </div>
        <div class="battle-footer__item">
          <span class="eyebrow">Current arc</span>
          <strong>${escapeHtml(state.currentPhaseName ?? question?.arc ?? "gate")}</strong>
        </div>
      </div>
    </article>
  `;
}

function renderMap(state, chapter) {
  const selectedNode =
    state.mapView?.nodeViews?.find((node) => node.id === state.selectedNodeId) ??
    state.mapView?.nodeViews?.find((node) => node.isCurrent) ??
    state.mapView?.nodeViews?.[0];

  return `
    <article class="card map-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Campaign map</p>
          <h2>${escapeHtml(chapter.region)}</h2>
        </div>
        <span class="pill">${escapeHtml(state.mapView?.scopeState ?? "visible")}</span>
      </div>

      <div class="map-path">
        ${(state.mapView?.nodeViews ?? []).map((node) => renderNode(node)).join("")}
      </div>

      <div class="map-meta">
        ${(state.mapView?.submapViews ?? [])
          .map(
            (submap) => `
              <span class="pill pill--submap">${escapeHtml(submap.title)} · ${escapeHtml(submap.state)}</span>
            `,
          )
          .join("")}
      </div>

      <div class="selected-node">
        <div class="selected-node__title">
          <p class="eyebrow">Selected node</p>
          <h3>${escapeHtml(selectedNode?.title ?? chapter.region)}</h3>
        </div>
        <p>${escapeHtml(selectedNode?.flavor ?? selectedNode?.summary ?? chapter.subtitle)}</p>
        <dl class="selected-node__facts">
          <div>
            <dt>Kind</dt>
            <dd>${escapeHtml(selectedNode?.type ?? "region")}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>${escapeHtml(selectedNode?.state ?? "locked")}</dd>
          </div>
          <div>
            <dt>Route</dt>
            <dd>${escapeHtml(String(chapter.route.length))}</dd>
          </div>
        </dl>
      </div>
    </article>
  `;
}

function renderNarrative(state, chapter) {
  const mentorFeed = state.feed.filter((entry) => entry.speaker === chapter.mentor).slice(-4);
  const bossFeed = state.feed.filter((entry) => entry.speaker === chapter.boss).slice(-4);

  return `
    <article class="card narrative">
      <div class="section-head">
        <div>
          <p class="eyebrow">Mentor / boss shell</p>
          <h2>Voice, doctrine, and tension</h2>
        </div>
        <span class="pill">${escapeHtml(chapter.foundation?.contractFreeze?.status ?? "frozen")}</span>
      </div>

      <div class="voice-stack">
        <section class="voice-panel voice-panel--mentor">
          <div class="voice-panel__label">${escapeHtml(chapter.mentor)}</div>
          ${
            mentorFeed.length
              ? mentorFeed
                  .map(
                    (entry) => `
                      <p class="voice-line">${escapeHtml(entry.text)}</p>
                    `,
                  )
                  .join("")
              : `<p class="voice-line">The mentor is waiting for the first breach.</p>`
          }
        </section>

        <section class="voice-panel voice-panel--boss">
          <div class="voice-panel__label">${escapeHtml(chapter.boss)}</div>
          ${
            bossFeed.length
              ? bossFeed
                  .map(
                    (entry) => `
                      <p class="voice-line">${escapeHtml(entry.text)}</p>
                    `,
                  )
                  .join("")
              : `<p class="voice-line">The Beast waits behind the map.</p>`
          }
        </section>
      </div>

      <section class="doctrine">
        <h3>Chapter doctrine</h3>
        <div class="doctrine__list">
          ${chapter.doctrine
            .map(
              (line) => `
              <div class="doctrine__item">${escapeHtml(line)}</div>
            `,
            )
            .join("")}
        </div>
      </section>

      ${renderKnowledgePanel(state, chapter)}

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
        <span class="pill">Pace: ${escapeHtml(state.currentPaceState || "flow")}</span>
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

function renderTelemetry(state) {
  const events = state.telemetry?.events ?? [];
  const groupCounts = events.reduce((acc, event) => {
    const group = event.group ?? "unknown";
    acc[group] = (acc[group] ?? 0) + 1;
    return acc;
  }, {});
  const recent = events.slice(-6).reverse();
  const clears = events.filter((event) => event.name === "region_conquered").length;
  const failures = events.filter((event) => event.name === "run_failed").length;
  const reclaims = events.filter((event) => event.name === "reclaim_succeeded").length;
  const bossAttempts = events.filter((event) => event.name === "boss_attempted").length;

  return `
    <article class="card telemetry-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Telemetry surface</p>
          <h2>Live balancing signals</h2>
        </div>
        <span class="pill">${escapeHtml(String(events.length))} events</span>
      </div>

      <div class="battle-stats">
        ${metric("Clears", String(clears), "mint")}
        ${metric("Failures", String(failures), "danger")}
        ${metric("Reclaims", String(reclaims), "teal")}
        ${metric("Boss tries", String(bossAttempts), "amber")}
      </div>

      <div class="cue-log">
        <h3>Event groups</h3>
        <div class="cue-list">
          ${Object.entries(groupCounts)
            .map(
              ([group, count]) => `
                <span class="cue-pill cue-pill--${escapeHtml(group)}">${escapeHtml(group)} · ${escapeHtml(String(count))}</span>
              `,
            )
            .join("") || `<span class="cue-pill">session · 0</span>`}
        </div>
      </div>

      <div class="feed-list">
        ${
          recent.length
            ? recent
                .map(
                  (event) => `
                    <article class="feed-entry feed-entry--${escapeHtml(event.group ?? "neutral")}">
                      <div class="feed-entry__speaker">${escapeHtml(event.name)}</div>
                      <p>${escapeHtml(event.questionId ?? event.regionId ?? event.nodeId ?? event.bossId ?? "runtime event")}</p>
                    </article>
                  `,
                )
                .join("")
            : `<article class="feed-entry feed-entry--neutral"><div class="feed-entry__speaker">session_started</div><p>The slice is armed and waiting for Chapter I.</p></article>`
        }
      </div>
    </article>
  `;
}

function renderHero(state, chapter) {
  const statusLabel =
    state.phase === "victory"
      ? "Chapter clear"
      : state.phase === "failure"
        ? "Repair mode"
        : state.phase === "campaign"
          ? "Active route"
          : "Title screen";

  return `
    <section class="hero card">
      <div class="hero__mark">
        <img src="./assets/road-master-crest.svg" alt="" />
      </div>
      <div class="hero__copy">
        <p class="eyebrow">0.1.0 vertical slice</p>
        <h1>${escapeHtml(chapter.title)}</h1>
        <p class="hero__lead">${escapeHtml(chapter.subtitle)}</p>
        <div class="hero__hooks">
          ${chapter.hook
            .map(
              (item) => `
              <span class="hook-chip">${escapeHtml(item)}</span>
            `,
            )
            .join("")}
        </div>
      </div>
      <div class="hero__stats">
        ${metric("Region", chapter.region, "amber")}
        ${metric("Status", statusLabel, "teal")}
        ${metric("Readiness", `${clamp(state.readiness ?? 0, 0, 100)}%`, "mint")}
        ${metric("Risk", `${clamp(state.pressure ?? 0, 0, 100)}%`, "danger")}
      </div>
      <div class="hero__stats">
        ${metric("Route", `${chapter.route.length} nodes`, "teal")}
        ${metric("Questions", `${chapter.questions.length}`, "amber")}
        ${metric("Pack slice", `${chapter.pack?.playableSlice?.questionCount ?? chapter.questions.length}`, "mint")}
        ${metric("Contracts", chapter.foundation?.contractFreeze?.status ?? "frozen", "neutral")}
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
          <h2>${escapeHtml(chapter.region)}</h2>
          <p class="overlay__lede">
            One region, one route, one boss. The integrated vertical slice is loaded and ready.
          </p>
          <div class="overlay__actions">
            <button class="primary" data-action="start-chapter" type="button">Enter Chapter I</button>
            <button class="secondary" data-action="toggle-audio" type="button">${state.audioEnabled ? "Mute audio" : "Enable audio"}</button>
          </div>
          <div class="overlay__stack">
            <div class="overlay__item">The route comes from the map graph.</div>
            <div class="overlay__item">Questions come from the chapter pack.</div>
            <div class="overlay__item">Combat, pacing, memory, and audio share one runtime.</div>
            <div class="overlay__item">Victory ends in a share card and reset path.</div>
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
          <h2>${escapeHtml(chapter.region)} conquered</h2>
          <p class="overlay__lede">${escapeHtml(state.shareText || chapter.shareCard)}</p>
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
          <p class="overlay__lede">${escapeHtml(state.feedback?.detail ?? "Return to the checkpoint and try again.")}</p>
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
  const currentNode = state.mapView?.nodeViews?.find((node) => node.isCurrent) ?? state.mapView?.nodeViews?.[0] ?? null;
  const shellKind = currentNode?.type ?? "region";
  const routeNodeIds = Array.isArray(chapter.route) ? chapter.route : [];
  const currentRouteIndex = Math.max(0, routeNodeIds.findIndex((nodeId) => nodeId === state.currentRouteNode?.id));
  const routeLabel = `${currentRouteIndex + 1}/${Math.max(1, routeNodeIds.length)}`;

  return `
    <div class="shell shell--${escapeHtml(state.phase)} shell--${escapeHtml(shellKind)}">
      <header class="topbar">
        <div class="brand">
          <img class="brand__mark" src="./assets/road-master-crest.svg" alt="" />
          <div>
            <div class="brand__name">Road Master</div>
            <div class="brand__sub">${escapeHtml(chapter.chapter)} · ${escapeHtml(chapter.region)}</div>
          </div>
        </div>
        <div class="topbar__status">
          <span class="pill">Arc ${escapeHtml(state.currentPhaseName ?? "gate")}</span>
          <span class="pill">HP ${clamp(state.combatSnapshot?.hp ?? 0, 0, state.combatSnapshot?.maxHp ?? 100)}/${state.combatSnapshot?.maxHp ?? 100}</span>
          <span class="pill">Route ${escapeHtml(routeLabel)}</span>
          <span class="pill">Risk ${clamp(state.pressure ?? 0, 0, 100)}%</span>
          <span class="pill">Events ${state.telemetry?.events?.length ?? 0}</span>
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
                    <span class="pill">Integrated slice</span>
                  </div>
                  <p>
                    The shell is wired to the content pack, the combat/pacing loop, the map route,
                    the memory reclaim system, and the audio stub. Enter Chapter I to step into Crossing Fields.
                  </p>
                  <div class="intro-card__list">
                    ${chapter.hook
                      .map(
                        (item) => `
                          <div class="intro-chip">${escapeHtml(item)}</div>
                        `,
                      )
                      .join("")}
                  </div>
                </article>
              `
              : renderBattle(state, chapter)
          }
          ${renderNarrative(state, chapter)}
          ${renderAudio(state)}
          ${renderTelemetry(state)}
        </section>
      </main>

      ${renderOverlay(state, chapter)}
    </div>
  `;
}
