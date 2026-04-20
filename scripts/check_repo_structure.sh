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
  "scripts/overseer_lane_status.sh"
  "scripts/open_agent_pr.sh"
  "scripts/configure_repo_flow.sh"
  "scripts/create_worktrees.sh"
)

for file in "${required_files[@]}"; do
  [[ -f "${file}" ]] || {
    echo "Missing required file: ${file}" >&2
    exit 1
  }
done

contains_literal() {
  local needle="$1"
  local file="$2"

  if command -v rg >/dev/null 2>&1; then
    rg -Fq "${needle}" "${file}"
  else
    grep -Fq "${needle}" "${file}"
  fi
}

require_label() {
  local label="$1"

  jq -e --arg label "${label}" 'any(.[]; .name == $label)' "${ROOT_DIR}/roadmap/labels.json" >/dev/null || {
    echo "Missing required label: ${label}" >&2
    exit 1
  }
}

for label in \
  "lane:overseer" \
  "lane:spark-1" \
  "lane:spark-2" \
  "lane:spark-3" \
  "lane:spark-4" \
  "lane:spark-5" \
  "bot:overseer" \
  "bot:auto-review"
do
  require_label "${label}"
done

for lane_heading in \
  "### Overseer" \
  "### Spark 1 — Roadmap model" \
  "### Spark 2 — Bootstrap scripts" \
  "### Spark 3 — CI lane" \
  "### Spark 4 — Review and merge automation" \
  "### Spark 5 — Governance and templates"
do
  contains_literal "${lane_heading}" "AGENTS.md" || {
    echo "Missing lane heading in AGENTS.md: ${lane_heading}" >&2
    exit 1
  }
done

contains_literal "Each Spark agent works in an isolated worktree or branch." "AGENTS.md" || {
  echo "AGENTS.md must describe isolated worktrees or branches" >&2
  exit 1
}

contains_literal "Spark branch names use \`lane/spark-<N>-<slug>\`." "AGENTS.md" || {
  echo "AGENTS.md must define Spark lane branch naming" >&2
  exit 1
}

contains_literal "Overseer integration branches use \`lane/overseer-<slug>\`." "AGENTS.md" || {
  echo "AGENTS.md must define overseer integration branch naming" >&2
  exit 1
}

contains_literal "scripts/ci.sh manifest" ".github/workflows/ci.yml" || {
  echo ".github/workflows/ci.yml must invoke scripts/ci.sh manifest" >&2
  exit 1
}

contains_literal "scripts/ci.sh repo-smoke" ".github/workflows/ci.yml" || {
  echo ".github/workflows/ci.yml must invoke scripts/ci.sh repo-smoke" >&2
  exit 1
}

contains_literal "scripts/ci.sh shellcheck" ".github/workflows/ci.yml" || {
  echo ".github/workflows/ci.yml must invoke scripts/ci.sh shellcheck" >&2
  exit 1
}

contains_literal "scripts/ci.sh bash" ".github/workflows/ci.yml" || {
  echo ".github/workflows/ci.yml must invoke scripts/ci.sh bash" >&2
  exit 1
}

contains_literal "scripts/auto_review.sh" ".github/workflows/auto-review.yml" || {
  echo ".github/workflows/auto-review.yml must invoke scripts/auto_review.sh" >&2
  exit 1
}

current_branch="$(git branch --show-current)"
if [[ -n "${current_branch}" && "${current_branch}" == lane/* ]]; then
  if ! [[ "${current_branch}" =~ ^lane/(spark-[1-5]-[a-z0-9][a-z0-9.-]*|overseer-[a-z0-9][a-z0-9.-]*)$ ]]; then
    echo "Lane branches must follow lane/spark-<N>-<slug> or lane/overseer-<slug>: ${current_branch}" >&2
    exit 1
  fi
fi

if [[ -e "scripts/create_worktrees.sh" ]]; then
  [[ -x "scripts/create_worktrees.sh" ]] || {
    echo "scripts/create_worktrees.sh must be executable when present" >&2
    exit 1
  }

  contains_literal "worktree add" "scripts/create_worktrees.sh" || {
    echo "scripts/create_worktrees.sh should manage worktrees" >&2
    exit 1
  }
fi

echo "Repo structure checks passed"
