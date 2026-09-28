#!/bin/bash
# prepare-website-content.sh
# 把 v2 公开简报转成 Astro 内容，并发布机器可读的静态文件供 bot 读取
#
# Usage:
#   ./scripts/prepare-website-content.sh <YYYY-MM-DD> [output-dir] [website-dir]

set -euo pipefail

DATE="${1:?Usage: $0 <YYYY-MM-DD> [output-dir] [website-dir]}"
OUTPUT_DIR="${2:-./output}"
WEBSITE_DIR="${3:-./website}"

PUBLIC_MD="$OUTPUT_DIR/v2-public-${DATE}.md"
BRIEF_MD="$OUTPUT_DIR/v2-infographic-brief-${DATE}.md"
CONTENT_DIR="$WEBSITE_DIR/src/content/reports"
BRIEFINGS_DIR="$WEBSITE_DIR/public/briefings"

echo "=== Preparing website content for $DATE ==="

if [ ! -f "$PUBLIC_MD" ]; then
  echo "ERROR: public briefing not found: $PUBLIC_MD"
  exit 1
fi

mkdir -p "$CONTENT_DIR" "$BRIEFINGS_DIR/$DATE" "$WEBSITE_DIR/public/images/infographics"

export LC_ALL=C.UTF-8 2>/dev/null || export LC_ALL=en_US.UTF-8 2>/dev/null || true

# 描述取"一句话"那一行
DESCRIPTION=$(grep -m 1 '^\*\*一句话\*\*' "$PUBLIC_MD" | sed 's/^\*\*一句话\*\*: *//' | cut -c 1-160 | sed 's/"/\\"/g' || true)
[ -z "$DESCRIPTION" ] && DESCRIPTION="全球宏观 × AI 产业链 每日简报 $DATE"

# 正文去掉第一行 H1（页面已有标题）
BODY=$(sed '1{/^# /d;}' "$PUBLIC_MD" | sed '/./,$!d')

cat > "$CONTENT_DIR/${DATE}.md" << FRONTMATTER
---
title: "全球宏观 × AI 每日简报 ${DATE}"
date: ${DATE}
dateStr: "${DATE}"
description: "${DESCRIPTION}"
tags: ["macro", "AI", "finance"]
---

${BODY}
FRONTMATTER
echo "  Content: $CONTENT_DIR/${DATE}.md"

# 机器可读文件：bot 读 latest.json → brief.md
cp "$PUBLIC_MD" "$BRIEFINGS_DIR/$DATE/public.md"
[ -f "$BRIEF_MD" ] && cp "$BRIEF_MD" "$BRIEFINGS_DIR/$DATE/brief.md"
cat > "$BRIEFINGS_DIR/latest.json" << JSON
{
  "date": "${DATE}",
  "page": "https://luoli523.github.io/fin-report/reports/${DATE}/",
  "public_md": "https://luoli523.github.io/fin-report/briefings/${DATE}/public.md",
  "brief_md": "https://luoli523.github.io/fin-report/briefings/${DATE}/brief.md",
  "infographic_upload_path": "website/public/images/infographics/${DATE}.png",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
echo "  Briefings: $BRIEFINGS_DIR/$DATE/ + latest.json"
echo "=== Done: $DATE ==="
