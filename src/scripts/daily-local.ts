import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { todayInReportTZ, REPORT_TZ } from '../pipeline/dates';
import { sendTelegramMessage } from '../services/telegram';

dotenv.config({quiet:true}); process.umask(0o077);
const scheduled = process.argv.includes('--scheduled');
const date = todayInReportTZ();
const parts = new Intl.DateTimeFormat('en-US',{timeZone:REPORT_TZ,weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
const part = (name:string) => parts.find(p=>p.type===name)?.value || '';
const base = path.resolve('data/local-runner');
const dir = path.join(base,date);
const lock = path.join(base,'active.lock');
const stateFile = path.join(dir,'state.json');
type State = {done:string[]; failed?:string; updatedAt?:string};
const state:State = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile,'utf8')) : {done:[]};
const save = () => {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(stateFile+'.tmp',JSON.stringify(state,null,2)); fs.renameSync(stateFile+'.tmp',stateFile);
};
function command(script:string, args:string[] = []) {
  const result = spawnSync(process.execPath,['--import','tsx',`src/scripts/${script}.ts`,...args],{stdio:'inherit',env:process.env});
  if (result.error || result.status !== 0) throw new Error(`${script} failed (${result.status ?? result.error?.message})`);
}
async function main() {
  if (scheduled && (!['Tue','Wed','Thu','Fri','Sat'].includes(part('weekday')) || Number(part('hour')) < 7)) return;
  if (scheduled && !fs.existsSync(path.join(base,'enabled.json'))) return;
  if (state.done.includes('complete')) return;
  fs.mkdirSync(dir,{recursive:true});
  if (fs.existsSync(lock)) {
    const pid = Number(fs.readFileSync(lock,'utf8'));
    try { process.kill(pid,0); console.log('[daily] another run is active'); return; }
    catch(e) { if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e; fs.unlinkSync(lock); }
  }
  fs.writeFileSync(lock,String(process.pid),{flag:'wx'});
  let current = 'preflight';
  const step = (name:string, run:()=>void) => {
    if (state.done.includes(name)) return;
    current = name; console.log(`[daily] ${date} ${name}`);
    run(); state.done.push(name); delete state.failed; save();
  };
  try {
    step('generate',()=>command('run-v2',['--resume']));
    step('narration',()=>command('narrate',[`--date=${date}`]));
    // Delivery is independent of GitHub availability. Complete all independent
    // channels even if one fails, retaining per-step receipts for the next run.
    const failures:string[] = [];
    for (const [name,run] of [
      ['telegram',()=>command('deliver-daily',[`--date=${date}`])],
      ['email',()=>{
        if (process.env.EMAIL_ENABLED !== 'true' || fs.existsSync(path.join(dir,'legacy-documents-delivered.json'))) return;
        const pending = path.join(dir,'email.pending');
        const receipt = path.join(dir,'email.delivered');
        if (fs.existsSync(receipt)) return;
        if (fs.existsSync(pending)) throw new Error('Previous email outcome unknown; inspect mailbox and email.pending');
        fs.writeFileSync(pending,new Date().toISOString(),{flag:'wx'});
        command('send-email',[date]);
        fs.writeFileSync(receipt,new Date().toISOString()); fs.unlinkSync(pending);
      }],
      ['public-audio',()=>command('publish-narration',[`--date=${date}`])],
      ['website',()=>{
        if (!state.done.includes('public-audio')) throw new Error('Public audio is not uploaded yet');
        command('publish-daily',[`--date=${date}`]);
      }],
    ] as Array<[string,()=>void]>) {
      try { step(name,run); } catch(e) { failures.push(`${name}: ${(e as Error).message}`); }
    }
    if (failures.length) { current = failures.join('; '); throw new Error(current); }
    step('complete',()=>{});
  } catch(e) {
    state.failed = current; save();
    const alert = path.join(dir,'failure-notified');
    if (!fs.existsSync(alert)) {
      fs.writeFileSync(alert,new Date().toISOString());
      await sendTelegramMessage(`本地简报 ${date} 未全部完成，阶段：${current.split(':')[0]}。已完成步骤会保留，本机会重试。日志：data/local-runner/logs/。`);
    }
    throw e;
  } finally { fs.unlinkSync(lock); }
}
main().catch(e=>{console.error(`[daily] ${e.message}`);process.exitCode=1;});
