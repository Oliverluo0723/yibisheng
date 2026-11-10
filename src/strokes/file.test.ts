import { expect, test } from 'vitest';
import { fromFile, toFile } from './file';

test('toFile wraps strokes with version 1', () => {
  expect(toFile([], { width: 10, height: 20 })).toEqual({
    version: 1,
    canvas: { width: 10, height: 20 },
    strokes: [],
  });
});

test('fromFile round-trips', () => {
  const f = toFile([{ id: 'a', startedAt: 0, points: [{ x: 0, y: 0, t: 0 }] }], {
    width: 1,
    height: 1,
  });
  expect(fromFile(JSON.parse(JSON.stringify(f)))).toEqual(f);
});

test('fromFile rejects unknown version', () => {
  expect(() => fromFile({ version: 2, canvas: { width: 1, height: 1 }, strokes: [] })).toThrow(
    /version/,
  );
  expect(() => fromFile(null)).toThrow();
  expect(() => fromFile({ version: 1 })).toThrow();
});
