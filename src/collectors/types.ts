/**
 * 收集器数据类型定义
 */

// 数据类型枚举
export type DataType = 'news' | 'market' | 'economic' | 'sec-filings' | 'government-news' | 'company-ir' | 'rss' | 'congress-trading' | 'hedge-fund' | 'prediction-market' | 'social-sentiment' | 'earnings-calendar';

// 市场类型
export type MarketType = 'stock' | 'index' | 'forex' | 'crypto' | 'commodity';

// 单个数据项
export interface DataItem {
  id: string;
  title: string;
  content?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

// 股票/指数报价
export interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
  previousClose?: number;
  // 52周高低点
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHighChange?: number;       // 距52周高点变化
  fiftyTwoWeekHighChangePercent?: number;
  fiftyTwoWeekLowChange?: number;        // 距52周低点变化
  fiftyTwoWeekLowChangePercent?: number;
  timestamp: Date;
}

// 市场概览数据
export interface MarketOverview {
  indices: QuoteData[];      // 主要指数
  topGainers?: QuoteData[];  // 涨幅榜
  topLosers?: QuoteData[];   // 跌幅榜
  mostActive?: QuoteData[];  // 成交活跃
}

// 收集器返回的统一数据格式
export interface CollectedData {
  source: string;            // 数据来源标识
  type: DataType;            // 数据类型
  collectedAt: Date;         // 收集时间
  items: DataItem[];         // 通用数据项
  market?: MarketOverview;   // 市场数据（可选）
  raw?: any;                 // 原始数据（调试用）
  metadata?: Record<string, any>; // 额外的元数据（可选）
}

// 收集器配置
export interface CollectorConfig {
  enabled: boolean;
  saveRaw?: boolean;         // 是否保存原始数据
  timeout?: number;          // 请求超时（毫秒）
  retries?: number;          // 重试次数
}

// Yahoo Finance 特定配置
export interface YahooFinanceConfig extends CollectorConfig {
  symbols: string[];         // 要获取的股票代码
  indices: string[];         // 要获取的指数代码
}

// 新闻类别
export type NewsCategory = 'general' | 'forex' | 'crypto' | 'merger';

// 新闻文章
export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: Date;
  category: NewsCategory;
  relatedSymbols?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// Finnhub 特定配置
export interface FinnhubConfig extends CollectorConfig {
  apiKey: string;            // Finnhub API Key
  category?: NewsCategory;   // 新闻类别
  minId?: number;            // 最小新闻 ID（用于增量获取）
}

// 经济指标类别
export type EconomicCategory =
  | 'growth'      // 经济增长 (GDP)
  | 'inflation'   // 通胀 (CPI, PCE)
  | 'employment'  // 就业 (失业率, 非农)
  | 'rates'       // 利率 (联邦基金利率, 国债收益率)
  | 'sentiment'   // 信心指数 (消费者信心)
  | 'housing'     // 房地产
  | 'trade';      // 贸易

// 经济指标数据点
export interface EconomicDataPoint {
  seriesId: string;          // FRED 系列 ID
  name: string;              // 指标名称
  value: number;             // 当前值
  previousValue?: number;    // 前值
  change?: number;           // 变化
  changePercent?: number;    // 变化百分比
  unit: string;              // 单位
  frequency: string;         // 更新频率
  date: Date;                // 数据日期
  category: EconomicCategory;
}

// 经济数据概览
export interface EconomicOverview {
  growth: EconomicDataPoint[];
  inflation: EconomicDataPoint[];
  employment: EconomicDataPoint[];
  rates: EconomicDataPoint[];
  sentiment: EconomicDataPoint[];
}

// FRED 特定配置
export interface FredConfig extends CollectorConfig {
  apiKey: string;            // FRED API Key
  seriesIds?: string[];      // 要获取的系列 ID 列表
}

// SEC EDGAR 配置
export interface SECConfig extends CollectorConfig {
  userAgent: string;          // SEC 要求的 User-Agent
  symbols: string[];          // 要监控的股票代码
  forms: string[];            // 要收集的 filing 类型 (8-K, 10-K, 10-Q, etc.)
  daysBack: number;           // 回溯天数
}

// 政府机构新闻配置
export interface GovernmentNewsConfig extends CollectorConfig {
  sources: GovernmentSource[];  // 要监控的政府机构
}

// 政府机构来源
export interface GovernmentSource {
  name: string;
  type: 'rss' | 'api' | 'html';
  url: string;
  enabled: boolean;
}

// 公司 IR 配置
export interface CompanyIRConfig extends CollectorConfig {
  companies: CompanyIRSource[];  // 要监控的公司
}

