/**
 * v2 渲染：
 * - renderPublicBriefing   世界观 + 关注列表，可公开发布
 * - renderPrivateBriefing  持仓映射，只走私密渠道（Telegram PDF）
 * - renderInfographicBrief 给 Grok 读的精简文案（只含公开内容）
 */

import { WORLD_GROUP_LABELS, WorldGroup } from '../config/world-symbols';
import { Anomaly, EarningsEvent, MemoryState, StageMeta, TriageResult, WatchlistQuote, WorldSnapshot } from '../pipeline/types';
import { topMovers } from '../collectors/watchlist-quotes';
import { PortfolioResult, SynthesisResult, WatchlistResult } from '../pipeline/synthesize';

export interface PublicRenderInput {
  date: string;
  snapshot: WorldSnapshot;
  anomalies: Anomaly[];
  historyDays: number;
  triage: TriageResult;
  synthesis: SynthesisResult;
  watchlist: WatchlistResult;
  publicMemory: MemoryState;
  quotes: WatchlistQuote[];
  earnings: EarningsEvent[];
  feedCount: number;
  sourceCount: number;
  researchCount: number;
  meta: Record<string, StageMeta>;
}

export interface PrivateRenderInput {
  date: string;
  synthesis: SynthesisResult;
  portfolio: PortfolioResult;
  privateMemory: MemoryState;
  meta: Record<string, StageMeta>;
}

const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const lvl = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
const dot = (v: number) => (v > 0 ? '🟢' : v < 0 ? '🔴' : '⚪');
const list = (arr: string[] | undefined) => (arr && arr.length ? arr.map(x => `- ${x}`).join('\n') : '- （无）');

function snapshotTable(snapshot: WorldSnapshot, groups: WorldGroup[]): string {
  const rows: string[] = ['| 资产 | 最新 | 变动 | |', '|:--|--:|--:|:-:|'];
  for (const g of groups) {
    for (const q of snapshot.quotes.filter(q => q.group === g)) {
      const m = q.isLevel ? q.change : q.changePercent;
      rows.push(`| ${q.name} | ${q.price.toFixed(2)} | ${q.isLevel ? lvl(q.change) : pct(q.changePercent)} | ${dot(m)} |`);
    }
  }
  return rows.join('\n');
}

function regimeHeader(date: string, s: SynthesisResult, title: string): string[] {
  const out = [`# ${title} ${date}`, ''];
  out.push(`> **Regime**: ${s.regime?.label || '未判定'} · 增长 ${s.regime?.growth || '-'} · 通胀 ${s.regime?.inflation || '-'} · 流动性 ${s.regime?.liquidity || '-'}`, '');
  out.push(`**一句话**: ${s.regime?.oneLiner || ''}`, '');
  if (s.regime?.changeVsYesterday) out.push(`**相比昨日**: ${s.regime.changeVsYesterday}`, '');
  return out;
}

