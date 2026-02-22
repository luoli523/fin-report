import { CollectedData, QuoteData } from '../collectors/types';
import { BaseAnalyzer } from './base';
import {
  MarketAnalysis,
  AssetAnalysis,
  SectorAnalysis,
  MarketCondition,
  Sentiment,
  AnalyzerConfig,
} from './types';

// 板块分类配置
const SECTOR_MAPPING: Record<string, string[]> = {
  '主要指数': ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX', '^SPX'],
  'ETF': ['SPY', 'QQQ', 'VOO', 'SOXX', 'SMH', 'GLD'],
  '科技巨头': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'ORCL'],
  '半导体': ['NVDA', 'AMD', 'INTC', 'AVGO', 'QCOM', 'TSM', 'ASML', 'MU', 'MRVL', 'ARM', 'LRCX', 'AMAT', 'KLAC'],
  '存储': ['WDC', 'STX', 'PSTG'],
  '数据中心': ['VRT', 'DELL', 'ANET'],
  '能源/核电': ['VST', 'CEG', 'LEU', 'OKLO', 'BE'],
  'AI/软件': ['PLTR', 'CRWV'],
  '航天': ['RKLB'],
  '金融': ['BRK-B', 'JPM', 'V'],
  '保险科技': ['LMND'],
  '医疗': ['LLY'],
};

// 主要指数代码
const MAJOR_INDICES = ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX', '^SPX'];

/**
 * 市场数据分析器
 */
export class MarketAnalyzer extends BaseAnalyzer<MarketAnalysis> {
  readonly name = 'market-analyzer';

  constructor(config: AnalyzerConfig = {}) {
    super(config);
  }

  /**
   * 分析市场数据
   */
  async analyze(data: CollectedData): Promise<MarketAnalysis> {
    this.log('Starting market analysis...');

    const quotes = data.items.map(item => item.metadata as QuoteData);

    // 分离指数和股票（用于特殊处理）
    const indices = quotes.filter(q => MAJOR_INDICES.includes(q.symbol));
    const stocks = quotes.filter(q => !MAJOR_INDICES.includes(q.symbol));

    // 分析指数
    const indicesAnalysis = this.analyzeIndices(indices);

    // 分析所有板块（包括指数作为一个板块）
    const sectors = this.analyzeSectors(quotes);

    // 获取涨跌榜
    const sortedStocks = [...stocks].sort((a, b) => b.changePercent - a.changePercent);
    const topN = this.config.topN || 5;
    const topGainers = sortedStocks.slice(0, topN).map(q => this.analyzeAsset(q));
    const topLosers = sortedStocks.slice(-topN).reverse().map(q => this.analyzeAsset(q));

    // 判断市场状态
    const condition = this.determineMarketCondition(indices, stocks);
    const sentiment = this.determineMarketSentiment(indices, stocks);

    // 生成关键发现
    const highlights = this.generateHighlights(indices, sectors, topGainers, topLosers);

    // 检测风险信号
    const riskSignals = this.detectRiskSignals(indices, stocks);

    const result: MarketAnalysis = {
      timestamp: new Date(),
      condition,
      sentiment,
      indices: {
        summary: this.generateIndicesSummary(indices),
        details: indices.map(q => this.analyzeAsset(q)),
      },
      sectors,
      topGainers,
      topLosers,
      highlights,
      riskSignals,
    };

    this.log('Market analysis completed');
    return result;
  }

  /**
   * 分析单个资产
   */
  private analyzeAsset(quote: QuoteData): AssetAnalysis {
    return {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      trend: this.getTrend(quote.changePercent),
      strength: this.getStrength(quote.changePercent),
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
    };
  }

  /**
   * 分析指数
   */
  private analyzeIndices(indices: QuoteData[]): AssetAnalysis[] {
    return indices.map(q => this.analyzeAsset(q));
  }

  /**
   * 分析板块表现
   */
  private analyzeSectors(stocks: QuoteData[]): SectorAnalysis[] {
    const sectors: SectorAnalysis[] = [];

    for (const [sectorName, symbols] of Object.entries(SECTOR_MAPPING)) {
      const sectorStocks = stocks.filter(s => symbols.includes(s.symbol));

      if (sectorStocks.length === 0) continue;

      const performances = sectorStocks.map(s => s.changePercent);
      const avgPerformance = this.average(performances);

      const sortedByChange = [...sectorStocks].sort((a, b) => b.changePercent - a.changePercent);

      sectors.push({
        name: sectorName,
        performance: avgPerformance,
        trend: this.getTrend(avgPerformance),
        topGainer: sortedByChange.length > 0 ? this.analyzeAsset(sortedByChange[0]) : undefined,
        topLoser: sortedByChange.length > 0 ? this.analyzeAsset(sortedByChange[sortedByChange.length - 1]) : undefined,
        stocks: sectorStocks.map(s => this.analyzeAsset(s)),
      });
    }

    // 保持配置顺序（不排序），便于简报中按类别顺序显示
    return sectors;
  }

  /**
   * 判断市场状态
   */
  private determineMarketCondition(indices: QuoteData[], stocks: QuoteData[]): MarketCondition {
    const sp500 = indices.find(i => i.symbol === '^GSPC' || i.symbol === '^SPX');
    const vix = indices.find(i => i.symbol === '^VIX');

    // VIX > 25 表示恐慌，< 15 表示贪婪
    const vixLevel = vix?.price || 20;
    const sp500Change = sp500?.changePercent || 0;

    if (vixLevel > 25 || sp500Change < -2) {
      return 'risk-off';
    }

    if (vixLevel < 18 && sp500Change > 0.5) {
      return 'risk-on';
    }

    return 'mixed';
  }

