#!/usr/bin/env bash
set -euo pipefail

: "${GH_REPO:?Set GH_REPO to owner/repo.}"
: "${HEAD_BRANCH:?Set HEAD_BRANCH to the current lane branch.}"
: "${TITLE:?Set TITLE to the PR title.}"
: "${BODY_FILE:?Set BODY_FILE to the path of the PR body file.}"
: "${LANE_LABEL:?Set LANE_LABEL to lane:spark-1..lane:spark-5.}"

BASE_BRANCH="${BASE_BRANCH:-main}"

case "${LANE_LABEL}" in
  lane:spark-1|lane:spark-2|lane:spark-3|lane:spark-4|lane:spark-5)
    ;;
  *)
    echo "LANE_LABEL must be one of lane:spark-1..lane:spark-5" >&2
    exit 1
    ;;
esac

pr_url="$(gh pr create \
  --repo "${GH_REPO}" \
  --base "${BASE_BRANCH}" \
  --head "${HEAD_BRANCH}" \
  --title "${TITLE}" \
  --body-file "${BODY_FILE}" \
  --label "${LANE_LABEL}")"

pr_number="$(gh pr view "${pr_url}" --repo "${GH_REPO}" --json number --jq '.number')"

gh pr merge "${pr_number}" \
  --repo "${GH_REPO}" \
  --auto \
  --squash \
  --delete-branch

echo "${pr_url}"
