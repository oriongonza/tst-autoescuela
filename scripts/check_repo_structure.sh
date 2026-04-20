#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

required_files=(
  "AGENTS.md"
  ".github/pull_request_template.md"
  ".github/workflows/ci.yml"
  ".github/workflows/auto-review.yml"
  "scripts/ci.sh"
  "scripts/auto_review.sh"
  "scripts/open_agent_pr.sh"
  "scripts/configure_repo_flow.sh"
)

for file in "${required_files[@]}"; do
  [[ -f "${file}" ]] || {
    echo "Missing required file: ${file}" >&2
    exit 1
  }
done

jq -e '
  any(.[]; .name == "lane:spark-1") and
  any(.[]; .name == "lane:spark-2") and
  any(.[]; .name == "lane:spark-3") and
  any(.[]; .name == "lane:spark-4") and
  any(.[]; .name == "lane:spark-5") and
  any(.[]; .name == "bot:overseer") and
  any(.[]; .name == "bot:auto-review")
' "${ROOT_DIR}/roadmap/labels.json" >/dev/null

rg -q "scripts/validate_manifest.sh" ".github/workflows/ci.yml"
rg -q "scripts/check_repo_structure.sh" ".github/workflows/ci.yml"
rg -q "scripts/auto_review.sh" ".github/workflows/auto-review.yml"

echo "Repo structure checks passed"
