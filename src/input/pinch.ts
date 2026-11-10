/**
 * 手勢判斷（純計算）：從 MediaPipe 的 21 個手部關節點算出「捏著沒」和「筆在哪」。
 * 關節點座標是相機畫面的 0..1 比例；0 手腕、4 拇指尖、5 食指根、8 食指尖。
 */
export type Landmark = { x: number; y: number; z?: number };

export const WRIST = 0;
export const THUMB_TIP = 4;
export const INDEX_MCP = 5;
export const INDEX_TIP = 8;

export type PinchParams = {
  /** 捏合比例低於這個值算「捏下去」 */
  down: number;
  /** 高於這個值才算「放開」（比 down 大，避免在邊界抖來抖去） */
  up: number;
  /** 相機畫面中間多大範圍對應到整個螢幕（0.8 = 手不用伸到鏡頭邊緣） */
  reach: number;
};

export const defaultPinchParams: PinchParams = { down: 0.28, up: 0.42, reach: 0.75 };

const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * 捏合比例 = 拇指尖到食指尖的距離 ÷ 手腕到食指根的距離。
 * 除以手掌大小，手離鏡頭遠近就不影響判斷。
 */
export function pinchRatio(lm: Landmark[]): number | null {
  const w = lm[WRIST];
  const t = lm[THUMB_TIP];
  const m = lm[INDEX_MCP];
  const i = lm[INDEX_TIP];
  if (!w || !t || !m || !i) return null;
  const palm = dist(w, m);
  return palm > 1e-6 ? dist(t, i) / palm : null;
}

/** 帶遲滯的捏合狀態：捏下去要夠緊、放開要夠開，中間維持原狀 */
export function nextPinched(prev: boolean, ratio: number | null, p: PinchParams): boolean {
  if (ratio === null) return false;
  if (prev) return ratio < p.up;
  return ratio < p.down;
}

/**
 * 筆尖位置：拇指尖和食指尖的中點，鏡像（像照鏡子），
 * 再把相機畫面中間 reach 的範圍放大到整個螢幕。回傳螢幕像素。
 */
export function cursorFrom(lm: Landmark[], w: number, h: number, p: PinchParams) {
  const t = lm[THUMB_TIP];
  const i = lm[INDEX_TIP];
  if (!t || !i) return null;
  const mx = 1 - (t.x + i.x) / 2;
  const my = (t.y + i.y) / 2;
  const m = (1 - p.reach) / 2;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return { x: clamp((mx - m) / p.reach) * w, y: clamp((my - m) / p.reach) * h };
}

/** 四根手指：[指尖, 第二指節(PIP)] */
const FINGERS: [number, number][] = [
  [8, 6],
  [12, 10],
  [16, 14],
  [20, 18],
];
const PALM = [0, 5, 9, 13, 17];

/**
 * 張開手掌：四根手指都伸直（指尖比第二指節離手腕更遠），而且拇指張開、沒有在捏。
 * 和「捏」差最多，最不容易誤判。
 */
export function isOpenPalm(lm: Landmark[], p: PinchParams = defaultPinchParams): boolean {
  const w = lm[WRIST];
  if (!w) return false;
  for (const [tip, pip] of FINGERS) {
    const t = lm[tip];
    const j = lm[pip];
    if (!t || !j) return false;
    if (dist(w, t) < dist(w, j) * 1.15) return false;
  }
  const ratio = pinchRatio(lm);
  return ratio !== null && ratio > p.up * 1.3;
}

/** 手掌中心（手腕和四個指根的平均），鏡像後的 0..1 比例座標 */
export function palmCenter(lm: Landmark[]): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  for (const i of PALM) {
    const q = lm[i];
    if (!q) return null;
    x += q.x;
    y += q.y;
  }
  return { x: 1 - x / PALM.length, y: y / PALM.length };
}
