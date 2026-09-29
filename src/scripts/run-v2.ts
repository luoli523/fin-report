/**
 * v2 流水线总控
 *
 * 用法:
 *   npm run v2                     # 完整跑今天
 *   npm run v2 -- --date=2026-09-26
 *   npm run v2 -- --from=triage    # 从某一阶段重跑（复用 data/v2/<date>/ 里已缓存的前序结果）
 *     阶段: snapshot | feeds | detect | triage | research | synthesis | watchlist | portfolio | render
 *
 * 产物:
 *   output/v2-public-<date>.md / .pdf         公开：世界观 + 关注列表
 *   output/v2-private-<date>.md / .pdf        私密：持仓映射（只走 Telegram，不进 artifact）
 *   output/v2-infographic-brief-<date>.md     给 Grok 读的精简文案（公开内容）
 *   data/history/world/<date>.json            提交进仓库，异常检测历史
 *   data/memory/public.json                   提交进仓库，论点记忆
 *   data/memory/private.json                  不提交，CI 用 actions/cache 持久化
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { collectWorldSnapshot, loadWorldHistory, WORLD_HISTORY_DIR } from '../collectors/world-snapshot';
import { collectFeeds } from '../pipeline/feeds';
import { collectWatchlistQuotes } from '../collectors/watchlist-quotes';
import { collectEarnings } from '../pipeline/earnings';
import { detectAnomalies } from '../pipeline/detect';
import { runTriage } from '../pipeline/triage';
import { runResearch } from '../pipeline/research';
import { runSynthesis, runWatchlist, runPortfolio, mergePublicMemory, mergePrivateMemory } from '../pipeline/synthesize';
import { loadHoldings, loadWatchlist, redactHoldings } from '../pipeline/holdings';
import { loadPublicMemory, loadPrivateMemory, savePublicMemory, savePrivateMemory } from '../pipeline/memory';
import { renderPublicBriefing, renderPrivateBriefing, renderInfographicBrief } from '../generators/v2-markdown';
import { markdownToPdf } from '../pipeline/pdf';
import { EarningsEvent, StageMeta, WatchlistQuote, WorldSnapshot } from '../pipeline/types';
import { todayInReportTZ } from '../pipeline/dates';

dotenv.config();
process.umask(0o077);

const STAGES = ['snapshot', 'feeds', 'detect', 'triage', 'research', 'synthesis', 'watchlist', 'portfolio', 'render'] as const;
type Stage = typeof STAGES[number];

const argv = process.argv.slice(2);
const arg = (k: string) => argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const date = arg('date') || todayInReportTZ();
const resume = argv.includes('--resume');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
const requiredCache: Record<Stage, string[]> = {
  snapshot: [`data/history/world/${date}.json`, `data/v2/${date}/quotes.json`],
  feeds: [`data/v2/${date}/feeds.json`, `data/v2/${date}/earnings.json`],
  detect: [`data/v2/${date}/detect.json`], triage: [`data/v2/${date}/triage.json`],
  research: [`data/v2/${date}/research.json`], synthesis: [`data/v2/${date}/synthesis.json`],
  watchlist: [`data/v2/${date}/watchlist.json`], portfolio: [`data/v2/${date}/portfolio.json`], render: [],
};
const from: Stage = (arg('from') as Stage) || (resume ? STAGES.find(s => s === 'render' || requiredCache[s].some(p => !fs.existsSync(p)))! : 'snapshot');
if (!STAGES.includes(from)) throw new Error(`未知阶段 ${from}，可选: ${STAGES.join(', ')}`);
const fromIdx = STAGES.indexOf(from);

const stageDir = path.resolve(process.cwd(), 'data/v2', date);
fs.mkdirSync(stageDir, { recursive: true });
const cachePath = (name: string) => path.join(stageDir, `${name}.json`);
const save = (name: string, data: unknown) => {
  fs.writeFileSync(cachePath(name) + '.tmp', JSON.stringify(data, null, 2));
  fs.renameSync(cachePath(name) + '.tmp', cachePath(name));
};
const load = <T>(name: string): T => {
  const p = cachePath(name);
  if (!fs.existsSync(p)) throw new Error(`缺少缓存 ${p}，无法从 ${from} 阶段续跑`);
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T;
};
const need = (stage: Stage) => STAGES.indexOf(stage) >= fromIdx;

/** 跑或读缓存一个 LLM 阶段 */
async function llmStage<T>(name: Stage, meta: Record<string, StageMeta>, run: () => Promise<{ result: T; meta: StageMeta }>): Promise<T> {
  if (need(name)) {
    const r = await run();
    meta[name] = r.meta;
    save(name, r);
    return r.result;
  }
  const r = load<{ result: T; meta: StageMeta }>(name);
  meta[name] = r.meta;
  return r.result;
}

