/**
 * 统一数据收集脚本
 * 运行所有可用的收集器，收集完整的财经数据
 *
 * 运行: npm run collect
 * 
 * 数据源说明:
 * - Yahoo Finance: 市场行情 (免费)
 * - Finnhub: 新闻 + 国会交易 (免费 API Key)
 * - FRED: 宏观经济数据 (免费 API Key)
 * - Polymarket: 预测市场 (免费)
 * - ApeWisdom: Reddit 情绪 (免费)
 * - SEC EDGAR: 对冲基金 13F (免费)
 * - StockGeist: X.com 情绪 (免费层可选)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  YahooFinanceCollector,
  FinnhubCollector,
  FredCollector,
  CongressTradingCollector,
  HedgeFundCollector,
  PredictionMarketCollector,
  SocialSentimentCollector,
  TwitterSentimentCollector,
  ForexCollector,
  EarningsCalendarCollector,
  CollectedData,
} from '../collectors/index.js';
import { appConfig, STOCK_INFO, AI_INDUSTRY_CATEGORIES } from '../config/index.js';

// 收集结果汇总
interface CollectionSummary {
  timestamp: Date;
  collectors: {
    name: string;
    status: 'success' | 'failed' | 'skipped';
    itemCount?: number;
    error?: string;
    duration?: number;
  }[];
  totalItems: number;
  outputFile: string;
}

// 合并后的数据
interface AggregatedData {
  collectedAt: Date;
  market?: CollectedData;
  news?: CollectedData;
  economic?: CollectedData;
  forex?: CollectedData;                // 美元指数、美债收益率、外汇
  congressTrading?: CollectedData;
  hedgeFund?: CollectedData;
  predictionMarket?: CollectedData;
  socialSentiment?: CollectedData;      // Reddit (ApeWisdom)
  twitterSentiment?: CollectedData;     // X.com (StockGeist)
  summary: CollectionSummary;
}

/**
 * 生成整合的 Markdown 文件
 * 方便拷贝转发给其他应用（如 infographic 生成器、slides 等）
 */
