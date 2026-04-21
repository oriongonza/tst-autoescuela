#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "${SCRIPT_DIR}/common.sh"

require_cmd git

BASE_BRANCH="${BASE_BRANCH:-main}"
MAIN_REPO_ROOT="$(main_repo_root)"
WORKTREE_ROOT="${WORKTREE_ROOT:-${MAIN_REPO_ROOT}/.worktrees}"
LAUNCH_ID="$(spark_launch_id)"

if ! git -C "${MAIN_REPO_ROOT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository: ${MAIN_REPO_ROOT}" >&2
  exit 1
fi

BASE_BRANCH="$(spark_resolve_worktree_base_branch "${MAIN_REPO_ROOT}" "${BASE_BRANCH}")"

mkdir -p "${WORKTREE_ROOT}"

for lane_number in 1 2 3 4 5; do
  branch="$(spark_lane_branch "${lane_number}" "${LAUNCH_ID}")"
  path="$(spark_lane_worktree_path "${WORKTREE_ROOT}" "${lane_number}" "${LAUNCH_ID}")"
  existing_path="$(worktree_path_for_branch "${MAIN_REPO_ROOT}" "${branch}")"

  if [[ -n "${existing_path}" ]]; then
    if [[ "${existing_path}" == "${path}" ]]; then
      echo "Worktree already exists: ${path} (${branch})"
      continue
    fi

    echo "Branch already checked out at ${existing_path}; expected ${path}" >&2
    exit 1
  fi

  if [[ -e "${path}" ]]; then
    if git -C "${path}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      current_branch="$(git -C "${path}" branch --show-current)"
      if [[ "${current_branch}" == "${branch}" ]]; then
        echo "Worktree already exists: ${path} (${branch})"
        continue
      fi
    fi

    echo "Refusing to reuse existing path: ${path}" >&2
    exit 1
  fi

  mkdir -p "$(dirname "${path}")"

  if git -C "${MAIN_REPO_ROOT}" show-ref --verify --quiet "refs/heads/${branch}"; then
    git -C "${MAIN_REPO_ROOT}" worktree add "${path}" "${branch}"
  else
    git -C "${MAIN_REPO_ROOT}" worktree add -b "${branch}" "${path}" "${BASE_BRANCH}"
  fi

  echo "Created worktree: ${path} (${branch})"
done

echo "Spark worktree bootstrap complete"
