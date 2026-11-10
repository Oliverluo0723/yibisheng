import { expect, test } from 'vitest';
import { WebAudioEngine } from './webaudio';

// node 環境沒有 AudioContext：引擎在 start() 之前一切都要是 no-op
test('onGrowth before start is a no-op', () => {
  const e = new WebAudioEngine(1);
  expect(() => e.onGrowth({ kind: 'branch', x: 0.5, y: 0.5, depth: 1, age: 100 })).not.toThrow();
  expect(() => e.setVolume(0.5)).not.toThrow();
  expect(() => e.onStrokePoint({ x: 0, y: 0, t: 0 })).not.toThrow();
});
