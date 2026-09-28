/**
 * 世界快照标的（v2 流水线）
 *
 * 与 MONITORED_SYMBOLS 不同：这里不看个股，看整个市场的状态。
 * 全部可通过 Yahoo Finance 免费获取。
 */

export interface WorldSymbol {
  symbol: string;
  name: string;
  group: WorldGroup;
  /** 数值是收益率/波动率等"水平"而非价格，异常检测时用绝对变化而非百分比 */
  isLevel?: boolean;
}

export type WorldGroup =
  | 'us-index'
  | 'global-index'
  | 'us-sector'
  | 'rates'
  | 'credit'
  | 'volatility'
  | 'fx'
  | 'commodity'
  | 'crypto';

export const WORLD_SYMBOLS: WorldSymbol[] = [
  // 美股指数
  { symbol: '^GSPC', name: 'S&P 500', group: 'us-index' },
  { symbol: '^IXIC', name: 'NASDAQ', group: 'us-index' },
  { symbol: '^DJI', name: 'Dow Jones', group: 'us-index' },
  { symbol: '^RUT', name: 'Russell 2000', group: 'us-index' },
  { symbol: '^SOX', name: 'PHLX Semiconductor', group: 'us-index' },
  { symbol: 'RSP', name: 'S&P 500 Equal Weight', group: 'us-index' },

  // 全球指数
  { symbol: '^N225', name: 'Nikkei 225', group: 'global-index' },
  { symbol: 'EWJ', name: 'MSCI Japan ETF', group: 'global-index' },
  { symbol: '^KS11', name: 'KOSPI', group: 'global-index' },
  { symbol: '^TWII', name: 'Taiwan TAIEX', group: 'global-index' },
  { symbol: '^HSI', name: 'Hang Seng', group: 'global-index' },
  { symbol: '000001.SS', name: 'Shanghai Composite', group: 'global-index' },
  { symbol: '^STOXX50E', name: 'Euro Stoxx 50', group: 'global-index' },
  { symbol: '^GDAXI', name: 'DAX', group: 'global-index' },
  { symbol: '^FTSE', name: 'FTSE 100', group: 'global-index' },
  { symbol: '^BSESN', name: 'India Sensex', group: 'global-index' },
  { symbol: 'EEM', name: 'MSCI Emerging Markets ETF', group: 'global-index' },

  // 美股板块 ETF（轮动）
  { symbol: 'XLK', name: 'Technology', group: 'us-sector' },
  { symbol: 'XLF', name: 'Financials', group: 'us-sector' },
  { symbol: 'XLE', name: 'Energy', group: 'us-sector' },
  { symbol: 'XLV', name: 'Health Care', group: 'us-sector' },
  { symbol: 'XLI', name: 'Industrials', group: 'us-sector' },
  { symbol: 'XLY', name: 'Consumer Discretionary', group: 'us-sector' },
  { symbol: 'XLP', name: 'Consumer Staples', group: 'us-sector' },
  { symbol: 'XLU', name: 'Utilities', group: 'us-sector' },
  { symbol: 'XLRE', name: 'Real Estate', group: 'us-sector' },
  { symbol: 'XLB', name: 'Materials', group: 'us-sector' },
  { symbol: 'XLC', name: 'Communication Services', group: 'us-sector' },
  { symbol: 'IGV', name: 'Software ETF', group: 'us-sector' },
  { symbol: 'ITA', name: 'Aerospace & Defense ETF', group: 'us-sector' },

  // 利率
  { symbol: '^IRX', name: 'US 3M T-Bill', group: 'rates', isLevel: true },
  { symbol: '^FVX', name: 'US 5Y Yield', group: 'rates', isLevel: true },
  { symbol: '^TNX', name: 'US 10Y Yield', group: 'rates', isLevel: true },
  { symbol: '^TYX', name: 'US 30Y Yield', group: 'rates', isLevel: true },
  { symbol: 'TLT', name: '20Y+ Treasury ETF', group: 'rates' },
  { symbol: 'TIP', name: 'TIPS ETF (实际利率代理)', group: 'rates' },
  { symbol: 'RINF', name: 'Inflation Expectations ETF', group: 'rates' },

  // 信用
  { symbol: 'HYG', name: 'High Yield Corp Bond ETF', group: 'credit' },
  { symbol: 'LQD', name: 'IG Corp Bond ETF', group: 'credit' },
  { symbol: 'EMB', name: 'EM USD Sovereign Bond ETF', group: 'credit' },

  // 波动率
  { symbol: '^VIX', name: 'VIX', group: 'volatility', isLevel: true },
  { symbol: '^VIX3M', name: 'VIX 3M', group: 'volatility', isLevel: true },
  { symbol: '^MOVE', name: 'MOVE (债市波动率)', group: 'volatility', isLevel: true },

  // 外汇
  { symbol: 'DX-Y.NYB', name: 'US Dollar Index', group: 'fx' },
  { symbol: 'USDJPY=X', name: 'USD/JPY', group: 'fx' },
  { symbol: 'EURUSD=X', name: 'EUR/USD', group: 'fx' },
  { symbol: 'USDCNH=X', name: 'USD/CNH', group: 'fx' },
  { symbol: 'USDKRW=X', name: 'USD/KRW', group: 'fx' },
  { symbol: 'USDTWD=X', name: 'USD/TWD', group: 'fx' },
  { symbol: 'USDCHF=X', name: 'USD/CHF', group: 'fx' },
  { symbol: 'USDSGD=X', name: 'USD/SGD', group: 'fx' },

  // 大宗商品
  { symbol: 'CL=F', name: 'WTI Crude', group: 'commodity' },
  { symbol: 'BZ=F', name: 'Brent Crude', group: 'commodity' },
  { symbol: 'NG=F', name: 'Natural Gas', group: 'commodity' },
  { symbol: 'HG=F', name: 'Copper', group: 'commodity' },
  { symbol: 'GC=F', name: 'Gold', group: 'commodity' },
  { symbol: 'SI=F', name: 'Silver', group: 'commodity' },
  { symbol: 'URA', name: 'Uranium ETF', group: 'commodity' },

  // 加密
  { symbol: 'BTC-USD', name: 'Bitcoin', group: 'crypto' },
];

export const WORLD_GROUP_LABELS: Record<WorldGroup, string> = {
  'us-index': '美股指数',
  'global-index': '全球指数',
  'us-sector': '美股板块',
  rates: '利率',
  credit: '信用',
  volatility: '波动率',
  fx: '外汇',
  commodity: '大宗商品',
  crypto: '加密资产',
};
