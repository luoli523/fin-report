/**
 * 发送简报到 Telegram
 * 
 * 使用方式:
 *   npm run send-telegram             # 发送当天 v2 简报（摘要 + 公开 PDF + 私人 PDF）
 *   npm run send-telegram 2026-09-29  # 发送指定日期
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { getTelegramConfig, sendTelegramMessage, sendBriefingDocument } from '../services/telegram';
import { todayInReportTZ } from '../pipeline/dates';

dotenv.config();

async function main() {
  console.log('\n📱 Telegram 简报发送\n');

  // 获取配置
  const config = getTelegramConfig();
  
  if (!config.enabled) {
    console.log('⚠️  Telegram 发送未启用');
    console.log('   请在 .env 文件中设置:');
    console.log('   TELEGRAM_ENABLED=true');
    console.log('   TELEGRAM_BOT_TOKEN=your_bot_token');
    console.log('   TELEGRAM_CHAT_ID=your_chat_id');
    console.log('\n   详见 README.md 中的 Telegram 配置说明');
    process.exit(0);
  }

  const targetDate = process.argv[2] || todayInReportTZ();
  const outputDir = path.resolve(process.cwd(), 'output');
  const publicMd = path.join(outputDir, `v2-public-${targetDate}.md`);

  if (!fs.existsSync(publicMd)) {
    console.error(`❌ 未找到 ${targetDate} 的公开简报，请先运行 npm run v2`);
    process.exit(1);
  }
  console.log(`📱 Chat ID: ${config.chatId}\n`);

  // 1. 短文本：regime + 一句话
  const md = fs.readFileSync(publicMd, 'utf-8');
  const regime = (md.match(/^> \*\*Regime\*\*: (.+)$/m)?.[1] || '').replace(/\*\*/g, '');
  const oneLiner = md.match(/^\*\*一句话\*\*: (.+)$/m)?.[1] || '';
  const text = [`🌍 全球宏观 × AI 简报 ${targetDate}`, regime ? `Regime: ${regime}` : '', '', oneLiner, '', `https://luoli523.github.io/fin-report/reports/${targetDate}/`].join('\n');
  console.log((await sendTelegramMessage(text)) ? '✅ 摘要已发送' : '⚠️  摘要发送失败');

  // 2. 公开简报 PDF
  const publicPdf = path.join(outputDir, `v2-public-${targetDate}.pdf`);
  if (fs.existsSync(publicPdf)) {
    console.log((await sendBriefingDocument(publicPdf, `🌍 全球宏观 × AI 简报 ${targetDate}`)) ? '✅ 公开简报 PDF 已发送' : '⚠️  公开简报 PDF 发送失败');
  }

  // 3. 私人组合简报 PDF（只走 Telegram）
  const privatePdf = path.join(outputDir, `v2-private-${targetDate}.pdf`);
  if (fs.existsSync(privatePdf)) {
    console.log((await sendBriefingDocument(privatePdf, `🔒 私人组合简报 ${targetDate}（请勿转发）`)) ? '✅ 私人简报 PDF 已发送' : '⚠️  私人简报 PDF 发送失败');
  } else {
    console.log('ℹ️  无私人简报（未配置持仓）');
  }

  console.log('\n📱 Telegram 发送流程完成\n');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
