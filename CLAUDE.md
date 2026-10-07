# CLAUDE.md

给 AI 会话读的项目约束。

## 站点地址（2026-10-07 起）

本仓库的 GitHub Pages 站点发布在 **https://guige.ai/fin-report/**。

`guige.ai` 只绑定在用户站点仓库 `luoli523.github.io` 上，本账号下所有 Pages 项目站
**自动跟随**同域子路径，所以本仓库不需要、也不要加自己的 CNAME 文件（加了会被摘出统一域）。
旧地址 `luoli523.github.io/fin-report/` 由 GitHub 自动 301。

- 新内容里不要再写 `luoli523.github.io` 地址，一律用 `guige.ai`
- `website/astro.config.mjs` 的 `base: '/fin-report'` 是相对路径，不要改成绝对 URL。
- **不要改动已发布页面的 URL 路径** —— Waline 的评论和阅读量按路径存，改路径等于丢数据
- 历史内容里的旧域链接没有批量改写，靠 301 兜底，不要为此发起大规模替换

完整域名拓扑（DNS 记录、回滚方式、加新站怎么做）见主站 [docs/DOMAIN.md](https://github.com/luoli523/luoli523.github.io/blob/master/docs/DOMAIN.md)
