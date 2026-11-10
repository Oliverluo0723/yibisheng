import type { GrowthEvent } from '../growth/types';
import type { StrokePoint } from '../strokes/types';

/** 聲音引擎的統一介面。實作可以替換（原生 Web Audio、Tone.js…）。 */
export interface SoundEngine {
  /** 瀏覽器規定要在使用者互動的事件裡呼叫。 */
  start(): Promise<void>;
  onStrokePoint(p: StrokePoint): void;
  onGrowth(e: GrowthEvent): void;
  /** 0..1 */
  setVolume(v: number): void;
}
