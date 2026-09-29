import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { todayInReportTZ } from '../pipeline/dates';

// Explicit public filenames only. Never scan output/ for upload candidates.
const date = process.argv.find(a => a.startsWith('--date='))?.slice(7) || todayInReportTZ();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
const repo = 'luoli523/fin-report';
const gh = (args: string[]) => execFileSync('gh', [...args, '--repo', repo], {encoding:'utf8'}).trim();
const stem = `v2-public-narration-${date}`;
const bytes = fs.readFileSync(`output/${stem}.mp3`);
const metadata = JSON.parse(fs.readFileSync(`output/${stem}.json`, 'utf8'));
const digest = crypto.createHash('sha256').update(bytes).digest('hex');
if (metadata.date !== date || metadata.audience !== 'public' || metadata.audioHash !== digest || !(metadata.duration > 0)) throw new Error('Public audio metadata mismatch');
const tag = `audio-${date.slice(0, 7)}`;
const releases = JSON.parse(gh(['release','list','--limit','100','--json','tagName']));
if (!releases.some((r: {tagName: string}) => r.tagName === tag)) {
  const target = execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim();
  gh(['release','create',tag,'--target',target,'--title',`${date.slice(0,7)} 公开投资播报`,'--notes','每日公开简报音频，鬼哥授权 AI 配音。','--latest=false']);
}
const name = `${stem}-${digest.slice(0,16)}.mp3`;
const release = JSON.parse(gh(['release','view',tag,'--json','assets']));
if (!release.assets.some((a: {name:string}) => a.name === name)) {
  const dir = path.resolve('output/public-upload'); fs.mkdirSync(dir,{recursive:true});
  const upload = path.join(dir,name); fs.writeFileSync(upload,bytes);
  try { gh(['release','upload',tag,upload]); } finally { fs.unlinkSync(upload); }
}
const url = `https://github.com/${repo}/releases/download/${tag}/${name}`;
const dir = 'website/src/data/narration'; fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(`${dir}/${date}.json`,JSON.stringify({date,url,duration:metadata.duration,voice:'鬼哥',sha256:digest},null,2)+'\n');
console.log(`Public audio published: ${url}`);
