import { expect, test } from 'vitest';
import { arcGrowth, arcLevel, defaultArcParams, witherFor } from './arc';
import { defaultGrowth3DParams } from './branching3d';

const arc = { ...defaultArcParams };

test('冷的時候量少，往門檻漲，過門檻翻面變多', () => {
  expect(arcLevel(0, arc)).toEqual({ amount: arc.cold, burst: false });
  expect(arcLevel(arc.threshold / 2, arc).amount).toBeCloseTo((arc.cold + 1) / 2);
  expect(arcLevel(arc.threshold - 0.001, arc).amount).toBeLessThan(1);
  expect(arcLevel(arc.threshold, arc)).toMatchObject({ amount: arc.burst, burst: true });
  expect(arcLevel(1, arc).amount).toBeGreaterThan(arc.burst);
});

test('關掉就等於沒接：倍率 1、參數原封不動', () => {
  const off = { ...arc, enabled: false };
  expect(arcLevel(0.9, off)).toEqual({ amount: 1, burst: false });
  expect(arcGrowth(defaultGrowth3DParams, 0.9, off)).toEqual(defaultGrowth3DParams);
});

test('生長參數跟著倍率走：冷時芽少、層淺、慢；翻面時芽多、層深、快', () => {
  const base = defaultGrowth3DParams;
  const cold = arcGrowth(base, 0, arc);
  expect(cold.tipsPerStroke).toBeLessThan(base.tipsPerStroke);
  expect(cold.tipsPerStroke).toBeGreaterThanOrEqual(1);
  expect(cold.maxDepth).toBe(base.maxDepth - 1);
  expect(cold.speed).toBeLessThan(base.speed);
  expect(cold.branchChance).toBeLessThan(base.branchChance);
  const hot = arcGrowth(base, 0.8, arc);
  expect(hot.tipsPerStroke).toBeGreaterThan(base.tipsPerStroke);
  expect(hot.maxTips).toBeGreaterThan(base.maxTips);
  expect(hot.maxDepth).toBe(base.maxDepth + 1);
  expect(hot.speed).toBeGreaterThan(base.speed);
  expect(hot.leafEvery).toBe(base.leafEvery);
  expect(hot.branchChance).toBeLessThanOrEqual(1);
  expect(hot.life).toBe(base.life);
  // 不動傳進來的 base
  expect(base).toEqual(defaultGrowth3DParams);
});

test('退潮：熱度在峰值不枯，掉到峰值 × (1 − 跨度) 全枯，中間平滑', () => {
  expect(witherFor(0.8, 0.8, arc)).toBe(0);
  expect(witherFor(0.8, 0.9, arc)).toBe(0);
  expect(witherFor(0.8, 0.8 * (1 - arc.witherSpan), arc)).toBe(1);
  expect(witherFor(0.8, 0, arc)).toBe(1);
  const mid = witherFor(0.8, 0.8 * (1 - arc.witherSpan / 2), arc);
  expect(mid).toBeGreaterThan(0.4);
  expect(mid).toBeLessThan(0.6);
  // 兩種關法都回 0
  expect(witherFor(0.8, 0, { ...arc, witherAuto: false })).toBe(0);
  expect(witherFor(0.8, 0, { ...arc, enabled: false })).toBe(0);
});

test('峰值很低（剛開始畫）也不會一出生就枯', () => {
  expect(witherFor(0.02, 0.02, arc)).toBe(0);
  expect(witherFor(0, 0, arc)).toBe(0);
});
