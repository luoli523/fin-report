/**
 * 外汇与美元数据收集器
 * 
 * 收集内容：
 * - 美元指数 (DXY)
 * - 美债收益率（3M、5Y、10Y、30Y）
 * - 主要货币对（USDCHF, USDSGD, USDJPY, USDCNH）
 * 
 * 注：2Y 收益率由 FRED (DGS2) 提供，Yahoo Finance 无可靠符号
 */

import { BaseCollector } from './base';
import { createYahooFinanceClient } from './yahoo-finance';
import {
  CollectedData,
  CollectorConfig,
  QuoteData,
  DataItem,
} from './types';

export const FOREX_SYMBOLS = {
  dollarIndex: 'DX-Y.NYB',

  treasuryYields: {
    '3M': '^IRX',
    '5Y': '^FVX',
    '10Y': '^TNX',
    '30Y': '^TYX',
  },

  currencyPairs: {
    'USDCHF': 'USDCHF=X',
    'USDSGD': 'USDSGD=X',
    'USDJPY': 'USDJPY=X',
    'USDCNH': 'USDCNH=X',
  },
};

export interface ForexConfig extends CollectorConfig {
  includeYields?: boolean;
  includeCurrencies?: boolean;
}

const DEFAULT_CONFIG: ForexConfig = {
  enabled: true,
  saveRaw: true,
  timeout: 30000,
  retries: 3,
  includeYields: true,
  includeCurrencies: true,
};

export class ForexCollector extends BaseCollector<ForexConfig> {
  readonly name = 'forex-collector';
  readonly description = 'Dollar Index, Treasury Yields, and Forex pairs collector';

  constructor(config: Partial<ForexConfig> = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
  }

  async collect(): Promise<CollectedData> {
    this.log('Starting forex and dollar data collection...');

    const symbols: string[] = [FOREX_SYMBOLS.dollarIndex];

    if (this.config.includeYields) {
      symbols.push(...Object.values(FOREX_SYMBOLS.treasuryYields));
    }

    if (this.config.includeCurrencies) {
      symbols.push(...Object.values(FOREX_SYMBOLS.currencyPairs));
    }

    let quotes: QuoteData[] = [];
    try {
      quotes = await this.fetchQuotes(symbols);
    } catch (error) {
      this.logError('Batch forex fetch failed, trying individual symbols', error as Error);
    }

    // If batch failed or returned empty, try symbols one by one
    if (quotes.length === 0) {
      for (const symbol of symbols) {
        try {
          const singleQuotes = await this.fetchQuotes([symbol]);
          quotes.push(...singleQuotes);
        } catch {
          this.log(`Skipping failed symbol: ${symbol}`);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const items: DataItem[] = quotes.map(quote => ({
      id: quote.symbol,
      title: quote.name,
      content: this.formatQuoteSummary(quote),
      timestamp: quote.timestamp,
      metadata: quote,
    }));

    const result: CollectedData = {
      source: this.name,
      type: 'market',
      collectedAt: new Date(),
      items,
      metadata: {
        dollarIndex: this.extractDollarIndex(quotes),
        treasuryYields: this.extractTreasuryYields(quotes),
        currencyPairs: this.extractCurrencyPairs(quotes),
      },
      raw: this.config.saveRaw ? quotes : undefined,
    };

    if (this.config.saveRaw && quotes.length > 0) {
      await this.saveRawData(quotes);
    }
    await this.saveProcessedData(result);

    this.log(`Collected ${quotes.length}/${symbols.length} forex data points`);
    return result;
  }

  private async fetchQuotes(symbols: string[]): Promise<QuoteData[]> {
    const quotes: QuoteData[] = [];
    const batchSize = 5;
    const delayMs = 1000;

    this.log(`Fetching quotes for ${symbols.length} symbols...`);

    const yahooFinance = await createYahooFinanceClient();

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (symbol) => {
          const quote = await yahooFinance.quote(symbol) as any;
          return { symbol, quote };
        })
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'fulfilled') {
          const transformed = this.transformQuote(result.value.quote, batch[j]);
          if (transformed) {
            quotes.push(transformed);
          }
        } else {
          this.log(`Failed to fetch ${batch[j]}: ${result.reason}`);
        }
      }

      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return quotes;
  }

  private transformQuote(quote: any, originalSymbol: string): QuoteData | null {
    if (!quote || typeof quote.regularMarketPrice !== 'number') {
      this.log(`Invalid quote data for ${originalSymbol}`);
      return null;
    }

    const marketTime = quote.regularMarketTime instanceof Date
      ? quote.regularMarketTime
      : quote.regularMarketTime
        ? new Date(quote.regularMarketTime)
        : new Date();

    return {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || originalSymbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      previousClose: quote.regularMarketPreviousClose,
      timestamp: marketTime,
    };
  }

  private formatQuoteSummary(quote: QuoteData): string {
    const direction = quote.change >= 0 ? '↑' : '↓';
    const sign = quote.change >= 0 ? '+' : '';
    return `${quote.name}: ${quote.price.toFixed(4)} ${direction} ${sign}${quote.change.toFixed(4)} (${sign}${quote.changePercent.toFixed(2)}%)`;
  }

  private extractDollarIndex(quotes: QuoteData[]): QuoteData | null {
    return quotes.find(q => q.symbol === FOREX_SYMBOLS.dollarIndex) || null;
  }

  private extractTreasuryYields(quotes: QuoteData[]): Record<string, QuoteData> {
    const yields: Record<string, QuoteData> = {};
    for (const [period, symbol] of Object.entries(FOREX_SYMBOLS.treasuryYields)) {
      const quote = quotes.find(q => q.symbol === symbol);
      if (quote) {
        yields[period] = quote;
      }
    }
    return yields;
  }

  private extractCurrencyPairs(quotes: QuoteData[]): Record<string, QuoteData> {
    const pairs: Record<string, QuoteData> = {};
    for (const [pair, symbol] of Object.entries(FOREX_SYMBOLS.currencyPairs)) {
      const quote = quotes.find(q => q.symbol === symbol);
      if (quote) {
        pairs[pair] = quote;
      }
    }
    return pairs;
  }
}

export const forexCollector = new ForexCollector();

export function createForexCollector(config?: Partial<ForexConfig>): ForexCollector {
  return new ForexCollector(config);
}
