#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "${SCRIPT_DIR}/common.sh"

skip_repo=0
bootstrap_worktrees=0

for arg in "$@"; do
  case "${arg}" in
    --skip-repo)
      skip_repo=1
      ;;
    --worktrees)
      bootstrap_worktrees=1
      ;;
    *)
      echo "Unknown argument: ${arg}" >&2
      exit 1
    ;;
  esac
done

"${SCRIPT_DIR}/validate_manifest.sh"

if [[ "${skip_repo}" -eq 0 ]]; then
  "${SCRIPT_DIR}/create_repo.sh"
fi

if [[ "${bootstrap_worktrees}" -eq 1 || "${BOOTSTRAP_WORKTREES:-0}" == "1" ]]; then
  "${SCRIPT_DIR}/create_worktrees.sh"
fi

export GH_REPO="${GH_REPO:-${OWNER:-dev-ardi}/${REPO_NAME:-tst-autoescuela}}"

"${SCRIPT_DIR}/create_labels.sh"
"${SCRIPT_DIR}/create_milestones.sh"
"${SCRIPT_DIR}/create_issues.sh"

echo "Bootstrap complete for ${GH_REPO}"
