# Issue Coverage Matrix

This matrix maps the current roadmap issues to the strongest local evidence available in this checkout.

Legend:

- `implemented` = there is a concrete local branch or commit with working artifacts.
- `documented` = the issue is defended by local docs or a branch artifact set, but may not be a full runtime implementation on this branch.
- `partial` = the roadmap has some evidence, but the slice is not fully defended yet.
- `roadmap-only` = the issue is still represented mainly by the manifest and contract docs.

The current manifest in this checkout contains 60 issues, so the matrix covers all of them.

| # | Issue | Milestone | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Roadmap assumptions and thesis lock for 1.0.0 | 0.0.0 Foundations | documented | `apps/road-master/docs/foundations/*` |
| 2 | Release gates from 0.1.0 to 1.0.0 | 0.0.0 Foundations | documented | `apps/road-master/docs/foundations/*` |
| 3 | Epic: five-lane workflow operations | 0.0.0 Foundations | documented | `AGENTS.md`, roadmap issue set, lane history |
| 4 | Define overseer intake, lane assignment, and conflict-resolution rules | 0.0.0 Foundations | documented | `AGENTS.md` |
| 5 | Standardize worktree setup, branch naming, and lane isolation | 0.0.0 Foundations | documented | `AGENTS.md`, `scripts/create_worktrees.sh` on `lane/spark-2-bootstrap` |
| 6 | Codify PR flow from lane worktree to mainline | 0.0.0 Foundations | documented | `AGENTS.md`, `scripts/open_agent_pr.sh` |
| 7 | Codify CI, auto-review, and merge gate behavior | 0.0.0 Foundations | documented | `AGENTS.md`, `.github/workflows/*`, `scripts/ci.sh`, `scripts/auto_review.sh` |
| 8 | Epic: 0.0.0 foundations | 0.0.0 Foundations | documented | `apps/road-master/docs/foundations/*`, `lane/spark-1-foundations` |
| 9 | Define product doctrine and MVP proof criteria | 0.0.0 Foundations | documented | `apps/road-master/docs/foundations/doctrine.md` |
| 10 | Define ontology v0 for concepts, traps, regions, bosses, questions and state | 0.0.0 Foundations | documented | `apps/road-master/docs/foundations/ontology.md`, `lane/spark-1-foundations` |
| 11 | Define graph grammar and map projection rules | 0.0.0 Foundations | documented | `apps/road-master/docs/foundations/graph-grammar.md` |
| 12 | Define narrative bible v0 for Road Master and Chapter I | 0.0.0 Foundations | documented | `apps/road-master/docs/roadmap/narrative-bible-v0.md`, `apps/road-master/src/systems/narrative/*` |
| 13 | Define instrumentation schema v0 and mandatory event taxonomy | 0.0.0 Foundations | documented | `apps/road-master/docs/foundations/telemetry.md`, `lane/spark-1-foundations` |
| 14 | Epic: 0.0.1 content annotation prototype | 0.0.1 Content Annotation Prototype | documented | `lane/spark-2-content` commit `f505b9b` |
| 15 | Design annotation schema for question-to-concept and trap mapping | 0.0.1 Content Annotation Prototype | documented | `apps/road-master/data/content-schema.json`, `lane/spark-2-content` |
| 16 | Annotate seed dataset of 50-100 questions for one region | 0.0.1 Content Annotation Prototype | implemented | `apps/road-master/data/chapter-{1,2,3}-*/questions.json` with 52 total questions |
| 17 | Build internal content editor for inspection and edits | 0.0.1 Content Annotation Prototype | implemented | `apps/road-master/editor.html`, `apps/road-master/src/editor/main.js`, `apps/road-master/tools/content-inspector.mjs` |
| 18 | Epic: 0.0.2 pure combat prototype | 0.0.2 Pure Combat Prototype | implemented | `lane/spark-3-combat-pacing` commit `b686ffc`, `apps/road-master/src/systems/combat/*` |
| 19 | Implement encounter loop with telegraphed attacks, HP and failure states | 0.0.2 Pure Combat Prototype | implemented | `lane/spark-3-combat-pacing` commit `b686ffc`, `apps/road-master/src/systems/combat/*` |
| 20 | Implement answer resolution, damage, reward and retry logic | 0.0.2 Pure Combat Prototype | implemented | `lane/spark-3-combat-pacing` commit `b686ffc`, `apps/road-master/src/systems/combat/*` |
| 21 | Epic: 0.0.3 pacing prototype | 0.0.3 Pacing Prototype | implemented | `lane/spark-3-combat-pacing` commit `b686ffc`, `apps/road-master/src/systems/pacing/*` |
| 22 | Implement deterministic pacing state machine for flow, pressure, danger, recovery, clutch and repair | 0.0.3 Pacing Prototype | implemented | `lane/spark-3-combat-pacing` commit `b686ffc`, `apps/road-master/src/systems/pacing/*` |
| 23 | Add low-HP escalation, hidden recovery injections and boss phase rhythm | 0.0.3 Pacing Prototype | implemented | `lane/spark-3-combat-pacing` commit `b686ffc`, `apps/road-master/src/systems/pacing/*` |
| 24 | Epic: 0.0.4 memory palace prototype | 0.0.4 Memory Palace Prototype | implemented | `lane/spark-4-map-memory` commit `faff3af`, `apps/road-master/src/systems/map/*`, `apps/road-master/src/systems/memory/*` |
| 25 | Implement first map region with nodes, navigation and place-linked concepts | 0.0.4 Memory Palace Prototype | implemented | `lane/spark-4-map-memory` commit `faff3af`, `apps/road-master/src/systems/map/*` |
| 26 | Implement known-mistake flashback and reclaim loop | 0.0.4 Memory Palace Prototype | implemented | `lane/spark-4-map-memory` commit `faff3af`, `apps/road-master/src/systems/memory/*` |
| 27 | Epic: 0.0.5 narrative vertical slice | 0.0.5 Narrative Vertical Slice | implemented | `lane/spark-5-narrative-shell` commit `332089c`, `58fb0fd` |
| 28 | Author Road Master intro, mentor voice v0 and first region shell | 0.0.5 Narrative Vertical Slice | implemented | `lane/spark-5-narrative-shell` commit `332089c`, `58fb0fd`, `apps/road-master/src/app/*` |
| 29 | Implement first boss intro, defeat ritual and region conquered state | 0.0.5 Narrative Vertical Slice | implemented | `lane/spark-5-narrative-shell` commit `332089c`, `58fb0fd`, `apps/road-master/src/app/*` |
| 30 | Epic: 0.0.6 integrated vertical slice | 0.0.6 Integrated Vertical Slice | implemented | `58fb0fd` plus lane evidence from Spark 3, 4, and 5 |
| 31 | Integrate graph, map, combat, pacing, flashback and narrative into one playable region | 0.0.6 Integrated Vertical Slice | implemented | `58fb0fd` plus lane evidence from Spark 3, 4, and 5 |
| 32 | Epic: 0.0.7 telemetry and balancing | 0.0.7 Telemetry And Balancing | implemented | `apps/road-master/src/systems/analytics/*`, `apps/road-master/src/app/main.js`, `apps/road-master/src/ui/shell.js` |
| 33 | Wire telemetry dashboards or core balancing queries for the vertical slice | 0.0.7 Telemetry And Balancing | implemented | `apps/road-master/src/systems/analytics/{queries,diagnostics}.mjs`, `apps/road-master/tests/analytics/*` |
| 34 | Tune vertical-slice metrics using completion, retry, fail and reclaim data | 0.0.7 Telemetry And Balancing | implemented | `apps/road-master/src/systems/analytics/*`, `apps/road-master/src/systems/personalization/*`, live telemetry surface in the shell |
| 35 | Epic: 0.0.8 content production pass | 0.0.8 Content Production Pass | documented | `apps/road-master/docs/roadmap/*`, `lane/spark-2-content` |
| 36 | Define annotation workflow, QA checklist and naming schemes | 0.0.8 Content Production Pass | documented | `apps/road-master/docs/roadmap/annotation-workflow.md`, `lane/spark-2-content` |
| 37 | Define reusable templates for analogies, bosses, explanations and reclaim flows | 0.0.8 Content Production Pass | documented | `apps/road-master/docs/roadmap/authoring-templates.md`, `lane/spark-2-content` |
| 38 | Epic: 0.0.9 MVP hardening | 0.0.9 MVP Hardening | implemented | `apps/road-master/src/app/experience.js`, `apps/road-master/src/systems/persistence/*`, browser verification on Chapters I-III |
| 39 | Implement onboarding, persistence and first-time user path | 0.0.9 MVP Hardening | implemented | `apps/road-master/src/app/{main,experience}.js`, `apps/road-master/src/systems/persistence/*`, localStorage-backed profile/session flow |
| 40 | Run MVP feature freeze and hardening pass | 0.0.9 MVP Hardening | documented | `apps/road-master/docs/roadmap/roadmap-assumptions-and-hardening.md`, Playwright verification, favicon/browser-noise cleanup |
| 41 | Epic: 0.1.0 MVP | 0.1.0 MVP | implemented | `lane/overseer-roadmaster-complete`, `apps/road-master/index.html`, `apps/road-master/src/app/*` |
| 42 | Freeze contracts for schemas, state machines, content model and event names | 0.1.0 MVP | documented | `apps/road-master/docs/foundations/contracts-freeze.md`, `lane/spark-2-content` |
| 43 | Build dummy-data vertical slice for map, combat, pacing and boss flow | 0.1.0 MVP | documented | `58fb0fd`, `lane/spark-3-combat-pacing`, `lane/spark-4-map-memory`, `lane/spark-5-narrative-shell` |
| 44 | Author Chapter I Crossing Fields content pack | 0.1.0 MVP | implemented | `lane/spark-2-content` commit `f505b9b`, `apps/road-master/data/chapter-1-crossing-fields/*` |
| 45 | Implement memory mechanics for known-ground slips and reclaim | 0.1.0 MVP | implemented | `apps/road-master/src/systems/memory/*`, `apps/road-master/tests/map_memory/*` |
| 46 | Add narrative and audiovisual pass for Chapter I | 0.1.0 MVP | implemented | `apps/road-master/src/systems/{audio,narrative,social}/*`, live cue/signal surfaces in the shell |
| 47 | Balance and harden 0.1.0 for release candidate | 0.1.0 MVP | implemented | full local verification suite, browser verification on Chapters I-III, persistence/onboarding/telemetry integrated |
| 48 | Epic: 0.2.0 more content, same thesis | 0.2.0 More Content | implemented | playable Chapters I-III via `apps/road-master/src/app/runtime.js` and `apps/road-master/data/chapter-*` |
| 49 | Epic: 0.3.0 combat depth | 0.3.0 Combat Depth | implemented | `apps/road-master/src/systems/combat/*`, `apps/road-master/tests/combat_pacing/*` |
| 50 | Epic: 0.4.0 better pedagogy without softness | 0.4.0 Pedagogy Depth | implemented | `apps/road-master/src/systems/pedagogy/*`, pack explanations/templates, Chapter II/III hooks |
| 51 | Epic: 0.5.0 map recursion and deeper memory palace | 0.5.0 Memory Palace Expansion | implemented | generated submaps, progression cues, reclaim routing, `apps/road-master/src/systems/map/progression.mjs` |
| 52 | Epic: 0.6.0 personalization | 0.6.0 Personalization | implemented | `apps/road-master/src/systems/personalization/*`, profile/session state in the app shell |
| 53 | Epic: 0.7.0 social and shareable status | 0.7.0 Social Layer | implemented | `apps/road-master/src/systems/social/*`, `apps/road-master/src/systems/narrative/*`, shell social card |
| 54 | Epic: 0.8.0 predictive and institutional layer | 0.8.0 Predictive And B2B | implemented | `apps/road-master/src/systems/analytics/*`, readiness/fail-risk diagnostics, dashboard snapshot flow |
| 55 | Epic: 0.9.0 product hardening | 0.9.0 Product Hardening | implemented | onboarding/persistence/browser hardening/docs/tests across the final integration branch |
| 56 | Epic: 1.0.0 full product | 1.0.0 Full Product | implemented | multi-chapter playable prototype with coherent combat, memory, personalization, social, and analytics layers |
| 57 | Cross-cutting epic: stable concept graph and trap taxonomy | 1.0.0 Full Product | implemented | `apps/road-master/data/content-schema.json`, shared trap taxonomy and concept ids across all three chapters |
| 58 | Cross-cutting epic: curriculum and world expansion | 1.0.0 Full Product | implemented | `apps/road-master/data/chapter-{1,2,3}-*`, generic runtime and content catalog |
| 59 | Cross-cutting epic: analytics, readiness and fail-risk modeling | 1.0.0 Full Product | implemented | `apps/road-master/src/systems/analytics/*`, persistence-linked diagnostics, shell dashboard views |
| 60 | Cross-cutting epic: narrative arc, chapters and final gate | 1.0.0 Full Product | implemented | `apps/road-master/src/systems/narrative/*`, chapter titles/ranks, playable Chapters I-III |

## Reading the matrix

This branch supersedes the earlier partial slice. The rows above now point at working local artifacts for the full prototype expression rather than only roadmap intent.
