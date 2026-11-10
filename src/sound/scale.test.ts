import { expect, test } from 'vitest';
import { mulberry32 } from '../growth/rng';
import { BB_MAJOR_PITCH_CLASSES, midiToHz, pickNote } from './scale';

test('midiToHz: A4 is 440', () => {
  expect(midiToHz(69)).toBeCloseTo(440);
});

test('pickNote stays in Bb major and in range, higher depth never lower on average', () => {
  const rng = mulberry32(5);
  const shallow: number[] = [];
  const deep: number[] = [];
  for (let i = 0; i < 200; i++) {
    shallow.push(pickNote(rng, 0));
    deep.push(pickNote(rng, 5));
  }
  for (const n of [...shallow, ...deep]) {
    expect(BB_MAJOR_PITCH_CLASSES).toContain(n % 12);
    expect(n).toBeGreaterThanOrEqual(48);
    expect(n).toBeLessThanOrEqual(84);
  }
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  expect(avg(deep)).toBeGreaterThan(avg(shallow));
});
