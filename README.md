# tst-autoescuela / Road Master

This repo now contains both the roadmap tracker and a working Road Master prototype derived from that roadmap.

## What is here

- `apps/road-master/`: playable static prototype with three catalog-backed chapters, combat, pacing, memory, onboarding, persistence, analytics, and social/share surfaces.
- `apps/road-master/editor.html`: ugly internal content editor for inspecting packs and staging local draft edits.
- `apps/road-master/docs/`: foundations contracts plus roadmap coverage and hardening docs.
- `roadmap/`: milestones, labels, and issue manifests through `1.0.0`.
- `.github/` and `scripts/`: the autonomous five-lane workflow, CI, and auto-review automation.

## Prototype status

The current local branch includes:

- Playable Chapter I `Crossing Fields`
- Playable Chapter II `Switchback Ridge`
- Playable Chapter III `Lantern Docks`
- Generated runtime support for catalog-backed chapters beyond the original handcrafted slice
- Combat depth: shield, armor, tempo/combo, parry/trap-defuse, revenge/retry flow
- Memory/personalization layer: flashbacks, reclaim, progression cues, profile/session state
- Analytics layer: readiness, fail-risk, weak-scope diagnostics, dashboard snapshot helpers
- Social layer: share cards, ghost runs, cohort comparison, narrative rank/title helpers

## Local validation

Core repo checks:

```bash
scripts/validate_manifest.sh
scripts/ci.sh
```

Road Master checks:

```bash
node --test apps/road-master/tests/combat_pacing/*.test.mjs \
  apps/road-master/tests/map_memory/*.test.mjs \
  apps/road-master/tests/analytics/*.test.mjs \
  apps/road-master/tests/social_or_narrative/*.test.mjs \
  apps/road-master/tests/app/*.test.mjs

node apps/road-master/tools/content-inspector.mjs validate
```

Manual browser entry points:

- `apps/road-master/index.html`
- `apps/road-master/editor.html`

## Workflow

The repo still uses the overseer-plus-five-lane model described in `AGENTS.md`:

- one overseer coordinates seam splits and integration
- five Spark lanes work in isolated git worktrees
- CI and auto-review enforce the lane contract
- public GitHub actions still require explicit confirmation per the standing repo rule

Launch-time operators should fetch `origin/main` before seeding a lane and should not assume the local `main` branch is current. If a canonical `.worktrees/spark-<N>` path is already occupied, use a launch-scoped worktree path and fold the launch ID into the lane slug only as needed for uniqueness; the branch forms remain `lane/spark-<N>-<slug>` for Spark work and `lane/overseer-<slug>` for overseer integration.
