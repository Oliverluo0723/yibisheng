import type { Stroke } from '../strokes/types';
import { mulberry32 } from './rng';
import type { GrowthEvent, GrowthParams, Segment } from './types';

/** 固定的模擬步長（ms）。生長以固定步長推進，和畫面幀率無關，同一個種子才能重現。 */
export const TICK_MS = 1000 / 60;
/** 單次 step() 最多補幾個 tick，避免分頁回到前景時一次追太多。 */
const MAX_TICKS_PER_STEP = 10;

type Tip = {
  /** 這株植物裡唯一的編號，分枝出來的新芽拿新編號 */
  id: number;
  x: number;
  y: number;
  heading: number;
  depth: number;
  /** 上一個節點（上一段的終點） */
  nx: number;
  ny: number;
  /** 自上一個節點以來累積的長度 */
  pending: number;
  /** 這根芽總共長了多遠 */
  grown: number;
  /** 這根芽能長多遠；到了就停 */
  budget: number;
  /** 這根芽自己的速度倍率（0.7..1.3） */
  vigor: number;
  /** 這根芽自己的固定偏轉（弧度 / 秒） */
  curl: number;
  /** 目前的轉向速率（弧度 / 秒），由雜訊慢慢推，所以是波浪不是毛邊 */
  turn: number;
};

export type LiveTip = {
  id: number;
  x: number;
  y: number;
  depth: number;
  /** 這根芽長了多少（0..1）：給末端收細用 */
  progress: number;
};

/**
 * 遞迴分枝 + 雜訊 + 向光的植物。筆觸是主幹，芽從筆觸上長出去。
 *
 * 座標存成畫布比例（0..1）。`aspect` = 畫布寬 / 高：生長本身在「以畫布高為單位」的
 * 等向空間進行，水平位移再除以 aspect 換回比例座標，這樣枝條在螢幕上不會被拉扯。
 *
 * 每根芽各自有：能長多遠（越深越短，帶隨機）、速度倍率、固定偏轉。快到底時放慢，
 * 到了就各自停，所以不是整株在同一刻停下。`life` 是硬上限。
 */
export class BranchingPlant {
  readonly stroke: Stroke;
  readonly segments: Segment[] = [];
  private _age = 0;
  private accumulator = 0;
  private tips: Tip[] = [];
  private nextTipId = 0;
  private readonly params: GrowthParams;
  private readonly aspect: number;
  private readonly rng: () => number;

  constructor(stroke: Stroke, params: GrowthParams, seed: number, aspect = 1) {
    this.stroke = stroke;
    this.params = params;
    this.aspect = aspect > 0 ? aspect : 1;
    this.rng = mulberry32(seed);
    this.tips = this.seedTips();
  }

  get age(): number {
    return this._age;
  }

  get alive(): boolean {
    return this.tips.length > 0;
  }

  /** 每個活芽「正在長、還沒完成」的那一小段（從上一個節點到目前位置），給畫面每幀畫出連續生長用。 */
  get growing(): Segment[] {
    return this.tips
      .filter((t) => t.pending > 0)
      .map((t) => ({ x1: t.nx, y1: t.ny, x2: t.x, y2: t.y, depth: t.depth, born: this._age }));
  }

