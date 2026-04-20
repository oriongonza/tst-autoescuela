# Contracts Freeze

## Frozen surfaces

- Doctrine
- Ontology
- Graph grammar
- Run and player state templates
- Telemetry catalog
- Release gates

## Freeze rules

- Do not rename frozen nouns without a version bump and a migration note.
- Do not repurpose an existing event name or enum value for a new meaning.
- Do not hardcode Chapter I into engine code when the content pack can carry the data.
- Prefer additive changes; make breaking changes explicit and documented.
- Extend content data freely, but keep the core contracts stable.

## What can change

- Chapter content packs
- Explanatory copy
- New data records that fit existing contracts
- Additional telemetry fields that do not break existing consumers

## What should not change lightly

- Entity and enum names
- Event names
- State vocabulary
- Graph edge semantics
- Release gate meanings

## Snapshot rule

When the contract snapshot changes, update both:

- `apps/road-master/src/core/contracts.mjs`
- the corresponding foundation docs in this directory

The docs and the module mirror are the same contract written in two forms.
