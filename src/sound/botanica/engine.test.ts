import { expect, test } from 'vitest';
import type { GrowthEvent } from '../../growth/types';
import type { StrokePoint } from '../../strokes/types';
import { BotanicaEngine, type EngineDeps } from './engine';
import type { SampleRole } from './manifest';
import { defaultBotanicaParams, freshBotanicaParams } from './params';
import { DEFAULT_RECIPE } from './recipe';

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
    'kit',
    'perc',
    'keys',
    'ostr',
  ]);
  const levels: { perc: number; kit: number; lowpassHz: number }[] = [];
  const phrases: { midi: number; eighth: number; velocity: number }[][] = [];
  let t = 0;
  let tick: ((time: number, s: number, bar: number) => void) | null = null;
  const deps: EngineDeps = {
    clock: {
      everySixteenth: (fn) => {
        tick = fn;
        return () => {
          tick = null;
        };
      },
    },
    bed: { ...layer, start: () => calls.push('bed.start') },
    bloom: { ...layer, bloom: (id, o) => calls.push(`bloom ${id} shift=${o.shift}`) },
    grains: {
      ...layer,
      setLowpass: (hz) => calls.push(`lowpass ${hz}`),
      grain: (id, o) =>
        calls.push(`grain ${id} shift=${o.shift} db=${o.gainDb}${o.durationSec ? ' slice' : ''}`),
    },
    pad: { ...layer, chord: (m, o) => calls.push(`pad ${m.join(',')} v=${o.velocity.toFixed(2)}`) },
    drips: {
      ...layer,
      drip: (id) => calls.push(`drip ${id}`),
      glitch: (id, _s, o) => calls.push(`glitch ${id}${o?.reverse ? ' rev' : ''}`),
    },
    drums: {
      ...layer,
      start: (bpm) => calls.push(`drums.start ${bpm}`),
      setLevels: (perc, kit, lowpassHz) => levels.push({ perc, kit, lowpassHz }),
    },
    piano: {
      ...layer,
      start: () => {},
      phrase: (n) => {
        phrases.push([...n]);
        calls.push(`piano ${n.length}`);
      },
    },
    store: { ready: (r) => ready.has(r), loadRole: async () => {} },
    now: () => t,
    seed: 1,
  };
  return {
    calls,
    levels,
    phrases,
    deps,
    ready,
    tick: (ms: number) => {
      t += ms;
    },
    sixteenth: (s: number, bar = 0) => tick?.(bar * 16 + s, s, bar),
  };
};
const info = (id: number) => ({
  id,
  gesture: { durationMs: 1000, energy: 0.2, pauses: 0, evenness: 1 },
});
const ev = (depth: number, x = 0.5): GrowthEvent => ({ kind: 'branch', x, y: 0.5, depth, age: 0 });
const calm = () => ({ ...freshBotanicaParams(), randomness: 0 });
const shift = (c: string | undefined) => Number(/shift=(-?\d+)/.exec(c ?? '')?.[1]);

test('畫線中無聲；放開才綻放並推進和弦', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onStrokePoint({ x: 0, y: 0, t: 0 } as StrokePoint);
  expect(f.calls).toEqual([]);
  e.onPlantStart(1);
  expect(e.chordIndex).toBe(0); // 第一筆落在 IV
  // 預設聲音（押花樹）、幅度 0 → 弦樂拉長的 F 和弦，中音域
  expect(f.calls).toContain('pad 53,57,60 v=1.00');
});

test('1.5 秒內的第二筆只推進和弦', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1);
  f.tick(500);
  e.onPlantStart(2);
  expect(f.calls.filter((c) => /^(bloom|pad) /.test(c)).length).toBe(1);
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
    expect(c).toMatch(/grain piano-\d+ .* db=-8 slice/); // 押花樹：淺層用鋼琴碎片
    expect(Math.abs(shift(c))).toBeLessThanOrEqual(7);
  }
  f.tick(1100);
  e.onGrowth(ev(4));
  expect(f.calls.at(-1)).toMatch(/grain bell-/);
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
  // 和弦會跟著進行走（F、G、Am），但力度等參數一樣
  const seen = new Set(
    f.calls.filter((c) => c.startsWith('pad')).map((c) => c.replace(/^pad [\d,]+ /, '')),
  );
  expect(seen.size).toBe(1);
});

