import { expect, test } from 'vitest';
import { reversedCopy } from './reverse';

test('反轉是複製一份，不動原本的資料', () => {
  const a = new Float32Array([1, 2, 3]);
  const b = new Float32Array([4, 5, 6]);
  const out = reversedCopy([a, b]);
  expect(Array.from(out[0] as Float32Array)).toEqual([3, 2, 1]);
  expect(Array.from(out[1] as Float32Array)).toEqual([6, 5, 4]);
  expect(Array.from(a)).toEqual([1, 2, 3]);
  expect(Array.from(b)).toEqual([4, 5, 6]);
});

test('播放器不准設 .reverse（Tone 會把共用的音檔原地翻掉）', () => {
  const sources = import.meta.glob(['../layers/*.ts', './*.ts', '!**/*.test.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  expect(Object.keys(sources).length).toBeGreaterThan(5);
  for (const [file, src] of Object.entries(sources)) expect(src, file).not.toMatch(/\.reverse\s*=/);
});