// 公司 IR 来源
export interface CompanyIRSource {
  symbol: string;
  name: string;
  irUrl: string;
  rssUrl?: string;
  enabled: boolean;
}

// Alpha Vantage 配置
export interface AlphaVantageConfig extends CollectorConfig {
  apiKey: string;
  symbols: string[];
}

// RSS Feed 配置
export interface RSSConfig extends CollectorConfig {
  feeds: string[];           // RSS feed URLs
  maxItemsPerFeed?: number;  // 每个 feed 最多获取的条目数
}

// ===== 智慧资金数据类型 =====

// 国会交易数据
export interface CongressTrade {
  politician: string;          // 议员姓名
  party: 'D' | 'R' | 'I';      // 党派 (Democrat/Republican/Independent)
  chamber: 'House' | 'Senate'; // 众议院/参议院
  ticker: string;              // 股票代码
  company: string;             // 公司名称
  transactionType: 'buy' | 'sell' | 'exchange'; // 交易类型
  amount: string;              // 交易金额范围 (如 "$1,001 - $15,000")
  amountMin?: number;          // 最小金额
  amountMax?: number;          // 最大金额
  transactionDate: Date;       // 交易日期
  disclosureDate: Date;        // 披露日期
  filingUrl?: string;          // 申报文件链接
}

// 国会交易收集器配置
export interface CongressTradingConfig extends CollectorConfig {
  apiKey: string;              // Finnhub API Key (免费版包含国会交易数据)
  daysBack?: number;           // 回溯天数 (默认 30)
  filterSymbols?: string[];    // 过滤特定股票
}

// 对冲基金持仓数据 (13F)
export interface HedgeFundHolding {
  fundName: string;            // 基金名称
  fundManager: string;         // 基金经理
  ticker: string;              // 股票代码
  company: string;             // 公司名称
  shares: number;              // 持股数量
  value: number;               // 持仓市值 (美元)
  portfolioWeight: number;     // 占组合权重 (%)
  sharesChange: number;        // 持股变动
  sharesChangePercent: number; // 持股变动 (%)
  action: 'new' | 'add' | 'reduce' | 'sold' | 'unchanged'; // 操作类型
  reportDate: Date;            // 报告日期
  filingDate: Date;            // 申报日期
}

// 对冲基金持仓配置
export interface HedgeFundConfig extends CollectorConfig {
  apiKey?: string;             // 可选 API Key (SEC EDGAR 免费无需 key)
  topFunds?: number;           // 获取 Top N 基金 (默认 10)
  filterSymbols?: string[];    // 过滤特定股票
}

// 预测市场数据 (Polymarket)
export interface PredictionMarket {
  id: string;                  // 市场 ID
  question: string;            // 预测问题
  category: string;            // 分类 (经济/政治/科技等)
  outcomes: {
    name: string;              // 结果选项
    probability: number;       // 概率 (0-1)
    price: number;             // 价格
  }[];
  volume: number;              // 交易量 (美元)
  liquidity: number;           // 流动性
  endDate?: Date;              // 结束日期
  createdAt: Date;             // 创建日期
  url?: string;                // 市场链接
}

// 预测市场配置
export interface PredictionMarketConfig extends CollectorConfig {
  categories?: string[];       // 过滤分类
  minVolume?: number;          // 最小交易量过滤
}

// 社交情绪数据 (Reddit via ApeWisdom)
export interface SocialSentiment {
  ticker: string;              // 股票代码
  company?: string;            // 公司名称
  sentiment: 'bullish' | 'bearish' | 'neutral'; // 整体情绪
  bullishPercent: number;      // 看涨比例 (%)
  bearishPercent: number;      // 看跌比例 (%)
  messageCount: number;        // 提及次数
  messageVolume24h?: number;   // 24小时消息量
  watchersCount?: number;      // 关注人数 / 点赞数
  trendingScore?: number;      // 热度分数
  // ApeWisdom 特有字段
  rank?: number;               // Reddit 排名
  rankChange?: number;         // 排名变化 (24h)
  mentionsChange?: number;     // 提及变化百分比 (24h)
  upvotes?: number;            // 点赞数
  topMessages?: {
    body: string;              // 消息内容
    sentiment: 'bullish' | 'bearish' | 'neutral';
    likes: number;
    createdAt: Date;
    user: string;
  }[];
  timestamp: Date;
}

// 社交情绪配置
export interface SocialSentimentConfig extends CollectorConfig {
  apiKey?: string;             // StockTwits API Key (可选)
  symbols: string[];           // 要监控的股票
  includeMessages?: boolean;   // 是否包含热门消息
}
