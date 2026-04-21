#!/usr/bin/env bash
# Smoke test: every minigame's index.html + game.mjs returns 200 and expected content.
set -u
BASE="${BASE:-http://localhost:8765/apps/minigames}"
SLUGS=(
  lane-runner sign-smash lightning-strike
  asteroid-answer flappy-signal sign-slicer
  brake-or-floor-it plinko-test traffic-tinder
  crossing-guard rhythm-road tetris-quiz
  parking-lot pong-prompts piano-tiles
  frogger-crossing archery answer-boxing
)

fail=0
check() {
  local url="$1" expect="$2" label="$3"
  local code body
  code=$(curl -so /tmp/smoke_body -w '%{http_code}' "$url")
  body=$(cat /tmp/smoke_body)
  if [ "$code" != "200" ]; then
    echo "FAIL $label (HTTP $code) $url"
    fail=$((fail+1))
    return
  fi
  if [ -n "$expect" ] && ! grep -q "$expect" /tmp/smoke_body; then
    echo "FAIL $label (missing '$expect') $url"
    fail=$((fail+1))
    return
  fi
  echo "OK   $label"
}

check "$BASE/" "Autoescuela Arcade" "hub"
check "$BASE/core/quiz-core.mjs" "createQuiz" "core/quiz-core.mjs"
check "$BASE/core/juice.mjs" "beepCorrect" "core/juice.mjs"
check "$BASE/core/shared.css" "neon-cyan" "core/shared.css"
check "$BASE/data/questions.json" '"choices"' "data/questions.json"
check "$BASE/picker.mjs" "cyclePick" "picker.mjs"

for slug in "${SLUGS[@]}"; do
  check "$BASE/$slug/" "<canvas\\|<script\\|<html" "$slug/index.html"
  check "$BASE/$slug/game.mjs" "quiz" "$slug/game.mjs"
done

echo
if [ "$fail" = "0" ]; then
  echo "✓ All checks passed (${#SLUGS[@]} games + core)"
  exit 0
else
  echo "✗ $fail checks failed"
  exit 1
fi
