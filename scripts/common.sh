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

spark_launch_id() {
  local launch_id="${SPARK_LAUNCH_ID:-}"

  if [[ -z "${launch_id}" ]]; then
    return 0
  fi

  if ! [[ "${launch_id}" =~ ^[a-z0-9][a-z0-9.-]*$ ]]; then
    echo "Invalid SPARK_LAUNCH_ID: ${launch_id}" >&2
    echo "Expected a lowercase alphanumeric prefix followed by lowercase letters, digits, dots, or dashes." >&2
    exit 1
  fi

  printf '%s\n' "${launch_id}"
}

spark_lane_branch() {
  local lane_number="$1"
  local launch_id="${2:-}"

  if [[ -n "${launch_id}" ]]; then
    printf 'lane/spark-%s-%s-%s\n' "${lane_number}" "$(spark_lane_slug "${lane_number}")" "${launch_id}"
    return 0
  fi

  printf 'lane/spark-%s-%s\n' "${lane_number}" "$(spark_lane_slug "${lane_number}")"
}

spark_lane_worktree_path() {
  local worktree_root="$1"
  local lane_number="$2"
  local launch_id="${3:-}"

  if [[ -n "${launch_id}" ]]; then
    printf '%s/%s-spark-%s\n' "${worktree_root}" "${launch_id}" "${lane_number}"
    return 0
  fi

  printf '%s/spark-%s\n' "${worktree_root}" "${lane_number}"
}

spark_resolve_worktree_base_branch() {
  local repo_root="$1"
  local base_branch="$2"

  if [[ "${base_branch}" == "main" ]] && git -C "${repo_root}" rev-parse --verify --quiet "origin/main" >/dev/null; then
    printf '%s\n' 'origin/main'
    return 0
  fi

  if git -C "${repo_root}" rev-parse --verify --quiet -- "${base_branch}" >/dev/null; then
    printf '%s\n' "${base_branch}"
    return 0
  fi

  if [[ "${base_branch}" != origin/* ]] && git -C "${repo_root}" rev-parse --verify --quiet -- "origin/${base_branch}" >/dev/null; then
    printf '%s\n' "origin/${base_branch}"
    return 0
  fi

  echo "Unable to resolve base branch: ${base_branch}" >&2
  exit 1
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
