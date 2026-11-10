/**
 * 數手指（純計算）：比 1、2、3、4 換植物，中式的「六」（拇指和小指張開）換第五種。
 * 1 到 4 只看食指、中指、無名指、小指；六才看拇指（用捏合比例判斷拇指有沒有張開）。
 */
import { type Landmark, type PinchParams, pinchRatio, WRIST } from './pinch';

/** 四根手指：[指尖, 第二指節(PIP)]，和 pinch.ts 的張開手掌判斷用同一個標準 */
const FINGERS: [tip: number, pip: number][] = [
  [8, 6],
  [12, 10],
  [16, 14],
  [20, 18],
];

const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);

/** 四根手指各自有沒有伸直（食、中、無名、小）：指尖比第二指節離手腕更遠才算。關節點不夠回 null。 */
export function fingerMask(lm: Landmark[]): [boolean, boolean, boolean, boolean] | null {
  const w = lm[WRIST];
  if (!w) return null;
  const out: boolean[] = [];
  for (const [tip, pip] of FINGERS) {
    const t = lm[tip];
    const j = lm[pip];
    if (!t || !j) return null;
    out.push(dist(w, t) > dist(w, j) * 1.15);
  }
  return out as [boolean, boolean, boolean, boolean];
}

/** 伸直的手指數（0..4），不含拇指。 */
export function extendedFingers(lm: Landmark[]): number | null {
  const m = fingerMask(lm);
  return m ? m.filter(Boolean).length : null;
}

/**
 * 手比的數字：1–4 = 伸直的手指數；6 = 只伸小指、拇指張開（中式的六）；0 = 握拳。
 * 5 是張開手掌，另外處理（轉向），這裡會算成 4。
 */
export function handNumber(lm: Landmark[], p: PinchParams): number | null {
  const m = fingerMask(lm);
  if (!m) return null;
  const [index, middle, ring, pinky] = m;
  const ratio = pinchRatio(lm);
  const thumbOut = ratio !== null && ratio > p.up * 1.3;
  if (pinky && !index && !middle && !ring && thumbOut) return 6;
  return m.filter(Boolean).length;
}

/**
 * 同一個數字（1..4 或 6）連續看到 holdMs 才確認，確認時回傳一次，之後不再重複；
 * 數字變了、沒看到手、0 或超過 4 都重新計時。手放下再比同一個數字會再報一次。
 */
export class StableCount {
  private current: number | null = null;
  private since = 0;
  private reported = false;

  constructor(private readonly holdMs: number) {}

  update(count: number | null, nowMs: number): number | null {
    const valid = count !== null && ((count >= 1 && count <= 4) || count === 6) ? count : null;
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
