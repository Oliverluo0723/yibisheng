import { expect, test } from 'vitest';
import { extendedFingers, handNumber, StableCount } from './fingers';
import { defaultPinchParams, type Landmark } from './pinch';

/** 做一隻手：手腕在 (0.5, 0.9)，手指往上伸；extended 決定哪幾根伸直 */
function hand(extended: boolean[], thumbOut = false): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.6 }));
  lm[0] = { x: 0.5, y: 0.9 };
  const fingers: [tip: number, pip: number, mcp: number][] = [
    [8, 6, 5],
    [12, 10, 9],
    [16, 14, 13],
    [20, 18, 17],
  ];
  fingers.forEach(([tip, pip, mcp], k) => {
    const x = 0.42 + k * 0.05;
    lm[mcp] = { x, y: 0.6 };
    lm[pip] = { x, y: 0.5 };
    // 伸直：指尖比第二指節離手腕更遠；彎曲：指尖縮回手掌
    lm[tip] = extended[k] ? { x, y: 0.38 } : { x, y: 0.62 };
  });
  lm[4] = thumbOut ? { x: 0.2, y: 0.55 } : { x: 0.45, y: 0.62 };
  return lm;
}

test('數伸直的手指：食指、中指、無名指、小指', () => {
  expect(extendedFingers(hand([false, false, false, false]))).toBe(0);
  expect(extendedFingers(hand([true, false, false, false]))).toBe(1);
  expect(extendedFingers(hand([true, true, false, false]))).toBe(2);
  expect(extendedFingers(hand([true, true, true, false]))).toBe(3);
  expect(extendedFingers(hand([true, true, true, true]))).toBe(4);
  // 不管大拇指
  expect(extendedFingers(hand([true, true, false, false], true))).toBe(2);
  // 關節點不夠就不算
  expect(extendedFingers(hand([true, true, false, false]).slice(0, 10))).toBeNull();
});

test('同一個數字連續看到夠久才確認，而且只回報一次', () => {
  const s = new StableCount(500);
  expect(s.update(2, 0)).toBeNull();
  expect(s.update(2, 200)).toBeNull();
  expect(s.update(2, 499)).toBeNull();
  expect(s.update(2, 500)).toBe(2);
  expect(s.update(2, 900)).toBeNull(); // 已經報過
  expect(s.update(3, 1000)).toBeNull(); // 換數字重新計時
  expect(s.update(3, 1400)).toBeNull();
  expect(s.update(3, 1500)).toBe(3);
});

test('中間斷掉（沒看到手、0 根、超過 4 根）就重來', () => {
  const s = new StableCount(500);
  s.update(1, 0);
  s.update(null, 100);
  expect(s.update(1, 500)).toBeNull();
  expect(s.update(1, 1000)).toBe(1);
  s.update(0, 1100);
  s.update(1, 1200);
  expect(s.update(1, 1600)).toBeNull();
  expect(s.update(1, 1700)).toBe(1);
  expect(s.update(5, 2000)).toBeNull();
  expect(s.update(5, 3000)).toBeNull();
});

test('放下手再比同一個數字，會再報一次', () => {
  const s = new StableCount(500);
  s.update(2, 0);
  expect(s.update(2, 500)).toBe(2);
  s.update(null, 600);
  s.update(2, 700);
  expect(s.update(2, 1200)).toBe(2);
});

test('handNumber：1–4 數伸直的手指；六＝只伸小指加拇指張開', () => {
  const p = defaultPinchParams;
  expect(handNumber(hand([true, false, false, false]), p)).toBe(1);
  expect(handNumber(hand([true, true, true, false]), p)).toBe(3);
  expect(handNumber(hand([true, true, true, true]), p)).toBe(4);
  expect(handNumber(hand([false, false, false, true], true), p)).toBe(6);
  // 只伸小指但拇指收著 → 當作 1
  expect(handNumber(hand([false, false, false, true], false), p)).toBe(1);
  // 握拳
  expect(handNumber(hand([false, false, false, false]), p)).toBe(0);
  expect(handNumber(hand([false, false, false, false]).slice(0, 10), p)).toBeNull();
});

test('StableCount 接受 6，不接受 5', () => {
  const s = new StableCount(500);
  s.update(6, 0);
  expect(s.update(6, 500)).toBe(6);
  s.update(5, 600);
  expect(s.update(5, 1200)).toBeNull();
});
