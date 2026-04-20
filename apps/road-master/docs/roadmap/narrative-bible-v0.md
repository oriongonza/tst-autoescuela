# Narrative Bible v0

## Product thesis

Road Master is a severe, sparse driving-theory game that turns rules into spatial memory. The player does not grind trivia. The player crosses fields, clears pressure points, and learns to name the trap before the mistake becomes permanent.

This matches the doctrine already frozen in `apps/road-master/docs/foundations/doctrine.md`: the product should behave like a graph-structured narrative combat world and should not collapse into broad quiz-app behavior.

## Chapter I: Crossing Fields

Chapter I is the first playable proof of that thesis. The current local content pack evidence on `lane/spark-2-content` defines:

- Region: `Crossing Fields`
- Submap: `Four-Way Labyrinth`
- Boss: `Right-of-Way Beast`
- Theme: right-of-way and intersection order

The chapter vocabulary is intentionally small and repetitive:

- priority
- stop
- yield
- signal
- mirror check
- gap
- visibility
- reclaim

The boss and content pack make the same point from different directions. Questions train the rule. Analogies pin the rule to memory. Boss phases pressure the same rule until the player can reclaim it cleanly.

## Voice rules

- Mentor voice is severe, sparse, and ceremonial.
- Reward is visible but restrained.
- Failure is corrective, not shaming.
- Explanations should read like a field manual, not a lecture.

## Stable nouns

Keep these nouns stable across docs, content, and runtime:

- `Road Master`
- `Crossing Fields`
- `Four-Way Labyrinth`
- `Right-of-Way Beast`
- `reclaim loop`
- `known mistake`

Do not replace them with generic UI language. The product needs one remembered lexicon, not many competing ones.

## What this bible does and does not cover

This bible locks the Chapter I frame and the tone needed to defend `0.1.0`. It does not promise later chapters, social systems, or a large content library. Those belong to later roadmap issues and should stay subordinate to the first slice.

## Current evidence

- `apps/road-master/docs/foundations/doctrine.md`
- `apps/road-master/docs/foundations/release-gates.md`
- `lane/spark-2-content` commit `f505b9b`
- `lane/spark-5-narrative-shell` commit `332089c`
- integration commit `58fb0fd`
