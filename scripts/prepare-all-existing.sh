#!/bin/bash
# prepare-all-existing.sh
# One-time script to migrate all existing reports to website content
#
# Usage:
#   ./scripts/prepare-all-existing.sh [output-dir] [website-dir]
#   ./scripts/prepare-all-existing.sh
#   ./scripts/prepare-all-existing.sh ./output ./website

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${1:-./output}"
WEBSITE_DIR="${2:-./website}"

echo "=== Batch processing all existing reports ==="
echo "  Source: $OUTPUT_DIR"
echo "  Target: $WEBSITE_DIR"
echo ""

COUNT=0
for briefing in "$OUTPUT_DIR"/ai-briefing-????-??-??.md; do
  [ -f "$briefing" ] || continue
  # Extract date from filename
  DATE=$(basename "$briefing" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
  if [ -n "$DATE" ]; then
    bash "$SCRIPT_DIR/prepare-website-content.sh" "$DATE" "$OUTPUT_DIR" "$WEBSITE_DIR"
    COUNT=$((COUNT + 1))
    echo ""
  fi
done

echo "=== Processed $COUNT reports ==="
