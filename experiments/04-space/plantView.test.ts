import * as THREE from 'three';
import { expect, test } from 'vitest';
import { defaultGrowth3DParams, Plant3D } from '../../src/growth/branching3d';
import { defaultLeafStyle, defaultStemStyle, PlantView, type WitherViewEvent } from './plantView';

/** 一株沒有葉片貼圖的押花樹（node 裡沒有 canvas），長 3 秒，長完 */
const grow = () => {
  const v = new PlantView(
    new THREE.Color('#446644'),
    [],
    { ...defaultLeafStyle },
    { ...defaultStemStyle },
  );
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
