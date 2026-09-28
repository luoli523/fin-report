/**
 * 未来 14 天关注列表财报日历（Finnhub 免费接口）。无 key 时返回空。
 */

import { getStockSymbols } from '../config';
import { EarningsEvent } from './types';

export async function collectEarnings(): Promise<EarningsEvent[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    console.log('[earnings] FINNHUB_API_KEY 未设置，跳过财报日历');
    return [];
  }
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  try {
    const res = await fetch(`https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${key}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    const watch = new Set(getStockSymbols());
    const events: EarningsEvent[] = (data.earningsCalendar || [])
      .filter((e: any) => watch.has(e.symbol))
      .map((e: any) => ({
        symbol: e.symbol, date: e.date,
        hour: e.hour === 'bmo' ? '盘前' : e.hour === 'amc' ? '盘后' : '',
        epsEstimate: e.epsEstimate ?? undefined,
        revenueEstimate: e.revenueEstimate ?? undefined,
      }))
      .sort((a: EarningsEvent, b: EarningsEvent) => a.date.localeCompare(b.date));
    console.log(`[earnings] ${events.length} upcoming reports in watchlist`);
    return events;
  } catch (e) {
    console.warn(`[earnings] failed: ${(e as Error).message}`);
    return [];
  }
}

export function formatEarnings(events: EarningsEvent[]): string {
  if (events.length === 0) return '（未来两周关注列表内无财报，或未获取）';
  return events.map(e => `- ${e.date} ${e.hour} ${e.symbol}${e.epsEstimate != null ? ` EPS预期 ${e.epsEstimate}` : ''}${e.revenueEstimate ? ` 收入预期 $${(e.revenueEstimate / 1e9).toFixed(2)}B` : ''}`).join('\n');
}