async function main() {
  if (resume && fs.existsSync(cachePath('complete'))) {
    const done = load<{files:string[]}>('complete');
    if (done.files.every(p => fs.existsSync(p))) { console.log(`[v2] ${date} already complete`); return; }
  }
  if (date !== todayInReportTZ() && (need('snapshot') || need('feeds'))) throw new Error('不能用当前行情或新闻生成历史日期简报');
  // A retry must merge against the same starting memory, including after a crash
  // between saving public and private memory.
  const memoryInput = resume && fs.existsSync(cachePath('memory-input'))
    ? load<{publicMemory:ReturnType<typeof loadPublicMemory>; privateMemory:ReturnType<typeof loadPrivateMemory>}>('memory-input')
    : {publicMemory:loadPublicMemory(), privateMemory:loadPrivateMemory()};
  if (resume && !fs.existsSync(cachePath('memory-input'))) save('memory-input', memoryInput);
  console.log(`\n=== v2 pipeline · ${date} · from=${from} ===\n`);
  const meta: Record<string, StageMeta> = {};

  // 1. 世界快照
  let snapshot: WorldSnapshot;
  if (need('snapshot')) {
    snapshot = await collectWorldSnapshot(date);
  } else {
    snapshot = JSON.parse(fs.readFileSync(path.join(WORLD_HISTORY_DIR, `${date}.json`), 'utf-8'));
  }
  const history = loadWorldHistory(date);
  const wl = need('snapshot') ? await collectWatchlistQuotes() : load<{ quotes: WatchlistQuote[]; failed: string[] }>('quotes');
  if (need('snapshot')) save('quotes', wl);

  // 2. 信息流
  const feeds = need('feeds') ? await collectFeeds() : load<Awaited<ReturnType<typeof collectFeeds>>>('feeds');
  if (need('feeds')) save('feeds', feeds);
  const earnings = need('feeds') ? await collectEarnings() : load<EarningsEvent[]>('earnings');
  if (need('feeds')) save('earnings', earnings);

  // 3. 异常
  const detected = need('detect') ? detectAnomalies(snapshot, history) : load<ReturnType<typeof detectAnomalies>>('detect');
  if (need('detect')) save('detect', detected);

  // 4. 分级
  const triage = await llmStage('triage', meta, () => runTriage(date, snapshot, detected.anomalies, detected.historyDays, feeds.items));

  // 5. 研究
  const research = need('research') ? await runResearch(triage, feeds.items) : load<Awaited<ReturnType<typeof runResearch>>>('research');
  if (need('research')) save('research', research);

  // 6. 世界观（公开记忆）
  const { publicMemory } = memoryInput;
  const synthesis = await llmStage('synthesis', meta, () =>
    runSynthesis(date, snapshot, detected.anomalies, detected.historyDays, triage, feeds.items, research, publicMemory, wl.quotes, earnings));

  // 7. 关注列表映射（公开，不见持仓）
  const watchlistView = await llmStage('watchlist', meta, () => runWatchlist(date, snapshot, synthesis, loadWatchlist(), publicMemory, wl.quotes, earnings));

  // 8. 持仓映射（私密）
  const holdings = loadHoldings();
  const { privateMemory } = memoryInput;
  const portfolio = holdings.length > 0
    ? await llmStage('portfolio', meta, () => runPortfolio(date, snapshot, synthesis, watchlistView, holdings, privateMemory))
    : null;
  if (!portfolio) console.log('[portfolio] 无持仓，跳过私人简报');

  // 9. 渲染
  const outDir = path.resolve(process.cwd(), 'output');
  fs.mkdirSync(outDir, { recursive: true });

  const publicInput = {
    date, snapshot, anomalies: detected.anomalies, historyDays: detected.historyDays,
    triage, synthesis, watchlist: watchlistView, publicMemory, quotes: wl.quotes, earnings,
    feedCount: feeds.items.length, sourceCount: feeds.feedStats.filter(s => !s.error).length,
    researchCount: research.length, meta,
  };
  // 公开输出从未接触持仓，这里的脱敏只是最后一道保险
  const publicMd = redactHoldings(renderPublicBriefing(publicInput), holdings).text;
  const briefMd = redactHoldings(renderInfographicBrief(publicInput), holdings).text;
  const publicPath = path.join(outDir, `v2-public-${date}.md`);
  fs.writeFileSync(publicPath, publicMd);
  fs.writeFileSync(path.join(outDir, `v2-infographic-brief-${date}.md`), briefMd);
  await markdownToPdf(publicMd, path.join(outDir, `v2-public-${date}.pdf`), `全球宏观 × AI 简报 ${date}`);

  let privatePath: string | null = null;
  if (portfolio) {
    const privateMd = renderPrivateBriefing({ date, synthesis, portfolio, privateMemory, meta });
    privatePath = path.join(outDir, `v2-private-${date}.md`);
    fs.writeFileSync(privatePath, privateMd);
    await markdownToPdf(privateMd, path.join(outDir, `v2-private-${date}.pdf`), `私人组合简报 ${date}`);
  }

  // 10. 记忆
  if (resume || need('watchlist')) savePublicMemory(mergePublicMemory(publicMemory, date, synthesis, watchlistView));
  else console.log('[memory] 未重跑 watchlist 阶段，公开记忆不更新');
  if (portfolio && (resume || need('portfolio'))) savePrivateMemory(mergePrivateMemory(privateMemory, date, portfolio));
  else if (portfolio) console.log('[memory] 未重跑 portfolio 阶段，私人记忆不更新');
  save('complete', {date, completedAt:new Date().toISOString(), files:[publicPath, publicPath.replace(/\.md$/, '.pdf'), ...(privatePath ? [privatePath, privatePath.replace(/\.md$/, '.pdf')] : [])]});

  console.log(`\n✅ v2 完成`);
  console.log(`   公开: ${publicPath} (${(fs.statSync(publicPath).size / 1024).toFixed(1)} KB)`);
  if (privatePath) console.log(`   私密: ${privatePath}`);
  console.log(`   阶段缓存: ${stageDir}\n`);
}

main()
  .then(() => process.exit(0)) // 第三方客户端会留下句柄让进程不退出，显式退出
  .catch(e => {
    console.error('\n❌ v2 失败:', e);
    process.exit(1);
  });
