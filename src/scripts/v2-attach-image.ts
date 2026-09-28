/**
 * 把手工生成的信息图（如用 Grok 生成）挂到当日简报上
 *
 * 用法:
 *   npm run v2:attach-image -- <图片路径> [日期]
 *
 * 做三件事:
 *   1. 复制到 output/v2-briefing-<日期>-infographic.<ext>
 *   2. 复制到 website/public/images/infographics/<日期>.<ext>（页面按文件名约定自动找图）
 *   3. 若 Telegram 已启用，把图发到 Telegram
 * 之后 git commit + push，下次网站构建就会带上这张图。
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { getTelegramConfig, sendTelegramPhoto } from '../services/telegram';

dotenv.config();

async function main() {
  const [src, dateArg] = process.argv.slice(2);
  if (!src || !fs.existsSync(src)) {
    console.error('用法: npm run v2:attach-image -- <图片路径> [YYYY-MM-DD]');
    process.exit(1);
  }
  const date = dateArg || new Date().toISOString().slice(0, 10);
  const ext = path.extname(src).toLowerCase().replace('.', '') || 'png';
  const root = process.cwd();

  const outDst = path.join(root, 'output', `v2-briefing-${date}-infographic.${ext}`);
  fs.mkdirSync(path.dirname(outDst), { recursive: true });
  fs.copyFileSync(src, outDst);
  console.log(`✅ ${outDst}`);

  const webImg = path.join(root, 'website/public/images/infographics', `${date}.${ext}`);
  fs.mkdirSync(path.dirname(webImg), { recursive: true });
  fs.copyFileSync(src, webImg);
  console.log(`✅ ${webImg}`);

  if (getTelegramConfig().enabled) {
    const ok = await sendTelegramPhoto(outDst, `📊 ${date} 信息图`);
    console.log(ok ? '✅ 已发送到 Telegram' : '⚠️ Telegram 发送失败');
  }

  console.log('\n下一步: git add website/ && git commit -m "chore: add infographic ' + date + '" && git push');
}

main().catch(e => { console.error(e); process.exit(1); });
