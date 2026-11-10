import type { GrowthEvent } from '../growth/types';
import type { StrokePoint } from '../strokes/types';

/** 聲音引擎的統一介面。實作可以替換（原生 Web Audio、Tone.js…）。 */
export interface SoundEngine {
  /** 瀏覽器規定要在使用者互動的事件裡呼叫。 */
  start(): Promise<void>;
  onStrokePoint(p: StrokePoint): void;
  /** voice 是發事件的植物的聲音名（植物種類），舊引擎可忽略 */
  onGrowth(e: GrowthEvent, voice?: string): void;
  /** 0..1 */
  setVolume(v: number): void;
  /** 放開一筆、植物開始長；seed 是這一筆的種子（可選，舊引擎不用實作） */
  onPlantStart?(seed: number, voice?: string): void;
  /** 一株植物長完（可選） */
  onPlantDone?(): void;
}
