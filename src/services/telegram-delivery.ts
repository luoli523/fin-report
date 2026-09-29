import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export async function telegramCall(method: string, body: FormData | URLSearchParams) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method:'POST', body, signal:AbortSignal.timeout(120000),
  });
  const json = await r.json() as {ok:boolean; error_code?:number; result:any};
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.error_code}`);
  return json.result;
}

export async function requirePrivateChat() {
  if (process.env.TELEGRAM_ENABLED !== 'true' || !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) throw new Error('Telegram not configured');
  const chat = await telegramCall('getChat',new URLSearchParams({chat_id:process.env.TELEGRAM_CHAT_ID}));
  if (chat.type !== 'private') throw new Error('Delivery requires a private Telegram chat');
}

// Telegram has no idempotency key: an ambiguous response requires checking the
// chat manually. Never blindly retry a request that might already have arrived.
export async function deliverOnce(date: string, name: string, payload: Buffer | string, method: string, form: FormData) {
  const digest = crypto.createHash('sha256').update(process.env.TELEGRAM_CHAT_ID!).update(payload).digest('hex');
  const dir = path.resolve('data/delivery',date); fs.mkdirSync(dir,{recursive:true});
  const receipt = path.join(dir,`${name}-${digest}.json`);
  if (fs.existsSync(receipt)) { console.log(`[delivery] ${name}: already delivered`); return; }
  const pending = receipt + '.pending';
  try { fs.writeFileSync(pending,JSON.stringify({startedAt:new Date().toISOString(),method}),{flag:'wx',mode:0o600}); }
  catch { throw new Error(`[delivery] ${name}: previous outcome unknown; inspect Telegram and ${pending}`); }
  form.append('chat_id',process.env.TELEGRAM_CHAT_ID!);
  const result = await telegramCall(method,form);
  fs.writeFileSync(receipt+'.tmp',JSON.stringify({messageId:result.message_id,deliveredAt:new Date().toISOString()},null,2),{mode:0o600});
  fs.renameSync(receipt+'.tmp',receipt); fs.unlinkSync(pending);
  console.log(`[delivery] ${name}: message ${result.message_id}`);
}
