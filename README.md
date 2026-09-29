# 全球宏观 × AI 产业链 每日简报

每天美股收盘后自动生成的投资简报。先看整个世界（利率、美元、信用、波动率、商品、全球股指、地缘、供应链），再落到 AI 产业链关注列表，最后单独为持仓人生成一份私密的组合简报。

- 公开简报：站点 https://luoli523.github.io/fin-report/ · 邮件 · Telegram PDF
- 私人组合简报：只通过 Telegram 发 PDF，不进仓库，不进 CI artifact
- 每日新加坡时间 09:30 由 GitHub Actions 运行

## 流水线

```
世界快照 59 个宏观标的 ──┐
关注列表行情 60 只 ───────┤
信息流 45 个 RSS + Finnhub ┼─→ 异常检测(z-score) ─→ 分级 LLM ─→ Tavily 研究 ─→ 世界观 LLM ─┬─→ 关注列表 LLM ─→ 公开简报 md/pdf
财报日历 ─────────────────┘                                                              └─→ 持仓 LLM ─→ 私人简报 pdf
```

每个 LLM 步骤用哪个模型在 `config/llm-profiles.json` 里配置，密钥从环境变量读。默认全部 `gemini-3.8-flash`，一天成本几美分。

跨日记忆分两份：`data/memory/public.json`（论点、regime，提交进仓库）和 `data/memory/private.json`（对持仓的可验证判断与记分，不提交，CI 用 actions/cache 持久化）。异常检测的历史样本在 `data/history/world/`，需要累积 15 天后 z-score 才生效。

## 运行

```bash
cp .env.example .env            # 填密钥
npm install
npm run v2                      # 跑今天，产物在 output/
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

只有 portfolio 步骤能看到它。公开简报在代码层面接触不到持仓，渲染后还会再过一遍脱敏。

## 本地播报（验收阶段）

`npm run narrate -- --date=YYYY-MM-DD` 从已有同日公私简报生成口播稿，并调用本机 `local-tts` 的 `guige` 音色配音。新增口播编辑使用本机 Ollama。可用 `--stage=script` 先生成并审稿，再用 `--stage=audio` 配音；`npm run send-narration -- --date=YYYY-MM-DD` 将两份试听发送到配置的 Telegram 私聊。

运行要求、缓存恢复与迁移状态见 [docs/LOCAL_NARRATION.md](docs/LOCAL_NARRATION.md)。当前仍保留云端每日生成任务，尚未切换定时或公开发布音频。

## 信息图

流水线每天产出 `output/v2-infographic-brief-<日期>.md` 并发布到站点 `briefings/<日期>/brief.md`。bot 读它生成信息图，再用 GitHub Contents API 把 PNG 提交到 `website/public/images/infographics/<日期>.png`，站点自动重建。完整接口见 [docs/BOT_INTEGRATION.md](docs/BOT_INTEGRATION.md)。

手动兜底：`npm run v2:attach-image -- pic.png [日期]` 然后 push。

## 部署

GitHub Secrets 与 `.env.example` 同名。`scripts/setup-github-secrets.sh` 可以把本地 `.env` 一键写入 Secrets。

- `daily-briefing.yml`：每日流水线 + 发送 + 站点构建部署
- `site-rebuild.yml`：信息图或站点源码被推送时只重建站点

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