  /** 目前活著的芽尖位置（比例座標）。給「每支芽各自連續畫」的畫法用：id 不變就是同一支芽。 */
  get liveTips(): LiveTip[] {
    return this.tips.map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      depth: t.depth,
      progress: Math.min(1, t.grown / t.budget),
    }));
  }

  /** 推進時間（任意 ms），內部以固定步長 tick；回傳這一步新發生的事件。 */
  step(dtMs: number): GrowthEvent[] {
    if (this.tips.length === 0) return [];
    const events: GrowthEvent[] = [];
    this.accumulator += Math.max(0, dtMs);
    let ticks = 0;
    while (this.accumulator >= TICK_MS && ticks < MAX_TICKS_PER_STEP && this.tips.length > 0) {
      this.accumulator -= TICK_MS;
      ticks++;
      this.tick(events);
    }
    if (ticks === MAX_TICKS_PER_STEP) this.accumulator = 0;
    return events;
  }

  /** -π..π 之間的角度差 */
  private static angleTo(from: number, to: number): number {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  private tick(events: GrowthEvent[]): void {
    const { params, aspect } = this;
    this._age += TICK_MS;
    const dt = TICK_MS / 1000;

    if (this._age >= params.life) {
      for (const t of this.tips) {
        events.push({ kind: 'leaf', x: t.x, y: t.y, depth: t.depth, age: this._age });
      }
      this.tips = [];
      return;
    }

    const born: Tip[] = [];
    const survivors: Tip[] = [];
    let dead = 0;
    for (const t of this.tips) {
      // 方向：雜訊推轉向速率（低通，所以是波浪）＋ 自己的捲 ＋ 向光
      t.turn = t.turn * 0.9 + (this.rng() * 2 - 1) * params.noise * 0.35;
      t.heading += (t.turn * 6 + t.curl) * dt;
      t.heading += BranchingPlant.angleTo(t.heading, params.lightAngle) * params.tropism * dt * 3;

      // 速度：快到底時放慢
      const progress = t.grown / t.budget;
      const ease = 0.15 + 0.85 * (1 - progress) ** 1.5;
      const d = params.speed * t.vigor * ease * dt;
      t.x += (Math.cos(t.heading) * d) / aspect;
      t.y += Math.sin(t.heading) * d;
      t.pending += d;
      t.grown += d;

      if (t.grown >= t.budget) {
        if (t.pending >= params.segmentLength * 0.9) this.closeSegment(t);
        events.push({ kind: 'leaf', x: t.x, y: t.y, depth: t.depth, age: this._age });
        dead++;
        continue;
      }
      survivors.push(t);
      if (t.pending < params.segmentLength) continue;
      this.closeSegment(t);

      const canBranch =
        t.depth + 1 <= params.maxDepth &&
        this.tips.length - dead + born.length < params.maxTips &&
        this.rng() < params.branchChance;
      if (!canBranch) continue;

      // 主從分岔：側枝拿走 (1 - apical) 的夾角、主幹只偏 apical，側邊隨機
      const side = this.rng() < 0.5 ? 1 : -1;
      const wobble = 0.7 + this.rng() * 0.6;
      born.push(
        this.newTip(
          t.x,
          t.y,
          t.heading + side * params.spread * (1 - params.apical) * wobble,
          t.depth + 1,
        ),
      );
      t.heading -= side * params.spread * params.apical * (0.7 + this.rng() * 0.6);
      events.push({ kind: 'branch', x: t.x, y: t.y, depth: t.depth + 1, age: this._age });
    }
    this.tips = survivors;
    this.tips.push(...born);
  }

  private closeSegment(t: Tip): void {
    this.segments.push({ x1: t.nx, y1: t.ny, x2: t.x, y2: t.y, depth: t.depth, born: this._age });
    t.nx = t.x;
    t.ny = t.y;
    t.pending = 0;
  }

  private newTip(x: number, y: number, heading: number, depth: number): Tip {
    const { params } = this;
    const r = this.rng;
    return {
      id: this.nextTipId++,
      x,
      y,
      nx: x,
      ny: y,
      heading,
      depth,
      pending: 0,
      grown: 0,
      budget: Math.max(1e-6, params.reach * params.reachDecay ** depth * (0.6 + r() * 0.8)),
      vigor: 0.7 + r() * 0.6,
      curl: (r() * 2 - 1) * params.curl,
      turn: 0,
    };
  }

  /** 沿筆觸抽出起始芽：位置略有錯落，方向是該處法線（等向空間）左右交替再加隨機偏轉。 */
  private seedTips(): Tip[] {
    const pts = this.stroke.points;
    if (pts.length === 0) return [];
    const n = Math.max(1, this.params.tipsPerStroke);
    const tips: Tip[] = [];
    for (let i = 0; i < n; i++) {
      const jitter = n === 1 ? 0 : ((this.rng() - 0.5) * 0.8) / (n - 1);
      const f = n === 1 ? 0.5 : Math.min(1, Math.max(0, i / (n - 1) + jitter));
      const idx = Math.min(pts.length - 1, Math.round(f * (pts.length - 1)));
      const p = pts[idx] as (typeof pts)[number];
      const prev = pts[Math.max(0, idx - 1)] as (typeof pts)[number];
      const next = pts[Math.min(pts.length - 1, idx + 1)] as (typeof pts)[number];
      // 切線換到等向空間（x 乘以 aspect）再算角度
      let tx = (next.x - prev.x) * this.aspect;
      let ty = next.y - prev.y;
      const len = Math.hypot(tx, ty);
      if (len < 1e-9) {
        tx = 1;
        ty = 0;
      } else {
        tx /= len;
        ty /= len;
      }
      // 法線：切線旋轉 90°，左右交替，再加隨機偏轉
      const side = i % 2 === 0 ? 1 : -1;
      const normal = Math.atan2(tx * side, -ty * side);
      const heading = normal + (this.rng() * 2 - 1) * this.params.seedJitter;
      tips.push(this.newTip(p.x, p.y, heading, 0));
    }
    return tips;
  }
}
