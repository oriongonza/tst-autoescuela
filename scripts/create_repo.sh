#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "${SCRIPT_DIR}/common.sh"

require_cmd gh

OWNER="${OWNER:-dev-ardi}"
REPO_NAME="${REPO_NAME:-tst-autoescuela}"
DESCRIPTION="${DESCRIPTION:-Road Master style driving theory product roadmap and implementation tracker}"
VISIBILITY="${VISIBILITY:-public}"
TARGET_REPO="${OWNER}/${REPO_NAME}"

case "${VISIBILITY}" in
  public|private|internal)
    visibility_flag="--${VISIBILITY}"
    ;;
  *)
    echo "VISIBILITY must be one of: public, private, internal" >&2
    exit 1
    ;;
esac

if gh repo view "${TARGET_REPO}" >/dev/null 2>&1; then
  echo "Repository already exists: ${TARGET_REPO}"
  exit 0
fi

if [[ "${PUSH_SOURCE:-0}" == "1" ]]; then
  if ! git -C "${ROOT_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "PUSH_SOURCE=1 requires ${ROOT_DIR} to already be a git repository." >&2
    exit 1
  fi

  if ! git -C "${ROOT_DIR}" rev-parse --verify HEAD >/dev/null 2>&1; then
    echo "PUSH_SOURCE=1 requires at least one local commit before publishing." >&2
    exit 1
  fi

  gh repo create "${TARGET_REPO}" \
    "${visibility_flag}" \
    --description "${DESCRIPTION}" \
    --source "${ROOT_DIR}" \
    --remote origin \
    --push
else
  gh repo create "${TARGET_REPO}" \
    "${visibility_flag}" \
    --description "${DESCRIPTION}" \
    --add-readme
fi

echo "Created repository: ${TARGET_REPO}"
