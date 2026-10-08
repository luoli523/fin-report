/**
 * v2 LLM 步骤：
 * - synthesis  世界观（不含持仓、不含 watchlist）
 * - watchlist  公开的关注列表映射（只看 watchlist）
 * - portfolio  私人持仓映射（看真实持仓，输出只走私密渠道）
 */

import { chatJSON } from '../llm/registry';
import { loadPrompt, formatWorldSnapshot, formatAnomalies } from './triage';
import { describeHoldingsForLLM, describeHoldingQuotesForLLM } from './holdings';
import { describePublicMemoryForLLM, describePrivateMemoryForLLM } from './memory';
import { Anomaly, EarningsEvent, FeedItem, Holding, MemoryState, ResearchFinding, StageMeta, TriageResult, WatchlistQuote, WorldSnapshot } from './types';
import { formatWatchlistQuotes, topMovers } from '../collectors/watchlist-quotes';
import { formatEarnings } from './earnings';

export interface SynthesisResult {
  regime: { label: string; growth: string; inflation: string; liquidity: string; oneLiner: string; changeVsYesterday: string };
  crossAssetRead: string;
  anomaliesExplained: Array<{ anomaly: string; explanation: string; confidence: string }>;
  lines: Array<{ name: string; state: string; whyItMatters: string; watch: string }>;
  deepDives: Array<{ title: string; whatHappened: string; mechanism: string; crossAssetImplication: string; winners: string[]; losers: string[]; confidence: string; sources: string[] }>;
  surprises: Array<{ title: string; why: string; source: string }>;
  contrarian: Array<{ consensus: string; counter: string; whatWouldConfirm: string }>;
  calendar: Array<{ date: string; event: string; why: string }>;
  keyLevels: Array<{ instrument: string; level: string; meaning: string }>;
  thesesUpdate: Array<{ id: string; statement: string; status: 'active' | 'weakening' | 'invalidated' | 'confirmed'; evidence?: string }>;
}

export interface WatchlistResult {
  headline: string;
  chainView: Array<{ segment: string; bias: string; reason: string; tickers: string[] }>;
  opportunities: Array<{ ticker: string; thesis: string; trigger: string; risk: string; horizon?: string }>;
  risks: Array<{ ticker: string; chain: string; signal: string }>;
  outsideIdeas: Array<{ instrument: string; thesis: string; why: string }>;
  thesisLinks: Array<{ thesis: string; tickers: string[]; today: string }>;
  watchItems: string[];
}

export interface PortfolioResult {
  headline: string;
  stance: string;
  exposureReview: string;
  todayActions: Array<{ ticker?: string; action: string; condition: string; invalidation: string; reason: string }>;
  holdingsReview: Array<{ ticker: string; tier: string; stance: string; marginOfSafety?: string; reason: string; keyLevel?: string }>;
  hedges: Array<{ instrument: string; purpose: string; condition: string }>;
  scorecard: Array<{ callId: string; outcome: 'right' | 'wrong' | 'unclear' | 'pending'; note: string }>;
  newCalls: Array<{ ticker?: string; statement: string; checkBy: string }>;
  watchItems: string[];
}

function ensureArrays<T extends object>(data: T, keys: (keyof T)[]): void {
  for (const k of keys) if (!Array.isArray(data[k])) (data as any)[k] = [];
}

function formatClusters(triage: TriageResult, items: FeedItem[]): string {
  const byId = new Map(items.map(i => [i.id, i]));
  return triage.clusters
    .map(c => {
      const lines = c.itemIds.slice(0, 6).map(id => {
        const it = byId.get(id);
        return it ? `  - [${it.source}] ${it.title}${it.snippet ? ' — ' + it.snippet.slice(0, 300) : ''}` : null;
      }).filter(Boolean);
      return `## [${c.importance}/10] ${c.title}${c.outsideWatchlist ? ' 〔watchlist之外〕' : ''}\n类别: ${c.category}\n为什么重要: ${c.why}\n${lines.join('\n')}`;
    })
    .join('\n\n');
}

function formatResearch(findings: ResearchFinding[]): string {
  if (findings.length === 0) return '（本次未进行搜索研究）';
  return findings.map(f => {
    const head = f.kind === 'search' ? `## 追问: ${f.question}` : `## 正文: ${f.clusterTitle}`;
    const body = f.results.map(r => `- ${r.title}${r.publishedDate ? ` (${r.publishedDate.slice(0, 10)})` : ''}${r.url ? ` <${r.url}>` : ''}\n  ${r.content}`).join('\n');
    return `${head}\n${body}`;
  }).join('\n\n');
}

function worldViewJSON(s: SynthesisResult): string {
  const { thesesUpdate, ...worldView } = s;
  return JSON.stringify(worldView, null, 1);
}

export async function runSynthesis(
  date: string, snapshot: WorldSnapshot, anomalies: Anomaly[], historyDays: number,
  triage: TriageResult, items: FeedItem[], research: ResearchFinding[], publicMemory: MemoryState,
  quotes: WatchlistQuote[] = [], earnings: EarningsEvent[] = [],
): Promise<{ result: SynthesisResult; meta: StageMeta }> {
  const movers = topMovers(quotes);
  const fmtMover = (q: WatchlistQuote) => `${q.symbol} ${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%`;
  const user = `# 日期: ${date}

# 世界快照
${formatWorldSnapshot(snapshot)}

# AI 产业链关注列表当日涨跌 TOP5
涨: ${movers.gainers.map(fmtMover).join(' · ') || '（无数据）'}
跌: ${movers.losers.map(fmtMover).join(' · ') || '（无数据）'}

# 未来两周关注列表财报
${formatEarnings(earnings)}

# 异常清单
${formatAnomalies(anomalies, historyDays)}

# 信息官挑出的事件聚类
${formatClusters(triage, items)}

# 信息官标记的惊喜
${triage.surprises.map(s => `- ${s}`).join('\n') || '（无）'}

# 研究结果（搜索与正文）
${formatResearch(research)}

# 昨日记忆
${describePublicMemoryForLLM(publicMemory)}
`;
  const { data, model, profile, tokens } = await chatJSON<SynthesisResult>('synthesis', loadPrompt('v2-synthesis.txt'), user);
  ensureArrays(data, ['anomaliesExplained', 'lines', 'deepDives', 'surprises', 'contrarian', 'calendar', 'keyLevels', 'thesesUpdate']);
  console.log(`[synthesis] regime="${data.regime?.label}", ${data.deepDives.length} deep dives, ${data.surprises.length} surprises`);
  return { result: data, meta: { model, profile, tokens } };
}

