import { expect, test } from 'vitest';
import {
  cameraAt,
  defaultDepthParams,
  layerDepth,
  layerLook,
  layerTransform,
  nextAutoLayer,
  toLayer,
  toScreen,
} from './parallax';

const p = defaultDepthParams;

test('layerDepth runs from 0 (far) to 1 (near)', () => {
  expect(layerDepth(0, 6)).toBe(0);
  expect(layerDepth(5, 6)).toBe(1);
  expect(layerDepth(0, 1)).toBe(1);
});

test('near layers move more than far layers, opposite to the camera', () => {
  const cam = { x: 1, y: 0, z: 0 };
  const far = layerTransform(0, cam, p);
  const near = layerTransform(1, cam, p);
  expect(near.dx).toBeLessThan(far.dx);
  expect(far.dx).toBeLessThan(0);
  expect(Math.abs(near.dx)).toBeCloseTo(p.shift);
});

test('toLayer is the inverse of toScreen', () => {
  const t = layerTransform(0.7, { x: 0.4, y: -0.6, z: 0.8 }, p);
  const s = toScreen(123, 456, t, 1400, 800);
  const back = toLayer(s.x, s.y, t, 1400, 800);
  expect(back.x).toBeCloseTo(123);
  expect(back.y).toBeCloseTo(456);
});

test('far layers are blurrier and fainter; the nearest is untouched', () => {
  const far = layerLook(0, p);
  const near = layerLook(1, p);
  expect(near.filter).toBe('none');
  expect(near.alpha).toBe(1);
  expect(far.filter).toContain('blur(3.00px)');
  expect(far.alpha).toBeCloseTo(p.farAlpha);
});

test('camera stays in a sane range and auto layers cycle far → near', () => {
  for (let t = 0; t < 200; t += 3.7) {
    const c = cameraAt(1, -1, t, p);
    expect(Math.abs(c.x)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(c.z)).toBeLessThanOrEqual(1);
  }
  expect(nextAutoLayer(undefined, 6)).toBe(0);
  expect(nextAutoLayer(4, 6)).toBe(5);
  expect(nextAutoLayer(5, 6)).toBe(0);
});
