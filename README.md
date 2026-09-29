# 全球宏观 × AI 产业链 每日简报

每天美股收盘后自动生成的投资简报。先看整个世界（利率、美元、信用、波动率、商品、全球股指、地缘、供应链），再落到 AI 产业链关注列表，最后单独为持仓人生成一份私密的组合简报。

- 公开简报：站点 https://luoli523.github.io/fin-report/ · 邮件 · Telegram PDF
- 私人组合简报：通过 Telegram 发 PDF 和本人声音播报；报告与记忆不进 GitHub
- 新加坡时间周二至周六 07:00 在 Mac 本地运行；GitHub 负责公共托管、网站构建与信息图通知

## 流水线

```
世界快照 59 个宏观标的 ──┐
关注列表行情 60 只 ───────┤
信息流 45 个 RSS + Finnhub ┼─→ 异常检测(z-score) ─→ 分级 LLM ─→ Tavily 研究 ─→ 世界观 LLM ─┬─→ 关注列表 LLM ─→ 公开简报 md/pdf
财报日历 ─────────────────┘                                                              └─→ 持仓 LLM ─→ 私人简报 pdf
```

每个 LLM 步骤用哪个模型在 `config/llm-profiles.json` 里配置，密钥从环境变量读。分析及口播校订默认 `gemini-3.8-flash`，口播初稿使用本机 Ollama，配音使用本机 Qwen3-TTS。

跨日记忆分两份：`data/memory/public.json`（论点、regime，提交进仓库）和 `data/memory/private.json`（对持仓的可验证判断与记分，只保存在本机，不提交）。异常检测的历史样本在 `data/history/world/`，需要累积 15 天后 z-score 才生效。

## 运行

```bash
cp .env.example .env            # 填密钥
npm install
npm run daily                   # 本地完整流程：简报、播报、发送、公共发布
npm run v2                      # 只生成今天简报，产物在 output/
npm run v2 -- --from=synthesis  # 复用 data/v2/<日期>/ 缓存，从某阶段重跑
npm run send-telegram           # 摘要 + 公开 PDF + 私人 PDF
npm run send-email              # 公开简报
```

阶段：`snapshot | feeds | detect | triage | research | synthesis | watchlist | portfolio | render`。

### 切换模型

```bash
LLM_STEP_SYNTHESIS=claude npm run v2 -- --from=synthesis
```

可用 profile 见 `config/llm-profiles.json`（flash / claude / gpt / grok）。

### 持仓

`HOLDINGS_JSON` 环境变量或 `data/private/holdings.json`：

```json
[{"ticker":"NVDA","tier":"core","costBasis":178.99},{"ticker":"SMCI","tier":"satellite"}]
```

原始持仓用于 portfolio 分析；私人简报随后用于私人口播改写与校订。Gemini 会处理用户已授权的私人分析材料。公开口播只读取公开简报，公共发布仅暂存明确列出的公开文件。

## 本地播报

`npm run narrate -- --date=YYYY-MM-DD` 从已有同日公私简报生成口播稿，并调用本机 `local-tts` 的 `guige` 音色配音。口播初稿使用本机 Ollama，终审校订使用已获授权的 Gemini。可用 `--stage=script` 先生成并审稿，再用 `--stage=audio` 配音；`npm run send-narration -- --date=YYYY-MM-DD` 将两份试听发送到配置的 Telegram 私聊。

两份试听已验收通过，公开音频通过 GitHub Releases 托管，报告页已接入播放器。`npm run daily:local` 串联本机生成、配音、私人 TG 发送和公共发布，支持按步骤续跑。

运行要求、缓存恢复与迁移状态见 [docs/LOCAL_NARRATION.md](docs/LOCAL_NARRATION.md)。本地全流程已于 2026-09-29 跑通并启用定时，原云端每日生成任务已停用，旧私人记忆缓存已清理。

## 信息图

流水线每天产出 `output/v2-infographic-brief-<日期>.md` 并发布到站点 `briefings/<日期>/brief.md`。bot 读它生成信息图，再用 GitHub Contents API 把 PNG 提交到 `website/public/images/infographics/<日期>.png`，站点自动重建。完整接口见 [docs/BOT_INTEGRATION.md](docs/BOT_INTEGRATION.md)。

手动兜底：`npm run v2:attach-image -- pic.png [日期]` 然后 push。

## 部署

分析 API、持仓、Telegram 和邮件配置保存在本地 `.env`。GitHub 仅需站点发布权限，以及可选的信息图 webhook 两项 Secrets。

- `scripts/local-daily.sh`：管理 Mac 的每日任务，状态和日志位于 `data/local-runner/`
- `site-rebuild.yml`：公共内容推送后构建网站；新简报部署后通知信息图 bot

## 目录

```
src/collectors/   world-snapshot（宏观标的）、watchlist-quotes（关注列表行情）、yahoo-client
src/pipeline/     feeds、detect、triage、research、synthesize、earnings、holdings、memory、pdf
src/llm/          多模型注册表
src/generators/   公开 / 私密 / 信息图文案渲染
src/config/       world-symbols、feeds、MONITORED_SYMBOLS（关注列表）
prompts/          v2-triage / v2-synthesis / v2-watchlist / v2-portfolio
website/          Astro 静态站
```

免责声明：本项目输出仅供参考，不构成投资建议。