export async function runWatchlist(
  date: string, snapshot: WorldSnapshot, synthesis: SynthesisResult, watchlist: string[], publicMemory: MemoryState,
  quotes: WatchlistQuote[] = [], earnings: EarningsEvent[] = [],
): Promise<{ result: WatchlistResult; meta: StageMeta }> {
  const user = `# 日期: ${date}

# 今日世界观（上游策略师输出）
${worldViewJSON(synthesis)}

# 世界快照摘要
${formatWorldSnapshot(snapshot)}

# 关注列表当日行情（公开）
${quotes.length ? formatWatchlistQuotes(quotes) : watchlist.join(', ')}

# 未来两周关注列表财报
${formatEarnings(earnings)}

# 记忆（论点）
${describePublicMemoryForLLM(publicMemory)}
`;
  const { data, model, profile, tokens } = await chatJSON<WatchlistResult>('watchlist', loadPrompt('v2-watchlist.txt'), user);
  ensureArrays(data, ['chainView', 'opportunities', 'risks', 'outsideIdeas', 'thesisLinks', 'watchItems']);
  console.log(`[watchlist] ${data.opportunities.length} opportunities, ${data.risks.length} risks, ${data.outsideIdeas.length} outside ideas`);
  return { result: data, meta: { model, profile, tokens } };
}

export async function runPortfolio(
  date: string, snapshot: WorldSnapshot, synthesis: SynthesisResult, watchlistView: WatchlistResult,
  holdings: Holding[], privateMemory: MemoryState, quotes: WatchlistQuote[] = [],
): Promise<{ result: PortfolioResult; meta: StageMeta }> {
  const user = `# 日期: ${date}

# 今日世界观（上游策略师输出）
${worldViewJSON(synthesis)}

# 公开的关注列表分析（已发布，不要重复）
${JSON.stringify(watchlistView, null, 1)}

# 世界快照摘要
${formatWorldSnapshot(snapshot)}

# 持仓人的真实持仓（私密）
${describeHoldingsForLLM(holdings)}

# 持仓当日行情（当前价以此为准）
${describeHoldingQuotesForLLM(holdings, quotes)}

# 私人记忆（含待验证判断，需要记分）
${describePrivateMemoryForLLM(privateMemory)}
`;
  const { data, model, profile, tokens } = await chatJSON<PortfolioResult>('portfolio', loadPrompt('v2-portfolio.txt'), user);
  ensureArrays(data, ['todayActions', 'holdingsReview', 'hedges', 'scorecard', 'newCalls', 'watchItems']);
  console.log(`[portfolio] stance=${data.stance}, ${data.todayActions.length} actions, ${data.newCalls.length} new calls`);
  return { result: data, meta: { model, profile, tokens } };
}

/** 公开记忆：论点 + regime + 关注列表层面的 watch items */
const THESIS_STATUS = new Set(['active', 'weakening', 'invalidated', 'confirmed']);
/** 模型偶尔会自造状态词（如 strengthened），统一归为 active */
const normStatus = (s: string): MemoryState['theses'][number]['status'] =>
  (THESIS_STATUS.has(s) ? s : 'active') as MemoryState['theses'][number]['status'];

export function mergePublicMemory(memory: MemoryState, date: string, synthesis: SynthesisResult, watchlistView: WatchlistResult): MemoryState {
  const updated = new Map(synthesis.thesesUpdate.map(t => [t.id, t]));
  const theses = memory.theses.map(t => {
    const u = updated.get(t.id);
    return u ? { ...t, statement: u.statement || t.statement, status: normStatus(u.status), evidence: u.evidence } : t;
  });
  let n = theses.length + 1;
  for (const t of synthesis.thesesUpdate) {
    if (!memory.theses.some(x => x.id === t.id)) {
      theses.push({ id: `T${date.replace(/-/g, '')}-${n++}`, statement: t.statement, since: date, status: normStatus(t.status), evidence: t.evidence });
    }
  }
  return { updatedAt: date, regime: synthesis.regime?.label, theses, calls: [], watchItems: watchlistView.watchItems };
}

/** 私人记忆：可验证判断 + 组合层面的 watch items */
export function mergePrivateMemory(memory: MemoryState, date: string, portfolio: PortfolioResult): MemoryState {
  const score = new Map(portfolio.scorecard.map(s => [s.callId, s]));
  const calls = memory.calls.map(c => {
    const s = score.get(c.id);
    return s ? { ...c, outcome: s.outcome, note: s.note } : c;
  });
  let m = calls.length + 1;
  for (const c of portfolio.newCalls) {
    calls.push({ id: `C${date.replace(/-/g, '')}-${m++}`, date, ticker: c.ticker, statement: c.statement, checkBy: c.checkBy, outcome: 'pending' });
  }
  return { updatedAt: date, theses: [], calls, watchItems: portfolio.watchItems };
}
