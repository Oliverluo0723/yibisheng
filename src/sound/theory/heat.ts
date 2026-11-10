/** 每種事件給熱度加多少能量 */
export const HEAT_BUMP = { branch: 0.03, leaf: 0.01, plant: 0.2 } as const;

/**
 * 整幅畫的「熱度」：事件累積能量 E，能量以固定半衰期衰減，熱度 = 1 − e^(−E)。
 * 畫越多越熱鬧，停手後慢慢退。
 */
const MAX_ENERGY = 5;

export class Heat {
  private energy = 0;
  private at = 0;
  private readonly halfLifeMs: number;

  constructor(opts: { halfLifeMs?: number } = {}) {
    this.halfLifeMs = opts.halfLifeMs ?? 20000;
  }

  add(nowMs: number, amount: number): void {
    // 能量上限：畫得再兇，熱度最高約 0.993，停手後約 90 秒內鋼琴會停
    this.energy = Math.min(MAX_ENERGY, this.energyAt(nowMs) + amount);
    this.at = nowMs;
  }

  value(nowMs: number): number {
    return 1 - Math.exp(-this.energyAt(nowMs));
  }

  private energyAt(nowMs: number): number {
    const dt = Math.max(0, nowMs - this.at);
    return this.energy * 0.5 ** (dt / this.halfLifeMs);
  }
}

export function smoothstep(lo: number, hi: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

/** 熱度 → 鼓的音量（0..1）與低通：三成後打擊、六成後鼓組，越熱越近 */
export function drumLevels(heat: number): { perc: number; kit: number; lowpassHz: number } {
  const open = Math.min(1, Math.max(0, (heat - 0.3) / 0.7));
  return {
    perc: smoothstep(0.3, 0.45, heat),
    kit: smoothstep(0.6, 0.75, heat),
    lowpassHz: 600 * (12000 / 600) ** open,
  };
}
