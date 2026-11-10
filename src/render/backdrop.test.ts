import { expect, test } from 'vitest';
import { coverRect, defaultBackdropParams, filterFor } from './backdrop';

test('coverRect crops a wide source to fit a tall target, centred', () => {
  // 1920×1080 的影片鋪到 1000×1000：裁掉左右
  const r = coverRect(1920, 1080, 1000, 1000);
  expect(r.sh).toBeCloseTo(1080);
  expect(r.sw).toBeCloseTo(1080);
  expect(r.sx).toBeCloseTo((1920 - 1080) / 2);
  expect(r.sy).toBeCloseTo(0);
});

test('coverRect crops a tall source to fit a wide target', () => {
  const r = coverRect(1080, 1920, 1600, 900);
  expect(r.sw).toBeCloseTo(1080);
  expect(r.sh / r.sw).toBeCloseTo(900 / 1600);
  expect(r.sx).toBeCloseTo(0);
  expect(r.sy).toBeGreaterThan(0);
});

test('coverRect handles a not-yet-loaded source', () => {
  expect(coverRect(0, 0, 100, 100)).toEqual({ sx: 0, sy: 0, sw: 0, sh: 0 });
});

test('filterFor builds a Canvas filter string', () => {
  expect(filterFor({ ...defaultBackdropParams, fade: 0, brightness: 1, blur: 0 })).toBe('none');
  expect(filterFor({ ...defaultBackdropParams, fade: 0.25, brightness: 0.8, blur: 3 })).toBe(
    'saturate(0.750) brightness(0.800) blur(3.0px)',
  );
});
