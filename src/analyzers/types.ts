/**
 * 分析器类型定义
 */

import type { ForexAnalysis } from './forex';

// 趋势方向
export type TrendDirection = 'up' | 'down' | 'neutral';

// 信号强度
export type SignalStrength = 'strong' | 'moderate' | 'weak';

// 情感倾向
export type Sentiment = 'bullish' | 'bearish' | 'neutral';

// 市场状态
export type MarketCondition = 'risk-on' | 'risk-off' | 'mixed';

// ===== 市场分析结果 =====

// 单个股票/指数分析
export interface AssetAnalysis {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  trend: TrendDirection;
  strength: SignalStrength;
  notes?: string;
  // 52周高低点
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

// 板块分析
export interface SectorAnalysis {
  name: string;
  performance: number;       // 平均涨跌幅
  trend: TrendDirection;
  topGainer?: AssetAnalysis;
  topLoser?: AssetAnalysis;
  stocks: AssetAnalysis[];
}

// 市场分析结果
export interface MarketAnalysis {
  timestamp: Date;
  condition: MarketCondition;
  sentiment: Sentiment;

  // 指数概览
  indices: {
    summary: string;
    details: AssetAnalysis[];
  };

  // 板块分析
  sectors: SectorAnalysis[];

  // 涨跌榜
  topGainers: AssetAnalysis[];
  topLosers: AssetAnalysis[];

  // 关键发现
  highlights: string[];

  // 风险信号
  riskSignals: string[];
}

// ===== 新闻分析结果 =====

// 新闻主题
export interface NewsTopic {
  topic: string;
  count: number;
  sentiment: Sentiment;
  relatedSymbols: string[];
  headlines: string[];
}

// 新闻分析结果
export interface NewsAnalysis {
  timestamp: Date;
  totalArticles: number;
  sentiment: Sentiment;

  // 热门主题
  topTopics: NewsTopic[];

  // 重要新闻
  keyHeadlines: {
    headline: string;
    source: string;
    sentiment: Sentiment;
    importance: 'high' | 'medium' | 'low';
  }[];

  // 关键发现
  highlights: string[];
}

// ===== 经济分析结果 =====

// 经济指标分析
export interface IndicatorAnalysis {
  seriesId: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: TrendDirection;
  significance: 'high' | 'medium' | 'low';
  interpretation: string;
}

// 经济分析结果
export interface EconomicAnalysis {
  timestamp: Date;
  outlook: 'expansion' | 'contraction' | 'stable';

  // 关键指标
  keyIndicators: IndicatorAnalysis[];

  // 分类分析
  categories: {
    employment: {
      summary: string;
      indicators: IndicatorAnalysis[];
    };
    inflation: {
      summary: string;
      indicators: IndicatorAnalysis[];
    };
    rates: {
      summary: string;
      yieldCurve: 'normal' | 'inverted' | 'flat';
      indicators: IndicatorAnalysis[];
    };
    sentiment: {
      summary: string;
      indicators: IndicatorAnalysis[];
    };
  };

  // 关键发现
  highlights: string[];

  // 风险因素
  riskFactors: string[];
}

// ===== 综合分析结果 =====

export interface ComprehensiveAnalysis {
  timestamp: Date;
  market?: MarketAnalysis;
  news?: NewsAnalysis;
  economic?: EconomicAnalysis;
  smartMoney?: SmartMoneyAnalysis;
  forex?: ForexAnalysis;

  // 综合摘要
  summary: {
    marketCondition: MarketCondition;
    overallSentiment: Sentiment;
    keyPoints: string[];
    risksAndConcerns: string[];
    outlook: string;
  };
}

// 分析器配置
export interface AnalyzerConfig {
  topN?: number;              // Top N 结果数量
  includeDetails?: boolean;   // 是否包含详细信息
}

// ===== 智慧资金分析类型 =====

// 国会交易分析
export interface CongressTradingAnalysis {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  netSentiment: 'bullish' | 'bearish' | 'neutral';
  topBuys: {
    ticker: string;
    company: string;
    buyCount: number;
    politicians: string[];
    totalAmount: string;
  }[];
  topSells: {
    ticker: string;
    company: string;
    sellCount: number;
    politicians: string[];
    totalAmount: string;
  }[];
  notableTrades: {
    politician: string;
    party: 'D' | 'R' | 'I';
    ticker: string;
    type: 'buy' | 'sell';
    amount: string;
    date: Date;
    significance: string;
  }[];
  highlights: string[];
}

// 对冲基金持仓分析
export interface HedgeFundAnalysis {
  totalFundsTracked: number;
  aggregatedSentiment: 'bullish' | 'bearish' | 'neutral';
  topHoldings: {
    ticker: string;
    company: string;
    fundsHolding: number;
    totalValue: number;
    avgWeight: number;
    recentAction: 'accumulating' | 'reducing' | 'stable';
  }[];
  significantChanges: {
    ticker: string;
    company: string;
    fundName: string;
    action: 'new' | 'add' | 'reduce' | 'sold';
    changePercent: number;
    value: number;
  }[];
  sectorConcentration: {
    sector: string;
    weight: number;
    change: number;
  }[];
  highlights: string[];
}

// 预测市场分析
export interface PredictionMarketAnalysis {
  totalMarkets: number;
  keyPredictions: {
    question: string;
    category: string;
    topOutcome: string;
    probability: number;
    volume: number;
    marketImplication: string;
  }[];
  economicIndicators: {
    question: string;
    currentProbability: number;
    implication: string;
  }[];
  marketSentiment: 'optimistic' | 'pessimistic' | 'neutral';
  highlights: string[];
}

// 社交情绪分析
export interface SocialSentimentAnalysis {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -100 to 100
  mostBullish: {
    ticker: string;
    company: string;
    bullishPercent: number;
    messageCount: number;
  }[];
  mostBearish: {
    ticker: string;
    company: string;
    bearishPercent: number;
    messageCount: number;
  }[];
  trending: {
    ticker: string;
    messageVolume: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    trendingScore: number;
  }[];
  contrarianSignals: {
    ticker: string;
    signal: 'extreme_bullish' | 'extreme_bearish';
    interpretation: string;
  }[];
  highlights: string[];
}

// 综合智慧资金分析
export interface SmartMoneyAnalysis {
  timestamp: Date;
  congressTrading?: CongressTradingAnalysis;
  hedgeFund?: HedgeFundAnalysis;
  predictionMarket?: PredictionMarketAnalysis;
  socialSentiment?: SocialSentimentAnalysis;

  // 综合研判
  synthesis: {
    overallSignal: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    signalStrength: 'strong' | 'moderate' | 'weak';

    // 聚合信号
    aggregatedSignals: {
      source: string;
      signal: 'bullish' | 'bearish' | 'neutral';
      weight: number;
      confidence: number;
    }[];

    // 重点关注标的
    focusStocks: {
      ticker: string;
      company: string;
      signals: string[];
      recommendation: string;
    }[];

    // 可操作建议
    actionableInsights: string[];

    // 风险提示
    riskWarnings: string[];
  };

  highlights: string[];
}
