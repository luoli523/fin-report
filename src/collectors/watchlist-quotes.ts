/**
 * 关注列表行情：MONITORED_SYMBOLS 里全部指数、ETF、个股的当日报价
 */

import { fetchQuotesBatched } from './yahoo-client';
import { getAllMonitoredSymbols, getIndexSymbols, STOCK_INFO } from '../config';
import { WatchlistQuote } from '../pipeline/types';

const INDEX_NAMES: Record<string, string> = {
  '^GSPC': 'S&P 500', '^DJI': '道琼斯', '^IXIC': '纳斯达克', '^RUT': '罗素2000', '^VIX': 'VIX',
};

export async function collectWatchlistQuotes(): Promise<{ quotes: WatchlistQuote[]; failed: string[] }> {
  const symbols = getAllMonitoredSymbols();
  const indices = new Set(getIndexSymbols());
  const { quotes: raw, failed } = await fetchQuotesBatched(symbols);
  const quotes: WatchlistQuote[] = [];
  for (const s of symbols) {
    const q = raw.get(s);
    if (!q) continue;
    const info = STOCK_INFO[s];
    quotes.push({
      symbol: s,
      name: INDEX_NAMES[s] || info?.name || q.shortName || s,
      category: indices.has(s) ? '指数' : info?.category || '其他',
      isIndex: indices.has(s),
      price: q.regularMarketPrice,
      changePercent: q.regularMarketChangePercent ?? 0,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    });
  }
  console.log(`[watchlist-quotes] ${quotes.length} quotes, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`);
  return { quotes, failed };
}

/** 个股+ETF 按涨跌幅排序（不含指数） */
export function topMovers(quotes: WatchlistQuote[], n = 5): { gainers: WatchlistQuote[]; losers: WatchlistQuote[] } {
  const s = quotes.filter(q => !q.isIndex).sort((a, b) => b.changePercent - a.changePercent);
  return { gainers: s.slice(0, n), losers: s.slice(-n).reverse() };
}

export function formatWatchlistQuotes(quotes: WatchlistQuote[]): string {
  const byCat = new Map<string, WatchlistQuote[]>();
  for (const q of quotes) byCat.set(q.category, [...(byCat.get(q.category) || []), q]);
  return [...byCat.entries()]
    .map(([cat, qs]) => `### ${cat}\n` + qs.map(q => `${q.symbol} ${q.name}: ${q.price.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`).join('\n'))
    .join('\n\n');
}
