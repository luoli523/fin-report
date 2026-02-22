/**
 * Earnings Calendar & Analyst Ratings Collector
 * 
 * Uses Finnhub API (free tier) to collect:
 * - Upcoming earnings dates for monitored stocks
 * - Analyst consensus ratings and price targets
 */

import { BaseCollector } from './base';
import {
  CollectedData,
  CollectorConfig,
  DataItem,
} from './types';
import * as https from 'https';

interface EarningsCalendarConfig extends CollectorConfig {
  apiKey: string;
  symbols?: string[];
}

interface FinnhubEarningsItem {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

interface FinnhubRecommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

interface FinnhubPriceTarget {
  lastUpdated: string;
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
}

export class EarningsCalendarCollector extends BaseCollector<EarningsCalendarConfig> {
  readonly name = 'earnings-calendar';
  readonly description = 'Earnings calendar and analyst ratings via Finnhub';

  private readonly finnhubBase = 'https://finnhub.io/api/v1';

  constructor(config: Partial<EarningsCalendarConfig> & { apiKey: string }) {
    super({
      enabled: true,
      saveRaw: true,
      timeout: 30000,
      retries: 3,
      ...config,
    });
  }

  async collect(): Promise<CollectedData> {
    this.log('Starting earnings calendar & analyst ratings collection...');

    const items: DataItem[] = [];
    const rawData: Record<string, unknown> = {};

    // 1. Fetch upcoming earnings calendar (this week + next week)
    try {
      const today = new Date();
      const from = today.toISOString().split('T')[0];
      const nextWeek = new Date(today.getTime() + 14 * 86400000);
      const to = nextWeek.toISOString().split('T')[0];

      const earnings = await this.fetchEarningsCalendar(from, to);
      rawData.earningsCalendar = earnings;

      // Filter to only our monitored symbols
      const monitoredSet = new Set(this.config.symbols || []);
      const relevantEarnings = monitoredSet.size > 0
        ? earnings.filter(e => monitoredSet.has(e.symbol))
        : earnings;

      for (const e of relevantEarnings) {
        items.push({
          id: `earnings-${e.symbol}-${e.date}`,
          title: `${e.symbol} Earnings: ${e.date} (Q${e.quarter} ${e.year})`,
          content: this.formatEarningsItem(e),
          timestamp: new Date(e.date),
          metadata: {
            type: 'earnings',
            symbol: e.symbol,
            date: e.date,
            hour: e.hour,
            quarter: e.quarter,
            year: e.year,
            epsEstimate: e.epsEstimate,
            revenueEstimate: e.revenueEstimate,
          },
        });
      }

      this.log(`Found ${relevantEarnings.length} upcoming earnings reports`);
    } catch (error) {
      this.logError('Failed to fetch earnings calendar', error as Error);
    }

    // 2. Fetch analyst ratings for key stocks
    const coreSymbols = this.config.symbols?.slice(0, 15) || [
      'NVDA', 'MSFT', 'GOOGL', 'TSM', 'META', 'AMZN', 'AMD', 'AVGO',
    ];

    for (const symbol of coreSymbols) {
      try {
        const [recommendation, priceTarget] = await Promise.all([
          this.fetchRecommendation(symbol),
          this.fetchPriceTarget(symbol),
        ]);

        if (recommendation || priceTarget) {
          const rec = recommendation;
          const pt = priceTarget;

          items.push({
            id: `rating-${symbol}`,
            title: `${symbol} Analyst Consensus`,
            content: this.formatRatingItem(symbol, rec, pt),
            timestamp: new Date(),
            metadata: {
              type: 'analyst-rating',
              symbol,
              recommendation: rec ? {
                strongBuy: rec.strongBuy,
                buy: rec.buy,
                hold: rec.hold,
                sell: rec.sell,
                strongSell: rec.strongSell,
                period: rec.period,
              } : null,
              priceTarget: pt ? {
                targetMean: pt.targetMean,
                targetMedian: pt.targetMedian,
                targetHigh: pt.targetHigh,
                targetLow: pt.targetLow,
                lastUpdated: pt.lastUpdated,
              } : null,
            },
          });
        }

        await new Promise(resolve => setTimeout(resolve, 250));
      } catch {
        this.log(`Skipping analyst data for ${symbol}`);
      }
    }

    rawData.analystRatings = items.filter(i => i.metadata?.type === 'analyst-rating');

    const result: CollectedData = {
      source: this.name,
      type: 'earnings-calendar',
      collectedAt: new Date(),
      items,
      metadata: {
        totalEarnings: items.filter(i => i.metadata?.type === 'earnings').length,
        totalRatings: items.filter(i => i.metadata?.type === 'analyst-rating').length,
      },
    };

    if (this.config.saveRaw) {
      await this.saveRawData(rawData);
    }
    await this.saveProcessedData(result);

    this.log(`Collected ${items.length} items (earnings + analyst ratings)`);
    return result;
  }

  private async fetchEarningsCalendar(from: string, to: string): Promise<FinnhubEarningsItem[]> {
    const url = `${this.finnhubBase}/calendar/earnings?from=${from}&to=${to}&token=${this.config.apiKey}`;
    const data = await this.httpsRequest(url);
    return data?.earningsCalendar || [];
  }

  private async fetchRecommendation(symbol: string): Promise<FinnhubRecommendation | null> {
    const url = `${this.finnhubBase}/stock/recommendation?symbol=${symbol}&token=${this.config.apiKey}`;
    const data = await this.httpsRequest(url);
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  }

  private async fetchPriceTarget(symbol: string): Promise<FinnhubPriceTarget | null> {
    const url = `${this.finnhubBase}/stock/price-target?symbol=${symbol}&token=${this.config.apiKey}`;
    const data = await this.httpsRequest(url);
    return data?.targetMean ? data : null;
  }

  private httpsRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: this.config.timeout || 15000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error('JSON parse error')); }
          } else if (res.statusCode === 429) {
            reject(new Error('Rate limit'));
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  private formatEarningsItem(e: FinnhubEarningsItem): string {
    const parts = [`${e.symbol} Q${e.quarter} ${e.year} Earnings: ${e.date}`];
    if (e.hour) parts.push(`Time: ${e.hour === 'bmo' ? 'Before Market Open' : e.hour === 'amc' ? 'After Market Close' : e.hour}`);
    if (e.epsEstimate !== null) parts.push(`EPS Est: $${e.epsEstimate}`);
    if (e.revenueEstimate !== null) parts.push(`Rev Est: $${(e.revenueEstimate / 1e9).toFixed(2)}B`);
    return parts.join(' | ');
  }

  private formatRatingItem(
    symbol: string,
    rec: FinnhubRecommendation | null,
    pt: FinnhubPriceTarget | null,
  ): string {
    const parts = [symbol];
    if (rec) {
      const total = rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell;
      parts.push(`Ratings: ${rec.strongBuy}SB/${rec.buy}B/${rec.hold}H/${rec.sell}S/${rec.strongSell}SS (${total} analysts)`);
    }
    if (pt) {
      parts.push(`Target: $${pt.targetMedian} (Low: $${pt.targetLow}, High: $${pt.targetHigh})`);
    }
    return parts.join(' | ');
  }
}

export function createEarningsCalendarCollector(
  config: Partial<EarningsCalendarConfig> & { apiKey: string },
): EarningsCalendarCollector {
  return new EarningsCalendarCollector(config);
}
