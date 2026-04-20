# Ontology

## Canonical states

- Mastery: `new`, `learned`, `fragile`, `mastered`, `corrupted`, `known_mistake`
- Pace: `flow`, `pressure`, `danger`, `recovery`, `clutch`, `victory`, `repair`
- Attack tier: `light`, `heavy`, `trap`, `critical`
- Attack type: `knowledge`, `exception`, `visual`, `anti_trap`, `mixed`
- Region: `locked`, `visible`, `unlocked`, `mastered`, `fragile`, `corrupted`

## Core entities

| Entity | Purpose | Required fields |
| --- | --- | --- |
| Concept | Atomic unit of learning and mastery. | `id`, `title`, `summary`, `regionId`, `masteryState` |
| TrapPattern | Repeatable failure mode or distractor family. | `id`, `title`, `summary`, `failureMode`, `counterplay` |
| Region | Spatial cluster of related concepts and encounters. | `id`, `title`, `theme`, `state`, `conceptIds` |
| Boss | Guardian encounter for a region spine. | `id`, `title`, `regionId`, `phaseIds`, `introLineId`, `defeatLineId` |
| Submap | Nested recursive plane inside a region. | `id`, `title`, `regionId`, `conceptIds` |
| Question | Answerable unit that becomes a combat attack. | `id`, `prompt`, `answers`, `correctIndex`, `conceptIds`, `trapIds`, `difficulty`, `tier`, `attackType`, `regionId` |
| Attack | Combat presentation of a question. | `id`, `questionId`, `tier`, `attackType`, `baseDamage`, `phase` |
| ConceptProgress | Player snapshot for a concept. | `conceptId`, `masteryState`, `learnedScore`, `stabilityScore` |
| PaceState | Emotional and mechanical rhythm for a run. | `state`, `hp`, `maxHp`, `momentum`, `frustration`, `boredom` |
| FlashbackEvent | Known-ground slip that reactivates spatial memory. | `conceptIds`, `regionId`, `reason`, `triggeredAt` |

## Entity rules

- Concepts, questions, and regions must share stable identifiers so telemetry can join them later.
- A question belongs to exactly one canonical region and may optionally belong to one submap.
- A boss belongs to exactly one region.
- A submap must belong to exactly one region and may optionally nest inside another submap.
- Trap patterns should be expressed as a reusable failure family, not one-off trivia.
