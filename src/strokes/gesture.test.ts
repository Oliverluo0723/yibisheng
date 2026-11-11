import { expect, test } from 'vitest';
import { analyzeGesture, EMPTY_GESTURE } from './gesture';

const run = (ms: number, speed: number, t0 = 0) =>
  Array.from({ length: Math.round(ms / 16) }, (_, i) => ({ t: t0 + i * 16, speed }));

test('空樣本回 EMPTY_GESTURE', () => {
  expect(analyzeGesture([])).toEqual(EMPTY_GESTURE);
});

test('一路快：能量高、沒有停頓、均勻度 1', () => {
  const s = run(1000, 0.9);
  const g = analyzeGesture(s);
  expect(g.durationMs).toBe((s.length - 1) * 16);
  expect(g.energy).toBeCloseTo(0.9, 2);
  expect(g.pauses).toBe(0);
  expect(g.evenness).toBe(1);
});

test('短於 130 ms 的慢下來不算停頓', () => {
  const g = analyzeGesture([...run(500, 0.5), ...run(100, 0, 500), ...run(500, 0.5, 600)]);
  expect(g.pauses).toBe(0);
});

test('兩次停頓平均分布 → 均勻度接近 1', () => {
  const s = [
    ...run(600, 0.5),
    ...run(200, 0, 600),
    ...run(600, 0.5, 800),
    ...run(200, 0, 1400),
    ...run(600, 0.5, 1600),
  ];
  const g = analyzeGesture(s);
  expect(g.pauses).toBe(2);
  expect(g.evenness).toBeGreaterThan(0.85);
});

test('兩次停頓擠在中段 → 均勻度低', () => {
  const s = [
    ...run(1200, 0.5),
    ...run(200, 0, 1200),
    ...run(60, 0.5, 1400),
    ...run(200, 0, 1460),
    ...run(1200, 0.5, 1660),
  ];
  const g = analyzeGesture(s);
  expect(g.pauses).toBe(2);
  expect(g.evenness).toBeLessThan(0.5);
});

test('停頓門檻跟著這一筆的速度：很慢但穩的一筆不算停頓', () => {
  const g = analyzeGesture(run(1500, 0.03));
  expect(g.pauses).toBe(0);
});

test('很慢的一筆裡真的停下來（速度掉到接近 0）才算停頓', () => {
  const g = analyzeGesture([...run(600, 0.03), ...run(200, 0.002, 600), ...run(600, 0.03, 800)]);
  expect(g.pauses).toBe(1);
});
