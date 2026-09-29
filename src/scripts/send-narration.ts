import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { todayInReportTZ } from '../pipeline/dates';

dotenv.config({quiet:true});
const date = process.argv.find(a=>a.startsWith('--date='))?.slice(7) || todayInReportTZ();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
const api = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
async function call(method: string, body: FormData | URLSearchParams) {
  const r = await fetch(`${api}/${method}`,{method:'POST',body,signal:AbortSignal.timeout(120000)});
  const j = await r.json() as any;
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.error_code}`);
  return j.result;
}
async function main() {
  if (process.env.TELEGRAM_ENABLED !== 'true' || !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) throw new Error('Telegram not configured');
  const chat = await call('getChat',new URLSearchParams({chat_id:process.env.TELEGRAM_CHAT_ID}));
  if (chat.type !== 'private') throw new Error('Narration preview requires a private Telegram chat');
  const dir = path.resolve('data/narration',date);fs.mkdirSync(dir,{recursive:true});
  const lock=path.join(dir,'.send-lock');
  try {fs.mkdirSync(lock);} catch {throw new Error('Another delivery may be running; inspect .send-lock');}
  try {
    for (const audience of ['public','private']) {
      const file = path.resolve('output',`v2-${audience}-narration-${date}.mp3`);
      const bytes = fs.readFileSync(file);
      const digest = crypto.createHash('sha256').update(bytes).digest('hex');
      const receipt = path.join(dir,`${audience}-telegram-${digest}.json`);
      if (fs.existsSync(receipt)) {console.log(`${audience}: already delivered`);continue;}
      const uncertain = receipt + '.pending';
      if(fs.existsSync(uncertain)) throw new Error('Previous delivery outcome unknown; check Telegram before clearing pending marker');
      const form = new FormData();
      form.append('chat_id',process.env.TELEGRAM_CHAT_ID!);
      form.append('audio',new Blob([bytes],{type:'audio/mpeg'}),path.basename(file));
      form.append('title',`${audience==='public'?'公开':'私人'}投资播报 · ${date} · 验收试听`);
      form.append('performer','鬼哥 · 经本人授权的 AI 克隆配音');
      form.append('caption',`${audience==='public'?'公开版样稿（尚未发布网站）':'私人持仓版'}｜${date}\n本机改稿和配音，用于验收完整播报。历史样稿，不是今天的行情更新。`);
      fs.writeFileSync(uncertain,JSON.stringify({startedAt:new Date().toISOString()}),{mode:0o600});
      const msg=await call('sendAudio',form);
      fs.writeFileSync(receipt,JSON.stringify({messageId:msg.message_id,date:msg.date,audioHash:digest},null,2),{mode:0o600});
      fs.unlinkSync(uncertain);
      console.log(`${audience}: delivered message=${msg.message_id} duration=${msg.audio?.duration}`);
    }
  } finally {fs.rmdirSync(lock);}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
