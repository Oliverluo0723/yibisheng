import type { Growth3DParams } from './branching3d';

/**
 * 起伏（草稿）：整幅畫的「熱度」決定每一筆長多少、多快；停手冷下來就枯。
 *
 * 像燒開水：熱度低時一筆只長少少幾枝（cold），往門檻漲的路上一筆比一筆多，
 * 過了門檻翻面（burst）：分枝、芽、葉一口氣變多、長得快。
 * 退潮：每株記住自己出生後看過的最高熱度，熱度從那裡掉下來多少就枯多少。
 */
export type ArcParams = {
  /** 接不接熱度；關了就是以前的樣子（每一筆都一樣） */
  enabled: boolean;
  /** 翻面的門檻（熱度 0..1） */
  threshold: number;
  /** 熱度 0 時，量是基準的幾成 */
  cold: number;
  /** 翻面後，量是基準的幾倍 */
  burst: number;
  /** 枯跟不跟熱度；關了用面板的「枯」滑桿 */
  witherAuto: boolean;
  /** 熱度從峰值掉到幾成就全枯：0.7 = 掉到峰值的三成時全枯 */
  witherSpan: number;
  /** 熱度半衰期（ms）：停手後多久退一半 */
  halfLifeMs: number;
};

export const defaultArcParams: ArcParams = {
  enabled: true,
  threshold: 0.6,
  cold: 0.5,
  burst: 1.8,
  witherAuto: true,
  witherSpan: 0.7,
  halfLifeMs: 20000,
};

/**
 * 畫面熱度每種事件加多少。和聲音的 HEAT_BUMP 不同：聲音那套一株中等的樹自己就能把熱度
 * 推到 0.76，曲線跟著植物走而不是跟著手；這裡筆重、枝葉輕，熱度主要由「畫了幾筆、多密」決定。
 * 模擬（每 8 秒一筆）：0 → 0.33 → 0.67（過門檻）→ 0.90 → 0.97；停手 40 秒退到 0.6 左右。
 */
export const ARC_HEAT_BUMP = { plant: 0.35, branch: 0.012, leaf: 0.004 } as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 熱度 → 量的倍率。門檻下從 cold 線性漲到 1；過門檻跳到 burst，再隨熱度多一點點 */
export function arcLevel(heat: number, arc: ArcParams): { amount: number; burst: boolean } {
  if (!arc.enabled) return { amount: 1, burst: false };
  const h = clamp01(heat);
  if (h >= arc.threshold) {
    const over = arc.threshold >= 1 ? 0 : (h - arc.threshold) / (1 - arc.threshold);
    return { amount: arc.burst * (1 + 0.25 * over), burst: true };
  }
  const t = arc.threshold <= 0 ? 1 : h / arc.threshold;
  return { amount: arc.cold + (1 - arc.cold) * t, burst: false };
}

/** 依熱度改寫這一筆的生長參數（不動傳進來的 base） */
export function arcGrowth(base: Growth3DParams, heat: number, arc: ArcParams): Growth3DParams {
  const { amount: a, burst } = arcLevel(heat, arc);
  if (!arc.enabled) return { ...base };
  // 葉子是一片一個 mesh，翻面時不再加密（一株三千片已經很重），靠芽數和層數撐密度
  const depthShift = burst ? 1 : a < 0.6 ? -1 : 0;
  return {
    ...base,
    tipsPerStroke: Math.max(1, Math.round(base.tipsPerStroke * a)),
    // 同時活著的芽不要跟著翻面倍數全開：一株會長到六、七千段，畫面撐不住
    maxTips: Math.max(1, Math.round(base.maxTips * Math.min(a, 1.5))),
    branchChance: clamp01(base.branchChance * a),
    maxDepth: Math.max(1, base.maxDepth + depthShift),
    speed: base.speed * (0.6 + 0.4 * a),
  };
}

/**
 * 退潮：這株出生後看過的最高熱度 peak，現在熱度 heat → 枯 0..1。
 * 熱度還在峰值 = 0；掉到 peak × (1 − witherSpan) = 1。再畫、熱回來會復原。
 */
export function witherFor(peak: number, heat: number, arc: ArcParams): number {
  if (!arc.enabled || !arc.witherAuto) return 0;
  // 跨度以峰值為基準，但峰值很低時不要縮到趨近零（一出生就全枯）
  const span = Math.max(0.05, arc.witherSpan) * Math.max(peak, 0.05);
  const t = clamp01((clamp01(peak) - clamp01(heat)) / span);
  return t * t * (3 - 2 * t);
}
