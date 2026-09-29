# 本地双版本播报（第一阶段）

生成程序在 Mac 上运行；分析流水线暂时保留原有模型配置。新增口播编辑使用本机 Ollama，配音使用独立 local-tts 的 guige 克隆音色。公开稿只读取公开 Markdown，私人稿读取同日公私 Markdown。

## 使用

```bash
npm run v2
npm run narrate
# 用已有同日期简报试运行
npm run narrate -- --date=2026-09-28
# 分开执行：先审稿，后配音
npm run narrate -- --date=2026-09-28 --stage=script
npm run narrate -- --date=2026-09-28 --stage=audio
# 指定 public 或 private；默认 both
npm run narrate -- --date=2026-09-28 --audience=private
# 将两份验收试听发到已配置的 Telegram 私聊
npm run send-narration -- --date=2026-09-28
```

不要用历史日期重新采集当天行情。历史验收使用该日已经保存的简报。

依赖：本机 Ollama 中的 qwen3.8:27b-mlx；local-tts 在 127.0.0.1:8091 运行并支持 guige；PATH 可找到 ffmpeg、ffprobe。
配置：config/llm-profiles.json 的 narration_public/narration_private。私人稿必须使用 Ollama。TTS_BASE_URL 默认 http://127.0.0.1:8091/v1/，TTS_VOICE 默认 guige，TTS_SPEED 默认 1。

## 产物与恢复

- output/v2-public-narration-日期.txt/mp3/json：公开稿、音频、元数据。
- output/v2-private-narration-日期.txt/mp3/json：私人产物，不能发布到网站或公开仓库。
- data/narration/日期/：提示词/材料指纹、稿件缓存、逐段音频（全部 gitignore）。

同样输入复用稿件。--rewrite 强制重新改写；编辑 txt 后用 --stage=audio 可重新配音，未变的段落复用音频。更换参考录音或 TTS 模型实现后，删除该日对应 audio 缓存再重录。锁目录防止同日重复运行，进程被强杀后需确认已无运行任务再移除 .lock。

发送按音频内容指纹去重。如果请求中断而无法确认 Telegram 是否收到，会保留 .pending 标记并拒绝自动重发；先在聊天里检查，再决定是否移除该标记。

这里只校验字段、长度和明显异常，不代表已核验金融事实或逐字识别音频。上线前应审稿、试听，确认观点没有漂移、传闻未变事实、数字读法准确。

## 迁移状态

2026-09-29 本地公开记忆更新到 09-29，私人记忆到 09-28。已备份到 output/migration-backup/。
GitHub Actions 中存在更晚的私人记忆缓存 v2-private-memory-36509159426（09-29）。正式切换前需恢复该版本；不得用本地较旧记忆覆盖它。现阶段不停止云端每日任务。

第一阶段只生成本地稿件与音频。网站播放器、公开音频托管、发送去重、本地定时、停用云端生成属于第二阶段，待两份完整试听验收后实施。

## 首次验收（2026-09-28 材料）

本机 Ollama 已生成两份初稿；审稿发现公开稿有术语过密、传闻推断语气过强问题，私人稿过短。两份验收 txt 已人工校订，公开稿 909 字、私人稿 1263 字。自动提示词已加强，但后续自动稿质量仍需观察，不能把本次人工校订结果当成无人值守质量已验证。

通过正式 guige HTTP 音色生成：公开版 169.5 秒、私人版 238.6 秒。TypeScript 类型检查、服务 Python 语法检查、两份 MP3 整文件解码均通过；逐字漏读和音色自然度等待用户试听。
