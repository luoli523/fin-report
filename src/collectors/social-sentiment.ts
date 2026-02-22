/**
 * Reddit 社交情绪数据收集器
 *
 * 数据源: ApeWisdom API (免费)
 * - 聚合 Reddit r/wallstreetbets, r/stocks, r/investing 等
 * - 无需 API Key
 */

import { BaseCollector } from './base';
import {
  CollectedData,
  SocialSentiment,
  SocialSentimentConfig,
} from './types';
import { getStockSymbols } from '../config/index';

// ApeWisdom API 响应类型
interface ApeWisdomResult {
  ticker: string;
  name: string;
  rank: number;
  mentions: number;
  upvotes: number;
  rank_24h_ago: number;
  mentions_24h_ago: number;
}

interface ApeWisdomResponse {
  results: ApeWisdomResult[];
}

/**
 * Reddit 情绪收集器 (使用 ApeWisdom 免费 API)
 */
export class SocialSentimentCollector extends BaseCollector<SocialSentimentConfig> {
  readonly name = 'social-sentiment';
  readonly description = 'Reddit social sentiment data collector via ApeWisdom';

  private readonly baseUrl = 'https://apewisdom.io/api/v1.0';

  constructor(config: Partial<SocialSentimentConfig> = {}) {
    super({
      enabled: true,
      symbols: config.symbols || getStockSymbols(),
      includeMessages: config.includeMessages ?? false,
      ...config,
    });
  }

  async collect(): Promise<CollectedData> {
    this.log('Starting Reddit sentiment collection via ApeWisdom...');

    const sentiments: SocialSentiment[] = [];

    try {
      // 获取所有子版块的热门股票
      const allStocks = await this.fetchAllSubreddits();
      this.log(`Fetched ${allStocks.length} trending stocks from Reddit`);

      // 过滤我们监控的股票
      const monitoredSymbols = new Set(this.config.symbols);

      for (const stock of allStocks) {
        // 过滤监控的股票
        if (monitoredSymbols.size > 0 && !monitoredSymbols.has(stock.ticker)) {
          continue;
        }

        const sentiment = this.processStock(stock);
        if (sentiment) {
          sentiments.push(sentiment);
        }
      }

      // 按提及次数排序
      sentiments.sort((a, b) => b.messageCount - a.messageCount);

      this.log(`Processed ${sentiments.length} stocks with sentiment data`);

      // 保存原始数据
      if (this.config.saveRaw) {
        await this.saveRawData({ stocks: allStocks });
      }

    } catch (error) {
      this.logError('Failed to fetch Reddit sentiment data', error as Error);
    }

    const result: CollectedData = {
      source: this.name,
      type: 'social-sentiment',
      collectedAt: new Date(),
      items: sentiments.map(s => ({
        id: s.ticker,
        title: `${s.ticker} - ${s.sentiment} (排名 #${s.rank || 'N/A'})`,
        content: this.formatSentimentContent(s),
        timestamp: s.timestamp,
        metadata: {
          ticker: s.ticker,
          company: s.company,
          sentiment: s.sentiment,
          bullishPercent: s.bullishPercent,
          bearishPercent: s.bearishPercent,
          messageCount: s.messageCount,
          watchersCount: s.watchersCount || s.upvotes || 0,
          mentions: s.messageCount,
          upvotes: s.upvotes,
          rank: s.rank,
          rankChange: s.rankChange,
          mentionsChange: s.mentionsChange,
        },
      })),
      metadata: {
        totalSymbols: sentiments.length,
        source: 'Reddit (ApeWisdom)',
        subreddits: ['wallstreetbets', 'stocks', 'investing', 'options'],
        topMentioned: sentiments.slice(0, 10).map(s => ({
          ticker: s.ticker,
          mentions: s.messageCount,
          rank: s.rank,
        })),
        trending: sentiments
          .filter(s => s.rankChange && s.rankChange > 5)
          .slice(0, 5)
          .map(s => s.ticker),
      },
    };

    // 保存处理后的数据
    await this.saveProcessedData(result);

    return result;
  }

