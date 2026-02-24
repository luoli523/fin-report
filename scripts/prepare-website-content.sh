#!/bin/bash
# prepare-website-content.sh
# Converts daily briefing output into Astro website content
#
# Usage:
#   ./scripts/prepare-website-content.sh <date> [output-dir] [website-dir]
#   ./scripts/prepare-website-content.sh 2026-01-28
#   ./scripts/prepare-website-content.sh 2026-01-28 ./output ./website

set -euo pipefail

DATE="${1:?Usage: $0 <YYYY-MM-DD> [output-dir] [website-dir]}"
OUTPUT_DIR="${2:-./output}"
WEBSITE_DIR="${3:-./website}"

BRIEFING_FILE="$OUTPUT_DIR/ai-briefing-${DATE}.md"
INFOGRAPHIC_FILE="$OUTPUT_DIR/ai-briefing-${DATE}-infographic.png"
SLIDES_DIR="$OUTPUT_DIR/ai-briefing-${DATE}-slide-deck"
CONTENT_DIR="$WEBSITE_DIR/src/content/reports"
IMAGES_DIR="$WEBSITE_DIR/public/images"

echo "=== Preparing website content for $DATE ==="

# Verify source exists
if [ ! -f "$BRIEFING_FILE" ]; then
  echo "ERROR: Briefing file not found: $BRIEFING_FILE"
  exit 1
fi

# Create directories
mkdir -p "$CONTENT_DIR"
mkdir -p "$IMAGES_DIR/infographics"

# --- Step 1: Extract description from markdown ---
export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8 2>/dev/null || true

# Take the first meaningful text after the ASCII header that isn't a heading or table
DESCRIPTION=$(grep -m 1 '^\*\*' "$BRIEFING_FILE" 2>/dev/null | cut -c 1-150 | sed 's/"/\\"/g' || true)

if [ -z "$DESCRIPTION" ]; then
  DESCRIPTION="AI Industry 每日简报 $DATE"
fi

# --- Step 2: Convert slide PDF to images if needed, then count ---
SLIDES_PDF="$OUTPUT_DIR/ai-briefing-${DATE}-slide-deck.pdf"

if [ -f "$SLIDES_PDF" ] && [ ! -d "$SLIDES_DIR" ]; then
  # PDF exists but no image directory — auto-convert
  if command -v pdftoppm &> /dev/null; then
    echo "  Converting slide PDF to images..."
    mkdir -p "$SLIDES_DIR"
    pdftoppm -png -r 200 "$SLIDES_PDF" "$SLIDES_DIR/slide"
    echo "  Converted $(find "$SLIDES_DIR" -maxdepth 1 -name "slide-*.png" | wc -l | tr -d ' ') slides from PDF"
  else
    echo "  WARNING: pdftoppm not found, cannot convert slide PDF"
    echo "  Install: brew install poppler (macOS) / apt-get install poppler-utils (Linux)"
  fi
fi

