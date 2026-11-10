import { expect, test } from 'vitest';
import { drumLevels, Heat } from './heat';

test('熱度從 0 開始，加能量後上升，半衰期 20 秒', () => {
  const h = new Heat();
  expect(h.value(0)).toBe(0);
  h.add(0, 0.2);
  expect(h.value(0)).toBeCloseTo(1 - Math.exp(-0.2));
  expect(h.value(20000)).toBeCloseTo(1 - Math.exp(-0.1));
  expect(h.value(200000)).toBeLessThan(0.001);
});

test('熱度永遠在 0..1 之間', () => {
  const h = new Heat();
  for (let i = 0; i < 1000; i++) h.add(i, 0.2);
  expect(h.value(1000)).toBeLessThan(1);
  expect(h.value(1000)).toBeGreaterThan(0.99);
});

test('鼓的音量跟著熱度：三成後打擊、六成後鼓組，低通越熱越開', () => {
  expect(drumLevels(0)).toMatchObject({ perc: 0, kit: 0 });
  expect(drumLevels(0.29).perc).toBe(0);
  expect(drumLevels(0.5)).toMatchObject({ perc: 1, kit: 0 });
  expect(drumLevels(0.8)).toMatchObject({ perc: 1, kit: 1 });
  expect(drumLevels(0.3).lowpassHz).toBeCloseTo(600);
  expect(drumLevels(1).lowpassHz).toBeCloseTo(12000);
  expect(drumLevels(0.7).lowpassHz).toBeGreaterThan(drumLevels(0.5).lowpassHz);
});
