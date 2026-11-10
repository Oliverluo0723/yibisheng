import { expect, test } from 'vitest';
import { type BloomColour, DEFAULT_RECIPE, makeRecipe } from './recipe';

test('amount 0 永遠是預設配方', () => {
  for (const s of [1, 2, 99]) expect(makeRecipe(s, 0)).toEqual(DEFAULT_RECIPE);
});

test('同種子同配方，不同種子會不同', () => {
  expect(makeRecipe(7, 1)).toEqual(makeRecipe(7, 1));
  const set = new Set(Array.from({ length: 50 }, (_, i) => JSON.stringify(makeRecipe(i, 1))));
  expect(set.size).toBeGreaterThan(40);
});

test('amount 1 的分布與邊界', () => {
  const rs = Array.from({ length: 2000 }, (_, i) => makeRecipe(i, 1));
  const share = (c: BloomColour) => rs.filter((r) => r.colour === c).length / rs.length;
  expect(share('strings')).toBeGreaterThan(0.28);
  expect(share('strings')).toBeLessThan(0.42);
  expect(share('none')).toBeGreaterThan(0.08);
  expect(share('none')).toBeLessThan(0.18);
  expect(rs.filter((r) => r.chord === 'stay').length / rs.length).toBeCloseTo(0.25, 1);
  expect(rs.filter((r) => r.reverse).length / rs.length).toBeCloseTo(0.25, 1);
  for (const r of rs) {
    expect(r.grains.maxPerSec).toBeGreaterThanOrEqual(3);
    expect(r.grains.maxPerSec).toBeLessThanOrEqual(8);
    expect(Math.abs(r.pan)).toBeLessThanOrEqual(0.7);
    expect(r.sliceLen === Number.POSITIVE_INFINITY || r.sliceLen >= 1.5).toBe(true);
    expect(r.attack).toBeGreaterThanOrEqual(0.5);
    expect(r.attack).toBeLessThanOrEqual(3);
  }
});

test('amount 介於中間：範圍往預設值收縮', () => {
  const rs = Array.from({ length: 500 }, (_, i) => makeRecipe(i, 0.5));
  for (const r of rs) expect(Math.abs(r.pan)).toBeLessThanOrEqual(0.35 + 1e-9);
  const half = rs.filter((r) => r.reverse).length / rs.length;
  expect(half).toBeGreaterThan(0.06);
  expect(half).toBeLessThan(0.2);
});
