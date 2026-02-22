/**
 * X.com (Twitter) 情绪数据收集器
 *
 * 数据源选项 (按优先级):
 * 1. StockGeist API (推荐，10,000 免费 credits)
 *    - 申请地址: https://www.stockgeist.ai/
 *    - 注册后在 Dashboard 获取 API Key
 * 
 * 2. Utradea API (备用)
 *    - 申请地址: https://utradea.com/
 *    - 提供免费的社交情绪数据
 */

import { BaseCollector } from './base';
import {
  CollectedData,
  CollectorConfig,
} from './types';
import { getStockSymbols, STOCK_INFO } from '../config/index';

// X.com 情绪数据
export interface TwitterSentiment {
  ticker: string;
  company?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;      // -100 to 100
  positivePercent: number;
  negativePercent: number;
  neutralPercent: number;
  messageVolume: number;
  volumeChange24h?: number;    // 24小时提及量变化 (%)
  trending?: boolean;
  keywords?: string[];
  timestamp: Date;
}

// 配置类型
export interface TwitterSentimentConfig extends CollectorConfig {
  apiKey?: string;             // StockGeist API Key
  utradeaApiKey?: string;      // Utradea API Key (备用)
  symbols?: string[];          // 要监控的股票
}

// StockGeist API 响应类型
interface StockGeistResponse {
  ticker: string;
  timestamp: string;
  sentiment: {
    score: number;
    positive: number;
    negative: number;
    neutral: number;
  };
  mentions: {
    total: number;
    change_24h?: number;
  };
  trending?: boolean;
}

// Utradea API 响应类型
interface UtradeaResponse {
  data: {
    ticker: string;
    sentiment_score: number;
    bullish_count: number;
    bearish_count: number;
    total_comments: number;
  }[];
}

/**
 * X.com 情绪收集器
 */
export class TwitterSentimentCollector extends BaseCollector<TwitterSentimentConfig> {
  readonly name = 'twitter-sentiment';
  readonly description = 'X.com (Twitter) sentiment data collector';

  private readonly stockGeistBaseUrl = 'https://api.stockgeist.ai/stock';
  private readonly utradeaBaseUrl = 'https://api.utradea.com/v1';

  constructor(config: Partial<TwitterSentimentConfig> = {}) {
    super({
      enabled: true,
      symbols: config.symbols || getStockSymbols().slice(0, 30), // 默认取前30个
      ...config,
    });
  }

  async collect(): Promise<CollectedData> {
    this.log('Starting X.com sentiment collection...');

    const sentiments: TwitterSentiment[] = [];

    // 尝试 StockGeist (推荐)
    if (this.config.apiKey) {
      this.log('Using StockGeist API...');
      const results = await this.fetchFromStockGeist();
      sentiments.push(...results);
    }
    // 尝试 Utradea (备用)
    else if (this.config.utradeaApiKey) {
      this.log('Using Utradea API (fallback)...');
      const results = await this.fetchFromUtradea();
      sentiments.push(...results);
    }
    // 无 API Key
    else {
      this.log('⚠️ No X.com sentiment API configured');
      this.log('   To enable X.com sentiment:');
      this.log('   1. Sign up at https://www.stockgeist.ai/ (10,000 free credits)');
      this.log('   2. Get your API key from the dashboard');
      this.log('   3. Set STOCKGEIST_API_KEY in your .env file');
      return this.createEmptyResult('No API key configured. Visit stockgeist.ai for free API key.');
    }

    // 按情绪分数排序
    sentiments.sort((a, b) => Math.abs(b.sentimentScore) - Math.abs(a.sentimentScore));

    this.log(`Collected X.com sentiment for ${sentiments.length} symbols`);

    // 保存原始数据
    if (this.config.saveRaw && sentiments.length > 0) {
      await this.saveRawData({ sentiments });
    }

    const result: CollectedData = {
      source: this.name,
      type: 'social-sentiment',
      collectedAt: new Date(),
      items: sentiments.map(s => ({
        id: `twitter-${s.ticker}`,
        title: `${s.ticker} - X.com ${this.getSentimentLabel(s.sentiment)} (${s.sentimentScore > 0 ? '+' : ''}${s.sentimentScore.toFixed(0)})`,
        content: this.formatSentimentContent(s),
        timestamp: s.timestamp,
        metadata: {
          ticker: s.ticker,
          company: s.company,
          sentiment: s.sentiment,
          sentimentScore: s.sentimentScore,
          bullishPercent: s.positivePercent,
          bearishPercent: s.negativePercent,
          messageCount: s.messageVolume,
          watchersCount: s.messageVolume,
          positivePercent: s.positivePercent,
          negativePercent: s.negativePercent,
          neutralPercent: s.neutralPercent,
          messageVolume: s.messageVolume,
          volumeChange24h: s.volumeChange24h,
          trending: s.trending,
          keywords: s.keywords,
          source: 'x.com',
        },
      })),
      metadata: {
        totalSymbols: sentiments.length,
        source: 'X.com',
        apiProvider: this.config.apiKey ? 'StockGeist' : 'Utradea',
        overallSentiment: this.calculateOverallSentiment(sentiments),
        mostBullish: sentiments
          .filter(s => s.sentiment === 'bullish')
          .slice(0, 5)
          .map(s => ({ ticker: s.ticker, score: s.sentimentScore })),
        mostBearish: sentiments
          .filter(s => s.sentiment === 'bearish')
          .slice(0, 5)
          .map(s => ({ ticker: s.ticker, score: s.sentimentScore })),
        trending: sentiments
          .filter(s => s.trending)
          .map(s => s.ticker),
      },
    };

    // 保存处理后的数据
    if (sentiments.length > 0) {
      await this.saveProcessedData(result);
    }

    return result;
  }

