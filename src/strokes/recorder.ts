import type { Stroke, StrokePoint } from './types';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 把滑鼠像素座標記錄成比例座標的筆觸。 */
export class StrokeRecorder {
  readonly strokes: Stroke[] = [];
  private active: Stroke | null = null;
  private readonly minDistance: number;

  constructor(opts: { minDistance?: number } = {}) {
    this.minDistance = opts.minDistance ?? 0.002;
  }

  /** 進行中的筆觸；沒有在畫時是 null。 */
  get current(): Stroke | null {
    return this.active;
  }

  begin(px: number, py: number, w: number, h: number, now: number): Stroke {
    this.active = {
      id: crypto.randomUUID(),
      startedAt: now,
      points: [{ x: clamp01(px / w), y: clamp01(py / h), t: 0 }],
    };
    return this.active;
  }

  extend(px: number, py: number, w: number, h: number, now: number): StrokePoint | null {
    if (!this.active) return null;
    const point: StrokePoint = {
      x: clamp01(px / w),
      y: clamp01(py / h),
      t: now - this.active.startedAt,
    };
    const last = this.active.points[this.active.points.length - 1];
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < this.minDistance) return null;
    this.active.points.push(point);
    return point;
  }

  end(): Stroke | null {
    const s = this.active;
    if (!s) return null;
    this.active = null;
    this.strokes.push(s);
    return s;
  }

  clear(): void {
    this.active = null;
    this.strokes.length = 0;
  }
}
