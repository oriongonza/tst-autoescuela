#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "${SCRIPT_DIR}/common.sh"

require_cmd gh
require_cmd jq
require_repo_env

declare -A milestone_numbers=()
while IFS=$'\t' read -r title number; do
  milestone_numbers["${title}"]="${number}"
done < <(
  gh api --paginate "repos/${GH_REPO}/milestones?state=all&per_page=100" \
    --jq '.[] | [.title, (.number | tostring)] | @tsv'
)

declare -A existing_titles=()
while IFS= read -r title; do
  [[ -n "${title}" ]] && existing_titles["${title}"]=1
done < <(
  gh issue list --repo "${GH_REPO}" --state all --limit 1000 --json title --jq '.[].title'
)

while IFS= read -r issue; do
  title="$(jq -r '.title' <<<"${issue}")"
  milestone_title="$(jq -r '.milestone' <<<"${issue}")"

  if [[ -n "${existing_titles["${title}"]:-}" ]]; then
    echo "Issue already exists: ${title}"
    continue
  fi

  milestone_number="${milestone_numbers["${milestone_title}"]:-}"
  if [[ -z "${milestone_number}" ]]; then
    echo "Missing milestone number for: ${milestone_title}" >&2
    exit 1
  fi

  body="$(jq -r '(.body_lines // []) | join("\n")' <<<"${issue}")"
  labels="$(jq -c '[("type: " + .type), ("area: " + .area), ("priority: " + .priority)] + (.extra_labels // [])' <<<"${issue}")"

  payload="$(jq -n \
    --arg title "${title}" \
    --arg body "${body}" \
    --argjson labels "${labels}" \
    --argjson milestone "${milestone_number}" \
    '{title: $title, body: $body, labels: $labels, milestone: $milestone}')"

  gh api "repos/${GH_REPO}/issues" --method POST --input - <<<"${payload}" >/dev/null
  existing_titles["${title}"]=1
  echo "Created issue: ${title}"
done < <(jq -c '.[]' "${ISSUES_FILE}")
