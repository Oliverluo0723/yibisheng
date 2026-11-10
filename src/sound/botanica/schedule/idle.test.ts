import { expect, test } from 'vitest';
import { mulberry32 } from '../../../growth/rng';
import { type IdleEvent, IdleScheduler } from './idle';

test('閒置 12 秒後才開始，間隔 15–40 秒，活動就重算', () => {
  const s = new IdleScheduler(mulberry32(1));
  s.activity(0);
  for (let t = 0; t < 12000; t += 500) expect(s.poll(t)).toBeNull();
  let first = -1;
  for (let t = 12000; t <= 60000; t += 100) {
    if (s.poll(t)) {
      first = t;
      break;
    }
  }
  expect(first).toBeGreaterThanOrEqual(27000);
  expect(first).toBeLessThanOrEqual(52000);
  s.activity(first + 1);
  for (let t = first + 1; t < first + 12000; t += 500) expect(s.poll(t)).toBeNull();
});

test('從沒有活動也算閒置：建好之後就開始計時', () => {
  const s = new IdleScheduler(mulberry32(5));
  let got = false;
  for (let t = 0; t <= 60000 && !got; t += 100) got = s.poll(t) !== null;
  expect(got).toBe(true);
});

test('glitch 約四分之一', () => {
  const s = new IdleScheduler(mulberry32(2), { idleMs: 0, minGapMs: 1, maxGapMs: 1 });
  s.activity(0);
  const ev: IdleEvent[] = [];
  for (let t = 1; ev.length < 400; t += 2) {
    const e = s.poll(t);
    if (e) ev.push(e);
  }
  expect(ev.filter((e) => e === 'glitch').length / 400).toBeCloseTo(0.25, 1);
});
