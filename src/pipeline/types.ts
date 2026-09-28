/**
 * v2 流水线共享类型
 */

import { WorldGroup } from '../config/world-symbols';
import { FeedCategory } from '../config/feeds';

export interface WorldQuote {
  symbol: string;
  name: string;
  group: WorldGroup;
  isLevel?: boolean;
  price: number;
  change: number;
  changePercent: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketTime?: string;
}

export interface WorldSnapshot {
  date: string;
  collectedAt: string;
  quotes: WorldQuote[];
  failed: string[];
}

export interface WatchlistQuote {
  symbol: string;
  name: string;
  category: string;
  isIndex: boolean;
  price: number;
  changePercent: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface EarningsEvent {
  symbol: string;
  date: string;
  hour: string;
  epsEstimate?: number;
  revenueEstimate?: number;
}

export interface FeedItem {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  source: string;
  category: FeedCategory | 'finnhub';
  publishedAt: string;
}

export interface Anomaly {
  kind: 'zscore' | 'divergence' | 'threshold';
  symbol?: string;
  severity: 'high' | 'medium';
  text: string;
  value?: number;
  zscore?: number;
}

export interface TriageCluster {
  title: string;
  category: string;
  importance: number;
  why: string;
  itemIds: string[];
  outsideWatchlist: boolean;
}

export interface TriageResult {
  clusters: TriageCluster[];
  researchQuestions: string[];
  surprises: string[];
  noiseNote?: string;
}

export interface ResearchFinding {
  question?: string;
  clusterTitle?: string;
  kind: 'search' | 'extract';
  results: Array<{ title: string; url: string; content: string; publishedDate?: string }>;
}

export interface Holding {
  ticker: string;
  tier: 'core' | 'satellite';
  costBasis?: number;
  note?: string;
}

export interface MemoryState {
  updatedAt: string;
  regime?: string;
  theses: Array<{
    id: string;
    statement: string;
    since: string;
    status: 'active' | 'weakening' | 'invalidated' | 'confirmed';
    evidence?: string;
  }>;
  calls: Array<{
    id: string;
    date: string;
    ticker?: string;
    statement: string;
    checkBy?: string;
    outcome?: 'pending' | 'right' | 'wrong' | 'unclear';
    note?: string;
  }>;
  watchItems: string[];
}

export interface StageMeta {
  model: string;
  profile: string;
  tokens?: number;
}
