import { expect, test } from 'vitest';
import {
  chordAt,
  chordMidis,
  chordTones,
  foldShift,
  grainShift,
  nearestOffset,
  nextChordIndex,
  PROGRESSION,
} from './chords';

test('王道進行與代換', () => {
  expect(PROGRESSION).toEqual(['IV', 'V', 'vi', 'I']);
  expect(nextChordIndex(3, 'advance')).toBe(0);
  expect(nextChordIndex(1, 'stay')).toBe(1);
  expect(nextChordIndex(1, 'substitute')).toBe(1);
  expect(chordAt(0, true)).toBe('ii');
  expect(chordAt(3, true)).toBe('vi');
  expect(chordAt(1, true)).toBe('V');
  expect(chordAt(2, false)).toBe('vi');
});

test('和弦音相對主音', () => {
  expect(chordTones('I')).toEqual([0, 4, 7]);
  expect(chordTones('ii')).toEqual([2, 5, 9]);
  expect(chordTones('IV')).toEqual([5, 9, 0]);
  expect(chordTones('V')).toEqual([7, 11, 2]);
  expect(chordTones('vi')).toEqual([9, 0, 4]);
});

test('位移折回 ±7', () => {
  expect(foldShift(9)).toBe(-3);
  expect(foldShift(-8)).toBe(4);
  expect(foldShift(7)).toBe(7);
  expect(nearestOffset(9)).toBe(-3);
  expect(nearestOffset(6)).toBe(6);
  for (const k of [-6, -5, 0, 5])
    for (const t of [0, 4, 7, 9, 11]) expect(Math.abs(grainShift(k, t))).toBeLessThanOrEqual(7);
});

test('chordMidis：和弦音放到指定音域，低到高排好', () => {
  // C 大調 IV（F：5,9,0）
  expect(chordMidis(0, [5, 9, 0], 'mid')).toEqual([53, 57, 60]);
  expect(chordMidis(0, [5, 9, 0], 'low')).toEqual([41, 45, 48]);
  expect(chordMidis(0, [5, 9, 0], 'high')).toEqual([65, 69, 72]);
  // G 大調 I（0,4,7）→ G B D，根音 55
  expect(chordMidis(7, [0, 4, 7], 'mid')).toEqual([55, 59, 62]);
});
