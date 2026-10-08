import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeHoldingQuotesForLLM } from '../src/pipeline/holdings';
import { Holding, WatchlistQuote } from '../src/pipeline/types';

const quote = (symbol: string, price: number, changePercent: number): WatchlistQuote =>
  ({ symbol, name: symbol, category: 'x', isIndex: false, price, changePercent });

test('gives the portfolio model the current price of each holding, not just its cost', () => {
  const holdings: Holding[] = [{ ticker: 'ORCL', tier: 'core', costBasis: 174.74 }];
  const text = describeHoldingQuotesForLLM(holdings, [quote('ORCL', 143.56, -0.84), quote('NVDA', 200, 1)]);
  assert.equal(text, '- ORCL: 143.56 (-0.84%)');
});

test('tells the model not to guess when a holding has no quote', () => {
  const holdings: Holding[] = [{ ticker: 'ORCL', tier: 'core' }, { ticker: 'XYZ', tier: 'satellite' }];
  const text = describeHoldingQuotesForLLM(holdings, [quote('ORCL', 143.56, -0.84)]);
  assert.equal(text, '- ORCL: 143.56 (-0.84%)\n- XYZ: 今日行情缺失，不要推断当前价');
});
