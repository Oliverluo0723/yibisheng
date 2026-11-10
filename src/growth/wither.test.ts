import { expect, test } from 'vitest';
import { PlantWither, WitherClock } from './wither';

test('寬限內不走；寬限後、熱度低才走', () => {
  const c = new WitherClock();
  c.activity(0);
  for (let t = 100; t <= 25000; t += 100) c.tick(t, 0);
  expect(c.seconds).toBe(0);
  for (let t = 25100; t <= 35000; t += 100) c.tick(t, 0);
  expect(c.seconds).toBeCloseTo(10, 1);
});

test('熱度 ≥ 門檻就停', () => {
  const c = new WitherClock();
  c.activity(0);
  for (let t = 100; t <= 60000; t += 100) c.tick(t, 0.5);
  expect(c.seconds).toBe(0);
});

test('活動會把寬限重算，D 不倒退', () => {
  const c = new WitherClock();
  c.activity(0);
  for (let t = 100; t <= 40000; t += 100) c.tick(t, 0);
  const d = c.seconds;
  expect(d).toBeGreaterThan(0);
  c.activity(40000);
  for (let t = 40100; t <= 60000; t += 100) c.tick(t, 0);
  expect(c.seconds).toBe(d);
});

test('一次 tick 最多算 100 ms（分頁回來不暴衝）', () => {
  const c = new WitherClock();
  c.activity(0);
  c.tick(100, 0);
  c.tick(30000, 0);
  c.tick(300000, 0);
  expect(c.seconds).toBeLessThanOrEqual(0.2);
});

test('每株從出生算、只增不減、手動取大', () => {
  const p = new PlantWither(10);
  expect(p.update(10, 100, 0)).toBe(0);
  expect(p.update(60, 100, 0)).toBeCloseTo(0.5);
  expect(p.update(60, 300, 0)).toBeCloseTo(0.5); // 全枯秒數拉大也不退
  expect(p.update(60, 100, 0.8)).toBeCloseTo(0.8);
  expect(p.update(60, 100, 0)).toBeCloseTo(0.8);
  expect(p.update(500, 100, 0)).toBe(1);
  expect(p.value).toBe(1);
});
