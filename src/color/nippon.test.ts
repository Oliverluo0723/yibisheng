import { expect, test } from 'vitest';
import { hexToRgb, mix, NIPPON, PALETTES, rgba } from './nippon';

test('every Nippon color has a valid hex', () => {
  for (const col of Object.values(NIPPON)) expect(() => hexToRgb(col.hex)).not.toThrow();
});

test('palettes have inks and do not reuse the paper as an ink', () => {
  for (const p of PALETTES) {
    expect(p.inks.length).toBeGreaterThanOrEqual(3);
    expect(p.inks).not.toContain(p.paper);
  }
});

test('hexToRgb / rgba / mix', () => {
  expect(hexToRgb('#D0104C')).toEqual({ r: 208, g: 16, b: 76 });
  expect(() => hexToRgb('red')).toThrow();
  expect(rgba({ r: 1, g: 2, b: 3 }, 2)).toBe('rgba(1,2,3,1)');
  expect(mix({ r: 0, g: 0, b: 0 }, { r: 200, g: 100, b: 50 }, 0.5)).toEqual({
    r: 100,
    g: 50,
    b: 25,
  });
});
