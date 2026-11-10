import { expect, test } from 'vitest';
import { BranchingPlant, TICK_MS } from '../growth/branching';
import { defaultGrowthParams } from '../growth/types';
import type { Stroke } from '../strokes/types';
import type { PenSample } from './pen';
import { PlantPainter } from './plantPainter';
import type { Brush, BrushEnv } from './types';

const stroke: Stroke = {
  id: 's',
  startedAt: 0,
  points: Array.from({ length: 20 }, (_, i) => ({ x: 0.2 + i * 0.03, y: 0.5, t: i * 16 })),
};

function fakeBrush(
  log: { brush: number; a: PenSample; b: PenSample }[],
  counter: { n: number },
): Brush {
  const id = counter.n++;
  return {
    id: 'fake',
    name: 'fake',
    note: '',
    params: { k: 1 },
    specs: {},
    taper: true,
    begin() {},
    segment(_env, a, b) {
      log.push({ brush: id, a, b });
    },
  };
}

test('each tip gets its own brush and is drawn as one continuous line', () => {
  const plant = new BranchingPlant(stroke, { ...defaultGrowthParams, branchChance: 0.5 }, 3);
  const log: { brush: number; a: PenSample; b: PenSample }[] = [];
  const counter = { n: 0 };
  const painter = new PlantPainter(plant, () => fakeBrush(log, counter), { k: 2 }, {} as BrushEnv, {
    size: 14,
    width: 0.5,
    ageThin: 0.5,
    life: defaultGrowthParams.life,
    minMove: 2,
    tipTaper: 0.6,
  });
  for (let f = 0; f < 600 && plant.alive; f++) {
    plant.step(TICK_MS);
    painter.paint(1000, 800);
  }
  expect(log.length).toBeGreaterThan(20);
  // 每支芽一支筆
  expect(counter.n).toBeGreaterThanOrEqual(defaultGrowthParams.tipsPerStroke);
  const lastByBrush = new Map<number, PenSample>();
  for (const { brush, a, b } of log) {
    const prev = lastByBrush.get(brush);
    if (prev) expect(a).toBe(prev); // 同一支芽：這段的起點就是上一段的終點
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(2);
    expect(b.width).toBeGreaterThan(0);
    lastByBrush.set(brush, b);
  }
});
