import { expect, test } from 'vitest';
import { type BloomColour, DEFAULT_RECIPE, makeRecipe } from './recipe';
import { VOICES } from './voices';

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
  // 預設聲音（押花樹）：pad 4、piano 2、strings 1.5、swell 1、none 1
  expect(share('pad')).toBeGreaterThan(0.35);
  expect(share('pad')).toBeLessThan(0.5);
  expect(share('none')).toBeGreaterThan(0.06);
  expect(share('none')).toBeLessThan(0.16);
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

test('配方照聲音的權重抽顏色', () => {
  const rs = Array.from({ length: 1000 }, (_, i) => makeRecipe(i, 1, VOICES.丁香));
  const share = (c: BloomColour) => rs.filter((r) => r.colour === c).length / rs.length;
  expect(share('cluster')).toBeGreaterThan(0.6);
  expect(share('strings')).toBe(0);
  const grass = Array.from({ length: 1000 }, (_, i) => makeRecipe(i, 1, VOICES.草));
  expect(grass.filter((r) => r.colour === 'none').length / 1000).toBeGreaterThan(0.5);
});

test('幅度 0 時顏色是該聲音的第一個（最重的）', () => {
  expect(makeRecipe(3, 0, VOICES.紫羅蘭).colour).toBe('keys');
  expect(makeRecipe(3, 0).colour).toBe('pad');
});
