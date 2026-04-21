#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

run_manifest() {
  "${SCRIPT_DIR}/validate_manifest.sh"
}

run_repo_smoke() {
  "${SCRIPT_DIR}/check_repo_structure.sh"
}

run_road_master_tests() {
  (
    cd "${ROOT_DIR}"
    node --test \
      apps/road-master/tests/combat_pacing/*.test.mjs \
      apps/road-master/tests/map_memory/*.test.mjs \
      apps/road-master/tests/analytics/*.test.mjs \
      apps/road-master/tests/social_or_narrative/*.test.mjs \
      apps/road-master/tests/app/*.test.mjs
  )
}

run_content_inspector() {
  (
    cd "${ROOT_DIR}"
    node apps/road-master/tools/content-inspector.mjs validate
  )
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
    road-master-tests)
      run_road_master_tests
      ;;
    content-inspector)
      run_content_inspector
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
      run_road_master_tests
      run_content_inspector
      run_bash
      run_shellcheck
      ;;
    *)
      echo "Unknown CI stage: ${1}" >&2
      echo "Usage: scripts/ci.sh [manifest|repo-smoke|road-master-tests|content-inspector|bash|shellcheck|all ...]" >&2
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
