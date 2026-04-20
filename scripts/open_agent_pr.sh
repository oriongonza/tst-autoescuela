#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

: "${GH_REPO:?Set GH_REPO to owner/repo.}"
: "${HEAD_BRANCH:?Set HEAD_BRANCH to the current lane branch.}"
: "${TITLE:?Set TITLE to the PR title.}"
: "${BODY_FILE:?Set BODY_FILE to the path of the PR body file.}"
LANE_LABEL="${LANE_LABEL:-}"

BASE_BRANCH="${BASE_BRANCH:-main}"

current_branch="$(git branch --show-current)"
if [[ "${current_branch}" != "${HEAD_BRANCH}" ]]; then
  echo "HEAD_BRANCH must match the current checked-out branch." >&2
  echo "current=${current_branch:-detached} expected=${HEAD_BRANCH}" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree must be clean before opening a PR." >&2
  exit 1
fi

lane_label_for_branch() {
  case "$1" in
    lane/overseer-*) echo "lane:overseer" ;;
    lane/spark-1*) echo "lane:spark-1" ;;
    lane/spark-2*) echo "lane:spark-2" ;;
    lane/spark-3*) echo "lane:spark-3" ;;
    lane/spark-4*) echo "lane:spark-4" ;;
    lane/spark-5*) echo "lane:spark-5" ;;
    *) echo "" ;;
  esac
}

expected_lane_label="$(lane_label_for_branch "${HEAD_BRANCH}")"
if [[ -z "${expected_lane_label}" ]]; then
  echo "HEAD_BRANCH must use lane/spark-<1-5>-* or lane/overseer-* naming." >&2
  exit 1
fi

if [[ -z "${LANE_LABEL}" ]]; then
  LANE_LABEL="${expected_lane_label}"
elif [[ "${LANE_LABEL}" != "${expected_lane_label}" ]]; then
  echo "LANE_LABEL must match the lane encoded in HEAD_BRANCH (${expected_lane_label})." >&2
  exit 1
fi

summary_file="$(mktemp)"
trap 'rm -f "${summary_file}"' EXIT
"${SCRIPT_DIR}/overseer_lane_status.sh" --repo "${GH_REPO}" --branch "${HEAD_BRANCH}" --format text >"${summary_file}"

echo "Lane readiness snapshot:"
cat "${summary_file}"

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
