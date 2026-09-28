/**
 * 发送已生成的简报邮件
 *
 * 用法：
 *   npm run send-email             # 发送当天 v2 公开简报
 *   npm run send-email 2026-09-29  # 发送指定日期
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { sendBriefingEmail, getEmailConfig } from '../services/email';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const targetDate = args[0] || new Date().toISOString().split('T')[0];

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║         📧 简报邮件发送工具                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // 检查邮件配置
  const emailConfig = getEmailConfig();
  if (!emailConfig.enabled) {
    console.log('⚠️  邮件发送未启用');
    console.log('   请在 .env 中设置 EMAIL_ENABLED=true');
    process.exit(0);
  }

  if (!emailConfig.smtp.pass || emailConfig.smtp.pass === '你的16位AppPassword') {
    console.error('❌ 邮件密码未配置');
    console.error('   请在 .env 中设置 EMAIL_SMTP_PASS');
    process.exit(1);
  }

  // v2 公开简报；私人简报只走 Telegram
  const outputDir = path.resolve(process.cwd(), 'output');
  const briefingPath = path.join(outputDir, `v2-public-${targetDate}.md`);

  if (!fs.existsSync(briefingPath)) {
    console.error(`❌ 未找到简报文件: v2-public-${targetDate}.md，请先运行 npm run v2`);
    process.exit(1);
  }

  console.log(`📄 简报文件: v2-public-${targetDate}.md`);
  console.log(`📧 收件人: ${emailConfig.to}\n`);

  const ok = await sendBriefingEmail(briefingPath);
  if (!ok) process.exit(1);
}

main().catch(console.error);