test('隨機幅度全開：八筆的綻放不會都一樣', () => {
  const f = fake();
  const recorded: string[] = [];
  f.deps.bloom.bloom = (id, o) => recorded.push(JSON.stringify({ id, ...o }));
  f.deps.pad.chord = (m, o) => recorded.push(JSON.stringify({ m, ...o }));
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

test('同一毫秒內的多個分枝只出一顆（時間戳帶小數也一樣）', () => {
  const f = fake();
  const t = { v: 1000.1 };
  f.deps.now = () => t.v;
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1);
  for (const x of [1000.1, 1000.4, 1000.9]) {
    t.v = x;
    e.onGrowth(ev(0));
  }
  expect(f.calls.filter((c) => c.startsWith('grain')).length).toBe(1);
});

const heatUp = (e: BotanicaEngine, f: ReturnType<typeof fake>, strokes: number) => {
  for (let i = 0; i < strokes; i++) {
    e.onPlantStart(i + 1);
    for (let j = 0; j < 10; j++) {
      f.tick(50);
      e.onGrowth(ev(1));
    }
  }
};

test('熱度：畫越多越高，停手後退', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  expect(e.heat()).toBe(0);
  heatUp(e, f, 2);
  const a = e.heat();
  heatUp(e, f, 4);
  expect(e.heat()).toBeGreaterThan(a);
  f.tick(60000);
  expect(e.heat()).toBeLessThan(a);
});

test('速度只從有打擊可配的鼓組速度裡抽（不會是 86）', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const f = fake();
    const e = new BotanicaEngine(calm(), { ...f.deps, seed });
    expect([100, 104, 106, 118, 119, 120]).toContain(e.bpm);
  }
});

test('start 把速度交給鼓與鋼琴', async () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  await e.start();
  expect(f.calls).toContain(`drums.start ${e.bpm}`);
  e.dispose();
});

test('鼓的音量跟著熱度：冷時 0、熱時鼓組全開、停手久了回到 0', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.poll();
  expect(f.levels.at(-1)).toMatchObject({ perc: 0, kit: 0 });
  heatUp(e, f, 8);
  for (let i = 0; i < 10; i++) e.poll();
  expect(f.levels.at(-1)?.kit).toBeCloseTo(0.8, 1); // 熱度全開 × 押花樹的鼓份量 0.8
  f.tick(300000);
  e.poll();
  expect(f.levels.at(-1)).toMatchObject({ perc: 0, kit: 0 });
});

test('鋼琴：冷時不彈；熱時會彈，音在當下的調裡', () => {
  const f = fake();
  const p = calm();
  const e = new BotanicaEngine(p, f.deps);
  for (let i = 0; i < 60; i++) {
    f.tick(500);
    e.poll();
  }
  expect(f.phrases.length).toBe(0);
  heatUp(e, f, 6);
  for (let i = 0; i < 40; i++) {
    f.tick(500);
    e.poll();
  }
  expect(f.phrases.length).toBeGreaterThan(0);
  const C = [0, 2, 4, 5, 7, 9, 11];
  for (const ph of f.phrases) for (const n of ph) expect(C).toContain(n.midi % 12);
  p.key = 'G';
  e.applyParams();
  const before = f.phrases.length;
  for (let i = 0; i < 40; i++) {
    f.tick(500);
    e.onGrowth(ev(1));
    e.poll();
  }
  expect(f.phrases.length).toBeGreaterThan(before);
  const G = C.map((x) => (x + 7) % 12);
  for (const ph of f.phrases.slice(before)) for (const n of ph) expect(G).toContain(n.midi % 12);
});

test('鋼琴素材沒載好就不彈', () => {
  const f = fake();
  f.ready.delete('keys');
  const e = new BotanicaEngine(calm(), f.deps);
  heatUp(e, f, 6);
  for (let i = 0; i < 40; i++) {
    f.tick(500);
    e.poll();
  }
  expect(f.phrases.length).toBe(0);
});

