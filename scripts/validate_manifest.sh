#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_cmd jq

jq empty "${LABELS_FILE}"
jq empty "${MILESTONES_FILE}"
jq empty "${ISSUES_FILE}"

jq -e 'map(.name) | length == (unique | length)' "${LABELS_FILE}" >/dev/null
jq -e 'map(.title) | length == (unique | length)' "${MILESTONES_FILE}" >/dev/null
jq -e 'map(.title) | length == (unique | length)' "${ISSUES_FILE}" >/dev/null

jq -e --slurpfile milestones "${MILESTONES_FILE}" '
  ($milestones[0] | map(.title)) as $valid_milestones
  | all(.[]; . as $issue | ($valid_milestones | index($issue.milestone)) != null)
' "${ISSUES_FILE}" >/dev/null

jq -e --slurpfile labels "${LABELS_FILE}" '
  ($labels[0] | map(.name)) as $valid_labels
  | all(.[]; . as $issue | ($valid_labels | index("type: " + $issue.type)) != null)
  and all(.[]; . as $issue | ($valid_labels | index("area: " + $issue.area)) != null)
  and all(.[]; . as $issue | ($valid_labels | index("priority: " + $issue.priority)) != null)
' "${ISSUES_FILE}" >/dev/null

jq -e '
  all(.[]; (.body_lines | type) == "array" and (.body_lines | length) > 0)
' "${ISSUES_FILE}" >/dev/null

printf 'Validated manifests: %s labels, %s milestones, %s issues\n' \
  "$(json_count "${LABELS_FILE}")" \
  "$(json_count "${MILESTONES_FILE}")" \
  "$(json_count "${ISSUES_FILE}")"
