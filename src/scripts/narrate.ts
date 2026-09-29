import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import dotenv from 'dotenv';
import { chatJSON, resolveConfig } from '../llm/registry';
import { todayInReportTZ } from '../pipeline/dates';
import { spokenText } from '../pipeline/spoken-text';

dotenv.config({ quiet: true });
process.umask(0o077);
type Audience = 'public' | 'private';
interface Script { date: string; audience: Audience; title: string; paragraphs: string[] }
const args = process.argv.slice(2);
const value = (key: string) => args.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3);
const date = value('date') || todayInReportTZ();
const selection = value('audience') || 'both';
const stage = value('stage') || 'all';
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['both','public','private'].includes(selection) || !['all','script','audio'].includes(stage)) throw new Error('Invalid date/audience/stage');
const audiences: Audience[] = selection === 'both' ? ['public', 'private'] : [selection as Audience];
const output = path.resolve('output');
const cache = path.resolve('data/narration', date);
const prompt = fs.readFileSync('prompts/narration.txt', 'utf8');
const voice = process.env.TTS_VOICE || 'guige';
const speed = Number(process.env.TTS_SPEED || 1);
const endpoint = new URL(process.env.TTS_BASE_URL || 'http://127.0.0.1:8091/v1/');
if (!['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname)) throw new Error('Narration requires a local TTS endpoint');
if (!Number.isFinite(speed) || speed < .25 || speed > 4) throw new Error('Invalid TTS_SPEED');
const hash = (v: unknown) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const atomic = (file: string, data: string | Buffer) => { fs.writeFileSync(file + '.tmp', data, { mode: 0o600 }); fs.renameSync(file + '.tmp', file); };
const readJSON = (file: string) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const duration = (file: string) => {
  const n = Number(execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file], { encoding: 'utf8' }).trim());
  if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid audio duration');
  return n;
};
function validate(s: Script, audience: Audience) {
  if (s.date !== date || s.audience !== audience || typeof s.title !== 'string' || !Array.isArray(s.paragraphs) || !s.paragraphs.length || s.paragraphs.some(p => typeof p !== 'string' || !p.trim())) throw new Error('Invalid narration schema');
  const text = s.paragraphs.join('\n\n');
  if (text.length < 200 || text.length > 1800 || /undefined|\bnull\b|https?:\/\//i.test(text)) throw new Error('Narration content requires review');
  if (audience === 'public' && /你的持仓|您的持仓|你的成本|您的成本|私人组合|持仓成本/.test(text)) throw new Error('Private wording in public narration');
  return text;
}
async function script(audience: Audience) {
  const step = audience === 'public' ? 'narration_public' : 'narration_private';
  const config = resolveConfig(step);
  if (audience === 'private' && config.provider !== 'ollama') throw new Error('Private narration must use local Ollama');
  if (audience === 'private' && !['localhost','127.0.0.1','[::1]'].includes(new URL(config.baseURL || 'http://127.0.0.1:11434').hostname)) throw new Error('Private narration requires a loopback Ollama endpoint');
  // The public branch never opens private files or holdings.
  const publicText = fs.readFileSync(path.join(output, `v2-public-${date}.md`), 'utf8');
  const privateText = audience === 'private' ? fs.readFileSync(path.join(output, `v2-private-${date}.md`), 'utf8') : '';
  if (!publicText.split('\n')[0].includes(date) || (privateText && !privateText.split('\n')[0].includes(date))) throw new Error('Report date mismatch');
  const key = hash({prompt, publicText, privateText, model: config.model, profile: config.profileName, temperature:config.temperature, thinking:config.thinking, contextWindow:config.contextWindow});
  const file = path.join(cache, `${audience}-script.json`);
  let saved = readJSON(file);
  if (!saved || saved.inputHash !== key || args.includes('--rewrite')) {
    const r = await chatJSON<Script>(step, prompt, `日期：${date}\n受众：${audience}\n公开简报：\n${publicText}\n${privateText ? `私人分析：\n${privateText}` : ''}`);
    validate(r.data, audience);
    saved = { inputHash: key, script: r.data, model: r.model, createdAt: new Date().toISOString() };
    atomic(file, JSON.stringify(saved, null, 2));
  }
  const text = spokenText(validate(saved.script, audience));
  atomic(path.join(output, `v2-${audience}-narration-${date}.txt`), text);
  console.log(`[${audience}] script: ${text.length} characters`);
}
async function audio(audience: Audience) {
  const scriptFile = path.join(output, `v2-${audience}-narration-${date}.txt`);
  const text = spokenText(fs.readFileSync(scriptFile, 'utf8').trim());
  validate({date, audience, title:'narration', paragraphs:text.split(/\n\s*\n/)}, audience);
  const parts = text.split(/\n\s*\n/).filter(Boolean);
  const dir = path.join(cache, audience, 'audio'); fs.mkdirSync(dir, { recursive:true });
  const files: string[] = [];
  for (const [i, part] of parts.entries()) {
    const key = hash({part, voice, speed, endpoint: endpoint.href});
    const file = path.join(dir, `${key}.mp3`);
    if (!fs.existsSync(file)) {
      const url = new URL(endpoint.href.endsWith('/') ? endpoint.href : endpoint.href + '/');
      const res = await fetch(new URL('audio/speech', url), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({model:'qwen3-tts',voice,input:part,speed,response_format:'mp3'}), signal:AbortSignal.timeout(600000) });
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}; completed segments retained`);
      atomic(file, Buffer.from(await res.arrayBuffer()));
      try { duration(file); } catch(e) { fs.unlinkSync(file); throw e; }
    }
    files.push(file);
    console.log(`[${audience}] audio ${i+1}/${parts.length}`);
  }
  const list = path.join(dir, 'concat.txt');
  atomic(list, files.map(f => `file '${path.basename(f)}'`).join('\n'));
  const target = path.join(output, `v2-${audience}-narration-${date}.mp3`);
  execFileSync('ffmpeg', ['-hide_banner','-loglevel','error','-y','-f','concat','-safe','1','-i',list,'-c:a','libmp3lame','-b:a','128k',target+'.tmp.mp3']);
  const seconds = duration(target+'.tmp.mp3');
  fs.renameSync(target+'.tmp.mp3',target);
  atomic(path.join(output, `v2-${audience}-narration-${date}.json`),JSON.stringify({date,audience,voice,duration:seconds,scriptHash:hash(text),audioHash:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),createdAt:new Date().toISOString()},null,2));
  console.log(`[${audience}] complete: ${seconds.toFixed(1)}s`);
}
async function main() {
  fs.mkdirSync(output,{recursive:true});fs.mkdirSync(cache,{recursive:true});
  const lock = path.join(cache, '.lock');
  try { fs.mkdirSync(lock); } catch { throw new Error(`Narration already running; if stale remove ${lock}`); }
  try {
    // Finish text work before loading TTS to avoid two large models in memory.
    if (stage !== 'audio') for (const a of audiences) await script(a);
    if (stage !== 'script') for (const a of audiences) await audio(a);
  } finally { fs.rmdirSync(lock); }
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
