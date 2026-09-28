# Bot 接入：读简报、回传信息图

站点是 GitHub Pages 静态站，bot 只需要两次 HTTP 调用：读靠站点静态文件，写靠 GitHub Contents API。

## 1. 读今天的简报（无需凭证）

```
GET https://luoli523.github.io/fin-report/briefings/latest.json
```

返回：

```json
{
  "date": "2026-09-29",
  "page": "https://luoli523.github.io/fin-report/reports/2026-09-29/",
  "public_md": "https://luoli523.github.io/fin-report/briefings/2026-09-29/public.md",
  "brief_md": "https://luoli523.github.io/fin-report/briefings/2026-09-29/brief.md",
  "infographic_upload_path": "website/public/images/infographics/2026-09-29.png",
  "generated_at": "2026-09-29T01:45:00Z"
}
```

- `brief_md` 是专为信息图准备的精简文案（结论、主线、盲区、机会、点位），优先用它。
- `public_md` 是完整公开简报，需要更多上下文时再拉。
- 每天新加坡时间 09:30 左右生成，约 10 分钟后上线。bot 可在 10:00 拉取。

## 2. 回传信息图（一次 PUT）

用 GitHub Contents API 把 PNG 提交到 `infographic_upload_path`。页面构建时按 `<日期>.png` 约定自动找图，不需要改任何其他文件。

```
PUT https://api.github.com/repos/luoli523/fin-report/contents/website/public/images/infographics/2026-09-29.png
Authorization: Bearer <FINE_GRAINED_PAT>
Accept: application/vnd.github+json
Content-Type: application/json

{
  "message": "chore: add infographic 2026-09-29",
  "content": "<PNG 的 base64>",
  "branch": "main"
}
```

- 同一天重传：先 `GET` 同一路径拿到现有文件的 `sha`，PUT 时带上 `"sha": "<sha>"`。
- 文件大小上限 100 MB，建议压到 2 MB 以内。支持 `.png` / `.webp` / `.jpg`。
- 推送后 `Rebuild Site` workflow 自动触发，两三分钟后图出现在文章顶部和首页卡片。

### PAT 权限

GitHub → Settings → Developer settings → Fine-grained tokens：

- Repository access: 只选 `luoli523/fin-report`
- Permissions → Repository permissions → Contents: **Read and write**
- 其他全部 No access

## 3. 手动兜底

没有 bot 时可以本地挂图：

```bash
npm run v2:attach-image -- ~/Downloads/infographic.png 2026-09-29
git add website/public/images/infographics && git commit -m "chore: add infographic 2026-09-29" && git push
```
