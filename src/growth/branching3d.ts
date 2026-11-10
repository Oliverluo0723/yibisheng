import { mulberry32 } from './rng';

/**
 * 3D 版的遞迴分枝：筆觸是畫在一個面上的主莖，芽從主莖往空間裡長（可以往畫面裡、外）。
 * 不依賴任何 3D 函式庫，向量都是 {x, y, z}；世界座標 y 朝上。
 */
export type V3 = { x: number; y: number; z: number };

export type Growth3DParams = {
  /** 生長速度（世界單位 / 秒） */
  speed: number;
  /** 每段長度（世界單位） */
  segmentLength: number;
  /** 每長一段分岔的機率 */
  branchChance: number;
  /** 分岔夾角（弧度） */
  spread: number;
  /** 方向擾動（弧度量級） */
  noise: number;
  maxDepth: number;
  /** 生命（ms） */
  life: number;
  tipsPerStroke: number;
  maxTips: number;
  /** 向上長的傾向 0..1 */
  tropism: number;
  /** 起始芽往畫面裡外偏的程度 0（貼著畫的面）..1（最多 ±90°） */
  outOfPlane: number;
  /** 每幾段長一片葉 */
  leafEvery: number;
};

export const defaultGrowth3DParams: Growth3DParams = {
  speed: 0.12,
  segmentLength: 0.03,
  branchChance: 0.14,
  spread: 0.8,
  noise: 0.5,
  maxDepth: 3,
  life: 9000,
  tipsPerStroke: 4,
  maxTips: 60,
  tropism: 0.35,
  outOfPlane: 0.7,
  leafEvery: 2,
};

/** tip = 長出這段的芽的 id：同一支芽的段連成一條「枝」，枯掉時整條一起斷 */
export type Segment3D = { a: V3; b: V3; depth: number; born: number; tip: number };

export type Leaf3D = {
  at: V3;
  /** 長出這片葉的枝條方向 */
  dir: V3;
  /** 葉子繞枝條轉了多少（互生 / 螺旋排列） */
  roll: number;
  depth: number;
  born: number;
  /** 長在哪支芽上（對應 Segment3D.tip） */
  tip: number;
  /** 0.6..1.2 的大小變化 */
  size: number;
  /** 0..1，挑葉片圖用 */
  pick: number;
};

export type Growth3DEvent = { kind: 'branch' | 'leaf'; at: V3; depth: number; age: number };

export const TICK_MS = 1000 / 60;
const MAX_TICKS_PER_STEP = 10;
/** 黃金角：螺旋葉序 */
const GOLDEN = (137.5 * Math.PI) / 180;

type Tip = {
  id: number;
  pos: V3;
  node: V3;
  dir: V3;
  depth: number;
  pending: number;
  segs: number;
  roll: number;
};

// ---------- 向量 ----------
export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
export const add = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: V3, k: number): V3 => v3(a.x * k, a.y * k, a.z * k);
export const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: V3, b: V3): V3 =>
  v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const len = (a: V3) => Math.hypot(a.x, a.y, a.z);
export function norm(a: V3, fallback: V3 = v3(0, 1, 0)): V3 {
  const l = len(a);
  return l < 1e-9 ? fallback : scale(a, 1 / l);
}
/** 任一條和 v 垂直的單位向量 */
export function perpendicular(v: V3): V3 {
  const ref = Math.abs(v.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0);
  return norm(cross(v, ref));
}
/** 繞單位軸 axis 轉 angle（Rodrigues） */
export function rotate(v: V3, axis: V3, angle: number): V3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = axis;
  return add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)));
}

const UP = v3(0, 1, 0);

export class Plant3D {
  readonly segments: Segment3D[] = [];
  readonly leaves: Leaf3D[] = [];
  private tips: Tip[] = [];
  private nextId = 0;
  private age_ = 0;
  private acc = 0;
  private readonly rng: () => number;

  /**
   * @param stroke 主莖（世界座標，至少 2 點）
   * @param view 從畫的那個面指向鏡頭的單位向量（芽會往它的正反方向偏）
   */
  constructor(
    readonly stroke: V3[],
    readonly params: Growth3DParams,
    seed: number,
    readonly view: V3,
  ) {
    this.rng = mulberry32(seed);
    this.tips = this.seed();
  }

  get age(): number {
    return this.age_;
  }

  get alive(): boolean {
    return this.tips.length > 0;
  }

  /** 每支活芽：上一個節點和現在的位置（畫「正在長的那一小段」用） */
  get liveTips(): { id: number; node: V3; pos: V3; depth: number }[] {
    return this.tips.map((t) => ({ id: t.id, node: t.node, pos: t.pos, depth: t.depth }));
  }

