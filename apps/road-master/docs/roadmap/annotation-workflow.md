# Annotation Workflow

## Goal

Turn raw driving questions into a small, inspectable content model that the static app can consume without a build-time content pipeline.

The current local evidence is the Chapter I content pack on `lane/spark-2-content`:

- `apps/road-master/data/content-schema.json`
- `apps/road-master/data/content-index.json`
- `apps/road-master/data/chapter-1-crossing-fields/**`
- `apps/road-master/tools/content-inspector.mjs`

## Annotation contract

Each question should carry the following data:

- stable `id`
- `prompt`
- exactly four `choices`
- `answerIndex`
- one or more `conceptIds`
- one `trapId`
- one `analogyId`
- one `explanationId`
- `regionId`
- `submapId`
- `bossIds`
- `attackTier`
- `difficulty`
- `arc`
- `knownMistake`

The schema is intentionally blunt. If a field cannot be validated by inspection, it is probably not part of the MVP contract.

## Workflow

1. Pick the chapter pack and region.
2. Assign the question to one primary concept and a small number of supporting concepts.
3. Map the distractor to one named trap pattern.
4. Attach one analogy and one explanation record.
5. Link the question to the boss compatibility set if it belongs in the Chapter I slice.
6. Mark `knownMistake` when the item should be used for reclaim behavior.
7. Run the inspector validation before the content is considered stable.

## Naming schemes

Use stable, readable slugs:

- Pack IDs: `chapter-1-crossing-fields`
- Question IDs: `cf-q-001`, `cf-q-002`, and so on
- Region IDs: `crossing-fields`
- Submap IDs: `four-way-labyrinth`
- Boss IDs: `right-of-way-beast`
- Trap IDs: noun phrases like `priority-inversion` or `gap-hunger`
- Analogy IDs: compact image names like `chessboard-crossing`
- Explanation IDs: `why-*`

Avoid synonyms. If two names mean the same thing, choose one and keep it.

## QA checklist

- Every question has four choices.
- `answerIndex` points at a real choice.
- Every referenced concept exists.
- Every referenced trap exists.
- Every referenced analogy exists.
- Every referenced explanation exists.
- Every explanation has a template.
- Every boss ID resolves.
- IDs are unique inside each array.
- The pack count is still small enough to inspect manually.

## Practical rule

The content editor does not need to be fancy. The current inspector proves the point: if the pack can be loaded, listed, shown, and validated locally, it is good enough for the slice.

## Current evidence

- `lane/spark-2-content` commit `f505b9b`
- `apps/road-master/tools/content-inspector.mjs`
- `apps/road-master/data/chapter-1-crossing-fields/questions.json`
- `apps/road-master/data/chapter-1-crossing-fields/explanations.json`
- `apps/road-master/data/chapter-1-crossing-fields/trap-taxonomy.json`
