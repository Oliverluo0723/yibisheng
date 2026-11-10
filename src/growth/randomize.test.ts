import { expect, test } from 'vitest';
import { randomizeGrowth } from './randomize';
import { mulberry32 } from './rng';
import { defaultGrowthParams } from './types';

test('amount 0 returns the base values unchanged', () => {
  expect(randomizeGrowth(defaultGrowthParams, 0, mulberry32(1))).toEqual(defaultGrowthParams);
});

test('same seed gives the same set, different seeds differ', () => {
  const a = randomizeGrowth(defaultGrowthParams, 0.5, mulberry32(3));
  const b = randomizeGrowth(defaultGrowthParams, 0.5, mulberry32(3));
  const c = randomizeGrowth(defaultGrowthParams, 0.5, mulberry32(4));
  expect(a).toEqual(b);
  expect(a).not.toEqual(c);
});

test('values stay in a sane range at full amount', () => {
  const rng = mulberry32(99);
  for (let i = 0; i < 200; i++) {
    const p = randomizeGrowth({ ...defaultGrowthParams, branchChance: 0.9, apical: 0.45 }, 1, rng);
    expect(p.branchChance).toBeGreaterThanOrEqual(0);
    expect(p.branchChance).toBeLessThanOrEqual(1);
    expect(p.apical).toBeLessThanOrEqual(0.5);
    expect(p.tropism).toBeLessThanOrEqual(1);
    expect(Number.isInteger(p.maxDepth)).toBe(true);
    expect(p.maxDepth).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(p.tipsPerStroke)).toBe(true);
    expect(p.tipsPerStroke).toBeGreaterThanOrEqual(1);
    expect(p.speed).toBeGreaterThan(0);
    expect(p.reach).toBeGreaterThan(0);
    expect(p.maxTips).toBe(defaultGrowthParams.maxTips);
  }
});
