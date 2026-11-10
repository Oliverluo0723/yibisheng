/** 顆粒素材的類別：音域高低靠換素材，不靠拉音高。 */
export type GrainCategory = 'kalimba' | 'bell' | 'glitch';

/** 淺層用卡林巴（低、暖），中層用鐘，深層用短的 bell glitch（高、短）。 */
export function grainCategory(depth: number): GrainCategory {
  if (depth <= 1) return 'kalimba';
  if (depth === 2) return 'bell';
  return 'glitch';
}
