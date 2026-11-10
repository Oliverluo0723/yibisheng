import { expect, test } from 'vitest';
import { DEFAULT_VOICE, VOICE_NAMES, VOICES, voiceFor } from './voices';

test('五種植物各一個聲音；不認識的名字用押花樹', () => {
  expect(VOICE_NAMES).toEqual(['押花樹', '草', '曼珠沙華', '紫羅蘭', '丁香']);
  expect(voiceFor('丁香')).toBe(VOICES.丁香);
  expect(voiceFor('不存在')).toBe(VOICES[DEFAULT_VOICE]);
  expect(voiceFor(undefined)).toBe(VOICES[DEFAULT_VOICE]);
});

test('每個聲音的資料都合理', () => {
  for (const name of VOICE_NAMES) {
    const v = VOICES[name];
    expect(v.bloom.length).toBeGreaterThan(0);
    for (const [, w] of v.bloom) expect(w).toBeGreaterThan(0);
    expect(v.grains.roles.length).toBe(3);
    expect(v.grains.gainDb).toBeLessThanOrEqual(0);
    expect(v.grains.density).toBeGreaterThan(0);
    expect(v.drums).toBeGreaterThanOrEqual(0);
    expect(v.drums).toBeLessThanOrEqual(1);
    expect(v.piano).toBeGreaterThanOrEqual(0);
    expect(v.piano).toBeLessThanOrEqual(1);
  }
  // 丁香以 cluster 為主、草大多不綻放
  expect(VOICES.丁香.bloom.find(([c]) => c === 'cluster')?.[1]).toBeGreaterThan(2);
  expect(VOICES.草.bloom.find(([c]) => c === 'none')?.[1]).toBeGreaterThan(2);
});
