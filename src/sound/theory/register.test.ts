import { expect, test } from 'vitest';
import { grainCategory } from './register';

test('深度對素材類別', () => {
  expect(grainCategory(0)).toBe('kalimba');
  expect(grainCategory(1)).toBe('kalimba');
  expect(grainCategory(2)).toBe('bell');
  expect(grainCategory(3)).toBe('glitch');
  expect(grainCategory(5)).toBe('glitch');
});