test('每種植物不同的聲音：丁香一串小音符、曼珠沙華低音弦與 glitch、草幾乎無聲', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1, '丁香');
  expect(f.calls.some((c) => c.startsWith('pad ') && c.includes('v=0.'))).toBe(true); // 高音軟墊
  expect(f.calls.some((c) => /^piano [6-9]$/.test(c))).toBe(true); // 6–9 個小音符
  for (const n of f.phrases.at(-1) ?? []) expect(n.midi).toBeGreaterThanOrEqual(72);
  f.tick(200);
  e.onGrowth(ev(1), '丁香');
  expect(f.calls.at(-1)).toMatch(/grain bell-\d+ .* db=-9/);

  f.calls.length = 0;
  f.tick(3000);
  e.onPlantStart(2, '曼珠沙華');
  const pad = f.calls.find((c) => c.startsWith('pad '));
  expect(pad).toBeDefined();
  for (const m of (pad as string).split(' ')[1]?.split(',').map(Number) ?? [])
    expect(m).toBeLessThan(52);
  f.tick(200);
  e.onGrowth(ev(0), '曼珠沙華');
  expect(f.calls.at(-1)).toMatch(/grain glitchfx-\d+ .* db=-6 slice/);

  f.calls.length = 0;
  f.tick(3000);
  e.onPlantStart(3, '草');
  expect(f.calls.filter((c) => /^(pad|bloom|piano) /.test(c)).length).toBe(0);
  f.tick(200);
  e.onGrowth(ev(2), '草');
  expect(f.calls.at(-1)).toMatch(/grain kalimba-\d+ .* db=-14/);
});

test('紫羅蘭：鋼琴慢分解和弦；不認識的名字用押花樹', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1, '紫羅蘭');
  expect(f.calls.some((c) => c === 'piano 3')).toBe(true);
  expect(f.phrases.at(-1)?.map((n) => n.midi)).toEqual([53, 57, 60]);
  f.tick(3000);
  e.onPlantStart(2, '沒有這種花');
  expect(f.calls.at(-1)).toMatch(/^pad /);
});

test('顆粒的素材跟著發事件的植物，不是最後放開的那株', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1, '草');
  f.tick(2000);
  e.onPlantStart(2, '丁香');
  f.tick(200);
  e.onGrowth(ev(1), '草');
  expect(f.calls.at(-1)).toMatch(/grain kalimba-/);
  f.tick(200);
  e.onGrowth(ev(1), '丁香');
  expect(f.calls.at(-1)).toMatch(/grain bell-/);
});

test('鼓與鋼琴的份量跟著最近放開的植物', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  heatUp(e, f, 8);
  for (let i = 0; i < 10; i++) e.poll();
  expect(f.levels.at(-1)?.kit).toBeCloseTo(0.8, 1); // 押花樹 0.8
  e.onPlantStart(99, '曼珠沙華');
  for (let i = 0; i < 10; i++) e.poll();
  expect(f.levels.at(-1)?.kit).toBeCloseTo(1, 1);
});

test('弦樂單音沒載好：pad 不響，但其他照常', () => {
  const f = fake();
  f.ready.delete('ostr');
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1);
  expect(f.calls.filter((c) => c.startsWith('pad')).length).toBe(0);
  f.tick(200);
  e.onGrowth(ev(1));
  expect(f.calls.at(-1)).toMatch(/^grain /);
});

test('枯：葉落發很輕的顆粒、枝斷走偶發層反轉；都不推熱度、不算活動', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1, '押花樹');
  f.tick(20000);
  const heatBefore = e.heat();
  f.calls.length = 0;
  for (let i = 0; i < 20; i++) {
    f.tick(1);
    e.onWither({ kind: 'leaf', x: 0.5, y: 0.5, depth: 2 }, '押花樹');
  }
  const grains = f.calls.filter((c) => c.startsWith('grain '));
  expect(grains.length).toBeGreaterThan(0);
  expect(grains.length).toBeLessThanOrEqual(DEFAULT_RECIPE.grains.maxPerSec);
  for (const g of grains) expect(Number(/db=(-?\d+)/.exec(g)?.[1])).toBeLessThanOrEqual(-14);
  e.onWither({ kind: 'branch', x: 0.5, y: 0.5, depth: 1 }, '押花樹');
  expect(f.calls.some((c) => /^glitch .* rev$/.test(c))).toBe(true);
  expect(e.heat()).toBeLessThanOrEqual(heatBefore); // 只會自然衰減，不會因枯事件上升
  // 不算活動：閒置 12 秒後的偶發排程照舊會來
  f.tick(60000);
  f.calls.length = 0;
  for (let i = 0; i < 200; i++) {
    f.tick(500);
    e.poll();
  }
  expect(f.calls.some((c) => c.startsWith('drip ') || c.startsWith('glitch '))).toBe(true);
});

