import { expect, test } from 'vitest';
import {
  cursorFrom,
  defaultPinchParams,
  isOpenPalm,
  type Landmark,
  nextPinched,
  palmCenter,
  pinchRatio,
} from './pinch';

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

/** 一隻手指朝上的手：wrist 在下，各指的 MCP / PIP / TIP 依 extend 往上排 */
function openHand(extend: number, thumbOut = 0.12): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  lm[0] = { x: 0.5, y: 0.8 };
  const cols = [0.44, 0.48, 0.52, 0.56];
  const bases = [5, 9, 13, 17];
  bases.forEach((b, k) => {
    const x = cols[k] as number;
    lm[b] = { x, y: 0.6 }; // MCP
    lm[b + 1] = { x, y: 0.5 }; // PIP
    lm[b + 2] = { x, y: 0.5 - 0.05 * extend }; // DIP
    lm[b + 3] = { x, y: 0.5 - 0.1 * extend }; // TIP
  });
  lm[4] = { x: 0.44 - thumbOut, y: 0.62 }; // 拇指尖
  return lm;
}

test('open palm: fingers extended and thumb out; a fist or a pinch is not', () => {
  expect(isOpenPalm(openHand(1))).toBe(true);
  // 握拳：指尖縮回比第二指節還靠近手腕
  expect(isOpenPalm(openHand(-1.5))).toBe(false);
  // 拇指貼著食指（捏）
  const pinchy = openHand(1, 0);
  pinchy[4] = { ...(pinchy[8] as Landmark) };
  expect(isOpenPalm(pinchy)).toBe(false);
});

test('palm center is mirrored', () => {
  const c = palmCenter(openHand(1));
  expect(c?.x).toBeCloseTo(1 - (0.5 + 0.44 + 0.48 + 0.52 + 0.56) / 5);
  expect(c?.y).toBeCloseTo((0.8 + 0.6 * 4) / 5);
});
