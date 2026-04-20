# tst-autoescuela Roadmap Bootstrap

This workspace contains the local bootstrap kit for a public GitHub roadmap repository for the Road Master style driving theory product.

The roadmap manifests in this directory were derived from the local `chatgpt_conv.md` conversation source, especially the sections covering `0.0.0` through `1.0.0` and the later Codex-ready execution doc. The conversation source does not need to be published with the tracker repository.

## Files

- `AGENTS.md`: overseer and five-Spark-agent workflow for no-human PR execution.
- `roadmap/labels.json`: label catalog for GitHub.
- `roadmap/milestones.json`: versioned capability milestones from `0.0.0` to `1.0.0`.
- `roadmap/issues.json`: epic-plus-task issue set that covers the roadmap through `1.0.0`.
- `.github/workflows/ci.yml`: required CI checks for this repo.
- `.github/workflows/auto-review.yml`: lane-aware bot review for PRs.
- `.github/pull_request_template.md`: required PR structure for agent lanes.
- `scripts/validate_manifest.sh`: validates the local manifests before any GitHub write.
- `scripts/ci.sh`: local CI wrapper mirroring the GitHub workflow checks.
- `scripts/check_repo_structure.sh`: validates repo automation files and lane labels.
- `scripts/auto_review.sh`: reruns checks and approves or rejects lane PRs.
- `scripts/open_agent_pr.sh`: standard PR creation helper that enables auto-merge.
- `scripts/configure_repo_flow.sh`: applies labels, auto-merge, and branch protection to the live repo.
- `scripts/create_repo.sh`: creates the public GitHub repository.
- `scripts/create_labels.sh`: creates or updates labels in batch.
- `scripts/create_milestones.sh`: creates milestones in batch.
- `scripts/create_issues.sh`: creates issues in batch and skips duplicates by title.
- `scripts/bootstrap_all.sh`: runs validation and then seeds the repo.
- `.github/ISSUE_TEMPLATE/`: local issue templates to publish once the repo contents are pushed.

## Local validation

```bash
scripts/validate_manifest.sh
scripts/ci.sh
```

## Planned public commands

Create the public repo:

```bash
OWNER=dev-ardi REPO_NAME=tst-autoescuela scripts/create_repo.sh
```

Seed labels, milestones, and issues:

```bash
GH_REPO=dev-ardi/tst-autoescuela scripts/bootstrap_all.sh --skip-repo
```

If you want this local `README` and the issue templates to land in the GitHub repo on first publish, initialize a local git repository, commit the current files, and then use `PUSH_SOURCE=1` with `scripts/create_repo.sh`.

## Agent PR flow

The repo is set up for one overseer plus five Spark lanes:

- `lane:spark-1`: roadmap manifests
- `lane:spark-2`: bootstrap scripts
- `lane:spark-3`: CI
- `lane:spark-4`: auto-review and merge automation
- `lane:spark-5`: governance and templates

Typical lane flow:

```bash
GH_REPO=owner/repo HEAD_BRANCH=lane/spark-3-ci TITLE="CI: tighten checks" BODY_FILE=/tmp/pr.md LANE_LABEL=lane:spark-3 scripts/open_agent_pr.sh
```

To configure the live repo settings after approval:

```bash
GH_REPO=owner/repo scripts/configure_repo_flow.sh
```

## Approval rule

The repository creation and issue seeding commands are public GitHub actions. Per the active instructions, they must not be executed without your confirmation on the exact command.
