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

test('生長進度點亮：0 時兩格、1 時到容量；只增不減', () => {
  const c = new TreeChoir(mulberry32(1));
  const v = c.add(1, 1, g, 0);
  const lit = () => {
    let n = 0;
    for (let s = 0; s < 16; s++) n += c.tick(s, 0, 1, full).length;
    return n;
  };
  c.grow(1, 0);
  expect(lit()).toBe(2);
  c.grow(1, 0.5);
  const half = lit();
  expect(half).toBeGreaterThanOrEqual(2);
  expect(half).toBeLessThanOrEqual(v.capacity);
  c.grow(1, 1);
  expect(lit()).toBe(v.capacity);
  c.grow(1, 0.2);
  expect(lit()).toBe(v.capacity);
});

test('枯的進度熄格：0.5 時剩一半、1 時死且只回一次 died', () => {
  const c = new TreeChoir(mulberry32(1));
  c.add(1, 1, g, 0);
  c.grow(1, 1); // 點滿
  const peak =
    c.tick(0, 0, 1, full).length +
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].reduce(
      (n, s) => n + c.tick(s, 0, 1, full).length,
      0,
    );
  expect(c.witherTo(1, 0)).toBe('none');
  expect(c.witherTo(1, 0.5)).toBe('dimmed');
  let lit = 0;
  for (let s = 0; s < 16; s++) lit += c.tick(s, 0, 1, full).length;
  expect(lit).toBe(Math.round(peak / 2));
  expect(c.witherTo(1, 1)).toBe('died');
  expect(c.aliveCount).toBe(0);
  expect(c.witherTo(1, 1)).toBe('none');
});

test('clear 之後沒有樹、聲部全部釋放', () => {
  const c = new TreeChoir(mulberry32(1));
  c.add(1, 1, g, 1);
  c.add(2, 2, g, 2);
  c.clear();
  expect(c.aliveCount).toBe(0);
  c.add(3, 3, g, 3);
  expect(c.tick(0, 0, 1, full).map((h) => h.slot)).toEqual([0]);
});
