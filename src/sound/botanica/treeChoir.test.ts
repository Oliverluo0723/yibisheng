import { expect, test } from 'vitest';
import { mulberry32 } from '../../growth/rng';
import { EMPTY_GESTURE } from '../../strokes/gesture';
import { TreeChoir } from './treeChoir';

const g = EMPTY_GESTURE; // 8 分、mid
const full = { maxActive: 0, density: 1 };
const slots = (hits: { treeId: number; slot: number }[]) =>
  Object.fromEntries(hits.map((h) => [h.treeId, h.slot]));

test('一株在第 0 拍響、聲部 0', () => {
  const c = new TreeChoir(mulberry32(1));
  c.add(1, 1, g, 0);
  const hits = c.tick(0, 0, 0, full);
  expect(hits.map((h) => [h.treeId, h.slot])).toEqual([[1, 0]]);
  expect(c.tick(1, 0, 0, full)).toEqual([]); // 8 分的樹不在奇數 16 分音符上
});

test('聲部依序發、死了釋放', () => {
  const c = new TreeChoir(mulberry32(1));
  for (let i = 1; i <= 4; i++) c.add(i, i, g, i);
  c.add(5, 5, g, 5);
  expect(slots(c.tick(0, 0, 1, { maxActive: 9, density: 9 }))).toEqual({
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 0,
  });
  expect(c.wither(2)).toBe('dimmed');
  expect(c.wither(2)).toBe('died');
  expect(c.wither(2)).toBe('none');
  c.add(6, 6, g, 6);
  expect(slots(c.tick(0, 0, 1, { maxActive: 9, density: 9 }))[6]).toBe(1);
});

test('冷的時候只有最新一株響', () => {
  const c = new TreeChoir(mulberry32(1));
  c.add(1, 1, g, 1);
  c.add(2, 2, g, 2);
  expect(c.tick(0, 0, 0.1, { maxActive: 0, density: 9 }).map((h) => h.treeId)).toEqual([2]);
});

test('二十株：每拍最多 4 株、密度 1/√20', () => {
  const c = new TreeChoir(mulberry32(3));
  for (let i = 1; i <= 20; i++) c.add(i, i, g, i);
  let total = 0;
  for (let bar = 0; bar < 50; bar++) {
    const hits = c.tick(0, bar, 1, full);
    expect(hits.length).toBeLessThanOrEqual(4);
    total += hits.length;
  }
  // 4 席 × 50 小節 × 1/√20 ≈ 45，機率閘有抖動
  expect(total).toBeGreaterThan(20);
  expect(total).toBeLessThan(80);
});

test('分枝點亮更多格；死了不再響', () => {
  const c = new TreeChoir(mulberry32(1));
  const v = c.add(1, 1, g, 0);
  for (let i = 0; i < 20; i++) c.grow(1);
  let n = 0;
  for (let s = 0; s < 16; s++) n += c.tick(s, 0, 1, full).length;
  expect(n).toBe(v.capacity);
  for (let i = 0; i < 20; i++) c.wither(1);
  expect(c.aliveCount).toBe(0);
  expect(c.tick(0, 0, 1, full)).toEqual([]);
});
