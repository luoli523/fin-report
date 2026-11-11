import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectAnomalies } from '../src/pipeline/detect';

test('does not crash when every quote is missing (data source outage)', () => {
  const empty = { date: '2026-11-11', collectedAt: '2026-11-10T23:00:00.000Z', quotes: [], failed: ['^VIX', '^VIX3M'] };
  assert.deepEqual(detectAnomalies(empty, []), { anomalies: [], historyDays: 0 });
});

test('still flags an inverted VIX term structure', () => {
  const q = (symbol: string, price: number) => ({ symbol, name: symbol, group: 'volatility' as const, isLevel: true, price, change: 0, changePercent: 0 });
  const snap = { date: '2026-11-11', collectedAt: '', quotes: [q('^VIX', 30), q('^VIX3M', 25)], failed: [] };
  const texts = detectAnomalies(snap, []).anomalies.map(a => a.text);
  assert.ok(texts.includes('VIX 期限结构倒挂（30.0 > 25.0）：短期恐慌定价'));
});
