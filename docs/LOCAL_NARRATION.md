# 本地双版本播报

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

同样输入复用稿件。--rewrite 强制重新改写；编辑 txt 后用 --stage=audio 可重新配音，未变的段落复用音频。更换参考录音或 TTS 模型实现后，删除该日对应 audio 缓存再重录。锁目录防止同日重复运行，记录 PID 后可以自动恢复已退出进程留下的锁；没有 PID 的旧锁需人工检查。

发送按音频内容指纹去重。如果请求中断而无法确认 Telegram 是否收到，会保留 .pending 标记并拒绝自动重发；先在聊天里检查，再决定是否移除该标记。

口播在初稿后增加独立的本机校订步骤，核对原文中的触发条件、失效信号、推断措辞并改善口语表达。程序同时校验字段、长度和明显异常。这不代表已独立核验金融事实或逐字识别音频。上线前应审稿、试听，确认观点没有漂移、传闻未变事实、数字读法准确。

## 迁移状态

2026-09-29 已从 GitHub Actions 缓存 v2-private-memory-36509159426 恢复 09-29 私人记忆。迁移使用一次性加密 artifact，本机解密，原记忆及迁移文件留在 output/migration-backup/recovery/；未在公开仓库提交私人数据。恢复工作流 run 36581702812，隔离分支不合并进 main。

用户已确认两份完整试听通过。09-28 公共音频已上传 Releases，并加入网站播放器。第二阶段已实现本地总控、逐步恢复、发送记录和 LaunchAgent；定时入口已安装，执行开关保持关闭。原云端每日任务仍运行。

**切换进度：** 用户已明确同意继续使用 Google Gemini 处理持仓及私人记忆。2026-09-29 本机完整分析和 PDF 生成已完成，正在完成口播配音与发布；成功后开启本地调度、移除云端生成。

## 每日运行与维护

```bash
npm run daily:local          # 运行今天全部步骤，成功步骤不重复
npm run v2 -- --resume       # 从第一个缺失的阶段缓存恢复
npm run deliver-daily -- --date=2026-09-29  # 私聊：摘要、公私 PDF、私人音频
npm run publish-narration -- --date=2026-09-29  # 只上传公开音频
npm run publish-daily -- --date=2026-09-29      # 只提交公开内容至 main
bash scripts/local-daily.sh status
bash scripts/local-daily.sh disable
# 切换完成后才启用：bash scripts/local-daily.sh enable
```

- 调度按新加坡时间周二至周六 07:00；每 15 分钟检查一次当天遗漏步骤。休眠后当天醒来可补跑，跨天不伪造历史行情。Mac 必须登录，任务运行时 caffeinate 阻止空闲休眠。
- 配置沿用项目 .env。LaunchAgent、日志、执行记录、发布 checkout 全部在 data/local-runner/；~/Library/LaunchAgents/ 只有 plist 符号链接。日志按天写入 logs/YYYY-MM-DD.log。
- data/local-runner/日期/state.json 记录 generate、narration、telegram、email、public-audio、website、complete；data/delivery/ 保存 Telegram 回执。
- Telegram 发给已配置的私人聊天。逐个文件去重，已成功的发送不重复。`.pending` 表示上次结果不确定，程序不会擅自重发。检查 TG 后，已送达的记录应转成同名 `.json` 回执，未送达才删除 `.pending`。邮件对应 email.pending / email.delivered。
- 切换当天若旧云端已发过摘要/PDF/邮件，在当天状态目录写入 legacy-documents-delivered.json，避免重复；私人音频仍正常发送。
- GitHub Releases 按月分组，文件名包含内容哈希。音频不进 Git 历史；页面通过原生播放器读取，默认不预加载。已确认音频地址支持 HTTP 206 和 Range，尚未逐一确认手机浏览器兼容性。
- 发布在独立 checkout 中进行，只暂存明确列出的公开文件。推送失败保留提交，下次先 rebase 后重试；若发布 checkout 留有未提交改动或冲突，须先检查处理。
- 简报分析仍沿用原模型配置；口播编辑使用本机 Ollama，声音生成使用 local-tts。首次试听有人工校订，后续自动稿件仍应观察质量。

## 首次验收（2026-09-28 材料）

本机 Ollama 已生成两份初稿；审稿发现公开稿有术语过密、传闻推断语气过强问题，私人稿过短。两份验收 txt 已人工校订，公开稿 909 字、私人稿 1263 字。自动提示词已加强，但后续自动稿质量仍需观察，不能把本次人工校订结果当成无人值守质量已验证。

通过正式 guige HTTP 音色生成：公开版 169.5 秒、私人版 238.6 秒。用户于 2026-09-29 确认两份试听均可用。第二阶段 TypeScript 编译和 Astro 160 页构建已完成；完整每日运行尚未完成。
