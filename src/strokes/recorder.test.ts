import { expect, test } from 'vitest';
import { StrokeRecorder } from './recorder';

test('normalizes by canvas size', () => {
  const r = new StrokeRecorder();
  const s = r.begin(200, 100, 400, 200, 1000);
  expect(s.points[0]).toEqual({ x: 0.5, y: 0.5, t: 0 });
  const r2 = new StrokeRecorder();
  expect(r2.begin(200, 100, 800, 400, 0).points[0]).toMatchObject({ x: 0.25, y: 0.25 });
});

test('clamps points outside canvas', () => {
  const r = new StrokeRecorder();
  r.begin(0, 0, 100, 100, 0);
  expect(r.extend(-50, 250, 100, 100, 16)).toEqual({ x: 0, y: 1, t: 16 });
});

test('skips points closer than minDistance and records t relative to start', () => {
  const r = new StrokeRecorder({ minDistance: 0.01 });
  r.begin(0, 0, 1000, 1000, 500);
  expect(r.extend(1, 1, 1000, 1000, 516)).toBeNull();
  expect(r.extend(20, 0, 1000, 1000, 532)).toEqual({ x: 0.02, y: 0, t: 32 });
});

test('current exposes the in-progress stroke and is null otherwise', () => {
  const r = new StrokeRecorder();
  expect(r.current).toBeNull();
  const s = r.begin(5, 5, 10, 10, 0);
  expect(r.current).toBe(s);
  r.extend(9, 9, 10, 10, 16);
  expect(r.current?.points).toHaveLength(2);
  r.end();
  expect(r.current).toBeNull();
});

test('begin while a stroke is active finalizes the previous one instead of dropping it', () => {
  const r = new StrokeRecorder();
  const first = r.begin(1, 1, 10, 10, 0);
  r.extend(5, 5, 10, 10, 16);
  r.begin(2, 2, 10, 10, 100);
  expect(r.strokes).toHaveLength(1);
  expect(r.strokes[0]).toBe(first);
  expect(r.current?.startedAt).toBe(100);
});

test('end returns the stroke and pushes it; extend without begin is null', () => {
  const r = new StrokeRecorder();
  expect(r.extend(1, 1, 10, 10, 0)).toBeNull();
  r.begin(1, 1, 10, 10, 0);
  const s = r.end();
  expect(s?.points).toHaveLength(1);
  expect(r.strokes).toHaveLength(1);
  expect(r.end()).toBeNull();
});
