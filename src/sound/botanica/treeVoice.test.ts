import { expect, test } from 'vitest';
import { EMPTY_GESTURE, type Gesture } from '../../strokes/gesture';
import { makeTreeVoice, sixteenthOf } from './treeVoice';

const g = (energy: number, evenness = 1): Gesture => ({
  durationMs: 1000,
  energy,
  pauses: 0,
  evenness,
});

test('慢而穩的一筆：4 分、低音域、正放、長切片', () => {
  const v = makeTreeVoice(1, g(0.1));
  expect(v).toMatchObject({ subdivision: 4, register: 'low', lengthSec: 1.2, gainDb: -6 });
  expect(['piano', 'strings', 'clarinet']).toContain(v.role);
});

test('快而果決的一筆：16 分、高音域、短切片', () => {
  const v = makeTreeVoice(1, g(0.9));
  expect(v).toMatchObject({ subdivision: 16, register: 'high', lengthSec: 0.35, gainDb: -10 });
  expect(['bell', 'glitch', 'kalimba']).toContain(v.role);
});

test('停頓擠在一起（掙扎）→ 反轉', () => {
  expect(makeTreeVoice(1, g(0.5, 0.2)).reverse).toBe(true);
});

test('同種子同手勢一樣；不同種子不同', () => {
  expect(makeTreeVoice(7, g(0.5))).toEqual(makeTreeVoice(7, g(0.5)));
  expect(makeTreeVoice(7, g(0.5))).not.toEqual(makeTreeVoice(8, g(0.5)));
});

test('點亮順序是排列、第一格是 0；容量至少 2、不超過細分', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const v = makeTreeVoice(seed, g(0.5));
    expect(v.order[0]).toBe(0);
    expect([...v.order].sort((a, b) => a - b)).toEqual([...Array(v.subdivision).keys()]);
    expect(v.capacity).toBeGreaterThanOrEqual(2);
    expect(v.capacity).toBeLessThanOrEqual(v.subdivision);
  }
});

test('空手勢也能生出個性', () => {
  expect(makeTreeVoice(1, EMPTY_GESTURE).subdivision).toBe(8);
});

test('格子對到 16 分音符', () => {
  expect(sixteenthOf(4, 1)).toBe(4);
  expect(sixteenthOf(8, 3)).toBe(6);
  expect(sixteenthOf(16, 15)).toBe(15);
});
