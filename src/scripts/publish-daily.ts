import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { todayInReportTZ } from '../pipeline/dates';

const date = process.argv.find(a=>a.startsWith('--date='))?.slice(7) || todayInReportTZ();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
const root = process.cwd();
const dir = path.resolve('data/local-runner/publish');
const git = (args:string[], cwd=root) => execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const sources = [
  `output/v2-public-${date}.md`, `output/v2-infographic-brief-${date}.md`,
  `website/src/data/narration/${date}.json`, `data/history/world/${date}.json`, 'data/memory/public.json',
];
for (const file of sources) if (!fs.existsSync(file)) throw new Error(`Missing public input: ${file}`);
git(['fetch','origin','main']);
if (!fs.existsSync(dir)) git(['worktree','add','--detach',dir,'origin/main']);
// This worktree belongs solely to publication. A previous failed push remains
// available locally; rebase it on the current main before attempting again.
if (git(['status','--porcelain'],dir)) throw new Error('Publication worktree has unfinished changes; inspect data/local-runner/publish');
git(['rebase','origin/main'],dir);
execFileSync('bash',['scripts/prepare-website-content.sh',date,path.join(root,'output'),path.join(dir,'website')],{cwd:root,stdio:'inherit'});
const files = [
  `website/src/content/reports/${date}.md`,
  `website/public/briefings/${date}/public.md`,
  `website/public/briefings/${date}/brief.md`,
  'website/public/briefings/latest.json',
  `website/src/data/narration/${date}.json`,
  `data/history/world/${date}.json`,
  'data/memory/public.json',
];
for (const relative of files.slice(4)) {
  const src = path.join(root,relative); const dst = path.join(dir,relative);
  fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(src,dst);
}
// No directory-wide staging: private output, holdings, memory and logs have no
// path into the public commit, even if new files appear next to these files.
git(['add','--',...files],dir);
if (git(['diff','--cached','--name-only'],dir)) git(['commit','-m',`chore: publish local briefing and narration ${date}`],dir);
git(['push','origin','HEAD:main'],dir);
const commit = git(['rev-parse','HEAD'],dir);
const gh = (args:string[]) => execFileSync('gh',[...args,'--repo','luoli523/fin-report'],{encoding:'utf8'}).trim();
let runId: number | undefined;
for (let attempt=0; attempt<12; attempt++) {
  const runs = JSON.parse(gh(['run','list','--workflow','site-rebuild.yml','--commit',commit,'--limit','1','--json','databaseId'])) as Array<{databaseId:number}>;
  if (runs[0]) { runId=runs[0].databaseId; break; }
  await new Promise(resolve=>setTimeout(resolve,5000));
}
if (!runId) throw new Error('Public content pushed, but site deployment has not started');
execFileSync('gh',['run','watch',String(runId),'--exit-status','--interval','10','--repo','luoli523/fin-report'],{stdio:'inherit',timeout:600000});
const audio = JSON.parse(fs.readFileSync(path.join(root,`website/src/data/narration/${date}.json`),'utf8'));
for (let attempt=0; attempt<18; attempt++) {
  try {
    const response = await fetch(`https://guige.ai/fin-report/reports/${date}/`,{signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'}});
    if (response.ok && (await response.text()).includes(audio.url)) {
      console.log(`[publish] ${date}: public player is live`); process.exit(0);
    }
  } catch { /* Pages/CDN may still be updating after the deploy job. */ }
  await new Promise(resolve=>setTimeout(resolve,10000));
}
throw new Error('Site deployment finished, but public player has not appeared yet');
