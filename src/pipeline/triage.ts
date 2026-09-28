/**
 * v2 步骤：分级（LLM step = triage）
 */

import * as fs from 'fs';
import * as path from 'path';
import { chatJSON } from '../llm/registry';
import { WORLD_GROUP_LABELS } from '../config/world-symbols';
import { Anomaly, FeedItem, StageMeta, TriageResult, WorldSnapshot } from './types';

const MAX_ITEMS = 700;

export function loadPrompt(name: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), 'prompts', name), 'utf-8');
}

export function formatWorldSnapshot(snapshot: WorldSnapshot): string {
  const groups = new Map<string, string[]>();
  for (const q of snapshot.quotes) {
    const label = WORLD_GROUP_LABELS[q.group];
    const move = q.isLevel
      ? `${q.price.toFixed(2)} (${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)})`
      : `${q.price.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`;
    const arr = groups.get(label) || [];
    arr.push(`${q.name}: ${move}`);
    groups.set(label, arr);
  }
  return [...groups.entries()].map(([g, lines]) => `### ${g}\n${lines.join('\n')}`).join('\n\n');
}

export function formatAnomalies(anomalies: Anomaly[], historyDays: number): string {
  if (anomalies.length === 0) return `（无显著异常；历史样本 ${historyDays} 天）`;
  return anomalies.map(a => `- [${a.severity}] ${a.text}`).join('\n') + `\n（历史样本 ${historyDays} 天）`;
}

export async function runTriage(date: string, snapshot: WorldSnapshot, anomalies: Anomaly[], historyDays: number, items: FeedItem[]): Promise<{ result: TriageResult; meta: StageMeta }> {
  const sliced = items.slice(0, MAX_ITEMS);
  const headlines = sliced
    .map(i => `${i.id} | ${i.source} | ${i.publishedAt.slice(5, 16)} | ${i.title}${i.snippet ? ' — ' + i.snippet.slice(0, 200) : ''}`)
    .join('\n');

  const user = `# 日期: ${date}

# 世界快照（收盘/最新）
${formatWorldSnapshot(snapshot)}

# 异常清单
${formatAnomalies(anomalies, historyDays)}

# 原始信息流（${sliced.length} 条；格式：id | 来源 | 时间 | 标题 — 摘要）
${headlines}
`;

  const { data, model, profile, tokens } = await chatJSON<TriageResult>('triage', loadPrompt('v2-triage.txt'), user);
  const validIds = new Set(sliced.map(i => i.id));
  data.clusters = (data.clusters || []).map(c => ({ ...c, itemIds: (c.itemIds || []).filter(id => validIds.has(id)) }));
  data.researchQuestions = data.researchQuestions || [];
  data.surprises = data.surprises || [];
  console.log(`[triage] ${data.clusters.length} clusters, ${data.researchQuestions.length} questions, ${data.clusters.filter(c => c.outsideWatchlist).length} outside-watchlist`);
  return { result: data, meta: { model, profile, tokens } };
}