export function renderPublicBriefing(i: PublicRenderInput): string {
  const { date, synthesis: s, watchlist: w } = i;
  const out: string[] = regimeHeader(date, s, '全球宏观 × AI 产业链 每日简报');

  out.push('## 一、世界在发生什么', '');
  out.push(s.crossAssetRead || '', '');
  if (i.anomalies.length) {
    out.push('### 异常与解释', '');
    for (const a of i.anomalies) {
      const e = s.anomaliesExplained.find(x => x.anomaly === a.text)
        || (a.symbol && s.anomaliesExplained.find(x => x.anomaly.includes(a.symbol!)))
        || s.anomaliesExplained.find(x => x.anomaly.slice(0, 12) === a.text.slice(0, 12));
      out.push(`- ${a.severity === 'high' ? '🔴' : '🟡'} **${a.text}**${e ? `\n  - ${e.explanation}（置信度 ${e.confidence}）` : ''}`);
    }
    out.push('');
  }

  if (s.lines.length) {
    out.push('## 二、五条主线', '');
    out.push('| 主线 | 状态 | 为什么重要 | 盯什么 |', '|:--|:--|:--|:--|');
    for (const l of s.lines) out.push(`| **${l.name}** | ${l.state} | ${l.whyItMatters} | ${l.watch} |`);
    out.push('');
  }

  if (s.deepDives.length) {
    out.push('## 三、深挖', '');
    s.deepDives.forEach((d, idx) => {
      out.push(`### ${idx + 1}. ${d.title}  ·  置信度 ${d.confidence}`, '');
      out.push(`**发生了什么**: ${d.whatHappened}`, '');
      out.push(`**传导机制**: ${d.mechanism}`, '');
      out.push(`**跨资产含义**: ${d.crossAssetImplication}`, '');
      if (d.winners?.length) out.push(`**受益**: ${d.winners.join(' · ')}`);
      if (d.losers?.length) out.push(`**受损**: ${d.losers.join(' · ')}`);
      if (d.sources?.length) out.push(`来源: ${d.sources.join(', ')}`);
      out.push('');
    });
  }

  out.push('## 四、盲区与反方', '');
  if (s.surprises.length) {
    out.push('### 你可能没注意到的', '');
    for (const x of s.surprises) out.push(`- **${x.title}** — ${x.why}${x.source ? `（${x.source}）` : ''}`);
    out.push('');
  }
  if (s.contrarian.length) {
    out.push('### 反方观点', '');
    for (const c of s.contrarian) out.push(`- **共识**: ${c.consensus}\n  - **反方**: ${c.counter}\n  - **证实反方需要**: ${c.whatWouldConfirm}`);
    out.push('');
  }

  out.push('## 五、关注列表映射', '');
  out.push(`**${w.headline}**`, '');
  if (i.quotes.length) {
    const mv = topMovers(i.quotes);
    const fm = (q: WatchlistQuote) => `${q.symbol} ${pct(q.changePercent)}`;
    out.push(`🟢 **涨**: ${mv.gainers.map(fm).join(' · ')}`, '', `🔴 **跌**: ${mv.losers.map(fm).join(' · ')}`, '');
  }
  if (w.chainView.length) {
    out.push('| 产业链位置 | 偏向 | 原因 | 标的 |', '|:--|:--:|:--|:--|');
    for (const c of w.chainView) out.push(`| **${c.segment}** | ${c.bias} | ${c.reason} | ${(c.tickers || []).join(' · ')} |`);
    out.push('');
  }
  if (w.opportunities.length) {
    out.push('### 机会', '');
    for (const o of w.opportunities) out.push(`- **${o.ticker}**${o.horizon ? `（${o.horizon}）` : ''}: ${o.thesis}\n  - 触发: ${o.trigger}\n  - 风险: ${o.risk}`);
    out.push('');
  }
  if (w.risks.length) {
    out.push('### 风险提示', '');
    for (const r of w.risks) out.push(`- **${r.ticker}**: ${r.chain} — 信号: ${r.signal}`);
    out.push('');
  }
  if (w.outsideIdeas.length) {
    out.push('### 关注列表之外', '');
    for (const o of w.outsideIdeas) out.push(`- **${o.instrument}**: ${o.thesis}（${o.why}）`);
    out.push('');
  }
  if (w.thesisLinks.length) {
    out.push('### 与在跟踪论点的关联', '');
    for (const t of w.thesisLinks) out.push(`- ${t.thesis} → ${(t.tickers || []).join(' · ')}：${t.today}`);
    out.push('');
  }

  if (s.calendar.length || s.keyLevels.length || i.earnings.length) {
    out.push('## 六、日历与关键点位', '');
    if (i.earnings.length) {
      out.push('### 未来两周关注列表财报', '');
      out.push('| 日期 | 标的 | 时段 | EPS 预期 | 收入预期 |', '|:--|:--:|:--:|--:|--:|');
      for (const e of i.earnings) out.push(`| ${e.date} | **${e.symbol}** | ${e.hour} | ${e.epsEstimate != null ? e.epsEstimate : ''} | ${e.revenueEstimate ? `$${(e.revenueEstimate / 1e9).toFixed(2)}B` : ''} |`);
      out.push('');
    }
    if (s.calendar.length) {
      out.push('| 日期 | 事件 | 为什么重要 |', '|:--|:--|:--|');
      for (const c of s.calendar) out.push(`| ${c.date} | ${c.event} | ${c.why} |`);
      out.push('');
    }
    if (s.keyLevels.length) {
      out.push('| 工具 | 点位 | 含义 |', '|:--|--:|:--|');
      for (const k of s.keyLevels) out.push(`| ${k.instrument} | ${k.level} | ${k.meaning} |`);
      out.push('');
    }
  }

  const activeTheses = i.publicMemory.theses.filter(t => t.status === 'active' || t.status === 'weakening');
  if (activeTheses.length || w.watchItems.length) {
    out.push('## 七、在跟踪什么', '');
    if (activeTheses.length) {
      out.push('### 论点', '');
      for (const t of activeTheses) out.push(`- ${t.status === 'weakening' ? '⚠️ ' : ''}${t.statement}${t.evidence ? ` — ${t.evidence}` : ''}`);
      out.push('');
    }
    if (w.watchItems.length) out.push('### 接下来盯什么', '', list(w.watchItems), '');
  }

  if (i.quotes.length) {
    out.push('## 附录A：AI 产业链关注列表行情', '');
    out.push('| 分类 | 标的 | 名称 | 价格 | 涨跌幅 | |', '|:--|:--:|:--|--:|--:|:-:|');
    for (const q of i.quotes) out.push(`| ${q.category} | **${q.symbol}** | ${q.name} | ${q.price.toFixed(2)} | ${pct(q.changePercent)} | ${dot(q.changePercent)} |`);
    out.push('');
  }
  out.push('## 附录B：世界快照', '');
  out.push('### 股指与板块', '', snapshotTable(i.snapshot, ['us-index', 'global-index', 'us-sector']), '');
  out.push('### 利率、信用、波动率', '', snapshotTable(i.snapshot, ['rates', 'credit', 'volatility']), '');
  out.push('### 外汇、商品、加密', '', snapshotTable(i.snapshot, ['fx', 'commodity', 'crypto']), '');
  if (i.snapshot.failed.length) out.push(`未获取: ${i.snapshot.failed.join(', ')}`, '');

  out.push('## 附录C：信息流统计', '');
  out.push(`- 信息流: ${i.feedCount} 条去重后标题，来自 ${i.sourceCount} 个源；异常检测历史样本 ${i.historyDays} 天`);
  out.push(`- 事件聚类: ${i.triage.clusters.length} 个，其中关注列表之外 ${i.triage.clusters.filter(c => c.outsideWatchlist).length} 个；研究调用 ${i.researchCount} 次`);
  if (i.triage.noiseNote) out.push(`- 丢弃的噪音: ${i.triage.noiseNote}`);
  for (const [step, m] of Object.entries(i.meta)) out.push(`- 模型 ${step}: ${m.profile} / ${m.model}${m.tokens ? ` (${m.tokens} tokens)` : ''}`);
  out.push('', '---', '', '**免责声明**: 本报告由自动化流水线生成，仅供参考，不构成投资建议。', '', `*生成时间: ${new Date().toISOString()}*`);
  return out.join('\n');
}

