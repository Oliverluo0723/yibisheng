import { expect, test } from 'vitest';
import { cursorFrom, defaultPinchParams, type Landmark, nextPinched, pinchRatio } from './pinch';

/** 做一隻假手：手腕在 (0.5, 0.8)，食指根在 (0.5, 0.6)，拇指尖與食指尖相距 gap */
function hand(gap: number, cx = 0.5, cy = 0.4, palm = 0.2): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: cx, y: cy }));
  lm[0] = { x: cx, y: cy + palm * 2 };
  lm[5] = { x: cx, y: cy + palm };
  lm[4] = { x: cx - gap / 2, y: cy };
  lm[8] = { x: cx + gap / 2, y: cy };
  return lm;
}

test('pinch ratio is independent of hand size', () => {
  const near = pinchRatio(hand(0.1, 0.5, 0.4, 0.2));
  const far = pinchRatio(hand(0.05, 0.5, 0.4, 0.1));
  expect(near).toBeCloseTo(0.5);
  expect(far).toBeCloseTo(0.5);
  expect(pinchRatio([])).toBeNull();
});

test('pinch has hysteresis between down and up', () => {
  const p = defaultPinchParams;
  expect(nextPinched(false, 0.35, p)).toBe(false); // 不夠緊，不算捏
  expect(nextPinched(false, 0.2, p)).toBe(true);
  expect(nextPinched(true, 0.35, p)).toBe(true); // 已經捏著，稍微鬆一點還算
  expect(nextPinched(true, 0.5, p)).toBe(false);
  expect(nextPinched(true, null, p)).toBe(false); // 手不見了就放開
});

test('cursor is mirrored and the central reach maps to the whole screen', () => {
  const p = { ...defaultPinchParams, reach: 0.5 };
  // 鏡頭左邊 1/4 處（鏡像後是右邊 3/4）→ 螢幕最右
  const right = cursorFrom(hand(0, 0.25, 0.25), 1000, 500, p);
  expect(right?.x).toBeCloseTo(1000);
  expect(right?.y).toBeCloseTo(0);
  const mid = cursorFrom(hand(0, 0.5, 0.5), 1000, 500, p);
  expect(mid?.x).toBeCloseTo(500);
  expect(mid?.y).toBeCloseTo(250);
});
