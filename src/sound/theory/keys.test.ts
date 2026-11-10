import { expect, test } from 'vitest';
import { KEY_NAMES, keyPitchClass, keyShift } from './keys';

test('12 個調，主音 pitch class 依序', () => {
  expect(KEY_NAMES.length).toBe(12);
  expect(keyPitchClass('C')).toBe(0);
  expect(keyPitchClass('Bb')).toBe(10);
});

test('keyShift 取最短路徑', () => {
  expect(keyShift('C', 'G')).toBe(-5);
  expect(keyShift('C', 'F')).toBe(5);
  expect(keyShift('Bb', 'C')).toBe(2);
  expect(keyShift('C', 'Gb')).toBe(-6);
  expect(keyShift('Db', 'C')).toBe(-1);
});
