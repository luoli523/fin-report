/**
 * v2 研究步骤：Tavily 搜索 + 正文抽取
 * 未配置 TAVILY_API_KEY 时跳过，返回空结果
 */

import { FeedItem, ResearchFinding, TriageResult } from './types';

const TAVILY = 'https://api.tavily.com';
const MAX_SEARCHES = 5;
const MAX_EXTRACT_URLS = 10;
const MAX_CONTENT_CHARS = 3500;

async function tavily(endpoint: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${TAVILY}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Tavily ${endpoint} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function runResearch(triage: TriageResult, items: FeedItem[]): Promise<ResearchFinding[]> {
  if (!process.env.TAVILY_API_KEY) {
    console.log('[research] TAVILY_API_KEY 未设置，跳过研究步骤');
    return [];
  }
  const findings: ResearchFinding[] = [];

  // 1) 追问搜索
  for (const q of triage.researchQuestions.slice(0, MAX_SEARCHES)) {
    try {
      const r = await tavily('/search', { query: q, topic: 'news', days: 4, max_results: 5, search_depth: 'advanced', include_answer: 'advanced' });
      const results = (r.results || []).map((x: any) => ({
        title: x.title, url: x.url, publishedDate: x.published_date,
        content: String(x.content || '').slice(0, 1200),
      }));
      if (r.answer) results.unshift({ title: 'Tavily 综合回答', url: '', content: String(r.answer).slice(0, 1500) });
      findings.push({ question: q, kind: 'search', results });
      console.log(`[research] search ok: ${q}`);
    } catch (e) {
      console.warn(`[research] search failed: ${q}: ${(e as Error).message}`);
    }
  }

  // 2) 对最重要聚类的代表文章抽正文
  const byId = new Map(items.map(i => [i.id, i]));
  const urls: Array<{ url: string; clusterTitle: string }> = [];
  for (const c of [...triage.clusters].sort((a, b) => b.importance - a.importance)) {
    for (const id of c.itemIds.slice(0, 2)) {
      const it = byId.get(id);
      if (it?.url && /^https?:/.test(it.url) && !urls.some(u => u.url === it.url)) urls.push({ url: it.url, clusterTitle: c.title });
      if (urls.length >= MAX_EXTRACT_URLS) break;
    }
    if (urls.length >= MAX_EXTRACT_URLS) break;
  }
  if (urls.length > 0) {
    try {
      const r = await tavily('/extract', { urls: urls.map(u => u.url), extract_depth: 'basic' });
      const byUrl = new Map<string, any>((r.results || []).map((x: any) => [x.url, x]));
      const grouped = new Map<string, ResearchFinding>();
      for (const u of urls) {
        const x = byUrl.get(u.url);
        if (!x?.raw_content) continue;
        const f = grouped.get(u.clusterTitle) || { clusterTitle: u.clusterTitle, kind: 'extract' as const, results: [] };
        f.results.push({ title: x.title || u.url, url: u.url, content: String(x.raw_content).replace(/\s+/g, ' ').slice(0, MAX_CONTENT_CHARS) });
        grouped.set(u.clusterTitle, f);
      }
      findings.push(...grouped.values());
      console.log(`[research] extracted ${r.results?.length ?? 0}/${urls.length} articles`);
    } catch (e) {
      console.warn(`[research] extract failed: ${(e as Error).message}`);
    }
  }
  return findings;
}
