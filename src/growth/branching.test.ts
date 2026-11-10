import { expect, test } from 'vitest';
import type { Stroke } from '../strokes/types';
import { BranchingPlant } from './branching';
import { defaultGrowthParams, type GrowthEvent } from './types';

const stroke: Stroke = {
  id: 's',
  startedAt: 0,
  points: Array.from({ length: 20 }, (_, i) => ({ x: 0.2 + i * 0.03, y: 0.5, t: i * 16 })),
};

test('same seed gives identical growth', () => {
  const a = new BranchingPlant(stroke, defaultGrowthParams, 42);
  const b = new BranchingPlant(stroke, defaultGrowthParams, 42);
  for (let i = 0; i < 60; i++) {
    a.step(50);
    b.step(50);
  }
  expect(a.segments).toEqual(b.segments);
  expect(a.segments.length).toBeGreaterThan(0);
});

test('dies after life elapses and emits leaf events', () => {
  const p = new BranchingPlant(stroke, { ...defaultGrowthParams, life: 1000 }, 1);
  const events: GrowthEvent[] = [];
  for (let i = 0; i < 30; i++) events.push(...p.step(50));
  expect(p.alive).toBe(false);
  expect(events.some((e) => e.kind === 'leaf')).toBe(true);
  expect(p.step(50)).toEqual([]);
});

test('never exceeds maxDepth', () => {
  const p = new BranchingPlant(
    stroke,
    { ...defaultGrowthParams, branchChance: 1, maxDepth: 3, maxTips: 50 },
    7,
  );
  for (let i = 0; i < 60; i++) p.step(50);
  expect(Math.max(...p.segments.map((s) => s.depth))).toBeLessThanOrEqual(3);
});

test('respects maxTips', () => {
  const p = new BranchingPlant(
    stroke,
    { ...defaultGrowthParams, branchChance: 1, maxDepth: 8, maxTips: 20 },
    9,
  );
  let branches = 0;
  for (let i = 0; i < 60; i++) {
    branches += p.step(50).filter((e) => e.kind === 'branch').length;
  }
  expect(branches).toBeLessThanOrEqual(20 - 6); // 起始 6 芽 + 分岔 ≤ 20
});

test('single-point stroke does not throw', () => {
  const p = new BranchingPlant(
    { id: 'one', startedAt: 0, points: [{ x: 0.5, y: 0.5, t: 0 }] },
    defaultGrowthParams,
    3,
  );
  expect(() => {
    for (let i = 0; i < 20; i++) p.step(50);
  }).not.toThrow();
  for (const s of p.segments) {
    for (const v of [s.x1, s.y1, s.x2, s.y2]) expect(Number.isFinite(v)).toBe(true);
  }
});
