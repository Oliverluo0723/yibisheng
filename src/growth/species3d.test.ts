import { expect, test } from 'vitest';
import { dot, len, type V3, v3 } from './branching3d';
import { mulberry32 } from './rng';
import { frameFor, planGrass, planLily, planStock, pointAt, polylineLength } from './species3d';

const line: V3[] = Array.from({ length: 21 }, (_, i) => v3(-0.5 + i * 0.05, 0, 0));

test('polyline length and pointAt', () => {
  expect(polylineLength(line)).toBeCloseTo(1);
  expect(pointAt(line, 0.5).p.x).toBeCloseTo(0);
  expect(pointAt(line, 1).p.x).toBeCloseTo(0.5);
});

test('grass: deterministic, blades point upward, density scales the count', () => {
  const a = planGrass(line, { density: 1, height: 1 }, mulberry32(1));
  const b = planGrass(line, { density: 1, height: 1 }, mulberry32(1));
  expect(a).toEqual(b);
  expect(a.length).toBeGreaterThan(50);
  for (const g of a) {
    expect(g.axis.y).toBeGreaterThan(0.85);
    expect(g.height).toBeGreaterThan(0);
  }
  const sparse = planGrass(line, { density: 0.3, height: 1 }, mulberry32(1));
  expect(sparse.length).toBeLessThan(a.length);
});

test('spider lily: 5–7 florets per stalk, all after the stalk has grown, facing outward', () => {
  const stalks = planLily(line, { density: 1, height: 1 }, mulberry32(2));
  expect(stalks.length).toBeGreaterThanOrEqual(3);
  for (const s of stalks) {
    expect(s.florets.length).toBeGreaterThanOrEqual(5);
    expect(s.florets.length).toBeLessThanOrEqual(7);
    for (const f of s.florets) {
      expect(f.delay).toBeGreaterThanOrEqual(s.delay + s.growMs);
      expect(len(f.dir)).toBeCloseTo(1);
      // 朝外（和莖不平行）且不朝下
      expect(dot(f.dir, s.axis)).toBeLessThan(0.6);
      expect(dot(f.dir, s.axis)).toBeGreaterThan(0);
    }
  }
});

test('stock: leaves low, flowers high, flowers open bottom to top, top ones stay buds', () => {
  const stalks = planStock(line, { density: 1, height: 1 }, mulberry32(3));
  for (const s of stalks) {
    expect(Math.max(...s.leaves.map((l) => l.t))).toBeLessThan(0.5);
    expect(Math.min(...s.flowers.map((f) => f.t))).toBeGreaterThanOrEqual(0.5);
    const sorted = [...s.flowers].sort((a, b) => a.t - b.t);
    for (let i = 1; i < sorted.length; i++) {
      expect((sorted[i] as { delay: number }).delay).toBeGreaterThan(
        (sorted[i - 1] as { delay: number }).delay - 130,
      );
    }
    expect(s.flowers.slice(-3).every((f) => f.bud)).toBe(true);
  }
});

test('frameFor builds an orthonormal right-handed basis', () => {
  const f = frameFor(v3(1, 0.3, 0.2));
  expect(len(f.x)).toBeCloseTo(1);
  expect(dot(f.x, f.y)).toBeCloseTo(0);
  expect(dot(f.y, f.z)).toBeCloseTo(0);
  expect(f.z.y).toBeGreaterThan(0);
});
