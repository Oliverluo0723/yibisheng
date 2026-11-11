import type { GrowthEvent } from '../growth/types';
import type { Gesture } from '../strokes/gesture';
import type { StrokePoint } from '../strokes/types';

/** 枯：葉落地、枝斷。x、y 是 0..1 的畫面座標 */
export type WitherEvent = { kind: 'leaf' | 'branch'; x: number; y: number; depth: number };

/** 放開一筆時交給聲音的身分與手勢：id 是這株的識別（之後分枝、枯的事件用同一個 id） */
export type PlantInfo = { id: number; gesture: Gesture };

/** 聲音引擎的統一介面。實作可以替換（原生 Web Audio、Tone.js…）。 */
export interface SoundEngine {
  /** 瀏覽器規定要在使用者互動的事件裡呼叫。 */
  start(): Promise<void>;
  onStrokePoint(p: StrokePoint): void;
  /** voice 是發事件的植物的聲音名（植物種類）、plantId 是哪一株，舊引擎可忽略 */
  onGrowth(e: GrowthEvent, voice?: string, plantId?: number): void;
  /** 0..1 */
  setVolume(v: number): void;
  /** 放開一筆、植物開始長；seed 是這一筆的種子、info 是身分與手勢（可選，舊引擎不用實作） */
  onPlantStart?(seed: number, voice?: string, info?: PlantInfo): void;
  /** 一株植物長完（可選） */
  onPlantDone?(): void;
  /** 枯的事件（可選）：不算活動、不推熱度 */
  onWither?(e: WitherEvent, voice?: string, plantId?: number): void;
  /** 一株枯到幾成（0..1，只增不減；可選）：俳句照比例熄格，到 1 響尾音 */
  onPlantWither?(plantId: number, progress: number, voice?: string): void;
  /** 一株從畫面上被拿掉（復原、清空；可選）：之後不該再響 */
  onPlantRemove?(plantId: number): void;
}
