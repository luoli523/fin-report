/**
 * v2 持仓与 watchlist
 * - 持仓来自 HOLDINGS_JSON 环境变量，或 data/private/holdings.json（已 gitignore）
 * - 报告中禁止出现真实持仓的权重/成本/股数：redactHoldings 做最后一道确定性检查
 */

import * as fs from 'fs';
import * as path from 'path';
import { Holding, WatchlistQuote } from './types';
import { getStockSymbols, getETFSymbols } from '../config';

export function loadHoldings(): Holding[] {
  let raw = process.env.HOLDINGS_JSON || '';
  const file = path.resolve(process.cwd(), 'data/private/holdings.json');
  if (!raw && fs.existsSync(file)) raw = fs.readFileSync(file, 'utf-8');
  if (!raw.trim()) {
    console.log('[holdings] 未提供持仓，只用 watchlist');
    return [];
  }
  const parsed = JSON.parse(raw);
  const list: Holding[] = Array.isArray(parsed) ? parsed : parsed.holdings || [];
  return list
    .filter(h => h && h.ticker)
    .map(h => ({ ticker: String(h.ticker).toUpperCase(), tier: h.tier === 'satellite' ? 'satellite' : 'core', costBasis: h.costBasis, note: h.note }));
}

export function loadWatchlist(): string[] {
  return [...getStockSymbols(), ...getETFSymbols()];
}

/** 提供给模型的持仓描述：只有 ticker、层级、成本价（用于判断安全边际），不含数量与权重 */
export function describeHoldingsForLLM(holdings: Holding[]): string {
  if (holdings.length === 0) return '（未提供真实持仓，请把 watchlist 中的核心票视为关注对象）';
  return holdings
    .map(h => `- ${h.ticker}（${h.tier === 'core' ? '核心' : '卫星'}）${h.costBasis ? ` 成本约 $${h.costBasis}` : ''}${h.note ? ` 备注: ${h.note}` : ''}`)
    .join('\n');
}

/** 持仓当日行情：没有当前价时模型会拿成本价冒充现价，缺行情的要明确告知 */
export function describeHoldingQuotesForLLM(holdings: Holding[], quotes: WatchlistQuote[]): string {
  const bySymbol = new Map(quotes.map(q => [q.symbol.toUpperCase(), q]));
  return holdings
    .map(h => {
      const q = bySymbol.get(h.ticker);
      return q
        ? `- ${h.ticker}: ${q.price.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`
        : `- ${h.ticker}: 今日行情缺失，不要推断当前价`;
    })
    .join('\n');
}

/** 扫描输出，把成本价数字替换掉，防止泄露 */
export function redactHoldings(text: string, holdings: Holding[]): { text: string; hits: number } {
  let hits = 0;
  let out = text;
  if (holdings.length === 0) return { text, hits };
  for (const h of holdings) {
    if (!h.costBasis) continue;
    const cb = h.costBasis;
    const variants = [...new Set([cb.toFixed(0), cb.toFixed(1), cb.toFixed(2), String(cb)])].sort((a, b) => b.length - a.length);
    for (const v of variants) {
      const re = new RegExp(`(成本[^0-9$]{0,6}\\$?|\\$)${v.replace('.', '\\.')}(?![0-9])`, 'g');
      out = out.replace(re, m => { hits++; return m.replace(v, '[已隐藏]'); });
    }
  }
  const words = /(持仓|仓位)[^\n]{0,12}?(占|约|为|是|比例|权重)[^\n]{0,4}?(\d{1,3}(\.\d+)?\s*%|\d+\s*股)/g;
  out = out.replace(words, m => { hits++; return m.replace(/(\d{1,3}(\.\d+)?\s*%|\d+\s*股)/, '[已隐藏]'); });
  if (hits) console.log(`[holdings] 隐去 ${hits} 处可能泄露持仓的表述`);
  return { text: out, hits };
}
