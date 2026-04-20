# Agent Workflow

This repo follows a seam-first, lane-based workflow modeled on `~/repos/muxon`.

One overseer agent owns planning, lane boundaries, PR orchestration, CI watching, and failure recovery. Five Spark agents execute disjoint lanes in parallel. No human review sits inside the loop.

## Roles

### Overseer

- Owns the spec, lane split, and branch naming.
- Ensures every lane has a narrow file ownership boundary before implementation starts.
- Opens or updates tracking issues as needed before lane work begins.
- Watches PR state with `gh pr view --json reviewDecision,statusCheckRollup`.
- Requeues a Spark agent when CI fails or auto-review requests changes.
- Enables auto-merge when opening the PR.

### Spark 1 — Roadmap model

- Owns `roadmap/`.
- May change labels, milestones, issue manifests, and roadmap invariants.

### Spark 2 — Bootstrap scripts

- Owns `scripts/common.sh`, `scripts/create_*.sh`, `scripts/validate_manifest.sh`, and `scripts/bootstrap_all.sh`.
- May change repo bootstrap behavior, manifest generation, and validation logic.

### Spark 3 — CI lane

- Owns `.github/workflows/ci.yml`, `scripts/ci.sh`, and `scripts/check_repo_structure.sh`.
- May change required checks and local CI parity.

### Spark 4 — Review and merge automation

- Owns `.github/workflows/auto-review.yml`, `scripts/auto_review.sh`, `scripts/open_agent_pr.sh`, and `scripts/configure_repo_flow.sh`.
- May change auto-review policy, PR bootstrap, and branch protection bootstrap.

### Spark 5 — Governance and templates

- Owns `AGENTS.md`, `README.md`, `.github/pull_request_template.md`, and `.github/ISSUE_TEMPLATE/`.
- May change workflow docs, templates, and operator guidance.

## Lane Rules

- Each Spark agent works in an isolated worktree or branch.
- Branch names use `lane/spark-<N>-<slug>`.
- Each PR must carry exactly one `lane:spark-<N>` label.
- A lane may only edit files it owns. Cross-lane edits are rejected by auto-review.
- If work spans multiple lanes, the overseer splits it into smaller PRs or takes an integration lane explicitly.

## PR Flow

1. Overseer locks the seam first.
2. Spark agent implements the lane in isolation.
3. Spark agent opens a PR with `scripts/open_agent_pr.sh`.
4. Auto-review reruns repo checks and enforces lane ownership.
5. CI must pass.
6. Auto-merge squash-merges the branch once review and CI are both green.

No human review is part of the normal path.

## Auto-Review Gate

Auto-review is not a rubber stamp. It rejects PRs that:

- are missing a `lane:spark-*` label
- target a branch other than `main`
- omit the required PR template sections
- fail local repo CI
- edit files outside the owning lane

## Failure Loop

- CI red: overseer requeues the same Spark lane with the failing log excerpt.
- Auto-review red: overseer requeues the same Spark lane with the review body.
- After 5 failed loops, the overseer must split the lane into smaller PRs rather than keep retrying the same shape.

## Repo Settings

The intended live repo policy is:

- branch protection on `main`
- no direct pushes to `main`
- required CI checks green
- 1 approving review required
- auto-merge enabled
- delete branch on merge enabled

`scripts/configure_repo_flow.sh` applies those settings when explicitly approved to run against GitHub.
