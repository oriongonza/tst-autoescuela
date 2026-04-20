# Graph Grammar

## Node families

- `concept`
- `trap`
- `region`
- `boss`
- `submap`
- `encounter`

## Edge families

- `prerequisite`
- `exception`
- `confusion`
- `similarity`
- `contains`
- `unlocks`
- `boss_of`
- `submap_of`

## Projection rules

- A region is the primary visible plane.
- A submap is a nested recursive plane inside exactly one parent region.
- Boss nodes are region guards, not free-floating encounters.
- Encounter nodes may be projected as pressure points along the region path.
- Concept nodes should appear as place-linked landmarks wherever possible.

## Clustering rules

- Every region groups related concepts, trap patterns, and at most one mandatory boss for the slice.
- Every question must resolve to one canonical region and may optionally resolve to one submap.
- Trap patterns belong to the same region as the concepts they confuse.
- Similarity and confusion edges are lateral and must not unlock content by themselves.

## Recursion rules

- Only submap nodes create recursion.
- A submap can reuse the same node families as its parent region but must keep distinct identifiers.
- Recursive depth should stay shallow in the foundations slice so the player reads the structure at a glance.

## Anti-patterns

- Hardcoding Chapter I into engine code.
- Using similarity edges as if they were prerequisites.
- Creating a region with no spatial identity.
- Creating recursive maps that are not visually legible in the foundations slice.