function generateConsolidatedMarkdown(data: AggregatedData): string {
  const dateStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const timeStr = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines: string[] = [];

  // 标题
  lines.push(`# AI 产业链每日数据汇总`);
  lines.push(`> 数据收集时间: ${dateStr} ${timeStr}`);
  lines.push('');

  // ==================== 市场数据 ====================
  if (data.market?.items && data.market.items.length > 0) {
    lines.push('---');
    lines.push('## 一、市场行情数据');
    lines.push('');

    // 按分类组织股票数据
    const marketItems = data.market.items;
    const symbolDataMap = new Map<string, any>();

    for (const item of marketItems) {
      const symbol = item.metadata?.symbol || item.id;
      symbolDataMap.set(symbol, item.metadata);
    }

    // 1. 主要指数
    lines.push('### 1. 主要指数');
    lines.push('| 指数 | 最新价 | 涨跌幅 | 成交量 |');
    lines.push('|------|--------|--------|--------|');

    const indices = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX'];
    for (const symbol of indices) {
      const d = symbolDataMap.get(symbol);
      if (d) {
        const sign = d.changePercent >= 0 ? '+' : '';
        const emoji = d.changePercent >= 0 ? '🟢' : '🔴';
        const volume = d.volume ? formatVolume(d.volume) : '-';
        lines.push(`| ${emoji} ${d.name} | $${formatNumber(d.price)} | ${sign}${d.changePercent?.toFixed(2)}% | ${volume} |`);
      }
    }
    lines.push('');

    // 2. ETF
    lines.push('### 2. ETF');
    lines.push('| ETF | 最新价 | 涨跌幅 |');
    lines.push('|-----|--------|--------|');

    const etfs = ['SMH', 'SOXX', 'QQQ', 'ARKQ', 'BOTZ', 'GLD'];
    for (const symbol of etfs) {
      const d = symbolDataMap.get(symbol);
      if (d) {
        const sign = d.changePercent >= 0 ? '+' : '';
        const emoji = d.changePercent >= 0 ? '🟢' : '🔴';
        lines.push(`| ${emoji} ${d.name || symbol} | $${formatNumber(d.price)} | ${sign}${d.changePercent?.toFixed(2)}% |`);
      }
    }
    lines.push('');

    // 3. AI 产业链分类
    lines.push('### 3. AI 产业链个股');
    lines.push('');

    const categories: Record<string, string[]> = {
      'GPU/加速与半导体': ['NVDA', 'AMD', 'AVGO', 'QCOM', 'MU', 'ARM'],
      '晶圆与制造': ['TSM', 'ASML'],
      '设备/EDA': ['AMAT', 'LRCX', 'KLAC', 'SNPS', 'CDNS'],
      '服务器与基础设施': ['SMCI', 'DELL', 'HPE', 'ANET', 'VRT', 'ETN'],
      '云与平台': ['MSFT', 'AMZN', 'GOOGL', 'ORCL'],
      '应用与软件': ['META', 'ADBE', 'CRM', 'NOW', 'SNOW', 'DDOG'],
      '自动驾驶/机器人': ['TSLA', 'MBLY', 'ABB', 'FANUY'],
      '数据中心能源': ['VST', 'CEG', 'OKLO', 'BE'],
      '其他': ['AAPL', 'INTC', 'MRVL', 'PLTR', 'LLY', 'JPM'],
    };

    for (const [category, symbols] of Object.entries(categories)) {
      lines.push(`#### ${category}`);
      lines.push('| 公司 | 代码 | 最新价 | 涨跌幅 | 市值 |');
      lines.push('|------|------|--------|--------|------|');

      for (const symbol of symbols) {
        const d = symbolDataMap.get(symbol);
        if (d) {
          const sign = d.changePercent >= 0 ? '+' : '';
          const emoji = d.changePercent >= 0 ? '🟢' : '🔴';
          const marketCap = d.marketCap ? formatMarketCap(d.marketCap) : '-';
          const stockInfo = STOCK_INFO[symbol];
          const name = stockInfo?.name || d.name || symbol;
          lines.push(`| ${emoji} ${name} | ${symbol} | $${formatNumber(d.price)} | ${sign}${d.changePercent?.toFixed(2)}% | ${marketCap} |`);
        }
      }
      lines.push('');
    }

    // 4. 涨跌幅排行
    lines.push('### 4. 今日涨跌幅排行');
    lines.push('');

    const stockItems = marketItems
      .filter(item => !item.id.startsWith('^') && !['SMH', 'SOXX', 'QQQ', 'ARKQ', 'BOTZ', 'GLD'].includes(item.id))
      .map(item => item.metadata)
      .filter(d => d && typeof d.changePercent === 'number');

    const sorted = stockItems.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));

    lines.push('**🔥 涨幅前5**');
    lines.push('| 公司 | 代码 | 涨幅 | 价格 |');
    lines.push('|------|------|------|------|');
    for (const d of sorted.slice(0, 5)) {
      if (d.changePercent > 0) {
        lines.push(`| ${d.name} | ${d.symbol} | +${d.changePercent?.toFixed(2)}% | $${formatNumber(d.price)} |`);
      }
    }
    lines.push('');

    lines.push('**📉 跌幅前5**');
    lines.push('| 公司 | 代码 | 跌幅 | 价格 |');
    lines.push('|------|------|------|------|');
    for (const d of sorted.slice(-5).reverse()) {
      if (d.changePercent < 0) {
        lines.push(`| ${d.name} | ${d.symbol} | ${d.changePercent?.toFixed(2)}% | $${formatNumber(d.price)} |`);
      }
    }
    lines.push('');
  }

  // ==================== 财经新闻 ====================
  if (data.news?.items && data.news.items.length > 0) {
    lines.push('---');
    lines.push('## 二、财经新闻要点');
    lines.push('');

    const newsItems = data.news.items.slice(0, 20); // 取前20条

    for (let i = 0; i < newsItems.length; i++) {
      const news = newsItems[i];
      const time = new Date(news.timestamp).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const source = news.metadata?.source || 'Unknown';

      lines.push(`### ${i + 1}. ${news.title}`);
      lines.push(`> 来源: ${source} | 时间: ${time}`);
      lines.push('');
      if (news.content) {
        lines.push(news.content);
      }
      if (news.metadata?.url) {
        lines.push(`[阅读原文](${news.metadata.url})`);
      }
      lines.push('');
    }
  }

  // ==================== 经济指标 ====================
  if (data.economic?.items && data.economic.items.length > 0) {
    lines.push('---');
    lines.push('## 三、宏观经济指标');
    lines.push('');
    lines.push('| 指标 | 最新值 | 变化 | 数据日期 |');
    lines.push('|------|--------|------|----------|');

    for (const item of data.economic.items) {
      const d = item.metadata;
      if (d) {
        const sign = (d.change || 0) >= 0 ? '+' : '';
        const changeStr = d.change !== undefined ? `${sign}${d.change.toFixed(2)}` : '-';
        const dateStr = d.date ? new Date(d.date).toLocaleDateString('zh-CN') : '-';
        lines.push(`| ${d.name} | ${d.value?.toFixed(2)} ${d.unit} | ${changeStr} | ${dateStr} |`);
      }
    }
    lines.push('');
  }

  // ==================== 智慧资金数据 ====================
  // 国会交易
  if (data.congressTrading?.items && data.congressTrading.items.length > 0) {
    lines.push('---');
    lines.push('## 四、国会交易披露');
    lines.push('');
    lines.push('| 议员 | 党派 | 股票 | 操作 | 金额 | 日期 |');
    lines.push('|------|------|------|------|------|------|');

    for (const item of data.congressTrading.items.slice(0, 15)) {
      const d = item.metadata;
      if (d) {
        const party = d.party === 'D' ? '🔵民主党' : d.party === 'R' ? '🔴共和党' : '⚪独立';
        const action = d.transactionType === 'buy' ? '📈买入' : '📉卖出';
        const date = d.transactionDate ? new Date(d.transactionDate).toLocaleDateString('zh-CN') : '-';
        lines.push(`| ${d.politician} | ${party} | ${d.ticker} | ${action} | ${d.amount} | ${date} |`);
      }
    }
    lines.push('');
  }

  // 预测市场
  if (data.predictionMarket?.items && data.predictionMarket.items.length > 0) {
    lines.push('---');
    lines.push('## 五、预测市场赔率 (Polymarket)');
    lines.push('');

    for (const item of data.predictionMarket.items.slice(0, 10)) {
      const outcomes = item.metadata?.outcomes || [];
      lines.push(`### ${item.title}`);
      lines.push(`交易量: $${(item.metadata?.volume || 0).toLocaleString()}`);
      lines.push('');
      lines.push('| 选项 | 概率 |');
      lines.push('|------|------|');
      for (const outcome of outcomes) {
        const prob = ((outcome.probability || 0) * 100).toFixed(1);
        lines.push(`| ${outcome.name} | ${prob}% |`);
      }
      lines.push('');
    }
  }

  // 社交情绪
  if (data.socialSentiment?.items && data.socialSentiment.items.length > 0) {
    lines.push('---');
    lines.push('## 六、Reddit 社交情绪 (ApeWisdom)');
    lines.push('');
    lines.push('| 股票 | Reddit排名 | 提及数 | 情绪 |');
    lines.push('|------|-----------|--------|------|');

    for (const item of data.socialSentiment.items.slice(0, 15)) {
      const d = item.metadata;
      if (d) {
        const emoji = d.sentiment === 'bullish' ? '🟢' : d.sentiment === 'bearish' ? '🔴' : '⚪';
        lines.push(`| ${d.ticker} | #${d.rank || '-'} | ${d.mentions?.toLocaleString() || '-'} | ${emoji} ${d.sentiment} |`);
      }
    }
    lines.push('');
  }

  // X.com 情绪
  if (data.twitterSentiment?.items && data.twitterSentiment.items.length > 0) {
    lines.push('---');
    lines.push('## 七、X.com 情绪 (StockGeist)');
    lines.push('');
    lines.push('| 股票 | 情绪分数 | 提及量 | 趋势 |');
    lines.push('|------|----------|--------|------|');

    for (const item of data.twitterSentiment.items.slice(0, 15)) {
      const d = item.metadata;
      if (d) {
        const scoreSign = d.sentimentScore > 0 ? '+' : '';
        const emoji = d.sentiment === 'bullish' ? '🟢' : d.sentiment === 'bearish' ? '🔴' : '⚪';
        const trending = d.trending ? '🔥' : '';
        lines.push(`| ${d.ticker} | ${scoreSign}${d.sentimentScore?.toFixed(0)} | ${d.messageVolume?.toLocaleString() || '-'} | ${emoji} ${trending} |`);
      }
    }
    lines.push('');
  }

  // ==================== 数据统计 ====================
  lines.push('---');
  lines.push('## 数据收集统计');
  lines.push('');
  lines.push('| 数据源 | 状态 | 数据条数 | 耗时 |');
  lines.push('|--------|------|----------|------|');

  for (const collector of data.summary.collectors) {
    const statusIcon = collector.status === 'success' ? '✅' :
                       collector.status === 'skipped' ? '⏭️' : '❌';
    const itemCount = collector.itemCount !== undefined ? `${collector.itemCount}` : '-';
    const duration = collector.duration ? `${(collector.duration / 1000).toFixed(1)}s` : '-';
    lines.push(`| ${statusIcon} ${collector.name} | ${collector.status} | ${itemCount} | ${duration} |`);
  }
  lines.push('');
  lines.push(`**总计**: ${data.summary.totalItems} 条数据`);
  lines.push('');

  // 尾部
  lines.push('---');
  lines.push('*本数据由 Finance Briefing Agent 自动收集整理，仅供参考，不构成投资建议。*');

  return lines.join('\n');
}

