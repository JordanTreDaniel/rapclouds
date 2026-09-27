#!/usr/bin/env bash
# Run all shark-finder smoke tests for rapclouds
# Usage: bash routines/run-all.sh [TARGET_URL]
set -euo pipefail

export TARGET_URL="${1:-http://localhost:8000}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "╔══════════════════════════════════════════╗"
echo "║  RapClouds Shark-Finder Smoke Tests      ║"
echo "║  Target: $TARGET_URL"
echo "╚══════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0
TOTAL=0

run_test() {
  local name="$1"
  local file="$2"
  TOTAL=$((TOTAL + 1))
  echo "━━━ [$TOTAL] $name ━━━"
  if npx tsx "$DIR/$file"; then
    PASSED=$((PASSED + 1))
    echo ""
  else
    FAILED=$((FAILED + 1))
    echo ""
  fi
}

run_test "Word Cloud" "wordcloud-smoke-test.ts"
run_test "Karaoke"    "karaoke-smoke-test.ts"
run_test "Admin"      "admin-smoke-test.ts"

echo "╔══════════════════════════════════════════╗"
echo "║  FINAL: $PASSED/$TOTAL passed, $FAILED failed"
echo "╚══════════════════════════════════════════╝"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