  /**
   * 从 StockGeist API 获取数据
   */
  private async fetchFromStockGeist(): Promise<TwitterSentiment[]> {
    const sentiments: TwitterSentiment[] = [];
    const symbols = this.config.symbols || [];

    // 分批获取
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(symbol => this.fetchStockGeistSymbol(symbol))
      );

      for (const result of batchResults) {
        if (result) {
          sentiments.push(result);
        }
      }

      // 避免速率限制
      if (i + batchSize < symbols.length) {
        await this.delay(500);
      }
    }

    return sentiments;
  }

  /**
   * 获取单个股票的 StockGeist 数据
   */
  private async fetchStockGeistSymbol(symbol: string): Promise<TwitterSentiment | null> {
    try {
      const url = `${this.stockGeistBaseUrl}/${symbol}/sentiment`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        if (response.status === 401) {
          this.logError('Invalid StockGeist API key', new Error('Unauthorized'));
          return null;
        }
        if (response.status === 429) {
          this.log(`Rate limited for ${symbol}, skipping...`);
          return null;
        }
        return null;
      }

      const data = await response.json() as StockGeistResponse;
      return this.processStockGeistData(symbol, data);

    } catch (error) {
      // 静默处理
      return null;
    }
  }

  /**
   * 处理 StockGeist 数据
   */
  private processStockGeistData(symbol: string, data: StockGeistResponse): TwitterSentiment | null {
    try {
      const score = (data.sentiment?.score || 0) * 100;
      const positive = data.sentiment?.positive || 0;
      const negative = data.sentiment?.negative || 0;
      const neutral = data.sentiment?.neutral || 0;
      const total = positive + negative + neutral || 1;

      let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (score > 20) sentiment = 'bullish';
      else if (score < -20) sentiment = 'bearish';

      return {
        ticker: symbol,
        company: STOCK_INFO[symbol]?.name || symbol,
        sentiment,
        sentimentScore: score,
        positivePercent: (positive / total) * 100,
        negativePercent: (negative / total) * 100,
        neutralPercent: (neutral / total) * 100,
        messageVolume: data.mentions?.total || 0,
        volumeChange24h: data.mentions?.change_24h,
        trending: data.trending || (data.mentions?.change_24h != null && data.mentions.change_24h > 50) || undefined,
        timestamp: new Date(data.timestamp || Date.now()),
      };
    } catch {
      return null;
    }
  }

  /**
   * 从 Utradea API 获取数据 (备用)
   */
  private async fetchFromUtradea(): Promise<TwitterSentiment[]> {
    const sentiments: TwitterSentiment[] = [];

    try {
      const url = `${this.utradeaBaseUrl}/social-sentiment/trending`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.utradeaApiKey}`,
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as UtradeaResponse;
      const monitoredSymbols = new Set(this.config.symbols || []);

      for (const item of data.data || []) {
        if (monitoredSymbols.size > 0 && !monitoredSymbols.has(item.ticker)) {
          continue;
        }

        const total = item.bullish_count + item.bearish_count || 1;
        const bullishPercent = (item.bullish_count / total) * 100;
        const bearishPercent = (item.bearish_count / total) * 100;

        let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        if (bullishPercent > 60) sentiment = 'bullish';
        else if (bearishPercent > 60) sentiment = 'bearish';

        sentiments.push({
          ticker: item.ticker,
          company: STOCK_INFO[item.ticker]?.name || item.ticker,
          sentiment,
          sentimentScore: item.sentiment_score * 100,
          positivePercent: bullishPercent,
          negativePercent: bearishPercent,
          neutralPercent: 0,
          messageVolume: item.total_comments,
          timestamp: new Date(),
        });
      }

    } catch (error) {
      this.logError('Failed to fetch from Utradea', error as Error);
    }

    return sentiments;
  }

  /**
   * 获取情绪标签
   */
  private getSentimentLabel(sentiment: 'bullish' | 'bearish' | 'neutral'): string {
    switch (sentiment) {
      case 'bullish': return '看涨';
      case 'bearish': return '看跌';
      default: return '中性';
    }
  }

  /**
   * 计算整体情绪
   */
  private calculateOverallSentiment(sentiments: TwitterSentiment[]): 'bullish' | 'bearish' | 'neutral' {
    if (sentiments.length === 0) return 'neutral';

    const avgScore = sentiments.reduce((sum, s) => sum + s.sentimentScore, 0) / sentiments.length;

    if (avgScore > 15) return 'bullish';
    if (avgScore < -15) return 'bearish';
    return 'neutral';
  }

  /**
   * 格式化情绪内容
   */
  private formatSentimentContent(sentiment: TwitterSentiment): string {
    const lines: string[] = [];

    lines.push(`股票: ${sentiment.ticker}`);
    if (sentiment.company) {
      lines.push(`公司: ${sentiment.company}`);
    }
    lines.push(`X.com 情绪: ${this.getSentimentLabel(sentiment.sentiment)}`);
    lines.push(`情绪分数: ${sentiment.sentimentScore > 0 ? '+' : ''}${sentiment.sentimentScore.toFixed(1)}`);
    lines.push(`看涨比例: ${sentiment.positivePercent.toFixed(1)}%`);
    lines.push(`看跌比例: ${sentiment.negativePercent.toFixed(1)}%`);
    lines.push(`提及量: ${sentiment.messageVolume.toLocaleString()}`);

    if (sentiment.volumeChange24h !== undefined) {
      const sign = sentiment.volumeChange24h > 0 ? '+' : '';
      lines.push(`提及变化 (24h): ${sign}${sentiment.volumeChange24h.toFixed(1)}%`);
    }

    if (sentiment.trending) {
      lines.push(`🔥 热门话题`);
    }

    return lines.join('\n');
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(reason: string): CollectedData {
    return {
      source: this.name,
      type: 'social-sentiment',
      collectedAt: new Date(),
      items: [],
      metadata: {
        status: 'no_data',
        reason,
        source: 'X.com',
        setupInstructions: {
          step1: 'Visit https://www.stockgeist.ai/',
          step2: 'Sign up for free (10,000 credits)',
          step3: 'Get API key from dashboard',
          step4: 'Set STOCKGEIST_API_KEY in .env',
        },
      },
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建 X.com 情绪收集器
 */
export function createTwitterSentimentCollector(
  config: Partial<TwitterSentimentConfig> = {}
): TwitterSentimentCollector {
  return new TwitterSentimentCollector(config);
}

// 导出默认实例
export const twitterSentimentCollector = new TwitterSentimentCollector();
