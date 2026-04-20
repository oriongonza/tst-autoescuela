import { loadContentCatalog, loadContentPack } from "../content/index.mjs";

const STORAGE_KEY = "road-master.content-editor.v1";
const root = document.getElementById("editor-app");

if (!root) {
  throw new Error("Editor root element not found.");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadDrafts() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Unable to load content editor drafts.", error);
    return {};
  }
}

function saveDrafts(drafts) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.warn("Unable to save content editor drafts.", error);
  }
}

function createLayout({ packs = [], selectedPackId = "", pack = null, drafts = {}, status = "" }) {
  const selectedDrafts = drafts[selectedPackId] ?? {};
  const questions = Array.isArray(pack?.questions) ? pack.questions : [];

  return `
    <div class="shell shell--title shell--region">
      <header class="topbar">
        <div class="brand">
          <img class="brand__mark" src="./assets/road-master-crest.svg" alt="" />
          <div>
            <div class="brand__name">Road Master Editor</div>
            <div class="brand__sub">Internal content inspection and drafting</div>
          </div>
        </div>
        <div class="topbar__status">
          <span class="pill">${escapeHtml(selectedPackId || "no pack")}</span>
          <span class="pill">${questions.length} questions</span>
          <span class="pill">${Object.keys(selectedDrafts).length} draft edits</span>
        </div>
      </header>

      <main class="stage">
        <section class="hero card">
          <div class="hero__copy">
            <p class="eyebrow">Internal tool</p>
            <h1>${escapeHtml(pack?.manifest?.title ?? "Choose a pack")}</h1>
            <p class="hero__lead">
              This is intentionally ugly. It exists to inspect catalog content and stage local draft edits in the browser.
            </p>
          </div>
          <div class="cue-grid">
            ${packs
              .map(
                (entry) => `
                  <button class="cue-button" data-action="select-pack" data-pack-id="${escapeHtml(entry.id)}" type="button">
                    ${escapeHtml(entry.title)}${entry.id === selectedPackId ? " · live" : ""}
                  </button>
                `,
              )
              .join("")}
          </div>
          <p>${escapeHtml(status)}</p>
        </section>

        ${
          pack
            ? `
              <section class="grid">
                ${questions
                  .map((question, index) => {
                    const draft = selectedDrafts[question.id] ?? {};
                    return `
                      <article class="card battle">
                        <div class="section-head">
                          <div>
                            <p class="eyebrow">Question ${index + 1}</p>
                            <h2>${escapeHtml(question.id)}</h2>
                          </div>
                          <span class="pill">${escapeHtml(question.arc ?? "gate")}</span>
                        </div>
                        <label>
                          <strong>Prompt</strong>
                          <textarea
                            data-action="edit-prompt"
                            data-question-id="${escapeHtml(question.id)}"
                            rows="3"
                          >${escapeHtml(draft.prompt ?? question.prompt)}</textarea>
                        </label>
                        <label>
                          <strong>Concept ids</strong>
                          <input
                            data-action="edit-concepts"
                            data-question-id="${escapeHtml(question.id)}"
                            value="${escapeHtml((draft.conceptIds ?? question.conceptIds ?? []).join(", "))}"
                          />
                        </label>
                        <label>
                          <strong>Trap id</strong>
                          <input
                            data-action="edit-trap"
                            data-question-id="${escapeHtml(question.id)}"
                            value="${escapeHtml(draft.trapId ?? question.trapId ?? "")}"
                          />
                        </label>
                        <div class="cue-grid">
                          <button class="cue-button" data-action="reset-question" data-question-id="${escapeHtml(question.id)}" type="button">
                            Reset draft
                          </button>
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </section>
            `
            : ""
        }
      </main>
    </div>
  `;
}

const state = {
  packs: [],
  selectedPackId: "",
  pack: null,
  drafts: loadDrafts(),
  status: "Loading content catalog...",
};

function render() {
  root.innerHTML = createLayout(state);
}

async function selectPack(packId) {
  state.status = `Loading ${packId}...`;
  render();
  state.pack = await loadContentPack(packId);
  state.selectedPackId = packId;
  state.status = `Loaded ${packId}. Draft edits stay local to this browser.`;
  render();
}

function ensureDraft(questionId) {
  state.drafts[state.selectedPackId] = state.drafts[state.selectedPackId] ?? {};
  state.drafts[state.selectedPackId][questionId] = state.drafts[state.selectedPackId][questionId] ?? {};
  return state.drafts[state.selectedPackId][questionId];
}

root.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || !root.contains(button)) {
    return;
  }

  const action = button.dataset.action;
  const questionId = button.dataset.questionId;
  const packId = button.dataset.packId;

  if (action === "select-pack" && packId) {
    void selectPack(packId);
    return;
  }

  if (action === "reset-question" && questionId && state.selectedPackId) {
    delete state.drafts[state.selectedPackId]?.[questionId];
    saveDrafts(state.drafts);
    state.status = `Reset draft for ${questionId}.`;
    render();
  }
});

root.addEventListener("input", (event) => {
  const target = event.target;
  const action = target.dataset?.action;
  const questionId = target.dataset?.questionId;

  if (!action || !questionId || !state.selectedPackId) {
    return;
  }

  const draft = ensureDraft(questionId);
  if (action === "edit-prompt") {
    draft.prompt = target.value;
  }
  if (action === "edit-concepts") {
    draft.conceptIds = target.value
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (action === "edit-trap") {
    draft.trapId = target.value.trim();
  }

  saveDrafts(state.drafts);
  state.status = `Draft updated for ${questionId}.`;
});

async function boot() {
  const catalog = await loadContentCatalog();
  state.packs = catalog.packs ?? [];
  state.status = "Select a pack to inspect or draft local edits.";
  render();
}

void boot();
