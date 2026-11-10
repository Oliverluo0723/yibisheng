import type { Stroke } from '../strokes/types';
import { mulberry32 } from './rng';
import type { GrowthEvent, GrowthParams, Segment } from './types';

type Tip = {
  x: number;
  y: number;
  heading: number;
  depth: number;
  /** 上一個節點（上一段的終點） */
  nx: number;
  ny: number;
  /** 自上一個節點以來累積的長度 */
  pending: number;
};

/** 遞迴分枝 + 雜訊的植物。筆觸是主幹，芽從筆觸上長出去。 */
export class BranchingPlant {
  readonly stroke: Stroke;
  readonly segments: Segment[] = [];
  private _age = 0;
  private tips: Tip[] = [];
  private readonly params: GrowthParams;
  private readonly rng: () => number;

  constructor(stroke: Stroke, params: GrowthParams, seed: number) {
    this.stroke = stroke;
    this.params = params;
    this.rng = mulberry32(seed);
    this.tips = this.seedTips();
  }

  get age(): number {
    return this._age;
  }

  get alive(): boolean {
    return this.tips.length > 0;
  }

  step(dtMs: number): GrowthEvent[] {
    if (this.tips.length === 0) return [];
    const { params } = this;
    const events: GrowthEvent[] = [];
    this._age += dtMs;
    const dt = dtMs / 1000;

    if (this._age >= params.life) {
      for (const t of this.tips) {
        events.push({ kind: 'leaf', x: t.x, y: t.y, depth: t.depth, age: this._age });
      }
      this.tips = [];
      return events;
    }

    const born: Tip[] = [];
    for (const t of this.tips) {
      t.heading += (this.rng() * 2 - 1) * params.noise * dt * 6;
      const d = params.speed * dt;
      t.x += Math.cos(t.heading) * d;
      t.y += Math.sin(t.heading) * d;
      t.pending += d;
      if (t.pending < params.segmentLength) continue;

      this.segments.push({
        x1: t.nx,
        y1: t.ny,
        x2: t.x,
        y2: t.y,
        depth: t.depth,
        born: this._age,
      });
      t.nx = t.x;
      t.ny = t.y;
      t.pending = 0;

      const canBranch =
        t.depth + 1 <= params.maxDepth &&
        this.tips.length + born.length < params.maxTips &&
        this.rng() < params.branchChance;
      if (!canBranch) continue;

      const half = params.spread / 2;
      born.push({
        x: t.x,
        y: t.y,
        nx: t.x,
        ny: t.y,
        heading: t.heading + half,
        depth: t.depth + 1,
        pending: 0,
      });
      t.heading -= half;
      events.push({ kind: 'branch', x: t.x, y: t.y, depth: t.depth + 1, age: this._age });
    }
    this.tips.push(...born);
    return events;
  }

  /** 沿筆觸等距抽出起始芽，方向為該處法線，左右交替。 */
  private seedTips(): Tip[] {
    const pts = this.stroke.points;
    if (pts.length === 0) return [];
    const n = Math.max(1, this.params.tipsPerStroke);
    const tips: Tip[] = [];
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1);
      const idx = Math.min(pts.length - 1, Math.round(f * (pts.length - 1)));
      const p = pts[idx] as (typeof pts)[number];
      const prev = pts[Math.max(0, idx - 1)] as (typeof pts)[number];
      const next = pts[Math.min(pts.length - 1, idx + 1)] as (typeof pts)[number];
      let tx = next.x - prev.x;
      let ty = next.y - prev.y;
      const len = Math.hypot(tx, ty);
      if (len < 1e-9) {
        tx = 1;
        ty = 0;
      } else {
        tx /= len;
        ty /= len;
      }
      // 法線：切線旋轉 90°，左右交替
      const side = i % 2 === 0 ? 1 : -1;
      const heading = Math.atan2(tx * side, -ty * side);
      tips.push({ x: p.x, y: p.y, nx: p.x, ny: p.y, heading, depth: 0, pending: 0 });
    }
    return tips;
  }
}
