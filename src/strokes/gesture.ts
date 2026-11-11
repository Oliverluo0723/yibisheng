/**
 * 手勢分析（概念來自 InkField「情緒與意圖」：速度是急切、停頓是猶豫；
 * 均勻散佈的停頓像呼吸，集中在中段的停頓像掙扎）。只看速度和時間，不做情緒判斷。
 */
export type GestureSample = {
  /** 毫秒 */
  t: number;
  /** 0..1：筆速 ÷ PenParams.maxSpeed，超過截成 1 */
  speed: number;
};

export type Gesture = {
  durationMs: number;
  /** 平均速度 0..1 */
  energy: number;
  /** 停頓次數：連續 ≥ 130 ms、speed < 0.05 算一次 */
  pauses: number;
  /** 停頓分布 0..1：1 = 均勻（像呼吸），0 = 擠在一起（像掙扎）；停頓 ≤ 1 次時為 1 */
  evenness: number;
};

/** 點一下沒拖：當作中等速度的一筆 */
export const EMPTY_GESTURE: Gesture = { durationMs: 0, energy: 0.2, pauses: 0, evenness: 1 };

const PAUSE_MIN_MS = 130;
const PAUSE_SPEED = 0.05;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function analyzeGesture(samples: readonly GestureSample[]): Gesture {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return EMPTY_GESTURE;
  const durationMs = last.t - first.t;
  const energy = samples.reduce((s, x) => s + clamp01(x.speed), 0) / samples.length;

  // 停頓：連續慢的一段，頭尾時間差夠長才算；記中點
  const centers: number[] = [];
  let start: GestureSample | null = null;
  let prev: GestureSample | null = null;
  const close = () => {
    if (start && prev && prev.t - start.t >= PAUSE_MIN_MS) centers.push((start.t + prev.t) / 2);
    start = null;
  };
  for (const s of samples) {
    if (s.speed < PAUSE_SPEED) {
      start ??= s;
      prev = s;
    } else {
      close();
    }
  }
  close();

  let evenness = 1;
  if (centers.length > 1) {
    const points = [first.t, ...centers, last.t];
    const gaps = points.slice(1).map((p, i) => p - (points[i] as number));
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    evenness = clamp01(1 - cv);
  }
  return { durationMs, energy, pauses: centers.length, evenness };
}
