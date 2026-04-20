# Authoring Templates

These templates are deliberately small. They are meant to keep Chapter I consistent without forcing a larger content-engine redesign.

## Analogy template

Use when a concept needs a memory hook.

```text
Title: [short image name]
Summary: [one sentence]
Memory hook: [one sentence the player can repeat]
Supports: [concept ids]
```

Good examples from the current content pack:

- `chessboard-crossing`
- `gate-guard`
- `river-confluence`
- `watchtower-scan`

## Boss template

Use when a region needs a guardian that pressures the same rules the questions teach.

```text
Name: [boss name]
Title: [ceremonial title]
Arena: [region and submap]
Weakness: [concept ids that collapse the boss]
Phases: [short phase names and what each phase tests]
Lines: [intro, shift, defeat, victory]
```

Current boss evidence uses `Right-of-Way Beast` with four phase beats and simple attack lines.

## Explanation template

Use for single-question explanations. Keep the explanation short enough to be reread after a miss.

```text
Correct answer:
Why it is correct:
Why the trap is tempting:
How to reclaim the rule:
```

This should usually fit in four short sentences or four short bullets.

## Reclaim-flow template

Use when the question is meant to reactivate memory after a failure.

```text
Name the trap.
Restate the rule.
Re-read the cue.
Retry the same pattern.
```

The reclaim flow should feel corrective and quick. It should not become a second lesson.

## Contrast-case template

Use when two answers are close and the player must separate them cleanly.

```text
Case A: [correct pattern]
Case B: [near miss]
Difference: [the rule that decides between them]
```

Contrast cases are useful for:

- priority versus confidence
- yield versus freeze
- signal versus actual safety check
- stop versus rolling pause

## Anti-trap micro-lesson template

Use when the point is to name the failure family directly.

```text
Trap name:
What it looks like:
Why it feels true:
How to break it:
```

This is the right shape for `priority-inversion`, `false-yield`, `stop-sign-bait`, and similar families.

## Practical rule

Do not create a new template just because a sentence feels awkward. If the record can fit one of these shapes, keep the system small and keep the language stable.

## Current evidence

- `apps/road-master/data/chapter-1-crossing-fields/templates.json`
- `apps/road-master/data/chapter-1-crossing-fields/analogies.json`
- `apps/road-master/data/chapter-1-crossing-fields/explanations.json`
- `apps/road-master/data/chapter-1-crossing-fields/bosses.json`
- `lane/spark-2-content` commit `f505b9b`