  /**
   * 获取所有子版块的数据
   */
  private async fetchAllSubreddits(): Promise<ApeWisdomResult[]> {
    const subreddits = ['all-stocks', 'wallstreetbets', 'stocks', 'investing'];
    const allResults: ApeWisdomResult[] = [];
    const seenTickers = new Set<string>();

    for (const subreddit of subreddits) {
      try {
        const results = await this.fetchSubreddit(subreddit);
        
        // 合并结果，避免重复
        for (const result of results) {
          if (!seenTickers.has(result.ticker)) {
            seenTickers.add(result.ticker);
            allResults.push(result);
          }
        }

        // 避免速率限制
        await this.delay(500);
      } catch (error) {
        this.logError(`Failed to fetch ${subreddit}`, error as Error);
      }
    }

    return allResults;
  }

  /**
   * 获取单个子版块的数据
   */
  private async fetchSubreddit(filter: string): Promise<ApeWisdomResult[]> {
    const url = `${this.baseUrl}/filter/${filter}/page/1`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FinanceBriefingAgent/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as ApeWisdomResponse;
    return data.results || [];
  }

  /**
   * 处理股票情绪数据
   */
  private processStock(stock: ApeWisdomResult): SocialSentiment | null {
    try {
      // 计算排名变化
      const rankChange = stock.rank_24h_ago 
        ? stock.rank_24h_ago - stock.rank 
        : undefined;

      // 计算提及变化
      const mentionsChange = stock.mentions_24h_ago
        ? ((stock.mentions - stock.mentions_24h_ago) / stock.mentions_24h_ago) * 100
        : undefined;

      // 判断情绪 (基于排名变化和提及量)
      let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (rankChange && rankChange > 10) {
        sentiment = 'bullish'; // 排名上升超过10位
      } else if (mentionsChange && mentionsChange > 50) {
        sentiment = 'bullish'; // 提及增长超过50%
      } else if (rankChange && rankChange < -10) {
        sentiment = 'bearish'; // 排名下降超过10位
      }

      return {
        ticker: stock.ticker,
        company: stock.name,
        sentiment,
        bullishPercent: sentiment === 'bullish' ? 70 : sentiment === 'bearish' ? 30 : 50,
        bearishPercent: sentiment === 'bearish' ? 70 : sentiment === 'bullish' ? 30 : 50,
        messageCount: stock.mentions,
        watchersCount: stock.upvotes,
        rank: stock.rank,
        rankChange,
        mentionsChange,
        upvotes: stock.upvotes,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logError(`Failed to process ${stock.ticker}`, error as Error);
      return null;
    }
  }

  /**
   * 格式化情绪内容
   */
  private formatSentimentContent(sentiment: SocialSentiment): string {
    const lines: string[] = [];

    lines.push(`股票: ${sentiment.ticker}`);
    if (sentiment.company) {
      lines.push(`公司: ${sentiment.company}`);
    }
    lines.push(`Reddit 排名: #${sentiment.rank || 'N/A'}`);
    lines.push(`提及次数: ${sentiment.messageCount.toLocaleString()}`);
    
    if (sentiment.upvotes) {
      lines.push(`点赞数: ${sentiment.upvotes.toLocaleString()}`);
    }

    if (sentiment.rankChange !== undefined) {
      const sign = sentiment.rankChange > 0 ? '+' : '';
      lines.push(`排名变化 (24h): ${sign}${sentiment.rankChange}`);
    }

    if (sentiment.mentionsChange !== undefined) {
      const sign = sentiment.mentionsChange > 0 ? '+' : '';
      lines.push(`提及变化 (24h): ${sign}${sentiment.mentionsChange.toFixed(1)}%`);
    }

    lines.push(`情绪: ${sentiment.sentiment}`);

    return lines.join('\n');
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建 Reddit 情绪收集器
 */
export function createSocialSentimentCollector(
  config: Partial<SocialSentimentConfig> = {}
): SocialSentimentCollector {
  return new SocialSentimentCollector(config);
}

// 导出默认实例
export const socialSentimentCollector = new SocialSentimentCollector();
