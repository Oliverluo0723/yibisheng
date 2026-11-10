import { expect, test } from 'vitest';
import { hashString, mulberry32 } from './rng';

test('mulberry32 is deterministic and in [0,1)', () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  for (let i = 0; i < 100; i++) {
    const v = a();
    expect(v).toBe(b());
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  }
});

test('hashString is stable and differs for different strings', () => {
  expect(hashString('abc')).toBe(hashString('abc'));
  expect(hashString('abc')).not.toBe(hashString('abd'));
  expect(Number.isInteger(hashString('x'))).toBe(true);
});
