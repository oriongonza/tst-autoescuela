#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC2034
LABELS_FILE="${ROOT_DIR}/roadmap/labels.json"
# shellcheck disable=SC2034
MILESTONES_FILE="${ROOT_DIR}/roadmap/milestones.json"
# shellcheck disable=SC2034
ISSUES_FILE="${ROOT_DIR}/roadmap/issues.json"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_repo_env() {
  : "${GH_REPO:?Set GH_REPO to owner/repo before running this script.}"
}

json_count() {
  jq 'length' "$1"
}

main_repo_root() {
  local common_dir
  local common_dir_path

  common_dir="$(git -C "${ROOT_DIR}" rev-parse --git-common-dir)"
  if [[ "${common_dir}" = /* ]]; then
    common_dir_path="${common_dir}"
  else
    common_dir_path="${ROOT_DIR}/${common_dir}"
  fi

  cd "${common_dir_path}/.." && pwd -P
}

spark_lane_slug() {
  case "$1" in
    1) printf '%s\n' 'roadmap' ;;
    2) printf '%s\n' 'bootstrap' ;;
    3) printf '%s\n' 'ci' ;;
    4) printf '%s\n' 'review' ;;
    5) printf '%s\n' 'governance' ;;
    *)
      echo "Unknown Spark lane: $1" >&2
      exit 1
      ;;
  esac
}

spark_lane_branch() {
  local lane_number="$1"
  printf 'lane/spark-%s-%s\n' "${lane_number}" "$(spark_lane_slug "${lane_number}")"
}

spark_lane_worktree_path() {
  local worktree_root="$1"
  local lane_number="$2"
  printf '%s/spark-%s\n' "${worktree_root}" "${lane_number}"
}

worktree_path_for_branch() {
  local repo_root="$1"
  local branch="$2"
  local current_path=""
  local line

  while IFS= read -r line; do
    case "${line}" in
      "worktree "*) current_path="${line#worktree }" ;;
      "branch refs/heads/${branch}")
        printf '%s\n' "${current_path}"
        return 0
        ;;
    esac
  done < <(git -C "${repo_root}" worktree list --porcelain)
}
