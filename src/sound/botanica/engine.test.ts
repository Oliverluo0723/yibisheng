import { expect, test } from 'vitest';
import type { GrowthEvent } from '../../growth/types';
import type { StrokePoint } from '../../strokes/types';
import { BotanicaEngine, type EngineDeps } from './engine';
import type { SampleRole } from './manifest';
import { defaultBotanicaParams, freshBotanicaParams } from './params';

const fake = () => {
  const calls: string[] = [];
  const layer = { setEnabled: () => {}, setVolume: () => {}, dispose: () => {} };
  const ready = new Set<SampleRole>([
    'bed',
    'kalimba',
    'bell',
    'glitch',
    'strings',
    'piano',
    'swell',
    'drip',
    'glitchfx',
  ]);
  let t = 0;
  const deps: EngineDeps = {
    bed: { ...layer, start: () => calls.push('bed.start') },
    bloom: { ...layer, bloom: (id, o) => calls.push(`bloom ${id} shift=${o.shift}`) },
    grains: { ...layer, grain: (id, o) => calls.push(`grain ${id} shift=${o.shift}`) },
    drips: {
      ...layer,
      drip: (id) => calls.push(`drip ${id}`),
      glitch: (id) => calls.push(`glitch ${id}`),
    },
    store: { ready: (r) => ready.has(r), loadRole: async () => {} },
    now: () => t,
    seed: 1,
  };
  return {
    calls,
    deps,
    ready,
    tick: (ms: number) => {
      t += ms;
    },
  };
};
const ev = (depth: number, x = 0.5): GrowthEvent => ({ kind: 'branch', x, y: 0.5, depth, age: 0 });
const calm = () => ({ ...freshBotanicaParams(), randomness: 0 });
const shift = (c: string | undefined) => Number((c ?? '').split('shift=')[1]);

test('畫線中無聲；放開才綻放並推進和弦', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onStrokePoint({ x: 0, y: 0, t: 0 } as StrokePoint);
  expect(f.calls).toEqual([]);
  e.onPlantStart(1);
  expect(e.chordIndex).toBe(0); // 第一筆落在 IV
  expect(f.calls.some((c) => c.startsWith('bloom strings-'))).toBe(true);
});

test('1.5 秒內的第二筆只推進和弦', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1);
  f.tick(500);
  e.onPlantStart(2);
  expect(f.calls.filter((c) => c.startsWith('bloom')).length).toBe(1);
  expect(e.chordIndex).toBe(1);
});

test('素材沒載好就略過，不丟錯', () => {
  const f = fake();
  f.ready.clear();
  const e = new BotanicaEngine(freshBotanicaParams(), f.deps);
  e.onPlantStart(1);
  e.onGrowth(ev(1));
  e.onPlantDone();
  expect(f.calls).toEqual([]);
});

test('顆粒受每秒上限，位移在 ±7 內，深度決定素材類別', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1);
  for (let i = 0; i < 20; i++) {
    f.tick(10);
    e.onGrowth(ev(0));
  }
  const g = f.calls.filter((c) => c.startsWith('grain'));
  expect(g.length).toBeGreaterThan(0);
  expect(g.length).toBeLessThanOrEqual(6);
  for (const c of g) {
    expect(c).toMatch(/grain kalimba-/);
    expect(Math.abs(shift(c))).toBeLessThanOrEqual(7);
  }
  f.tick(1100);
  e.onGrowth(ev(4));
  expect(f.calls.at(-1)).toMatch(/grain glitch-/);
});

test('換調後下一個顆粒用新調', () => {
  // 第一筆後和弦是 IV（F：5,9,0 → 最短位移 5,-3,0）；換到 G 後 keyShift(C,G) = -5 → 0,4,-5
  const f = fake();
  const p = calm();
  const e = new BotanicaEngine(p, f.deps);
  e.onPlantStart(1);
  for (let i = 0; i < 6; i++) {
    f.tick(200);
    e.onGrowth(ev(2));
    expect([5, -3, 0]).toContain(shift(f.calls.at(-1)));
  }
  p.key = 'G';
  e.applyParams();
  for (let i = 0; i < 6; i++) {
    f.tick(200);
    e.onGrowth(ev(2));
    expect([0, 4, -5]).toContain(shift(f.calls.at(-1)));
  }
});

test('長完掉一滴水；閒置後偶發', () => {
  const f = fake();
  const e = new BotanicaEngine(freshBotanicaParams(), f.deps);
  e.onPlantStart(1);
  e.onPlantDone();
  expect(f.calls.at(-1)).toMatch(/^drip /);
  const before = f.calls.length;
  for (let i = 0; i < 12; i++) {
    f.tick(1000);
    e.poll();
  }
  expect(f.calls.length).toBe(before); // 12 秒內不偶發
  for (let i = 0; i < 60; i++) {
    f.tick(1000);
    e.poll();
  }
  expect(f.calls.length).toBeGreaterThan(before); // 之後 60 秒內至少一次
  expect(f.calls.slice(before).every((c) => /^(drip|glitch) /.test(c))).toBe(true);
});

test('隨機幅度 0：不同種子的綻放參數相同', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  for (const s of [1, 2, 3]) {
    e.onPlantStart(s);
    f.tick(2000);
  }
  const seen = new Set(
    f.calls.filter((c) => c.startsWith('bloom')).map((c) => c.replace(/strings-\d+/, 'strings-*')),
  );
  expect(seen.size).toBe(1);
});

test('隨機幅度全開：八筆的綻放不會都一樣', () => {
  const f = fake();
  const recorded: string[] = [];
  f.deps.bloom.bloom = (id, o) => recorded.push(JSON.stringify({ id, ...o }));
  const e = new BotanicaEngine({ ...freshBotanicaParams(), randomness: 1 }, f.deps);
  for (let s = 1; s <= 8; s++) {
    e.onPlantStart(s * 7919);
    f.tick(3000);
  }
  expect(new Set(recorded).size).toBe(recorded.length);
});

test('預設參數物件不被引擎改動', () => {
  const f = fake();
  const p = freshBotanicaParams();
  new BotanicaEngine(p, f.deps).onPlantStart(1);
  expect(p).toEqual(defaultBotanicaParams);
});