  /**
   * 判断市场情感
   */
  private determineMarketSentiment(indices: QuoteData[], stocks: QuoteData[]): Sentiment {
    const indexChanges = indices
      .filter(i => i.symbol !== '^VIX')
      .map(i => i.changePercent);

    const avgIndexChange = this.average(indexChanges);

    const stockChanges = stocks.map(s => s.changePercent);
    const advancers = stockChanges.filter(c => c > 0).length;
    const decliners = stockChanges.filter(c => c < 0).length;
    const advanceDeclineRatio = decliners > 0 ? advancers / decliners : advancers;

    // 综合判断
    if (avgIndexChange > 1 && advanceDeclineRatio > 1.5) {
      return 'bullish';
    }

    if (avgIndexChange < -1 && advanceDeclineRatio < 0.7) {
      return 'bearish';
    }

    return 'neutral';
  }

  /**
   * 生成指数摘要
   */
  private generateIndicesSummary(indices: QuoteData[]): string {
    const sp500 = indices.find(i => i.symbol === '^GSPC' || i.symbol === '^SPX');
    const nasdaq = indices.find(i => i.symbol === '^IXIC');
    const dow = indices.find(i => i.symbol === '^DJI');

    const parts: string[] = [];

    if (sp500) {
      const direction = sp500.changePercent >= 0 ? '上涨' : '下跌';
      parts.push(`标普500 ${direction} ${this.formatPercent(sp500.changePercent)}`);
    }

    if (nasdaq) {
      const direction = nasdaq.changePercent >= 0 ? '上涨' : '下跌';
      parts.push(`纳指 ${direction} ${this.formatPercent(nasdaq.changePercent)}`);
    }

    if (dow) {
      const direction = dow.changePercent >= 0 ? '上涨' : '下跌';
      parts.push(`道指 ${direction} ${this.formatPercent(dow.changePercent)}`);
    }

    return parts.join('，');
  }

  /**
   * 生成关键发现
   */
  private generateHighlights(
    indices: QuoteData[],
    sectors: SectorAnalysis[],
    topGainers: AssetAnalysis[],
    topLosers: AssetAnalysis[]
  ): string[] {
    const highlights: string[] = [];

    // 指数表现
    const sp500 = indices.find(i => i.symbol === '^GSPC' || i.symbol === '^SPX');
    if (sp500) {
      if (Math.abs(sp500.changePercent) >= 2) {
        const direction = sp500.changePercent >= 0 ? '大涨' : '大跌';
        highlights.push(`标普500 ${direction} ${this.formatPercent(sp500.changePercent)}，市场波动加剧`);
      }
    }

    // VIX 恐慌指数
    const vix = indices.find(i => i.symbol === '^VIX');
    if (vix) {
      if (vix.price > 25) {
        highlights.push(`VIX 恐慌指数升至 ${vix.price.toFixed(1)}，市场恐慌情绪上升`);
      } else if (vix.price < 15) {
        highlights.push(`VIX 恐慌指数仅 ${vix.price.toFixed(1)}，市场情绪乐观`);
      }
    }

    // 板块表现（按涨跌幅排序取最佳/最差）
    const sortedSectors = [...sectors].sort((a, b) => b.performance - a.performance);
    const bestSector = sortedSectors[0];
    const worstSector = sortedSectors[sortedSectors.length - 1];

    if (bestSector && bestSector.performance > 1) {
      highlights.push(`${bestSector.name}板块领涨，平均涨幅 ${this.formatPercent(bestSector.performance)}`);
    }

    if (worstSector && worstSector.performance < -1) {
      highlights.push(`${worstSector.name}板块领跌，平均跌幅 ${this.formatPercent(worstSector.performance)}`);
    }

    // 个股亮点
    if (topGainers.length > 0 && topGainers[0].changePercent > 5) {
      highlights.push(`${topGainers[0].name} (${topGainers[0].symbol}) 大涨 ${this.formatPercent(topGainers[0].changePercent)}`);
    }

    if (topLosers.length > 0 && topLosers[0].changePercent < -5) {
      highlights.push(`${topLosers[0].name} (${topLosers[0].symbol}) 大跌 ${this.formatPercent(topLosers[0].changePercent)}`);
    }

    return highlights;
  }

  /**
   * 检测风险信号
   */
  private detectRiskSignals(indices: QuoteData[], stocks: QuoteData[]): string[] {
    const signals: string[] = [];

    // VIX 警告
    const vix = indices.find(i => i.symbol === '^VIX');
    if (vix && vix.price > 30) {
      signals.push(`⚠️ VIX 恐慌指数高企 (${vix.price.toFixed(1)})，市场极度恐慌`);
    }

    // 大盘暴跌
    const sp500 = indices.find(i => i.symbol === '^GSPC' || i.symbol === '^SPX');
    if (sp500 && sp500.changePercent < -3) {
      signals.push(`⚠️ 标普500 暴跌 ${this.formatPercent(sp500.changePercent)}，注意风险控制`);
    }

    // 科技股集体下跌
    const techStocks = stocks.filter(s =>
      ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'].includes(s.symbol)
    );
    const techDecliners = techStocks.filter(s => s.changePercent < -2);
    if (techDecliners.length >= 4) {
      signals.push(`⚠️ 科技巨头集体下跌，市场风险偏好降低`);
    }

    // 半导体板块暴跌
    const semiStocks = stocks.filter(s =>
      ['NVDA', 'AMD', 'INTC', 'TSM', 'ASML'].includes(s.symbol)
    );
    const semiAvgChange = this.average(semiStocks.map(s => s.changePercent));
    if (semiAvgChange < -4) {
      signals.push(`⚠️ 半导体板块大跌 ${this.formatPercent(semiAvgChange)}，关注 AI 算力需求`);
    }

    return signals;
  }
}
