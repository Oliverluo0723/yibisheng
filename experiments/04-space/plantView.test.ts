import * as THREE from 'three';
import { expect, test } from 'vitest';
import { defaultGrowth3DParams, Plant3D } from '../../src/growth/branching3d';
import {
  defaultLeafStyle,
  defaultStemStyle,
  type LeafTex,
  PlantView,
  type WitherViewEvent,
} from './plantView';

/** 假貼圖：node 裡沒有 canvas，用空的 Texture */
const fakeLeafTex = (): LeafTex[] => [
  { texture: new THREE.Texture() as THREE.CanvasTexture, aspect: 1, set: 'x' },
];

/** 一株押花樹，長 3 秒，長完；leaves 要不要長葉（預設不要），salt 是這株的鹽 */
const grow = (opts: { leaves?: boolean; salt?: number } = {}) => {
  const v = new PlantView(
    new THREE.Color('#446644'),
    opts.leaves ? fakeLeafTex() : [],
    { ...defaultLeafStyle },
    { ...defaultStemStyle },
  );
  if (opts.salt !== undefined) v.salt = opts.salt;
  v.addStem({ x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 0 }, 0.01);
  v.plant = new Plant3D(
    [
      { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 0 },
    ],
    { ...defaultGrowth3DParams, life: 3000 },
    7,
    { x: 0, y: 0, z: 1 },
  );
  for (let t = 0; t < 4000; t += 16) {
    v.plant.step(16);
    v.sync(t);
  }
  return v;
};

test('wither 推到 1：每條枝都斷、回傳 branch 事件、最後都落到地面以上', () => {
  const v = grow();
  expect(v.stemCountForTest).toBeGreaterThan(5);
  v.wither = 1;
  const events: WitherViewEvent[] = [];
  for (let t = 4000; t < 20000; t += 16) events.push(...v.sync(t));
  expect(events.filter((e) => e.kind === 'branch').length).toBeGreaterThan(0);
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  for (let i = 0; i < v.stemCountForTest; i++) {
    v.stemsForTest.getMatrixAt(i, m);
    p.setFromMatrixPosition(m);
    expect(p.y).toBeGreaterThanOrEqual(v.groundY - 1e-6);
  }
});

test('主幹（畫的那一筆）也跟著變色', () => {
  const v = grow();
  const c0 = new THREE.Color();
  v.stemsForTest.getColorAt(0, c0);
  v.wither = 1;
  v.sync(4016);
  const c1 = new THREE.Color();
  v.stemsForTest.getColorAt(0, c1);
  expect(c1.equals(c0)).toBe(false);
});

test('dispose 把葉和枝全部拿掉', () => {
  const v = grow();
  v.dispose();
  expect(v.group.children.length).toBe(0);
});

/** 慢慢把 wither 從 0 推到 1，回傳每條枝斷掉時的 wither（依序） */
const breakSchedule = (v: PlantView): number[] => {
  const out: number[] = [];
  let t = 4000;
  for (let w = 0; w <= 1.0001; w += 0.002) {
    v.wither = w;
    t += 16;
    for (const e of v.sync(t)) if (e.kind === 'branch') out.push(Math.round(w * 1000));
  }
  return out;
};

test('不同的鹽：同一株的枝不在同一個枯度斷（多株不會齊步）', () => {
  const a = breakSchedule(grow({ salt: 1 }));
  const b = breakSchedule(grow({ salt: 2 }));
  expect(a.length).toBeGreaterThan(3);
  expect(a.length).toBe(b.length); // 同一株、枝數一樣
  expect(a).not.toEqual(b); // 但斷的時間點不一樣
  expect(breakSchedule(grow({ salt: 1 }))).toEqual(a); // 同一個鹽可重現
});

test('斷枝落地後躺平：每條枝的方向都接近水平', () => {
  const v = grow();
  v.wither = 1;
  for (let t = 4000; t < 30000; t += 16) v.sync(t);
  const chains = v.chainsForTest;
  expect(chains.length).toBeGreaterThan(0);
  for (const c of chains) {
    expect(c.phase).toBe('down');
    expect(Math.abs(c.elevation)).toBeLessThan(0.2);
  }
});

test('活著的樹（wither 0）每片葉都是綠的，沒有一出生就褐', () => {
  const v = grow({ leaves: true });
  v.wither = 0;
  v.sync(4016);
  const leaves = v.leavesForTest;
  expect(leaves.length).toBeGreaterThan(5);
  for (const l of leaves) expect(l.dry).toBe(0);
});

test('葉子落地那一刻回報 leaf 事件，位置在地面附近', () => {
  const v = grow({ leaves: true });
  v.wither = 1;
  const events: WitherViewEvent[] = [];
  for (let t = 4000; t < 30000; t += 16) events.push(...v.sync(t));
  const leaf = events.filter((e) => e.kind === 'leaf');
  expect(leaf.length).toBeGreaterThan(0);
  for (const e of leaf) expect(Math.abs(e.at.y - v.groundY)).toBeLessThan(0.02);
});
