import { expect, test } from 'vitest';
import { loopBars, loopsNear, tempoChoices } from './tempo';

const kits = [104, 104, 100, 86, 86, 119, 106, 120, 118].map((bpm, i) => ({ id: `k${i}`, bpm }));
const percs = [100, 100, 104, 113, 70, 120, 118].map((bpm, i) => ({ id: `p${i}`, bpm }));

test('只選鼓組與打擊都有 ±10% 內 loop 的速度', () => {
  const c = tempoChoices(kits, percs);
  expect(c).toContain(104);
  expect(c).toContain(119);
  expect(c).not.toContain(86);
  expect(new Set(c).size).toBe(c.length);
});

test('loopsNear 取 ±10% 內', () => {
  expect(loopsNear(kits, 104).map((k) => k.bpm)).toEqual([104, 104, 100, 106]);
});

test('loop 的小節數', () => {
  expect(loopBars(9.23, 104)).toBe(4);
  expect(loopBars(4.8, 100)).toBe(2);
  expect(loopBars(2.4, 100)).toBe(1);
  expect(loopBars(22.33, 86)).toBe(8);
});
