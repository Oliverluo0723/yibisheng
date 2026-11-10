import type { GrowthParams } from './types';

/**
 * 在目前的參數附近抖一組新的，給「每筆隨機」用：每一筆的植物都不太一樣，畫面才有層次。
 * amount 0..1 是抖動幅度（1 ≈ 上下各一倍／減到零之間）。整數和機率各自夾在合理範圍。
 */
export function randomizeGrowth(
  base: GrowthParams,
  amount: number,
  rng: () => number,
): GrowthParams {
  const a = Math.max(0, Math.min(1, amount));
  // 乘法抖動：1 ± a·u，u 均勻 [-1, 1]
  const mul = (v: number, lo = 0, hi = Number.POSITIVE_INFINITY) =>
    Math.min(hi, Math.max(lo, v * (1 + (rng() * 2 - 1) * a)));
  // 加法抖動（角度）
  const add = (v: number, range: number) => v + (rng() * 2 - 1) * range * a;
  return {
    speed: mul(base.speed, 0.005),
    segmentLength: mul(base.segmentLength, 0.003),
    branchChance: mul(base.branchChance, 0, 1),
    spread: mul(base.spread, 0.1, Math.PI),
    noise: mul(base.noise, 0),
    maxDepth: Math.round(mul(base.maxDepth, 1, 8)),
    life: mul(base.life, 500),
    tipsPerStroke: Math.round(mul(base.tipsPerStroke, 1, 30)),
    maxTips: base.maxTips,
    tropism: mul(base.tropism, 0, 1),
    lightAngle: add(base.lightAngle, Math.PI / 3),
    curl: mul(base.curl, 0),
    apical: mul(base.apical, 0, 0.5),
    reach: mul(base.reach, 0.02),
    reachDecay: mul(base.reachDecay, 0.3, 1),
    seedJitter: mul(base.seedJitter, 0),
  };
}
