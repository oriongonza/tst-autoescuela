# tst-autoescuela Roadmap Bootstrap

This workspace contains the local bootstrap kit for a public GitHub roadmap repository for the Road Master style driving theory product.

The roadmap manifests in this directory were derived from the local `chatgpt_conv.md` conversation source, especially the sections covering `0.0.0` through `1.0.0` and the later Codex-ready execution doc. The conversation source does not need to be published with the tracker repository.

## Files

- `roadmap/labels.json`: label catalog for GitHub.
- `roadmap/milestones.json`: versioned capability milestones from `0.0.0` to `1.0.0`.
- `roadmap/issues.json`: epic-plus-task issue set that covers the roadmap through `1.0.0`.
- `scripts/validate_manifest.sh`: validates the local manifests before any GitHub write.
- `scripts/create_repo.sh`: creates the public GitHub repository.
- `scripts/create_labels.sh`: creates or updates labels in batch.
- `scripts/create_milestones.sh`: creates milestones in batch.
- `scripts/create_issues.sh`: creates issues in batch and skips duplicates by title.
- `scripts/bootstrap_all.sh`: runs validation and then seeds the repo.
- `.github/ISSUE_TEMPLATE/`: local issue templates to publish once the repo contents are pushed.

## Local validation

```bash
scripts/validate_manifest.sh
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

## Approval rule

The repository creation and issue seeding commands are public GitHub actions. Per the active instructions, they must not be executed without your confirmation on the exact command.
