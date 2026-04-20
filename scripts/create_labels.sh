#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_cmd gh
require_cmd jq
require_repo_env

while IFS= read -r label; do
  name="$(jq -r '.name' <<<"${label}")"
  color="$(jq -r '.color' <<<"${label}")"
  description="$(jq -r '.description' <<<"${label}")"

  gh label create "${name}" \
    --repo "${GH_REPO}" \
    --color "${color}" \
    --description "${description}" \
    --force
done < <(jq -c '.[]' "${LABELS_FILE}")

echo "Labels seeded for ${GH_REPO}"
