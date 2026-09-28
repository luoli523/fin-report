/**
 * v2 信息流收集：RSS（FEEDS）+ Finnhub general 新闻
 * 只保留最近 windowHours 小时，按标题去重
 */

import Parser from 'rss-parser';
import * as https from 'https';
import { FEEDS } from '../config/feeds';
import { FeedItem } from './types';

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
    Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
  },
});

function clean(s: string | undefined): string {
  return (s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9一-龥]+/g, ' ').trim().slice(0, 80);
}

async function fetchFinnhubGeneral(apiKey: string): Promise<FeedItem[]> {
  const url = `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`;
  const data: any[] = await new Promise((resolve, reject) => {
    https.get(url, { timeout: 20000 }, res => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', c => (buf += c));
      res.on('end', () => {
        try { resolve(res.statusCode === 200 ? JSON.parse(buf) : []); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
  return (data || []).map(n => ({
    id: `finnhub-${n.id}`,
    title: clean(n.headline),
    snippet: clean(n.summary).slice(0, 400),
    url: n.url,
    source: n.source || 'Finnhub',
    category: 'finnhub' as const,
    publishedAt: new Date((n.datetime || 0) * 1000).toISOString(),
  }));
}

export async function collectFeeds(windowHours = 36): Promise<{ items: FeedItem[]; feedStats: Array<{ source: string; count: number; error?: string }> }> {
  const cutoff = Date.now() - windowHours * 3600 * 1000;
  const feedStats: Array<{ source: string; count: number; error?: string }> = [];
  const all: FeedItem[] = [];

  const results = await Promise.allSettled(FEEDS.map(f => parser.parseURL(f.url)));
  results.forEach((r, i) => {
    const def = FEEDS[i];
    if (r.status === 'rejected') {
      feedStats.push({ source: def.source, count: 0, error: String(r.reason?.message || r.reason).slice(0, 120) });
      return;
    }
    let count = 0;
    for (const it of r.value.items || []) {
      const ts = it.isoDate || it.pubDate;
      const published = ts ? new Date(ts) : new Date();
      if (isNaN(published.getTime()) || published.getTime() < cutoff) continue;
      const title = clean(it.title);
      if (!title) continue;
      all.push({
        id: `${def.source}-${it.guid || it.link || count}`.replace(/\s+/g, '-').slice(0, 160),
        title,
        snippet: clean(it.contentSnippet || it.content || it.summary).slice(0, 400),
        url: it.link,
        source: def.source,
        category: def.category,
        publishedAt: published.toISOString(),
      });
      count++;
    }
    feedStats.push({ source: def.source, count });
  });

  if (process.env.FINNHUB_API_KEY) {
    try {
      const fh = (await fetchFinnhubGeneral(process.env.FINNHUB_API_KEY)).filter(i => new Date(i.publishedAt).getTime() >= cutoff);
      all.push(...fh);
      feedStats.push({ source: 'Finnhub general', count: fh.length });
    } catch (e) {
      feedStats.push({ source: 'Finnhub general', count: 0, error: (e as Error).message });
    }
  }

  // 去重
  const seen = new Set<string>();
  const items = all
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter(i => {
      const k = normalizeTitle(i.title);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  const ok = feedStats.filter(s => !s.error).length;
  console.log(`[feeds] ${items.length} unique items from ${ok}/${feedStats.length} sources (window ${windowHours}h)`);
  return { items, feedStats };
}
