#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

BASE_BRANCH="${BASE_BRANCH:-main}"
FORMAT="markdown"
FOCUS_BRANCH=""
PR_NUMBER=""
REPO="${GH_REPO:-}"

usage() {
  cat <<'EOF'
Usage: overseer_lane_status.sh [--repo OWNER/REPO] [--branch BRANCH] [--pr-number N] [--format markdown|text]

Summarizes lane branch and PR readiness for the overseer workflow.
EOF
}

while (($#)); do
  case "$1" in
    --branch)
      FOCUS_BRANCH="${2:?Missing value for --branch}"
      shift 2
      ;;
    --repo)
      REPO="${2:?Missing value for --repo}"
      shift 2
      ;;
    --pr-number)
      PR_NUMBER="${2:?Missing value for --pr-number}"
      shift 2
      ;;
    --format)
      FORMAT="${2:?Missing value for --format}"
      shift 2
      ;;
    --base-branch)
      BASE_BRANCH="${2:?Missing value for --base-branch}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

: "${REPO:?Set GH_REPO or pass --repo owner/repo.}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd git
require_cmd gh
require_cmd jq

cd "${ROOT_DIR}"

lane_from_branch() {
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

branch_state() {
  local branch="$1"
  local worktree="${2:-}"
  local status="clean"
  local ahead="n/a"
  local behind="n/a"

  if [[ -n "${worktree}" && -d "${worktree}" ]]; then
    if [[ -n "$(git -C "${worktree}" status --porcelain)" ]]; then
      status="dirty"
    fi
  else
    status="no-worktree"
  fi

  if git rev-parse --verify "${BASE_BRANCH}" >/dev/null 2>&1 && \
     git rev-parse --verify "${branch}" >/dev/null 2>&1; then
    read -r behind ahead < <(git rev-list --left-right --count "${BASE_BRANCH}...${branch}")
  fi

  local pr_json pr_number pr_url pr_draft pr_state pr_title
  pr_json="$(gh pr list --repo "${REPO}" --head "${branch}" --state open --json number,url,isDraft,mergeStateStatus,title,labels)"
  pr_number="$(jq -r '.[0] // {} | .number // empty' <<<"${pr_json}")"
  pr_url="$(jq -r '.[0] // {} | .url // empty' <<<"${pr_json}")"
  pr_draft="$(jq -r '.[0] // {} | .isDraft // false' <<<"${pr_json}")"
  pr_state="$(jq -r '.[0] // {} | .mergeStateStatus // empty' <<<"${pr_json}")"
  pr_title="$(jq -r '.[0] // {} | .title // empty' <<<"${pr_json}")"

  local readiness="needs-pr"
  if [[ -n "${pr_number}" ]]; then
    if [[ "${pr_draft}" == "true" ]]; then
      readiness="draft"
    elif [[ "${pr_state}" == "CLEAN" ]]; then
      readiness="ready"
    else
      readiness="blocked"
    fi
  fi

  if [[ "${status}" == "dirty" ]]; then
    readiness="dirty"
  elif [[ "${status}" == "no-worktree" && -z "${pr_number}" ]]; then
    readiness="unassigned"
  fi

  local lane branch_label
  lane="$(lane_from_branch "${branch}")"
  branch_label="${lane:-unmatched}"
  local pr_display pr_url_display pr_title_display
  pr_display="${pr_number:+#${pr_number}}"
  pr_url_display="${pr_url:-}"
  pr_title_display="${pr_title:-}"

  [[ -n "${pr_display}" ]] || pr_display="-"
  [[ -n "${pr_url_display}" ]] || pr_url_display="-"
  [[ -n "${pr_title_display}" ]] || pr_title_display="-"

  if [[ "${FORMAT}" == "text" ]]; then
    printf '%s branch=%s worktree=%s pr=%s state=%s ahead=%s behind=%s status=%s title=%s\n' \
      "${branch_label}" \
      "${branch}" \
      "${worktree:--}" \
      "${pr_display}" \
      "${readiness}" \
      "${ahead}" \
      "${behind}" \
      "${status}" \
      "${pr_title_display}"
  else
    printf '| %s | %s | %s | %s | %s | %s / %s | %s |\n' \
      "${branch_label}" \
      "${branch}" \
      "${worktree:--}" \
      "${pr_display} ${pr_url_display}" \
      "${readiness}" \
      "${ahead}" \
      "${behind}" \
      "${status}"
  fi
}

declare -A worktree_by_branch=()
current_worktree=""
while IFS= read -r line; do
  case "${line}" in
    worktree\ *)
      current_worktree="${line#worktree }"
      ;;
    branch\ refs/heads/*)
      worktree_by_branch["${line#branch refs/heads/}"]="${current_worktree}"
      ;;
  esac
done < <(git worktree list --porcelain)

branches=()
if [[ -n "${PR_NUMBER}" ]]; then
  pr_json="$(gh pr view "${PR_NUMBER}" --repo "${REPO}" --json headRefName,number,title,isDraft,mergeStateStatus,url)"
  focus_branch="$(jq -r '.headRefName' <<<"${pr_json}")"
  if [[ -n "${FOCUS_BRANCH}" && "${FOCUS_BRANCH}" != "${focus_branch}" ]]; then
    echo "Requested branch ${FOCUS_BRANCH} does not match PR branch ${focus_branch}." >&2
    exit 1
  fi
  branches+=("${focus_branch}")
elif [[ -n "${FOCUS_BRANCH}" ]]; then
  branches+=("${FOCUS_BRANCH}")
else
  mapfile -t branches < <(
    {
      git for-each-ref --format='%(refname:short)' "refs/heads/lane/spark-*"
      git for-each-ref --format='%(refname:short)' "refs/heads/lane/overseer-*"
    } | sort -u
  )
fi

if [[ "${FORMAT}" == "markdown" ]]; then
  echo "## Lane Readiness"
  echo
  echo "| Lane | Branch | Worktree | PR | State | Ahead / Behind | Status |"
  echo "| --- | --- | --- | --- | --- | --- | --- |"
fi

if [[ "${#branches[@]}" -eq 0 ]]; then
  if [[ "${FORMAT}" == "markdown" ]]; then
    echo "| - | - | - | - | unassigned | - | no lane branches found |"
  else
    echo "No lane branches found."
  fi
  exit 0
fi

for branch in "${branches[@]}"; do
  worktree="${worktree_by_branch[$branch]:-}"
  branch_state "${branch}" "${worktree}"
done
