#!/bin/bash
#
# 导出 NotebookLM 认证信息用于 GitHub Actions
#
# 用法:
#   ./scripts/export-notebooklm-auth.sh
#
# 然后将输出的 base64 字符串添加到 GitHub Secrets:
#   Settings → Secrets and variables → Actions → New repository secret
#   Name: NOTEBOOKLM_STORAGE_STATE
#   Value: <粘贴 base64 字符串>
#

DEFAULT_PROFILE_STORAGE_FILE="$HOME/.notebooklm/profiles/default/storage_state.json"
LEGACY_STORAGE_FILE="$HOME/.notebooklm/storage_state.json"
NOTEBOOKLM_CMD="notebooklm"

if [ -x ".venv/bin/notebooklm" ]; then
    NOTEBOOKLM_CMD=".venv/bin/notebooklm"
fi

if [ -f "$DEFAULT_PROFILE_STORAGE_FILE" ]; then
    STORAGE_FILE="$DEFAULT_PROFILE_STORAGE_FILE"
else
    STORAGE_FILE="$LEGACY_STORAGE_FILE"
fi

echo "================================================"
echo "  NotebookLM 认证导出工具"
echo "================================================"
echo ""

# 检查文件是否存在
if [ ! -f "$STORAGE_FILE" ]; then
    echo "❌ 错误: 认证文件不存在"
    echo "   已检查:"
    echo "   - $DEFAULT_PROFILE_STORAGE_FILE"
    echo "   - $LEGACY_STORAGE_FILE"
    echo ""
    echo "请先运行以下命令完成认证:"
    echo "   notebooklm login"
    echo "   # 如果默认 Chromium 启动失败:"
    echo "   notebooklm login --browser chrome"
    exit 1
fi

# 检查认证是否有效
echo "🔍 检查认证状态..."
if ! "$NOTEBOOKLM_CMD" list --json >/dev/null 2>&1; then
    echo "❌ 错误: NotebookLM 认证已过期"
    echo ""
    echo "请重新运行:"
    echo "   $NOTEBOOKLM_CMD login"
    echo "   # 如果默认 Chromium 启动失败:"
    echo "   $NOTEBOOKLM_CMD login --browser chrome"
    exit 1
fi

echo "✅ 认证有效"
echo ""

# 导出 base64
echo "📦 导出认证信息..."
echo "   使用认证文件: $STORAGE_FILE"
echo ""
echo "================================================"
echo "  将以下内容添加到 GitHub Secrets"
echo "  Name: NOTEBOOKLM_STORAGE_STATE"
echo "================================================"
echo ""

# 根据系统选择 base64 命令
if [[ "$OSTYPE" == "darwin"* ]]; then
    cat "$STORAGE_FILE" | base64
else
    cat "$STORAGE_FILE" | base64 -w 0
fi

echo ""
echo ""
echo "================================================"
echo "  配置步骤:"
echo "  1. 复制上面的 base64 字符串"
echo "  2. 打开 GitHub 仓库 Settings"
echo "  3. 进入 Secrets and variables → Actions"
echo "  4. 点击 New repository secret"
echo "  5. Name: NOTEBOOKLM_STORAGE_STATE"
echo "  6. Value: 粘贴 base64 字符串"
echo "  7. 点击 Add secret"
echo "================================================"
echo ""
echo "⚠️  注意: 认证信息可能会过期，届时需要重新导出"
