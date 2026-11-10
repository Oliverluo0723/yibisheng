import { createBleedBrush } from './bleed';
import { createDryBrush } from './dry';
import { createInkBrush } from './ink';
import { createPastelBrush } from './pastel';
import { createPollenBrush } from './pollen';
import { createPressedBrush } from './pressed';
import type { Brush } from './types';

export type { Brush, BrushEnv } from './types';

/** 筆的建構函式，順序 = 鍵盤 1、2、3…。每支分枝要各自一份筆的狀態時用。 */
export const BRUSH_FACTORIES: (() => Brush)[] = [
  createInkBrush,
  createDryBrush,
  createBleedBrush,
  createPollenBrush,
  createPastelBrush,
  createPressedBrush,
];

export function createBrushes(): Brush[] {
  return BRUSH_FACTORIES.map((make) => make());
}
