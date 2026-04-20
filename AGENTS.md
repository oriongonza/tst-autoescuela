# Agent Workflow

This repo follows a seam-first, five-lane workflow modeled on `~/repos/muxon`.

One overseer owns planning, lane boundaries, PR orchestration, CI watching, and failure recovery. Five Spark agents execute disjoint lanes in parallel. No human review sits inside the normal loop.

### Overseer

The overseer owns planning, lane boundaries, PR orchestration, CI watching, and failure recovery.

1. Lock the seam.
   - Freeze the lane split before implementation starts.
   - Verify every lane has one narrow file boundary.
   - Keep branch names in the form `lane/spark-<N>-<slug>`.

2. Seed the five worktrees from `origin/main`.

   ```bash
   ROOT=/home/ardi/repos/tst_autoescuela/app
   git -C "$ROOT" fetch origin main
   git -C "$ROOT" worktree add "$ROOT/.worktrees/spark-1" -b lane/spark-1-roadmap origin/main
   git -C "$ROOT" worktree add "$ROOT/.worktrees/spark-2" -b lane/spark-2-bootstrap origin/main
   git -C "$ROOT" worktree add "$ROOT/.worktrees/spark-3" -b lane/spark-3-ci origin/main
   git -C "$ROOT" worktree add "$ROOT/.worktrees/spark-4" -b lane/spark-4-review origin/main
   git -C "$ROOT" worktree add "$ROOT/.worktrees/spark-5" -b lane/spark-5-governance origin/main
   ```

   Pattern:

   ```bash
   git -C "$ROOT" worktree add "$ROOT/.worktrees/spark-<N>" -b lane/spark-<N>-<slug> origin/main
   ```

3. Hand each lane only its owned files and branch.
   - Work inside the lane worktree.
   - Do not edit files owned by other lanes.
   - Keep all five lanes in flight until the queue is empty.

4. Run the lane PR flow.
   - The lane commits locally on its branch.
   - The lane opens the PR with `scripts/open_agent_pr.sh`.
   - The PR carries exactly one `lane:spark-<N>` label.
   - Auto-merge is enabled when the PR opens.
   - Overseer watches `gh pr view --json reviewDecision,statusCheckRollup`.

5. Recover from failure without leaving the loop.
   - CI red or auto-review changes: reuse the same worktree and branch, fix the lane-owned issue, recommit, rerun checks, and update the PR.
   - After 3 failed iterations, split the work into a smaller lane PR and continue. Do not stop for human review in the normal path.

6. Clean up after merge.
   - Remove the worktree.
   - Delete the lane branch if it no longer has outstanding work.
   - Start the next lane if one is queued.

### Spark 1 — Roadmap model

- Owns `roadmap/`
- May change labels, milestones, issue manifests, and roadmap invariants

### Spark 2 — Bootstrap scripts

- Owns `scripts/common.sh`, `scripts/create_*.sh`, `scripts/validate_manifest.sh`, and `scripts/bootstrap_all.sh`
- May change repo bootstrap behavior, manifest generation, and validation logic

### Spark 3 — CI lane

- Owns `.github/workflows/ci.yml`, `scripts/ci.sh`, and `scripts/check_repo_structure.sh`
- May change required checks and local CI parity

### Spark 4 — Review and merge automation

- Owns `.github/workflows/auto-review.yml`, `scripts/auto_review.sh`, `scripts/open_agent_pr.sh`, and `scripts/configure_repo_flow.sh`
- May change auto-review policy, PR bootstrap, and branch protection bootstrap

### Spark 5 — Governance and templates

- Owns `AGENTS.md`, `README.md`, `.github/pull_request_template.md`, and `.github/ISSUE_TEMPLATE/`
- May change workflow docs, templates, and operator guidance

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
- Retry budget: 3 loops per lane. After that, the overseer narrows the scope into smaller lane PRs and continues the flow.

## Repo Settings

The intended live repo policy is:

- branch protection on `main`
- no direct pushes to `main`
- required CI checks green
- 1 approving review required
- auto-merge enabled
- delete branch on merge enabled

`scripts/configure_repo_flow.sh` applies those settings when explicitly approved to run against GitHub.