export function renderPrivateBriefing(i: PrivateRenderInput): string {
  const { date, synthesis: s, portfolio: p } = i;
  const out: string[] = regimeHeader(date, s, '私人组合简报');

  out.push('## 一、今天该做什么', '');
  out.push(`**${p.headline}**`, '');
  out.push(`立场: **${p.stance}**`, '');
  out.push(p.exposureReview, '');
  if (p.todayActions.length) {
    out.push('### 行动清单', '');
    for (const a of p.todayActions) {
      out.push(`- [ ] ${a.ticker ? `**${a.ticker}** ` : ''}${a.action} — ${a.condition}`);
      out.push(`  - 理由: ${a.reason}`);
      if (a.invalidation) out.push(`  - 失效条件: ${a.invalidation}`);
    }
    out.push('');
  }

  if (p.holdingsReview.length) {
    out.push('## 二、持仓复核', '');
    out.push('| 标的 | 层级 | 态度 | 安全边际 | 关联 | 关键位 |', '|:--:|:--:|:--:|:--|:--|:--|');
    for (const h of p.holdingsReview) out.push(`| **${h.ticker}** | ${h.tier} | ${h.stance} | ${h.marginOfSafety || ''} | ${h.reason} | ${h.keyLevel || ''} |`);
    out.push('');
  }
  if (p.hedges.length) {
    out.push('## 三、对冲', '');
    for (const h of p.hedges) out.push(`- **${h.instrument}**: ${h.purpose} — ${h.condition}`);
    out.push('');
  }

  out.push('## 四、复盘与记忆', '');
  const byId = new Map(i.privateMemory.calls.map(c => [c.id, c]));
  const scored = p.scorecard.filter(x => x.outcome !== 'pending');
  if (scored.length) {
    out.push('### 昨日判断记分', '');
    for (const x of scored) {
      const c = byId.get(x.callId);
      const icon = x.outcome === 'right' ? '✅' : x.outcome === 'wrong' ? '❌' : '➖';
      out.push(`- ${icon} ${c ? `${c.date}${c.ticker ? ' ' + c.ticker : ''}: ${c.statement}` : x.callId} — ${x.note}`);
    }
    out.push('');
  }
  const all = i.privateMemory.calls.filter(c => c.outcome && c.outcome !== 'pending');
  if (all.length) out.push(`累计记分: ${all.filter(c => c.outcome === 'right').length} / ${all.length} 正确`, '');
  if (p.newCalls.length) {
    out.push('### 今日新判断（待验证）', '');
    for (const c of p.newCalls) out.push(`- ${c.ticker ? `**${c.ticker}** ` : ''}${c.statement}（检验 ${c.checkBy}）`);
    out.push('');
  }
  if (p.watchItems.length) out.push('### 接下来盯什么', '', list(p.watchItems), '');

  if (s.keyLevels.length) {
    out.push('## 附录：关键点位', '');
    out.push('| 工具 | 点位 | 含义 |', '|:--|--:|:--|');
    for (const k of s.keyLevels) out.push(`| ${k.instrument} | ${k.level} | ${k.meaning} |`);
    out.push('');
  }
  const m = i.meta.portfolio;
  out.push('---', '', `*私密文件，请勿转发。模型: ${m ? `${m.profile} / ${m.model}` : '-'}；生成时间: ${new Date().toISOString()}*`);
  return out.join('\n');
}

