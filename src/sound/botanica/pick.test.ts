import { expect, test } from 'vitest';
import { mulberry32 } from '../../growth/rng';
import { FreshPicker } from './pick';

test('FreshPicker 不重抽最近用過的', () => {
  const pool = Array.from({ length: 24 }, (_, i) => ({ id: `s${i}` }));
  const p = new FreshPicker(8);
  const rng = mulberry32(3);
  const seen: string[] = [];
  for (let i = 0; i < 200; i++) {
    const x = p.pick(pool, rng).id;
    expect(seen.slice(-8)).not.toContain(x);
    seen.push(x);
  }
});

test('池子比記憶小：至少不連續重複', () => {
  const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const p = new FreshPicker(8);
  const rng = mulberry32(4);
  let prev = '';
  for (let i = 0; i < 50; i++) {
    const x = p.pick(pool, rng).id;
    expect(x).not.toBe(prev);
    prev = x;
  }
});

test('只有一個就一直給它', () => {
  const p = new FreshPicker(8);
  expect(p.pick([{ id: 'x' }], mulberry32(1)).id).toBe('x');
  expect(p.pick([{ id: 'x' }], mulberry32(1)).id).toBe('x');
});