SLIDE_COUNT=0
HAS_SLIDES="false"
if [ -d "$SLIDES_DIR" ]; then
  PNG_COUNT=$(find "$SLIDES_DIR" -maxdepth 1 -name "slide-*.png" 2>/dev/null | wc -l | tr -d ' ')
  JPG_COUNT=$(find "$SLIDES_DIR" -maxdepth 1 -name "slide-*.jpg" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$PNG_COUNT" -gt 0 ]; then
    SLIDE_COUNT=$PNG_COUNT
    SLIDE_EXT="png"
  elif [ "$JPG_COUNT" -gt 0 ]; then
    SLIDE_COUNT=$JPG_COUNT
    SLIDE_EXT="jpg"
  fi
  if [ "$SLIDE_COUNT" -gt 0 ]; then
    HAS_SLIDES="true"
  fi
fi

# --- Step 3: Determine infographic path ---
INFOGRAPHIC_PATH=""
if [ -f "$INFOGRAPHIC_FILE" ]; then
  INFOGRAPHIC_PATH="/fin-report/images/infographics/${DATE}.webp"
fi

# --- Step 4: Generate frontmatter + content ---
# Strip the ASCII art header box (lines with box-drawing characters)
# Also strip leading empty lines after removal
BODY=$(sed '/^[╔╗╚╝║]/d' "$BRIEFING_FILE" | sed '/./,$!d')

cat > "$CONTENT_DIR/${DATE}.md" << FRONTMATTER
---
title: "AI Industry 每日简报 ${DATE}"
date: ${DATE}
dateStr: "${DATE}"
description: "${DESCRIPTION}"
infographic: "${INFOGRAPHIC_PATH}"
slideCount: ${SLIDE_COUNT}
hasSlides: ${HAS_SLIDES}
tags: ["AI", "finance", "market"]
---

${BODY}
FRONTMATTER

echo "  Content: $CONTENT_DIR/${DATE}.md"

# --- Step 5: Compress images ---
if [ -f "$INFOGRAPHIC_FILE" ] || [ "$HAS_SLIDES" = "true" ]; then
  if command -v cwebp &> /dev/null; then
    # Compress infographic
    if [ -f "$INFOGRAPHIC_FILE" ]; then
      DST="$IMAGES_DIR/infographics/${DATE}.webp"
      cwebp -q 65 -resize 1200 0 "$INFOGRAPHIC_FILE" -o "$DST" 2>/dev/null
      echo "  Infographic: $(du -h "$DST" | cut -f1)"
    fi

    # Compress slides (standardize naming to 2-digit padding for <100, 3-digit for >=100)
    if [ "$HAS_SLIDES" = "true" ]; then
      mkdir -p "$IMAGES_DIR/slides/${DATE}"
      PAD_LEN=2
      [ "$SLIDE_COUNT" -ge 100 ] && PAD_LEN=3
      IDX=0
      for src_img in $(ls "$SLIDES_DIR"/slide-*."$SLIDE_EXT" 2>/dev/null | sort); do
        [ -f "$src_img" ] || continue
        IDX=$((IDX + 1))
        DST_NAME=$(printf "slide-%0${PAD_LEN}d.webp" "$IDX")
        cwebp -q 70 -resize 1280 0 "$src_img" -o "$IMAGES_DIR/slides/${DATE}/${DST_NAME}" 2>/dev/null
      done
      COMPRESSED_COUNT=$(ls "$IMAGES_DIR/slides/${DATE}"/*.webp 2>/dev/null | wc -l | tr -d ' ')
      echo "  Slides: ${COMPRESSED_COUNT} compressed"
    fi
  else
    echo "  WARNING: cwebp not found. Install: brew install webp (macOS) / apt-get install webp (Linux)"
    echo "  Falling back to copying original images..."

    # Fallback: copy originals
    if [ -f "$INFOGRAPHIC_FILE" ]; then
      cp "$INFOGRAPHIC_FILE" "$IMAGES_DIR/infographics/${DATE}.png"
      # Update frontmatter to use PNG path
      sed -i.bak "s|${DATE}.webp|${DATE}.png|" "$CONTENT_DIR/${DATE}.md" && rm -f "$CONTENT_DIR/${DATE}.md.bak"
    fi

    if [ "$HAS_SLIDES" = "true" ]; then
      mkdir -p "$IMAGES_DIR/slides/${DATE}"
      for src_img in "$SLIDES_DIR"/slide-*."$SLIDE_EXT"; do
        [ -f "$src_img" ] || continue
        cp "$src_img" "$IMAGES_DIR/slides/${DATE}/"
      done
      # Update frontmatter slide format (SlideGallery expects .webp, need to handle)
      echo "  WARNING: Slides copied as $SLIDE_EXT (SlideGallery expects .webp - may need adjustment)"
    fi
  fi
fi

echo "=== Done: $DATE ==="