/** 给 Grok 读的精简文案：只含公开内容 */
export function renderInfographicBrief(i: PublicRenderInput): string {
  const { date, synthesis: s, watchlist: w } = i;
  const out: string[] = [];
  out.push(`# ${date} 全球宏观 × AI 简报 · 信息图文案`, '');
  out.push(`Regime: ${s.regime?.label} | 增长 ${s.regime?.growth} | 通胀 ${s.regime?.inflation} | 流动性 ${s.regime?.liquidity}`);
  out.push(`一句话: ${s.regime?.oneLiner}`, '');
  out.push('## 市场怎么走', s.crossAssetRead || '', '');
  if (i.anomalies.length) out.push('## 今日异常', ...i.anomalies.slice(0, 6).map(a => `- ${a.text}`), '');
  out.push('## 五条主线', ...s.lines.map(l => `- ${l.name}: ${l.state}`), '');
  if (s.deepDives.length) out.push('## 深挖', ...s.deepDives.slice(0, 4).map(d => `- ${d.title}: ${d.mechanism}`), '');
  if (s.surprises.length) out.push('## 盲区', ...s.surprises.map(x => `- ${x.title}`), '');
  if (s.contrarian.length) out.push('## 反方', ...s.contrarian.map(c => `- 共识"${c.consensus}" vs 反方"${c.counter}"`), '');
  out.push('## 产业链强弱', ...w.chainView.map(c => `- ${c.segment}: ${c.bias}，${c.reason}`), '');
  if (w.opportunities.length) out.push('## 关注列表机会', ...w.opportunities.map(o => `- ${o.ticker}: ${o.thesis}`), '');
  if (w.outsideIdeas.length) out.push('## 视野之外', ...w.outsideIdeas.map(o => `- ${o.instrument}: ${o.thesis}`), '');
  if (s.keyLevels.length) out.push('## 关键点位', ...s.keyLevels.map(k => `- ${k.instrument} ${k.level}: ${k.meaning}`), '');
  if (w.watchItems.length) out.push('## 接下来盯', ...w.watchItems.map(x => `- ${x}`), '');
  return out.join('\n');
}

export { WORLD_GROUP_LABELS };
