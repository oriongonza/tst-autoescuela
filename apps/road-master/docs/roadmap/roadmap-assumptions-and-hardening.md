# Roadmap Assumptions and Hardening Guidance

## Thesis lock

The roadmap assumes the product thesis is already fixed:

- Road Master is a memory-palace driving-theory game.
- `0.1.0` proves one region, one boss, one content pack, and one recovery loop.
- Broad curriculum coverage is a later milestone, not an MVP requirement.

This is the same boundary stated in `apps/road-master/docs/foundations/doctrine.md` and `apps/road-master/docs/foundations/release-gates.md`.

## Hard assumptions

- Content can be authored as data, not code.
- Chapter I can stay static and still prove the game loop.
- The first slice is allowed to be small if it is coherent.
- The content model must remain inspectable by a local tool.
- Contract changes should be additive unless a version bump is explicitly planned.

## Release guidance

Treat milestones as proof gates:

- `0.1.0` proves the vertical slice.
- `0.3.0` proves the combat loop is not shallow.
- `0.5.0` proves memory and spatial recursion are real.
- `0.8.0` proves telemetry can support predictive or institutional use.
- `1.0.0` proves the product is coherent end to end.

Do not advance a gate with a pile of features that does not prove the thesis.

## MVP hardening guidance

Before calling the slice stable:

- Freeze schema names, event names, and content IDs.
- Verify the chapter pack can still be validated locally.
- Verify the chapter pack still matches the chapter vocabulary in the narrative bible.
- Verify the issue coverage matrix still points to a real artifact for every non-roadmap-only item.
- Keep the content pack small enough that one maintainer can inspect it by hand.

## What hardening means here

Hardening is not about expanding scope. It is about reducing drift:

- no new nouns without a reason
- no extra template shapes without a measurable need
- no hidden dependency on a later chapter
- no silent contract change

## Current evidence

- `apps/road-master/docs/foundations/release-gates.md`
- `apps/road-master/docs/foundations/contracts-freeze.md`
- `apps/road-master/docs/foundations/doctrine.md`
- `lane/spark-2-content` commit `f505b9b`
- `lane/spark-5-narrative-shell` commit `332089c`
