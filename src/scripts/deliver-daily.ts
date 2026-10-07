import fs from 'node:fs';
import dotenv from 'dotenv';
import { todayInReportTZ } from '../pipeline/dates';
import { deliverOnce, requirePrivateChat } from '../services/telegram-delivery';

dotenv.config({quiet:true}); process.umask(0o077);
const date = process.argv.find(a=>a.startsWith('--date='))?.slice(7) || todayInReportTZ();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
async function main() {
  await requirePrivateChat();
  const legacy = fs.existsSync(`data/local-runner/${date}/legacy-documents-delivered.json`);
  const errors: string[] = [];
  if (!legacy) {
    const publicMd = fs.readFileSync(`output/v2-public-${date}.md`,'utf8');
    const headline = publicMd.match(/^\*\*一句话\*\*: (.+)$/m)?.[1] || '';
    const text = `全球宏观 × AI 简报 ${date}\n${headline}\nhttps://guige.ai/fin-report/reports/${date}/`;
    const form = new FormData(); form.append('text',text);
    try { await deliverOnce(date,'summary',text,'sendMessage',form); } catch(e) { errors.push((e as Error).message); }
  }
  const files = [
    ...(!legacy ? [
      {name:'public-pdf',file:`v2-public-${date}.pdf`,title:`公开简报 · ${date}`,audio:false},
      {name:'private-pdf',file:`v2-private-${date}.pdf`,title:`私人组合简报 · ${date}`,audio:false},
    ] : []),
    {name:'private-audio',file:`v2-private-narration-${date}.mp3`,title:`鬼哥的私人投资播报 · ${date}`,audio:true},
  ];
  for (const item of files) {
    try {
      const bytes = fs.readFileSync(`output/${item.file}`);
      const form = new FormData();
      form.append(item.audio?'audio':'document',new Blob([bytes],{type:item.audio?'audio/mpeg':'application/pdf'}),item.file);
      form.append('caption',item.audio?`${date} 私人投资播报\n本人授权的 AI 声音播报。`:item.title);
      if (item.audio) { form.append('title',item.title); form.append('performer','鬼哥'); }
      await deliverOnce(date,item.name,bytes,item.audio?'sendAudio':'sendDocument',form);
    } catch(e) { errors.push((e as Error).message); }
  }
  if (errors.length) throw new Error(errors.join('\n'));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
