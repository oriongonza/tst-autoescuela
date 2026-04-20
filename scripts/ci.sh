#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/validate_manifest.sh"
"${SCRIPT_DIR}/check_repo_structure.sh"

for file in "${SCRIPT_DIR}"/*.sh; do
  bash -n "${file}"
done

command -v shellcheck >/dev/null 2>&1 || {
  echo "shellcheck is required for scripts/ci.sh" >&2
  exit 1
}

(
  cd "${SCRIPT_DIR}"
  shellcheck -x ./*.sh
)

echo "CI checks passed"
