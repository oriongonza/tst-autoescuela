# Foundations

This directory is the frozen contract surface for the Road Master 0.1.0 slice.

## What is here

- `doctrine.md`: product thesis, non-goals, and voice rules.
- `ontology.md`: entities, state vocabulary, and required fields.
- `graph-grammar.md`: how the map and concept graph are allowed to behave.
- `telemetry.md`: the instrumentation catalog and event contract.
- `release-gates.md`: capability gates from `0.1.0` to `1.0.0`.
- `contracts-freeze.md`: the no-drift rules for this slice.

## Source of truth

These docs were derived from the local `chatgpt_conv.md` roadmap and Codex-ready execution spec. The conversation source stays local; it does not need to be published with the app.

## Contract rule

The core modules under `apps/road-master/src/core/` and `apps/road-master/src/systems/telemetry/` are the code mirror of these docs. Update both sides together.