test('枯：枝斷的聲音有最小間隔，連續斷十條只響一次', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1, '押花樹');
  f.tick(20000);
  f.calls.length = 0;
  for (let i = 0; i < 10; i++) {
    f.tick(100);
    e.onWither({ kind: 'branch', x: 0.5, y: 0.5, depth: 1 }, '押花樹');
  }
  expect(f.calls.filter((c) => c.startsWith('glitch ')).length).toBe(1);
  f.tick(3000);
  e.onWither({ kind: 'branch', x: 0.5, y: 0.5, depth: 1 }, '押花樹');
  expect(f.calls.filter((c) => c.startsWith('glitch ')).length).toBe(2);
});

test('押花樹放開後分枝不直接掉顆粒，第 0 拍由合唱響', async () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  await e.start();
  e.onPlantStart(1, '押花樹', info(1));
  f.calls.length = 0;
  e.onGrowth(ev(2), '押花樹', 1);
  expect(f.calls.filter((c) => c.startsWith('grain'))).toEqual([]);
  f.sixteenth(0);
  expect(f.calls.filter((c) => c.startsWith('grain')).length).toBe(1);
});

test('素材沒載好不出聲、不丟錯', async () => {
  const f = fake();
  f.ready.clear();
  const e = new BotanicaEngine(calm(), f.deps);
  await e.start();
  e.onPlantStart(1, '押花樹', info(1));
  expect(() => f.sixteenth(0)).not.toThrow();
  expect(f.calls.filter((c) => c.startsWith('grain'))).toEqual([]);
});

test('死過的樹只響一次尾音、之後不再響', async () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  await e.start();
  e.onPlantStart(1, '押花樹', info(1));
  f.calls.length = 0;
  const w = { kind: 'branch' as const, x: 0.5, y: 0.5, depth: 1 };
  e.onWither(w, '押花樹', 1);
  e.onWither(w, '押花樹', 1);
  f.tick(2000);
  e.onWither(w, '押花樹', 1);
  expect(f.calls.filter((c) => c.startsWith('glitch')).length).toBe(1);
  f.sixteenth(0);
  expect(f.calls.filter((c) => c.startsWith('grain'))).toEqual([]);
});

test('關掉俳句就回舊路：分枝直接掉顆粒、拍子沒 hit', async () => {
  const f = fake();
  const p = calm();
  p.trees.enabled = false;
  const e = new BotanicaEngine(p, f.deps);
  await e.start();
  e.onPlantStart(1, '押花樹', info(1));
  f.calls.length = 0;
  e.onGrowth(ev(2), '押花樹', 1);
  expect(f.calls.filter((c) => c.startsWith('grain')).length).toBe(1);
  f.calls.length = 0;
  f.sixteenth(0);
  expect(f.calls).toEqual([]);
});

test('12 秒內第三株不再疊弦樂墊', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1, '押花樹', info(1));
  f.tick(2000);
  e.onPlantStart(2, '押花樹', info(2));
  f.tick(2000);
  e.onPlantStart(3, '押花樹', info(3));
  expect(f.calls.filter((c) => c.startsWith('pad')).length).toBe(2);
});

test('外部熱度接管鼓', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.setHeat(0.9);
  e.poll(0);
  // 鼓的份量會滑向植物的 drums（押花樹 0.8），所以不是剛好 1
  expect(f.levels.at(-1)?.perc).toBeGreaterThan(0.5);
  expect(f.levels.at(-1)?.kit).toBeGreaterThan(0.5);
  e.setHeat(null);
  e.poll(0);
  expect(f.levels.at(-1)).toMatchObject({ perc: 0, kit: 0 });
});

test('顆粒的低通從面板推下去（使用者：高頻太刺耳）', () => {
  const f = fake();
  const p = calm();
  const e = new BotanicaEngine(p, f.deps);
  e.applyParams();
  expect(f.calls).toContain('lowpass 3000');
  p.grains.lowpassHz = 1500;
  e.applyParams();
  expect(f.calls.at(-1)).toBe('lowpass 1500');
});
