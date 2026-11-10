import { expect, test } from 'vitest';
import { findIslands } from './islands';

function maskWith(w: number, h: number, fill: (x: number, y: number) => boolean): Uint8Array {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (fill(x, y)) m[y * w + x] = 255;
  return m;
}

test('finds two separate blobs and drops a speck', () => {
  const m = maskWith(100, 60, (x, y) => {
    const a = x >= 10 && x < 30 && y >= 10 && y < 40;
    const b = x >= 60 && x < 90 && y >= 20 && y < 50;
    const speck = x === 50 && y === 5;
    return a || b || speck;
  });
  const rects = findIslands(m, 100, 60, { cell: 2, minCells: 10, pad: 0 });
  expect(rects).toEqual([
    { x: 10, y: 10, w: 20, h: 30 },
    { x: 60, y: 20, w: 30, h: 30 },
  ]);
});

test('a thin stem stays attached to its leaf', () => {
  // 一塊葉片 + 一條 1px 寬的葉柄往右延伸
  const m = maskWith(
    80,
    40,
    (x, y) => (x >= 5 && x < 30 && y >= 5 && y < 35) || (y === 20 && x < 70),
  );
  const rects = findIslands(m, 80, 40, { cell: 4, minCells: 5, pad: 0 });
  expect(rects).toHaveLength(1);
  expect(rects[0]?.w).toBeGreaterThanOrEqual(68);
});
