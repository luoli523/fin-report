/**
 * v2 记忆，分两份：
 * - data/memory/public.json   论点、regime、关注列表层面的 watch items（提交进仓库，仓库是公开的）
 * - data/memory/private.json  可验证判断（calls）、组合层面的 watch items（只保存在本机，不提交）
 */

import * as fs from 'fs';
import * as path from 'path';
import { MemoryState } from './types';

const DIR = path.resolve(process.cwd(), 'data/memory');
export const PUBLIC_MEMORY_FILE = path.join(DIR, 'public.json');
export const PRIVATE_MEMORY_FILE = path.join(DIR, 'private.json');

function empty(): MemoryState {
  return { updatedAt: '', theses: [], calls: [], watchItems: [] };
}

function load(file: string): MemoryState {
  if (!fs.existsSync(file)) return empty();
  try {
    return { ...empty(), ...(JSON.parse(fs.readFileSync(file, 'utf-8')) as MemoryState) };
  } catch {
    console.warn(`[memory] ${path.basename(file)} 损坏，重新开始`);
    return empty();
  }
}

export function loadPublicMemory(): MemoryState { return load(PUBLIC_MEMORY_FILE); }
export function loadPrivateMemory(): MemoryState { return load(PRIVATE_MEMORY_FILE); }

export function savePublicMemory(state: MemoryState): void {
  fs.mkdirSync(DIR, { recursive: true });
  const active = state.theses.filter(t => t.status === 'active' || t.status === 'weakening');
  const closed = state.theses.filter(t => t.status !== 'active' && t.status !== 'weakening').slice(-20);
  const out: MemoryState = { updatedAt: state.updatedAt, regime: state.regime, theses: [...active, ...closed], calls: [], watchItems: state.watchItems.slice(0, 10) };
  fs.writeFileSync(PUBLIC_MEMORY_FILE, JSON.stringify(out, null, 2));
  console.log(`[memory] public saved: ${out.theses.length} theses`);
}

export function savePrivateMemory(state: MemoryState): void {
  fs.mkdirSync(DIR, { recursive: true });
  const out: MemoryState = { updatedAt: state.updatedAt, theses: [], calls: state.calls.slice(-60), watchItems: state.watchItems.slice(0, 10) };
  fs.writeFileSync(PRIVATE_MEMORY_FILE, JSON.stringify(out, null, 2));
  console.log(`[memory] private saved: ${out.calls.length} calls`);
}

export function describePublicMemoryForLLM(m: MemoryState): string {
  if (!m.updatedAt) return '（首次运行，没有历史记忆）';
  const lines: string[] = [`上次更新: ${m.updatedAt}`, `上次判断的 regime: ${m.regime || '未记录'}`, '', '## 在跟踪的论点'];
  for (const t of m.theses) lines.push(`- [${t.id}] (${t.status}, 自 ${t.since}) ${t.statement}${t.evidence ? ` | 证据: ${t.evidence}` : ''}`);
  if (m.watchItems.length) lines.push('', '## 上次说要盯的事', ...m.watchItems.map(w => `- ${w}`));
  return lines.join('\n');
}

export function describePrivateMemoryForLLM(m: MemoryState): string {
  if (!m.updatedAt) return '（首次运行，没有待验证的判断）';
  const lines: string[] = [`上次更新: ${m.updatedAt}`, '', '## 待验证的判断'];
  const pending = m.calls.filter(c => !c.outcome || c.outcome === 'pending').slice(-20);
  if (pending.length === 0) lines.push('（无）');
  for (const c of pending) lines.push(`- [${c.id}] ${c.date}${c.ticker ? ' ' + c.ticker : ''}: ${c.statement}${c.checkBy ? `（检验期限 ${c.checkBy}）` : ''}`);
  const scored = m.calls.filter(c => c.outcome && c.outcome !== 'pending');
  if (scored.length) lines.push('', `## 历史记分: ${scored.filter(c => c.outcome === 'right').length}/${scored.length} 正确`);
  if (m.watchItems.length) lines.push('', '## 上次说要盯的事（组合层面）', ...m.watchItems.map(w => `- ${w}`));
  return lines.join('\n');
}
