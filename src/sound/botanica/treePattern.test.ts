import { expect, test } from 'vitest';
import { TreePattern } from './treePattern';
import { makeTreeVoice } from './treeVoice';

const g = { durationMs: 1000, energy: 0.2, pauses: 0, evenness: 1 };

test('出生亮兩格、第一格是 0', () => {
  const p = new TreePattern(makeTreeVoice(1, g));
  expect(p.lit.length).toBe(2);
  expect(p.lit).toContain(0);
  expect(p.hitsAt(0)).toBe(true);
  expect(p.dead).toBe(false);
});

test('點亮到容量就停', () => {
  const v = makeTreeVoice(1, g);
  const p = new TreePattern(v);
  for (let i = 2; i < v.capacity; i++) expect(p.light()).toBe(true);
  expect(p.light()).toBe(false);
  expect(p.lit.length).toBe(v.capacity);
});

test('熄到零就死；死了再熄回 false', () => {
  const p = new TreePattern(makeTreeVoice(1, g));
  expect(p.dim()).toBe(true);
  expect(p.dim()).toBe(true);
  expect(p.dead).toBe(true);
  expect(p.dim()).toBe(false);
  expect(p.hitsAt(0)).toBe(false);
});

test('8 分的第 3 格落在第 6 個 16 分音符', () => {
  const v = {
    ...makeTreeVoice(1, g),
    subdivision: 8 as const,
    order: [0, 3, 1, 2, 4, 5, 6, 7],
    capacity: 8,
  };
  const p = new TreePattern(v);
  expect(p.hitsAt(6)).toBe(true);
  expect(p.hitsAt(5)).toBe(false);
});
