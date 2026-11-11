// 留白預算（InkField「小的東西需要更多留白」、Ooame「紋理變厚變薄」）：
// 熱度定同時幾株響、株數定每株多稀、最後一席輪流發言。純函式。

/** 同時最多幾株響：熱度 < 0.3 → 1、< 0.6 → 2、否則 4 */
export function maxActiveFor(heat: number): number {
  return heat < 0.3 ? 1 : heat < 0.6 ? 2 : 4;
}

/** 每株的密度倍率：1 / √max(1, aliveCount) */
export function densityFor(aliveCount: number): number {
  return 1 / Math.sqrt(Math.max(1, aliveCount));
}

/**
 * 這一小節誰在發言：最新的 maxActive − 1 株固定在；剩下一席每兩小節輪給更早的樹，
 * 從最新的那株往舊的輪（bar ÷ 2 取整，對更早的樹數取餘），所以剛畫的樹一定先被聽到。
 * 更早的樹不夠就全部都在。回傳順序＝輸入順序。
 */
export function activeTrees<T extends { born: number }>(
  trees: readonly T[],
  maxActive: number,
  bar: number,
): T[] {
  if (maxActive <= 0) return [];
  if (trees.length <= maxActive) return [...trees];
  const newestFirst = [...trees].sort((a, b) => b.born - a.born);
  const fixed = new Set(newestFirst.slice(0, maxActive - 1));
  const older = newestFirst.slice(maxActive - 1);
  const rotating = older[Math.floor(bar / 2) % older.length];
  return trees.filter((t) => fixed.has(t) || t === rotating);
}
