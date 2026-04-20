#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABELS_FILE="${ROOT_DIR}/roadmap/labels.json"
MILESTONES_FILE="${ROOT_DIR}/roadmap/milestones.json"
ISSUES_FILE="${ROOT_DIR}/roadmap/issues.json"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_repo_env() {
  : "${GH_REPO:?Set GH_REPO to owner/repo before running this script.}"
}

json_count() {
  jq 'length' "$1"
}
