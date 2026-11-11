import { expect, test } from 'vitest';
import { activeTrees, densityFor, maxActiveFor } from './budget';

test('熱度決定同時幾株', () => {
  expect(maxActiveFor(0)).toBe(1);
  expect(maxActiveFor(0.45)).toBe(2);
  expect(maxActiveFor(0.9)).toBe(4);
});

test('株數越多每株越稀', () => {
  expect(densityFor(0)).toBe(1);
  expect(densityFor(1)).toBe(1);
  expect(densityFor(4)).toBeCloseTo(0.5);
  expect(densityFor(20)).toBeCloseTo(1 / Math.sqrt(20));
});

const t = (born: number) => ({ born });

test('株數不超過上限就全部在', () => {
  const trees = [t(1), t(2)];
  expect(activeTrees(trees, 4, 0)).toEqual(trees);
});

test('最新的固定在，最後一席每兩小節輪給更早的樹', () => {
  const trees = [t(1), t(2), t(3), t(4), t(5)];
  expect(activeTrees(trees, 2, 0)).toEqual([t(1), t(5)]);
  expect(activeTrees(trees, 2, 1)).toEqual([t(1), t(5)]);
  expect(activeTrees(trees, 2, 2)).toEqual([t(2), t(5)]);
  expect(activeTrees(trees, 2, 8)).toEqual([t(1), t(5)]);
  expect(activeTrees(trees, 1, 2)).toEqual([t(2)]);
});
