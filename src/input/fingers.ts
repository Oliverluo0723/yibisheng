/**
 * 數手指（純計算）：比 1、2、3、4 換植物。
 * 只看食指、中指、無名指、小指；大拇指太難判，1 到 4 也用不到它。
 */
import { type Landmark, WRIST } from './pinch';

/** 四根手指：[指尖, 第二指節(PIP)]，和 pinch.ts 的張開手掌判斷用同一個標準 */
const FINGERS: [tip: number, pip: number][] = [
  [8, 6],
  [12, 10],
  [16, 14],
  [20, 18],
];

const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);

/** 伸直的手指數（0..4）：指尖比第二指節離手腕更遠才算伸直。關節點不夠回 null。 */
export function extendedFingers(lm: Landmark[]): number | null {
  const w = lm[WRIST];
  if (!w) return null;
  let n = 0;
  for (const [tip, pip] of FINGERS) {
    const t = lm[tip];
    const j = lm[pip];
    if (!t || !j) return null;
    if (dist(w, t) > dist(w, j) * 1.15) n++;
  }
  return n;
}

/**
 * 同一個數字（1..4）連續看到 holdMs 才確認，確認時回傳一次，之後不再重複；
 * 數字變了、沒看到手、0 或超過 4 都重新計時。手放下再比同一個數字會再報一次。
 */
export class StableCount {
  private current: number | null = null;
  private since = 0;
  private reported = false;

  constructor(private readonly holdMs: number) {}

  update(count: number | null, nowMs: number): number | null {
    const valid = count !== null && count >= 1 && count <= 4 ? count : null;
    if (valid !== this.current) {
      this.current = valid;
      this.since = nowMs;
      this.reported = false;
      return null;
    }
    if (valid === null || this.reported) return null;
    if (nowMs - this.since >= this.holdMs) {
      this.reported = true;
      return valid;
    }
    return null;
  }
}
