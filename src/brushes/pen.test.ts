import { expect, test } from 'vitest';
import { defaultPenParams, SpringPen, Walker } from './pen';

test('pen converges on a still target and comes to rest', () => {
  const pen = new SpringPen({ ...defaultPenParams });
  pen.reset(0, 0);
  let s = pen.step(100, 50);
  for (let i = 0; i < 60; i++) s = pen.step(100, 50);
  expect(s.x).toBeCloseTo(100, 1);
  expect(s.y).toBeCloseTo(50, 1);
  expect(s.speed).toBeLessThan(0.01);
  expect(s.pressure).toBeGreaterThan(0.99);
});

test('fast movement makes the pen thinner than slow movement', () => {
  const fast = new SpringPen({ ...defaultPenParams });
  const slow = new SpringPen({ ...defaultPenParams });
  fast.reset(0, 0);
  slow.reset(0, 0);
  let f = fast.step(0, 0);
  let s = slow.step(0, 0);
  for (let i = 1; i <= 30; i++) {
    f = fast.step(i * 40, 0);
    s = slow.step(i * 2, 0);
  }
  expect(f.width).toBeLessThan(s.width);
  expect(f.dist).toBeGreaterThan(s.dist);
});

test('lifting tapers the width to zero within taperFrames', () => {
  const p = { ...defaultPenParams, taperFrames: 10 };
  const pen = new SpringPen(p);
  pen.reset(0, 0);
  for (let i = 0; i < 40; i++) pen.step(0, 0);
  pen.lift();
  expect(pen.done).toBe(false);
  let prev = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 10; i++) {
    const s = pen.step(0, 0);
    expect(s.width).toBeLessThan(prev);
    expect(s.lifting).toBe(true);
    prev = s.width;
  }
  expect(pen.done).toBe(true);
});

test('walker spaces points evenly across consecutive segments', () => {
  const w = new Walker();
  const xs: number[] = [];
  const seg = (ax: number, bx: number) =>
    w.walk(ax, 0, bx, 0, 4, (t) => xs.push(ax + (bx - ax) * t));
  seg(0, 6);
  seg(6, 7);
  seg(7, 21);
  expect(xs.map((x) => Math.round(x * 1000) / 1000)).toEqual([4, 8, 12, 16, 20]);
});
