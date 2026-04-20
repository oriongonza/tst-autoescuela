# tst-autoescuela Roadmap Bootstrap

This workspace contains the local bootstrap kit for the public `tst-autoescuela` roadmap repository.

The manifests in this directory were derived from the local `chatgpt_conv.md` source, especially the sections covering `0.0.0` through `1.0.0` and the later Codex-ready execution doc. The conversation source does not need to be published with the tracker repository.

## What Lives Here

- `AGENTS.md`: overseer and five-Spark-agent workflow for no-human PR execution.
- `roadmap/labels.json`: label catalog for GitHub.
- `roadmap/milestones.json`: versioned capability milestones from `0.0.0` to `1.0.0`.
- `roadmap/issues.json`: epic-plus-task issue set that covers the roadmap through `1.0.0`.
- `.github/workflows/ci.yml`: required CI checks for this repo.
- `.github/workflows/auto-review.yml`: lane-aware bot review for PRs.
- `.github/pull_request_template.md`: required PR structure for agent lanes.
- `.github/ISSUE_TEMPLATE/`: local issue templates for epics and tasks.
- `scripts/*`: local bootstrap, validation, PR, and repo-configuration helpers.

## Overseer + Five Lanes

- One overseer coordinates five Spark lanes.
- Each lane gets one worktree and one branch.
- Branch names use `lane/spark-<N>-<slug>`.
- Worktrees live under `.worktrees/spark-<N>`.

### Worktree Creation

```bash
ROOT=/home/ardi/repos/tst_autoescuela/app
git -C "$ROOT" fetch origin main
git -C "$ROOT" worktree add "$ROOT/.worktrees/spark-5" -b lane/spark-5-governance origin/main
```

Pattern:

```bash
git -C "$ROOT" worktree add "$ROOT/.worktrees/spark-<N>" -b lane/spark-<N>-<slug> origin/main
```

### Lane PR Flow

1. Implement inside the lane worktree.
2. Commit locally on the lane branch.
3. Open the PR with `scripts/open_agent_pr.sh`.
4. Let auto-review and CI gate the merge.
5. Reuse the same worktree and branch for retries.

### Failure Loop

- CI red or auto-review changes: fix the lane-owned files in place and rerun checks.
- Retry budget: 3 loops per lane.
- After the retry budget is exhausted, split the work into a smaller lane PR and continue. The normal path stays headless.

## Local Validation

```bash
scripts/validate_manifest.sh
scripts/ci.sh
```

## Planned Public Commands

Create the public repo:

```bash
OWNER=dev-ardi REPO_NAME=tst-autoescuela scripts/create_repo.sh
```

Seed labels, milestones, and issues:

```bash
GH_REPO=dev-ardi/tst-autoescuela scripts/bootstrap_all.sh --skip-repo
```

If you want this local `README` and the issue templates to land in the GitHub repo on first publish, initialize a local git repository, commit the current files, and then use `PUSH_SOURCE=1` with `scripts/create_repo.sh`.

## Approval Rule

The repository creation and issue seeding commands are public GitHub actions. Per the active instructions, they must not be executed without your confirmation on the exact command.
