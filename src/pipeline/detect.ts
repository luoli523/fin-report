/**
 * v2 异常检测（确定性，不用 LLM）
 * - 每个世界快照标的：今日变动相对过去 N 日变动分布的 z-score
 * - 跨资产背离规则
 * 历史不足 MIN_HISTORY 天时退化为固定阈值
 */

import { WorldSnapshot, WorldQuote, Anomaly } from './types';

const MIN_HISTORY = 15;
const LOOKBACK = 60;
const Z_HIGH = 2.5;
const Z_MED = 1.8;

function dailyMove(q: WorldQuote): number {
  // 收益率/波动率用绝对变化（如 10Y +0.12），价格类用百分比
  return q.isLevel ? q.change : q.changePercent;
}

function fmtMove(q: WorldQuote): string {
  const v = dailyMove(q);
  const sign = v >= 0 ? '+' : '';
  return q.isLevel ? `${sign}${v.toFixed(2)}` : `${sign}${v.toFixed(2)}%`;
}

export function detectAnomalies(today: WorldSnapshot, history: WorldSnapshot[]): { anomalies: Anomaly[]; historyDays: number } {
  const anomalies: Anomaly[] = [];
  const recent = history.slice(-LOOKBACK);
  const historyDays = recent.length;

  for (const q of today.quotes) {
    const move = dailyMove(q);
    const series = recent
      .map(s => s.quotes.find(x => x.symbol === q.symbol))
      .filter((x): x is WorldQuote => !!x)
      .map(dailyMove);

    if (series.length >= MIN_HISTORY) {
      const mean = series.reduce((a, b) => a + b, 0) / series.length;
      const sd = Math.sqrt(series.reduce((a, b) => a + (b - mean) ** 2, 0) / series.length) || 1e-9;
      const z = (move - mean) / sd;
      if (Math.abs(z) >= Z_MED) {
        anomalies.push({
          kind: 'zscore', symbol: q.symbol, value: move, zscore: z,
          severity: Math.abs(z) >= Z_HIGH ? 'high' : 'medium',
          text: `${q.name} ${fmtMove(q)}，相对过去${series.length}日为 ${z.toFixed(1)}σ`,
        });
      }
    } else {
      // 固定阈值兜底
      const th = q.isLevel ? (q.group === 'volatility' ? 3 : 0.1) : (q.group === 'fx' ? 0.8 : q.group === 'crypto' ? 5 : 2.5);
      if (Math.abs(move) >= th) {
        anomalies.push({
          kind: 'threshold', symbol: q.symbol, value: move,
          severity: Math.abs(move) >= th * 1.6 ? 'high' : 'medium',
          text: `${q.name} ${fmtMove(q)}（历史不足，按固定阈值标记）`,
        });
      }
    }
  }

  // 跨资产背离
  const get = (s: string) => today.quotes.find(q => q.symbol === s);
  const spx = get('^GSPC'), tnx = get('^TNX'), dxy = get('DX-Y.NYB'), gold = get('GC=F');
  const hyg = get('HYG'), vix = get('^VIX'), vix3m = get('^VIX3M'), jpy = get('USDJPY=X');
  const move_ = get('^MOVE'), rsp = get('RSP'), tlt = get('TLT'), copper = get('HG=F'), oil = get('CL=F');

  const push = (cond: boolean | undefined, severity: Anomaly['severity'], text: string) => {
    if (cond) anomalies.push({ kind: 'divergence', severity, text });
  };

  push(tnx && dxy && gold && tnx.change > 0.05 && dxy.changePercent < -0.3 && gold.changePercent > 0.5, 'high',
    '收益率上、美元下、黄金上：可能是对美国财政/信用的定价，而非增长交易');
  push(spx && hyg && spx.changePercent > 0.5 && hyg.changePercent < -0.3, 'medium',
    '股涨但高收益债跌：信用市场不认同股市乐观');
  push(spx && vix && spx.changePercent > 0.3 && vix.change > 0.5, 'medium',
    '股涨 VIX 也涨：有人在买保护，上涨质量存疑');
  push(vix && vix3m && vix.price > vix3m.price, 'high',
    `VIX 期限结构倒挂（${vix!.price.toFixed(1)} > ${vix3m!.price.toFixed(1)}）：短期恐慌定价`);
  push(jpy && jpy.changePercent < -1.0, 'high',
    `日元单日升值 ${Math.abs(jpy!.changePercent).toFixed(2)}%：警惕套息交易平仓压力`);
  push(move_ && move_.change > 6, 'high', `MOVE 单日跳升 ${move_!.change.toFixed(1)}：债市波动率冲击`);
  push(spx && rsp && spx.changePercent - rsp.changePercent > 0.6, 'medium',
    '标普明显跑赢等权指数：涨幅集中在少数巨头，广度差');
  push(spx && tlt && spx.changePercent < -1 && tlt.changePercent < -0.5, 'high',
    '股债同跌：传统对冲失效，流动性或通胀恐慌');
  push(copper && oil && copper.changePercent < -2 && oil.changePercent < -2, 'medium',
    '铜油同跌：市场在交易全球需求走弱');

  anomalies.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1));
  console.log(`[detect] ${anomalies.length} anomalies (history ${historyDays} days)`);
  return { anomalies, historyDays };
}
