#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "${SCRIPT_DIR}/common.sh"

require_cmd gh
require_cmd jq
require_repo_env

milestones_endpoint="repos/${GH_REPO}/milestones"

while IFS= read -r item; do
  title="$(jq -r '.title' <<<"${item}")"
  description="$(jq -r '.description' <<<"${item}")"

  if gh api --paginate "${milestones_endpoint}?state=all&per_page=100" \
    --jq '.[] | .title' | grep -Fxq "${title}"; then
    echo "Milestone already exists: ${title}"
    continue
  fi

  gh api "${milestones_endpoint}" \
    --method POST \
    -f title="${title}" \
    -f description="${description}" >/dev/null

  echo "Created milestone: ${title}"
done < <(jq -c '.[]' "${MILESTONES_FILE}")
