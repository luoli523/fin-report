/**
 * Collectors 模块统一导出
 */

// 类型导出
export * from './types';

// 基类导出
export { BaseCollector } from './base';

// 收集器导出
export { YahooFinanceCollector, yahooFinanceCollector } from './yahoo-finance';
export { AlphaVantageCollector, alphaVantageCollector } from './alpha-vantage';
export { FinnhubCollector, createFinnhubCollector } from './finnhub';
export { FredCollector, createFredCollector, ECONOMIC_SERIES, DEFAULT_SERIES } from './fred';

// 统一市场数据收集器（支持多数据源和自动故障转移）
export { MarketCollector, marketCollector } from './market-collector';
export type { DataSource, MarketCollectorConfig } from './market-collector';

// 历史数据管理
export { HistoryManager, historyManager } from './history';
export type { HistoricalDataPoint, HistoricalRecord, MultiPeriodComparison } from './history';

// SEC EDGAR 收集器
export { SECCollector, createSECCollector } from './sec-edgar';

// RSS 收集器
export { RSSCollector, createRSSCollector } from './rss';

// 智慧资金收集器
export { CongressTradingCollector, createCongressTradingCollector, congressTradingCollector } from './congress-trading';
export { HedgeFundCollector, createHedgeFundCollector, hedgeFundCollector } from './hedge-fund';
export { PredictionMarketCollector, createPredictionMarketCollector, predictionMarketCollector } from './prediction-market';
export { SocialSentimentCollector, createSocialSentimentCollector, socialSentimentCollector } from './social-sentiment';
export { TwitterSentimentCollector, createTwitterSentimentCollector, twitterSentimentCollector } from './twitter-sentiment';
export type { TwitterSentiment, TwitterSentimentConfig } from './twitter-sentiment';

// 外汇与美元收集器
export { ForexCollector, createForexCollector, forexCollector, FOREX_SYMBOLS } from './forex-collector';
export type { ForexConfig } from './forex-collector';

// 财报日历与分析师评级
export { EarningsCalendarCollector, createEarningsCalendarCollector } from './earnings-calendar';
