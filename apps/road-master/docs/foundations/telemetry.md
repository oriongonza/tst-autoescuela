# Instrumentation

## Catalog rule

The telemetry catalog is intentionally small and structured so it can be logged from a static app without a build tool. The source events are mirrored in `apps/road-master/src/systems/telemetry/catalog.mjs`.

## Mandatory signals

- question shown
- answer submitted
- correctness
- time to answer
- concept ids
- trap ids
- attack tier
- damage taken
- hp before and after
- pace state
- flashback triggered
- reclaim success
- session start and end
- boss attempt
- boss clear or fail

## Event groups

- Session: `session_started`, `session_ended`
- Navigation: `map_opened`, `node_opened`, `submap_opened`, `region_conquered`
- Combat: `question_shown`, `attack_shown`, `answer_submitted`, `answer_evaluated`, `attack_resolved`, `hp_changed`, `boss_entered`, `boss_attempted`, `boss_phase_changed`, `boss_defeated`, `boss_failed`, `run_failed`
- Memory: `flashback_triggered`, `reclaim_scheduled`, `reclaim_succeeded`
- Progression: `pace_state_changed`

## Minimal event contract

Every event should carry:

- `sessionId`
- a stable entity identifier when relevant
- a timestamp field
- enough context to join the event back to the content pack

## Design intent

The catalog is meant to answer the product questions in the roadmap:

- What causes quits?
- Where do players fail?
- Which trap patterns are expensive?
- Do flashbacks improve reclaim?
- Which concepts are fragile?
- Does the chapter feel like a game rather than a quiz?
