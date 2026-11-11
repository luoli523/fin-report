/**
 * 世界快照收集器（v2）
 * 拉取 WORLD_SYMBOLS 全部报价，写入 data/history/world/YYYY-MM-DD.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fetchQuotesBatched } from './yahoo-client';
import { WORLD_SYMBOLS } from '../config/world-symbols';
import { WorldQuote, WorldSnapshot } from '../pipeline/types';

export const WORLD_HISTORY_DIR = path.resolve(process.cwd(), 'data/history/world');

export async function collectWorldSnapshot(date: string): Promise<WorldSnapshot> {
  const bySymbol = new Map(WORLD_SYMBOLS.map(s => [s.symbol, s]));
  const symbols = WORLD_SYMBOLS.map(s => s.symbol);
  const quotes: WorldQuote[] = [];

  const toQuote = (q: any): WorldQuote | null => {
    const def = bySymbol.get(q?.symbol);
    if (!def || q.regularMarketPrice == null) return null;
    return {
      symbol: def.symbol,
      name: def.name,
      group: def.group,
      isLevel: def.isLevel,
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
      marketTime: q.regularMarketTime ? new Date(q.regularMarketTime * 1000).toISOString() : undefined,
    };
  };

  const { quotes: raw, failed } = await fetchQuotesBatched(symbols);
  for (const s of symbols) {
    const wq = toQuote(raw.get(s));
    if (wq) quotes.push(wq);
  }

  // 大面积失败多半是网络没通：不落盘，让 --resume 重试时重新抓取，而不是基于空快照续跑
  if (quotes.length < symbols.length / 2) {
    throw new Error(`世界快照只拿到 ${quotes.length}/${symbols.length} 个行情，疑似网络或 Yahoo 故障；检查网络后重跑`);
  }
  const snapshot: WorldSnapshot = { date, collectedAt: new Date().toISOString(), quotes, failed };
  await fs.promises.mkdir(WORLD_HISTORY_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(WORLD_HISTORY_DIR, `${date}.json`), JSON.stringify(snapshot, null, 2));
  console.log(`[world-snapshot] ${quotes.length} quotes, ${failed.length} failed${failed.length ? ': ' + failed.join(', ') : ''}`);
  return snapshot;
}

/** 读取历史快照（不含当天），按日期升序 */
export function loadWorldHistory(beforeDate: string, maxDays = 90): WorldSnapshot[] {
  if (!fs.existsSync(WORLD_HISTORY_DIR)) return [];
  return fs.readdirSync(WORLD_HISTORY_DIR)
    .filter(f => f.endsWith('.json') && f.slice(0, 10) < beforeDate)
    .sort()
    .slice(-maxDays)
    .map(f => JSON.parse(fs.readFileSync(path.join(WORLD_HISTORY_DIR, f), 'utf-8')) as WorldSnapshot);
}
