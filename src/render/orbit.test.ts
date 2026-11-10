import { expect, test } from 'vitest';
import { orbitOffset } from './orbit';

const front = { x: 0, y: 0, z: 4 };

test('yaw keeps distance and height; +yaw moves the camera toward +x from the front', () => {
  const o = orbitOffset(front, Math.PI / 2, 0, 0.2);
  expect(o.x).toBeCloseTo(4);
  expect(o.z).toBeCloseTo(0);
  expect(o.y).toBeCloseTo(0);
});

test('pitch raises the camera and keeps the distance', () => {
  const o = orbitOffset(front, 0, 0.5, 0.2);
  expect(o.y).toBeGreaterThan(0);
  expect(Math.hypot(o.x, o.y, o.z)).toBeCloseTo(4);
  expect(o.x).toBeCloseTo(0);
});

test('pitch is clamped away from straight up and straight down', () => {
  const margin = 0.2;
  const up = orbitOffset(front, 0, 10, margin);
  expect(Math.acos(up.y / 4)).toBeCloseTo(margin);
  const down = orbitOffset(front, 0, -10, margin);
  expect(Math.acos(down.y / 4)).toBeCloseTo(Math.PI - margin);
});