  step(dtMs: number): Growth3DEvent[] {
    const events: Growth3DEvent[] = [];
    if (this.tips.length === 0) return events;
    this.acc += Math.max(0, dtMs);
    let n = 0;
    while (this.acc >= TICK_MS && n < MAX_TICKS_PER_STEP && this.tips.length > 0) {
      this.acc -= TICK_MS;
      n++;
      this.tick(events);
    }
    if (n === MAX_TICKS_PER_STEP) this.acc = 0;
    return events;
  }

  private randomUnit(): V3 {
    const z = this.rng() * 2 - 1;
    const a = this.rng() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    return v3(r * Math.cos(a), r * Math.sin(a), z);
  }

  private tick(events: Growth3DEvent[]): void {
    const p = this.params;
    this.age_ += TICK_MS;
    const dt = TICK_MS / 1000;
    if (this.age_ >= p.life) {
      for (const t of this.tips) {
        // 每支芽的末端留一片葉
        this.leaves.push(this.makeLeaf(t));
        events.push({ kind: 'leaf', at: t.pos, depth: t.depth, age: this.age_ });
      }
      this.tips = [];
      return;
    }
    const born: Tip[] = [];
    for (const t of this.tips) {
      // 漫遊 + 向上
      const wander = scale(this.randomUnit(), p.noise * dt * 3);
      const lift = scale(UP, p.tropism * dt * 1.5);
      t.dir = norm(add(add(t.dir, wander), lift), t.dir);
      const d = p.speed * dt;
      t.pos = add(t.pos, scale(t.dir, d));
      t.pending += d;
      if (t.pending < p.segmentLength) continue;

      this.segments.push({ a: t.node, b: t.pos, depth: t.depth, born: this.age_, tip: t.id });
      t.node = t.pos;
      t.pending = 0;
      t.segs++;

      if (p.leafEvery > 0 && t.segs % Math.max(1, Math.round(p.leafEvery)) === 0) {
        t.roll += GOLDEN;
        this.leaves.push(this.makeLeaf(t));
      }

      const canBranch =
        t.depth + 1 <= p.maxDepth &&
        this.tips.length + born.length < p.maxTips &&
        this.rng() < p.branchChance;
      if (!canBranch) continue;
      // 分岔軸：垂直於枝條、再依螺旋葉序轉一個角度，枝就不會都長在同一個平面上
      const axis = rotate(perpendicular(t.dir), t.dir, t.roll + this.rng() * Math.PI);
      born.push({
        id: this.nextId++,
        pos: t.pos,
        node: t.pos,
        dir: rotate(t.dir, axis, p.spread),
        depth: t.depth + 1,
        pending: 0,
        segs: 0,
        roll: this.rng() * Math.PI * 2,
      });
      t.dir = rotate(t.dir, axis, -p.spread * 0.25);
      events.push({ kind: 'branch', at: t.pos, depth: t.depth + 1, age: this.age_ });
    }
    this.tips.push(...born);
  }

  private makeLeaf(t: Tip): Leaf3D {
    return {
      at: t.pos,
      dir: t.dir,
      roll: t.roll,
      depth: t.depth,
      born: this.age_,
      tip: t.id,
      size: 0.6 + this.rng() * 0.6,
      pick: this.rng(),
    };
  }

  /** 沿主莖等距放起始芽：方向是主莖在畫面上的法線，再往畫面裡或外偏一個隨機角度。 */
  private seed(): Tip[] {
    const pts = this.stroke;
    if (pts.length === 0) return [];
    const n = Math.max(1, this.params.tipsPerStroke);
    const tips: Tip[] = [];
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0.5 : i / (n - 1);
      const idx = Math.min(pts.length - 1, Math.round(f * (pts.length - 1)));
      const at = pts[idx] as V3;
      const prev = pts[Math.max(0, idx - 1)] as V3;
      const next = pts[Math.min(pts.length - 1, idx + 1)] as V3;
      const tangent = norm(sub(next, prev), v3(1, 0, 0));
      const side = i % 2 === 0 ? 1 : -1;
      const inPlane = scale(norm(cross(this.view, tangent), UP), side);
      const lean = (this.rng() * 2 - 1) * this.params.outOfPlane * (Math.PI / 2);
      const dir = norm(add(scale(inPlane, Math.cos(lean)), scale(this.view, Math.sin(lean))));
      tips.push({
        id: this.nextId++,
        pos: at,
        node: at,
        dir,
        depth: 0,
        pending: 0,
        segs: 0,
        roll: this.rng() * Math.PI * 2,
      });
    }
    return tips;
  }
}
