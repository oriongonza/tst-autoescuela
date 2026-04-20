#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run_manifest() {
  "${SCRIPT_DIR}/validate_manifest.sh"
}

run_repo_smoke() {
  "${SCRIPT_DIR}/check_repo_structure.sh"
}

run_bash() {
  local file
  for file in "${SCRIPT_DIR}"/*.sh; do
    bash -n "${file}"
  done
}

run_shellcheck() {
  command -v shellcheck >/dev/null 2>&1 || {
    echo "shellcheck is required for scripts/ci.sh shellcheck" >&2
    exit 1
  }

  (
    cd "${SCRIPT_DIR}"
    shellcheck -x ./*.sh
  )
}

run_stage() {
  case "${1}" in
    manifest)
      run_manifest
      ;;
    repo-smoke)
      run_repo_smoke
      ;;
    bash)
      run_bash
      ;;
    shellcheck)
      run_shellcheck
      ;;
    all)
      run_manifest
      run_repo_smoke
      run_bash
      run_shellcheck
      ;;
    *)
      echo "Unknown CI stage: ${1}" >&2
      echo "Usage: scripts/ci.sh [manifest|repo-smoke|bash|shellcheck|all ...]" >&2
      exit 1
      ;;
  esac
}

if [[ $# -eq 0 ]]; then
  set -- all
fi

for stage in "$@"; do
  run_stage "${stage}"
done

echo "CI checks passed"
