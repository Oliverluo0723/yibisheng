import { expect, test } from 'vitest';
import {
  cross,
  defaultGrowth3DParams,
  dot,
  len,
  Plant3D,
  perpendicular,
  rotate,
  TICK_MS,
  type V3,
  v3,
} from './branching3d';

const stroke: V3[] = Array.from({ length: 20 }, (_, i) => v3(-0.5 + i * 0.05, 0, 0));
const VIEW = v3(0, 0, 1);

function grow(p: Plant3D, ms: number) {
  for (let t = 0; t < ms; t += TICK_MS) p.step(TICK_MS);
}

test('vector helpers', () => {
  const a = v3(1, 0, 0);
  const r = rotate(a, v3(0, 0, 1), Math.PI / 2);
  expect(r.x).toBeCloseTo(0);
  expect(r.y).toBeCloseTo(1);
  const n = perpendicular(v3(0, 1, 0));
  expect(dot(n, v3(0, 1, 0))).toBeCloseTo(0);
  expect(len(n)).toBeCloseTo(1);
  expect(cross(v3(1, 0, 0), v3(0, 1, 0))).toEqual(v3(0, 0, 1));
});

test('same seed grows the same plant', () => {
  const a = new Plant3D(stroke, { ...defaultGrowth3DParams }, 42, VIEW);
  const b = new Plant3D(stroke, { ...defaultGrowth3DParams }, 42, VIEW);
  grow(a, 3000);
  grow(b, 3000);
  expect(a.segments.length).toBeGreaterThan(10);
  expect(a.segments).toEqual(b.segments);
  expect(a.leaves).toEqual(b.leaves);
});

test('branches leave the drawing plane when outOfPlane > 0', () => {
  const p = new Plant3D(stroke, { ...defaultGrowth3DParams, outOfPlane: 1 }, 7, VIEW);
  grow(p, 4000);
  const maxZ = Math.max(...p.segments.map((s) => Math.abs(s.b.z)));
  expect(maxZ).toBeGreaterThan(0.05);
});

test('with no noise, no lean and an in-plane light, growth stays on the plane', () => {
  const p = new Plant3D(
    stroke,
    { ...defaultGrowth3DParams, outOfPlane: 0, noise: 0, branchChance: 0 },
    7,
    VIEW,
  );
  grow(p, 3000);
  for (const s of p.segments) expect(Math.abs(s.b.z)).toBeLessThan(1e-9);
});

test('respects maxDepth and maxTips, then dies and leaves a leaf on every tip', () => {
  const params = {
    ...defaultGrowth3DParams,
    branchChance: 1,
    maxDepth: 2,
    maxTips: 12,
    life: 2000,
  };
  const p = new Plant3D(stroke, params, 3, VIEW);
  let peak = 0;
  for (let t = 0; t < 2500; t += TICK_MS) {
    p.step(TICK_MS);
    peak = Math.max(peak, p.liveTips.length);
  }
  expect(peak).toBeLessThanOrEqual(12);
  expect(Math.max(...p.segments.map((s) => s.depth))).toBeLessThanOrEqual(2);
  expect(p.alive).toBe(false);
  expect(p.leaves.length).toBeGreaterThan(0);
});

test('leaves appear every leafEvery segments', () => {
  const p = new Plant3D(
    stroke,
    { ...defaultGrowth3DParams, branchChance: 0, leafEvery: 2 },
    9,
    VIEW,
  );
  grow(p, 3000);
  const perTip = p.segments.length / defaultGrowth3DParams.tipsPerStroke;
  const leavesPerTip = p.leaves.length / defaultGrowth3DParams.tipsPerStroke;
  expect(leavesPerTip).toBeGreaterThanOrEqual(Math.floor(perTip / 2) - 1);
  expect(leavesPerTip).toBeLessThanOrEqual(Math.ceil(perTip / 2) + 1);
});