// 格式化数字
function formatNumber(num: number): string {
  if (num === undefined || num === null) return '-';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 格式化成交量
function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toString();
}

// 格式化市值
function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap}`;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Finance Briefing Agent - Data Collection             ║');
  console.log('║       (All Free APIs - No Paid Subscriptions)              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  const startTime = Date.now();
  const summary: CollectionSummary = {
    timestamp: new Date(),
    collectors: [],
    totalItems: 0,
    outputFile: '',
  };

  const aggregatedData: AggregatedData = {
    collectedAt: new Date(),
    summary,
  };

  // 1. Yahoo Finance - 市场数据（免费）
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 📊 [1/9] Yahoo Finance - Market Data (Free)                  │');
  console.log('└──────────────────────────────────────────────────────────────┘');

  try {
    const yahooStart = Date.now();
    const yahooCollector = new YahooFinanceCollector({ saveRaw: true });
    const marketData = await yahooCollector.collect();

    aggregatedData.market = marketData;
    summary.collectors.push({
      name: 'yahoo-finance',
      status: 'success',
      itemCount: marketData.items.length,
      duration: Date.now() - yahooStart,
    });
    summary.totalItems += marketData.items.length;

    console.log(`✅ Collected ${marketData.items.length} market quotes\n`);
  } catch (error) {
    summary.collectors.push({
      name: 'yahoo-finance',
      status: 'failed',
      error: (error as Error).message,
    });
    console.error(`❌ Failed: ${(error as Error).message}\n`);
  }

  // 2. Finnhub - 财经新闻 + 核心个股新闻（免费 API Key）
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 📰 [2/9] Finnhub - Market & Company News (Free API Key)      │');
  console.log('└──────────────────────────────────────────────────────────────┘');

  if (appConfig.finnhub.apiKey) {
    try {
      const finnhubStart = Date.now();
      const finnhubCollector = new FinnhubCollector({
        apiKey: appConfig.finnhub.apiKey,
        saveRaw: true,
      });

      // General market news
      const newsData = await finnhubCollector.collect();

      // Per-ticker company news for core holdings
      const coreSymbols = ['NVDA', 'MSFT', 'GOOGL', 'TSM', 'META', 'AMZN', 'AMD', 'AVGO'];
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let companyNewsCount = 0;

      for (const symbol of coreSymbols) {
        try {
          const companyNews = await finnhubCollector.fetchCompanyNews(symbol, yesterday, today);
          if (companyNews.length > 0) {
            const companyItems = companyNews.slice(0, 5).map(article => ({
              id: article.id,
              title: article.headline,
              content: article.summary,
              timestamp: article.publishedAt,
              metadata: { ...article, companySymbol: symbol },
            }));
            newsData.items.push(...companyItems);
            companyNewsCount += companyItems.length;
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch {
          // Skip failed company news silently
        }
      }

      aggregatedData.news = newsData;
      summary.collectors.push({
        name: 'finnhub-news',
        status: 'success',
        itemCount: newsData.items.length,
        duration: Date.now() - finnhubStart,
      });
      summary.totalItems += newsData.items.length;

      console.log(`✅ Collected ${newsData.items.length} news articles (${companyNewsCount} company-specific)\n`);
    } catch (error) {
      summary.collectors.push({
        name: 'finnhub-news',
        status: 'failed',
        error: (error as Error).message,
      });
      console.error(`❌ Failed: ${(error as Error).message}\n`);
    }
  } else {
    summary.collectors.push({
      name: 'finnhub-news',
      status: 'skipped',
      error: 'FINNHUB_API_KEY not configured',
    });
    console.log('⏭️  Skipped: FINNHUB_API_KEY not configured\n');
  }

  // 3. FRED - 宏观经济数据（免费 API Key）
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 🏦 [3/9] FRED - Economic Indicators (Free API Key)           │');
  console.log('└──────────────────────────────────────────────────────────────┘');

  if (appConfig.fred.apiKey) {
    try {
      const fredStart = Date.now();
      const fredCollector = new FredCollector({
        apiKey: appConfig.fred.apiKey,
        saveRaw: true,
      });
      const economicData = await fredCollector.collect();

      aggregatedData.economic = economicData;
      summary.collectors.push({
        name: 'fred',
        status: 'success',
        itemCount: economicData.items.length,
        duration: Date.now() - fredStart,
      });
      summary.totalItems += economicData.items.length;

      console.log(`✅ Collected ${economicData.items.length} economic indicators\n`);
    } catch (error) {
      summary.collectors.push({
        name: 'fred',
        status: 'failed',
        error: (error as Error).message,
      });
      console.error(`❌ Failed: ${(error as Error).message}\n`);
    }
  } else {
    summary.collectors.push({
      name: 'fred',
      status: 'skipped',
      error: 'FRED_API_KEY not configured',
    });
    console.log('⏭️  Skipped: FRED_API_KEY not configured\n');
  }

  // 4. Finnhub - 国会交易数据（免费，复用 Finnhub API Key）
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 🏛️  [4/9] Finnhub - Congress Trading (Free)                   │');
  console.log('└──────────────────────────────────────────────────────────────┘');

  if (appConfig.finnhub.apiKey) {
    try {
      const congressStart = Date.now();
      const congressCollector = new CongressTradingCollector({
        apiKey: appConfig.finnhub.apiKey,
        saveRaw: true,
        daysBack: appConfig.congressTrading?.daysBack || 30,
      });
      const congressData = await congressCollector.collect();

      aggregatedData.congressTrading = congressData;
      summary.collectors.push({
        name: 'congress-trading',
        status: 'success',
        itemCount: congressData.items.length,
        duration: Date.now() - congressStart,
      });
      summary.totalItems += congressData.items.length;

      console.log(`✅ Collected ${congressData.items.length} congress trades\n`);
    } catch (error) {
      summary.collectors.push({
        name: 'congress-trading',
        status: 'failed',
        error: (error as Error).message,
      });
      console.error(`❌ Failed: ${(error as Error).message}\n`);
    }
  } else {
    summary.collectors.push({
      name: 'congress-trading',
      status: 'skipped',
      error: 'FINNHUB_API_KEY not configured',
    });
    console.log('⏭️  Skipped: FINNHUB_API_KEY not configured\n');
  }

  // 5. SEC EDGAR - 对冲基金 13F 持仓（免费公开数据）
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 🏦 [5/9] SEC EDGAR - Hedge Fund 13F (Free Public Data)       │');
  console.log('└──────────────────────────────────────────────────────────────┘');

  try {
    const hedgeStart = Date.now();
    const hedgeCollector = new HedgeFundCollector({
      saveRaw: true,
      topFunds: 10,
    });
    const hedgeFundData = await hedgeCollector.collect();

    aggregatedData.hedgeFund = hedgeFundData;
    summary.collectors.push({
      name: 'hedge-fund-13f',
      status: 'success',
      itemCount: hedgeFundData.items.length,
      duration: Date.now() - hedgeStart,
    });
    summary.totalItems += hedgeFundData.items.length;

    console.log(`✅ Collected ${hedgeFundData.items.length} hedge fund holdings\n`);
  } catch (error) {
    summary.collectors.push({
      name: 'hedge-fund-13f',
      status: 'failed',
      error: (error as Error).message,
    });
    console.error(`❌ Failed: ${(error as Error).message}\n`);
  }

  // 6. Polymarket - 预测市场数据（免费）
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 🔮 [6/9] Polymarket - Prediction Markets (Free)              │');
  console.log('└──────────────────────────────────────────────────────────────┘');

  try {
    const polyStart = Date.now();
    const polyCollector = new PredictionMarketCollector({
      saveRaw: true,
      minVolume: 10000,
    });
    const predictionData = await polyCollector.collect();

    aggregatedData.predictionMarket = predictionData;
    summary.collectors.push({
      name: 'polymarket',
      status: 'success',
      itemCount: predictionData.items.length,
      duration: Date.now() - polyStart,
    });
    summary.totalItems += predictionData.items.length;

    console.log(`✅ Collected ${predictionData.items.length} prediction markets\n`);
  } catch (error) {
    summary.collectors.push({
      name: 'polymarket',
      status: 'failed',
      error: (error as Error).message,
    });
    console.error(`❌ Failed: ${(error as Error).message}\n`);
  }

  // 7. ApeWisdom - Reddit 社交情绪（免费）
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 📱 [7/9] ApeWisdom - Reddit Sentiment (Free)                 │');
  console.log('└──────────────────────────────────────────────────────────────┘');

  try {
    const redditStart = Date.now();
    const redditCollector = new SocialSentimentCollector({
      saveRaw: true,
      includeMessages: false,
    });
    const sentimentData = await redditCollector.collect();

    aggregatedData.socialSentiment = sentimentData;
    summary.collectors.push({
      name: 'reddit-sentiment',
      status: 'success',
      itemCount: sentimentData.items.length,
      duration: Date.now() - redditStart,
    });
    summary.totalItems += sentimentData.items.length;

    console.log(`✅ Collected sentiment for ${sentimentData.items.length} symbols\n`);
  } catch (error) {
    summary.collectors.push({
      name: 'reddit-sentiment',
      status: 'failed',
      error: (error as Error).message,
    });
    console.error(`❌ Failed: ${(error as Error).message}\n`);
  }

  // 8. StockGeist - X.com 情绪（免费层可选）
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 🐦 [8/9] StockGeist - X.com Sentiment (Free Tier Optional)   │');
  console.log('└──────────────────────────────────────────────────────────────┘');

  const stockGeistApiKey = process.env.STOCKGEIST_API_KEY;
  if (stockGeistApiKey) {
    try {
      const twitterStart = Date.now();
      const twitterCollector = new TwitterSentimentCollector({
        apiKey: stockGeistApiKey,
        saveRaw: true,
      });
      const twitterData = await twitterCollector.collect();

      aggregatedData.twitterSentiment = twitterData;
      summary.collectors.push({
        name: 'twitter-sentiment',
        status: 'success',
        itemCount: twitterData.items.length,
        duration: Date.now() - twitterStart,
      });
      summary.totalItems += twitterData.items.length;

      console.log(`✅ Collected X.com sentiment for ${twitterData.items.length} symbols\n`);
    } catch (error) {
      summary.collectors.push({
        name: 'twitter-sentiment',
        status: 'failed',
        error: (error as Error).message,
      });
      console.error(`❌ Failed: ${(error as Error).message}\n`);
    }
  } else {
    summary.collectors.push({
      name: 'twitter-sentiment',
      status: 'skipped',
      error: 'STOCKGEIST_API_KEY not configured (optional)',
    });
    console.log('⏭️  Skipped: STOCKGEIST_API_KEY not configured (optional)\n');
  }

  // 9. Earnings Calendar & Analyst Ratings (免费, Finnhub)
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 📅 [9/10] Earnings Calendar & Analyst Ratings (Free)         │');
  console.log('└──────────────────────────────────────────────────────────────┘');

  if (appConfig.finnhub.apiKey) {
    try {
      const earningsStart = Date.now();
      const earningsCollector = new EarningsCalendarCollector({
        apiKey: appConfig.finnhub.apiKey,
        saveRaw: true,
        symbols: [
          'NVDA', 'MSFT', 'GOOGL', 'TSM', 'META', 'AMZN', 'AMD', 'AVGO',
          'ORCL', 'CRM', 'NOW', 'ADBE', 'SNOW', 'DDOG', 'PLTR',
          'DELL', 'ANET', 'VRT', 'AMAT', 'LRCX', 'KLAC',
          'TSLA', 'AAPL', 'INTC', 'MU', 'ARM',
        ],
      });
      const earningsData = await earningsCollector.collect();

      (aggregatedData as any).earningsCalendar = earningsData;
      summary.collectors.push({
        name: 'earnings-calendar',
        status: 'success',
        itemCount: earningsData.items.length,
        duration: Date.now() - earningsStart,
      });
      summary.totalItems += earningsData.items.length;

      console.log(`✅ Collected ${earningsData.items.length} earnings/ratings items\n`);
    } catch (error) {
      summary.collectors.push({
        name: 'earnings-calendar',
        status: 'failed',
        error: (error as Error).message,
      });
      console.error(`❌ Failed: ${(error as Error).message}\n`);
    }
  } else {
    summary.collectors.push({
      name: 'earnings-calendar',
      status: 'skipped',
      error: 'FINNHUB_API_KEY not configured',
    });
    console.log('⏭️  Skipped: FINNHUB_API_KEY not configured\n');
  }

  // 10. Forex - 美元指数、美债收益率、外汇（免费）
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 💵 [10/10] Forex - Dollar Index, Yields, FX Pairs (Free)     │');
  console.log('└──────────────────────────────────────────────────────────────┘');

  try {
    const forexStart = Date.now();
    const forexCollector = new ForexCollector({ saveRaw: true });
    const forexData = await forexCollector.collect();

    aggregatedData.forex = forexData;
    summary.collectors.push({
      name: 'forex-collector',
      status: 'success',
      itemCount: forexData.items.length,
      duration: Date.now() - forexStart,
    });
    summary.totalItems += forexData.items.length;

    console.log(`✅ Collected ${forexData.items.length} forex data points\n`);
  } catch (error) {
    summary.collectors.push({
      name: 'forex-collector',
      status: 'failed',
      error: (error as Error).message,
    });
    console.error(`❌ Failed: ${(error as Error).message}\n`);
  }

  // 保存汇总数据
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.resolve(process.cwd(), 'data/processed');
  const outputFile = path.join(outputDir, `aggregated-${timestamp}.json`);

  await fs.promises.mkdir(outputDir, { recursive: true });
  summary.outputFile = outputFile;
  aggregatedData.summary = summary;

  await fs.promises.writeFile(
    outputFile,
    JSON.stringify(aggregatedData, null, 2),
    'utf-8'
  );

  // 打印汇总
  const totalDuration = Date.now() - startTime;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Collection Summary                       ║');
  console.log('╠════════════════════════════════════════════════════════════╣');

  for (const collector of summary.collectors) {
    const statusIcon = collector.status === 'success' ? '✅' :
                       collector.status === 'skipped' ? '⏭️ ' : '❌';
    const itemStr = collector.itemCount !== undefined ?
                    `${collector.itemCount} items` :
                    collector.error || '';
    const durationStr = collector.duration ?
                        `(${(collector.duration / 1000).toFixed(1)}s)` : '';

    console.log(`║  ${statusIcon} ${collector.name.padEnd(18)} ${itemStr.padEnd(17)} ${durationStr.padStart(8)} ║`);
  }

  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  📦 Total items collected: ${String(summary.totalItems).padEnd(30)} ║`);
  console.log(`║  ⏱️  Total time: ${(totalDuration / 1000).toFixed(1)}s${' '.repeat(40)} ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  📁 Output: data/processed/aggregated-${timestamp}.json     ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  // 生成整合的 Markdown 文件
  const dateOnly = new Date().toISOString().slice(0, 10);
  const mdOutputDir = path.resolve(process.cwd(), 'output');
  const mdOutputFile = path.join(mdOutputDir, `daily-data-${dateOnly}.md`);

  await fs.promises.mkdir(mdOutputDir, { recursive: true });

  const markdownContent = generateConsolidatedMarkdown(aggregatedData);
  await fs.promises.writeFile(mdOutputFile, markdownContent, 'utf-8');

  console.log('\n┌──────────────────────────────────────────────────────────────┐');
  console.log('│ 📋 Consolidated Markdown Generated                           │');
  console.log('└──────────────────────────────────────────────────────────────┘');
  console.log(`   📄 File: output/daily-data-${dateOnly}.md`);
  console.log('   💡 可直接拷贝此文件用于生成 infographic、slides 等');
  console.log('');

  // 快速预览
  if (aggregatedData.market?.market) {
    console.log('\n📊 Market Snapshot:');
    for (const index of aggregatedData.market.market.indices.slice(0, 3)) {
      const sign = index.changePercent >= 0 ? '+' : '';
      const emoji = index.changePercent >= 0 ? '🟢' : '🔴';
      console.log(`   ${emoji} ${index.name}: ${index.price.toFixed(2)} (${sign}${index.changePercent.toFixed(2)}%)`);
    }
  }

  if (aggregatedData.news?.items) {
    console.log('\n📰 Top Headlines:');
    for (const news of aggregatedData.news.items.slice(0, 3)) {
      console.log(`   • ${news.title.slice(0, 60)}...`);
    }
  }

  if (aggregatedData.congressTrading?.items && aggregatedData.congressTrading.items.length > 0) {
    console.log('\n🏛️ Congress Trading:');
    for (const trade of aggregatedData.congressTrading.items.slice(0, 3)) {
      const d = trade.metadata;
      console.log(`   • ${d?.politician}: ${d?.transactionType} ${d?.ticker}`);
    }
  }

  if (aggregatedData.predictionMarket?.items && aggregatedData.predictionMarket.items.length > 0) {
    console.log('\n🔮 Prediction Markets:');
    for (const market of aggregatedData.predictionMarket.items.slice(0, 3)) {
      console.log(`   • ${market.title.slice(0, 50)}...`);
    }
  }

  console.log('\n✨ Data collection complete! Ready for briefing generation.\n');
}

main().catch(console.error);
