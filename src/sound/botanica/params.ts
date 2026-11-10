import type { KeyName } from '../theory/keys';

export type LayerParams = { enabled: boolean; volume: number };
export type LayerName = 'bed' | 'bloom' | 'pad' | 'grains' | 'drips' | 'drums' | 'piano';

/** 面板直接綁這個物件；改完呼叫 BotanicaEngine.applyParams()。 */
export type BotanicaParams = {
  key: KeyName;
  /** 每筆隨機幅度 0..1 */
  randomness: number;
  bed: LayerParams;
  bloom: LayerParams;
  /** 弦樂拉長的和弦（和綻放同一組開關，面板上不分開） */
  pad: LayerParams;
  grains: LayerParams;
  drips: LayerParams;
  drums: LayerParams;
  piano: LayerParams;
};

export const defaultBotanicaParams: BotanicaParams = {
  key: 'C',
  randomness: 0.7,
  bed: { enabled: true, volume: 0.25 },
  bloom: { enabled: true, volume: 0.7 },
  pad: { enabled: true, volume: 0.8 },
  grains: { enabled: true, volume: 0.9 },
  drips: { enabled: true, volume: 0.6 },
  drums: { enabled: true, volume: 0.5 },
  piano: { enabled: true, volume: 0.5 },
};

/** 深拷貝一份預設值（巢狀物件不共用）。 */
export function freshBotanicaParams(): BotanicaParams {
  return structuredClone(defaultBotanicaParams);
}
