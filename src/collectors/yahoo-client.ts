/**
 * yahoo-finance2 客户端（支持 HTTPS 代理），供 world-snapshot 与 watchlist-quotes 复用
 */

import YahooFinance from 'yahoo-finance2';

async function getProxyAgent(): Promise<unknown> {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
  if (!proxyUrl) return undefined;
  try {
    const moduleName = 'https-proxy-' + 'agent';
    const mod = await import(/* webpackIgnore: true */ moduleName).catch(() => null);
    if (mod?.HttpsProxyAgent) {
      console.log(`[yahoo] using proxy ${proxyUrl}`);
      return new mod.HttpsProxyAgent(proxyUrl);
    }
  } catch { /* ignore */ }
  return undefined;
}

export async function createYahooFinanceClient(): Promise<InstanceType<typeof YahooFinance>> {
  const agent = await getProxyAgent();
  const options: Record<string, unknown> = { suppressNotices: ['yahooSurvey'] };
  if (agent) options.fetchOptions = { agent };
  return new YahooFinance(options);
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const withTimeout = <T,>(p: Promise<T>, ms = 30000): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`yahoo timeout ${ms}ms`)), ms))]);

/** 分批拉报价，失败的单个重试一次；返回 symbol → 原始 quote */
export async function fetchQuotesBatched(symbols: string[], batchSize = 10): Promise<{ quotes: Map<string, any>; failed: string[] }> {
  const yf = await createYahooFinanceClient();
  const quotes = new Map<string, any>();
  const retry: string[] = [];
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    if (i > 0) await delay(1500);
    try {
      const res = await withTimeout(yf.quote(batch));
      for (const q of Array.isArray(res) ? res : [res]) if (q?.symbol && q.regularMarketPrice != null) quotes.set(q.symbol, q);
      retry.push(...batch.filter(s => !quotes.has(s)));
    } catch (e) {
      console.warn(`[yahoo] batch failed: ${(e as Error).message}`);
      retry.push(...batch);
    }
  }
  const failed: string[] = [];
  for (const s of retry) {
    await delay(1000);
    try {
      const q: any = await withTimeout(yf.quote(s));
      if (q?.regularMarketPrice != null) quotes.set(s, q); else failed.push(s);
    } catch { failed.push(s); }
  }
  return { quotes, failed };
}
