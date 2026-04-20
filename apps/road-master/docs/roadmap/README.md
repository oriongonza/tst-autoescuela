# Roadmap Completion

This subtree documents the Road Master 0.1.0 slice and the evidence needed to defend the roadmap through `1.0.0`.

## Contents

- `narrative-bible-v0.md`: the stable tone, chapter frame, and noun set for Road Master and Chapter I.
- `annotation-workflow.md`: how chapter content is annotated, named, inspected, and QAed.
- `authoring-templates.md`: reusable templates for analogies, bosses, explanations, reclaim flows, contrast cases, and anti-trap micro-lessons.
- `roadmap-assumptions-and-hardening.md`: thesis lock, release gates, and hardening guidance.
- `issue-coverage-matrix.md`: issue-by-issue coverage map with local evidence.

## Evidence model

The docs in this subtree intentionally point at local artifacts already present in the repo history:

- Foundation contracts in `apps/road-master/docs/foundations/**` and `apps/road-master/src/core/**` on `lane/spark-1-foundations`.
- Combat and pacing in `lane/spark-3-combat-pacing`.
- Map and memory in `lane/spark-4-map-memory`.
- Narrative shell runtime in `lane/spark-5-narrative-shell` and the integration commit `58fb0fd`.
- Chapter I content and inspection tooling in `lane/spark-2-content`.

## Rule

These docs are descriptive, not aspirational. If a claim is not backed by a file, a branch, or a commit already in this checkout, it is marked as a roadmap gap.
