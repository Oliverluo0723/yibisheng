import type { BranchingPlant } from '../growth/branching';
import type { PenSample } from './pen';
import type { Brush, BrushEnv } from './types';

export type BranchStyle = {
  /** 主幹筆寬（px），通常是筆尖面板的粗細 */
  size: number;
  /** 分枝筆寬 = size × width × 0.8^depth */
  width: number;
  /** 植物老了枝條變細多少 0..1（到生命終點時剩 1 − ageThin） */
  ageThin: number;
  /** 植物的生命（ms），算老化用 */
  life: number;
  /** 芽尖至少移動幾 px 才畫一次，避免每幀只動零點幾 px 時筆刷原地堆積 */
  minMove: number;
};

export const defaultBranchStyle: Omit<BranchStyle, 'size' | 'life'> = {
  width: 0.55,
  ageThin: 0.5,
  minMove: 2,
};

/**
 * 用筆刷畫一株正在長的植物：每支芽尖各自拿一份筆（各自的毛束、間距、左右交錯），
 * 每幀從上次畫到的位置連續畫到芽尖現在的位置，所以生長看起來是連續的。
 */
export class PlantPainter {
  private readonly tips = new Map<number, { brush: Brush; last: PenSample }>();

  constructor(
    readonly plant: BranchingPlant,
    private readonly make: () => Brush,
    /** 建立時從目前的筆複製參數，之後面板再調不影響這株 */
    private readonly params: Record<string, number>,
    readonly env: BrushEnv,
    private readonly style: BranchStyle,
  ) {}

  get alive(): boolean {
    return this.plant.alive;
  }

  /** w、h 是畫布的 CSS 像素尺寸（植物座標是 0..1 比例） */
  paint(w: number, h: number): void {
    const { style, env } = this;
    const age = Math.min(1, this.plant.age / Math.max(1, style.life));
    for (const t of this.plant.liveTips) {
      const x = t.x * w;
      const y = t.y * h;
      const width = Math.max(
        0.6,
        style.size * style.width * 0.8 ** t.depth * (1 - style.ageThin * age),
      );
      const st = this.tips.get(t.id);
      if (!st) {
        const brush = this.make();
        Object.assign(brush.params, this.params);
        const first = sample(x, y, 0, 0, width, 0, 0);
        brush.begin(env, first);
        this.tips.set(t.id, { brush, last: first });
        continue;
      }
      const dx = x - st.last.x;
      const dy = y - st.last.y;
      const d = Math.hypot(dx, dy);
      if (d < style.minMove) continue;
      const s = sample(x, y, dx, dy, width, st.last.dist + d, st.last.frame + 1);
      st.brush.segment(env, st.last, s);
      st.last = s;
    }
  }
}

function sample(
  x: number,
  y: number,
  vx: number,
  vy: number,
  width: number,
  dist: number,
  frame: number,
): PenSample {
  // 生長是穩定的慢速，當作中等偏重的筆壓
  return {
    x,
    y,
    vx,
    vy,
    speed: Math.hypot(vx, vy),
    pressure: 0.8,
    width,
    dist,
    frame,
    lifting: false,
  };
}
