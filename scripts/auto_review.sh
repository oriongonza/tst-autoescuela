#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

: "${GH_REPO:?Set GH_REPO to owner/repo.}"
: "${PR_NUMBER:?Set PR_NUMBER to the pull request number.}"

failures=()

record_failure() {
  failures+=("$1")
}

require_pr_field() {
  local value="$1"
  local message="$2"
  [[ -n "${value}" && "${value}" != "null" ]] || record_failure "${message}"
}

lane_allowlist_ok() {
  local lane="$1"
  shift
  local file

  case "${lane}" in
    lane:spark-1)
      for file in "$@"; do
        [[ "${file}" == roadmap/* ]] || return 1
      done
      ;;
    lane:spark-2)
      for file in "$@"; do
        [[ "${file}" == scripts/common.sh || \
           "${file}" == scripts/bootstrap_all.sh || \
           "${file}" == scripts/create_*.sh || \
           "${file}" == scripts/validate_manifest.sh ]] || return 1
      done
      ;;
    lane:spark-3)
      for file in "$@"; do
        [[ "${file}" == .github/workflows/ci.yml || \
           "${file}" == scripts/ci.sh || \
           "${file}" == scripts/check_repo_structure.sh ]] || return 1
      done
      ;;
    lane:spark-4)
      for file in "$@"; do
        [[ "${file}" == .github/workflows/auto-review.yml || \
           "${file}" == scripts/auto_review.sh || \
           "${file}" == scripts/open_agent_pr.sh || \
           "${file}" == scripts/configure_repo_flow.sh || \
           "${file}" == scripts/overseer_lane_status.sh ]] || return 1
      done
      ;;
    lane:spark-5)
      for file in "$@"; do
        [[ "${file}" == AGENTS.md || \
           "${file}" == README.md || \
           "${file}" == .github/pull_request_template.md || \
           "${file}" == .github/ISSUE_TEMPLATE/* ]] || return 1
      done
      ;;
    *)
      return 1
      ;;
  esac
}

cd "${ROOT_DIR}"

pr_json="$(gh pr view "${PR_NUMBER}" --repo "${GH_REPO}" --json title,body,baseRefName,isDraft,labels)"
base_ref="$(jq -r '.baseRefName' <<<"${pr_json}")"
is_draft="$(jq -r '.isDraft' <<<"${pr_json}")"
body="$(jq -r '.body // ""' <<<"${pr_json}")"
mapfile -t lane_labels < <(jq -r '.labels[].name | select(startswith("lane:spark-"))' <<<"${pr_json}")

lane_summary_file="$(mktemp)"

[[ "${base_ref}" == "main" ]] || record_failure "Base branch must be main."
[[ "${is_draft}" == "false" ]] || record_failure "Draft PRs are not auto-approved."
[[ "${#lane_labels[@]}" -eq 1 ]] || record_failure "PR must have exactly one lane:spark-* label."

for section in "## Lane" "## Summary" "## Scope" "## Tests" "## Out Of Scope" "## Source"; do
  grep -Fq "${section}" <<<"${body}" || record_failure "PR body is missing required section: ${section}"
done

mapfile -t changed_files < <(gh pr diff "${PR_NUMBER}" --repo "${GH_REPO}" --name-only)
[[ "${#changed_files[@]}" -gt 0 ]] || record_failure "PR has no changed files."

if ! "${SCRIPT_DIR}/overseer_lane_status.sh" --repo "${GH_REPO}" --pr-number "${PR_NUMBER}" --format markdown >"${lane_summary_file}"; then
  record_failure "Unable to summarize lane readiness."
fi

if [[ "${#lane_labels[@]}" -eq 1 && "${#changed_files[@]}" -gt 0 ]]; then
  lane_allowlist_ok "${lane_labels[0]}" "${changed_files[@]}" || \
    record_failure "Changed files cross the ownership boundary for ${lane_labels[0]}."
fi

if ! "${SCRIPT_DIR}/ci.sh"; then
  record_failure "Repo CI checks failed under auto-review."
fi

review_file="$(mktemp)"
cleanup() {
  rm -f "${review_file}"
  rm -f "${lane_summary_file}"
}
trap cleanup EXIT

write_summary() {
  local title="$1"
  {
    echo "${title}"
    echo
    cat "${review_file}"
  } | tee /dev/stderr

  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## ${title}"
      echo
      cat "${review_file}"
    } >>"${GITHUB_STEP_SUMMARY}"
  fi
}

if [[ "${#failures[@]}" -eq 0 ]]; then
  {
    echo "Auto-review passed."
    echo
    echo "- Lane ownership respected."
    echo "- Required PR sections present."
    echo "- Repo CI checks passed."
    echo
    cat "${lane_summary_file}"
  } > "${review_file}"
  write_summary "Auto-review passed"
else
  {
    echo "Auto-review failed."
    echo
    for failure in "${failures[@]}"; do
      echo "- ${failure}"
    done
    echo
    cat "${lane_summary_file}"
  } > "${review_file}"
  write_summary "Auto-review failed"
  exit 1
fi
