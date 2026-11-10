import { expect, test } from 'vitest';
import { RateLimiter } from './rateLimit';

test('每秒上限與同毫秒去重', () => {
  const r = new RateLimiter(3);
  expect([r.allow(0), r.allow(0), r.allow(100), r.allow(200), r.allow(300)]).toEqual([
    true,
    false,
    true,
    true,
    false,
  ]);
  expect(r.allow(1001)).toBe(true);
  r.setMax(1);
  expect(r.allow(1002)).toBe(false);
});
