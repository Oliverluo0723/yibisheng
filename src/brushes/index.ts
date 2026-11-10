import { createBleedBrush } from './bleed';
import { createDryBrush } from './dry';
import { createInkBrush } from './ink';
import { createMarkerBrush } from './marker';
import { createPastelBrush } from './pastel';
import { createPollenBrush } from './pollen';
import { createPressedBrush } from './pressed';
import type { Brush } from './types';

export type { Brush, BrushEnv } from './types';

/** 七支筆，順序 = 鍵盤 1–7。 */
export function createBrushes(): Brush[] {
  return [
    createInkBrush(),
    createDryBrush(),
    createBleedBrush(),
    createPollenBrush(),
    createPastelBrush(),
    createMarkerBrush(),
    createPressedBrush(),
  ];
}
