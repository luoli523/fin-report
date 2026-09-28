/**
 * v2 信息流 RSS 源
 *
 * 目标是覆盖整个市场而不是监控标的：央行、地缘、供应链、宏观、半导体、科技。
 * 抓不到的源会被跳过，不影响流水线。
 */

export interface FeedDef {
  url: string;
  source: string;
  category: FeedCategory;
}

export type FeedCategory =
  | 'central-bank'
  | 'macro'
  | 'geopolitics'
  | 'markets'
  | 'semis-supply-chain'
  | 'tech-ai'
  | 'energy'
  | 'asia';

export const FEEDS: FeedDef[] = [
  // 央行 / 官方
  { url: 'https://www.federalreserve.gov/feeds/press_all.xml', source: 'Federal Reserve', category: 'central-bank' },
  { url: 'https://www.federalreserve.gov/feeds/speeches.xml', source: 'Fed Speeches', category: 'central-bank' },
  { url: 'https://www.ecb.europa.eu/rss/press.html', source: 'ECB', category: 'central-bank' },
  { url: 'https://www.boj.or.jp/en/rss/whatsnew.xml', source: 'Bank of Japan', category: 'central-bank' },
  { url: 'https://www.bis.org/doclist/cbspeeches.rss', source: 'BIS Central Bank Speeches', category: 'central-bank' },

  // 宏观 / 市场
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC Top News', category: 'markets' },
  { url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', source: 'CNBC Economy', category: 'macro' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', source: 'CNBC Finance', category: 'markets' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source: 'MarketWatch', category: 'markets' },
  { url: 'https://feeds.marketwatch.com/marketwatch/marketpulse/', source: 'MarketWatch Pulse', category: 'markets' },
  { url: 'https://www.ft.com/rss/home', source: 'Financial Times', category: 'markets' },
  { url: 'https://feeds.content.dowjones.io/public/rss/RSSMarketsMain', source: 'WSJ Markets', category: 'markets' },
  { url: 'https://feeds.content.dowjones.io/public/rss/RSSWorldNews', source: 'WSJ World', category: 'geopolitics' },
  { url: 'https://www.economist.com/finance-and-economics/rss.xml', source: 'The Economist', category: 'macro' },
  { url: 'https://www.calculatedriskblog.com/feeds/posts/default', source: 'Calculated Risk', category: 'macro' },
  { url: 'https://wolfstreet.com/feed/', source: 'Wolf Street', category: 'macro' },
  { url: 'https://www.investing.com/rss/news_25.rss', source: 'Investing.com Economy', category: 'macro' },

  // 地缘政治
  { url: 'https://feeds.cfr.org/publication/rss', source: 'Council on Foreign Relations', category: 'geopolitics' },
  { url: 'https://www.csis.org/rss.xml', source: 'CSIS', category: 'geopolitics' },
  { url: 'https://warontherocks.com/feed/', source: 'War on the Rocks', category: 'geopolitics' },
  { url: 'https://www.lowyinstitute.org/the-interpreter/rss.xml', source: 'Lowy Interpreter', category: 'geopolitics' },
  { url: 'https://foreignpolicy.com/feed/', source: 'Foreign Policy', category: 'geopolitics' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera', category: 'geopolitics' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World', category: 'geopolitics' },

  // 亚洲 / 日本 / 中国
  { url: 'https://asia.nikkei.com/rss/feed/nar', source: 'Nikkei Asia', category: 'asia' },
  { url: 'https://www.scmp.com/rss/91/feed', source: 'SCMP China', category: 'asia' },
  { url: 'https://www.japantimes.co.jp/feed/', source: 'Japan Times', category: 'asia' },
  { url: 'https://en.yna.co.kr/RSS/news.xml', source: 'Yonhap', category: 'asia' },
  { url: 'https://www.kedglobal.com/rss', source: 'Korea Economic Daily', category: 'asia' },

  // 半导体 / 供应链
  { url: 'https://semianalysis.com/feed/', source: 'SemiAnalysis', category: 'semis-supply-chain' },
  { url: 'https://www.semiconductor-digest.com/feed/', source: 'Semiconductor Digest', category: 'semis-supply-chain' },
  { url: 'https://www.eetimes.com/feed/', source: 'EE Times', category: 'semis-supply-chain' },
  { url: 'https://www.trendforce.com/news/feed', source: 'TrendForce', category: 'semis-supply-chain' },
  { url: 'https://www.tomshardware.com/feeds/all', source: "Tom's Hardware", category: 'semis-supply-chain' },
  { url: 'https://www.hellenicshippingnews.com/feed/', source: 'Hellenic Shipping News', category: 'semis-supply-chain' },
  { url: 'https://www.freightwaves.com/news/feed', source: 'FreightWaves', category: 'semis-supply-chain' },
  { url: 'https://www.supplychaindive.com/feeds/news/', source: 'Supply Chain Dive', category: 'semis-supply-chain' },

  // 科技 / AI
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'TechCrunch AI', category: 'tech-ai' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', source: 'The Verge AI', category: 'tech-ai' },
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', source: 'Ars Technica', category: 'tech-ai' },
  { url: 'https://www.theinformation.com/feed', source: 'The Information', category: 'tech-ai' },
  { url: 'https://stratechery.com/feed/', source: 'Stratechery', category: 'tech-ai' },

  // 能源
  { url: 'https://oilprice.com/rss/main', source: 'OilPrice', category: 'energy' },
  { url: 'https://www.eia.gov/rss/todayinenergy.xml', source: 'EIA Today in Energy', category: 'energy' },
];
