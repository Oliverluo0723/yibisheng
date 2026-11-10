import type { KeyName } from '../theory/keys';

export type LayerParams = { enabled: boolean; volume: number };
export type LayerName = 'bed' | 'bloom' | 'grains' | 'drips';

/** 面板直接綁這個物件；改完呼叫 BotanicaEngine.applyParams()。 */
export type BotanicaParams = {
  key: KeyName;
  /** 每筆隨機幅度 0..1 */
  randomness: number;
  bed: LayerParams;
  bloom: LayerParams;
  grains: LayerParams;
  drips: LayerParams;
};

export const defaultBotanicaParams: BotanicaParams = {
  key: 'C',
  randomness: 0.7,
  bed: { enabled: true, volume: 0.35 },
  bloom: { enabled: true, volume: 0.8 },
  grains: { enabled: true, volume: 0.7 },
  drips: { enabled: true, volume: 0.6 },
};

/** 深拷貝一份預設值（巢狀物件不共用）。 */
export function freshBotanicaParams(): BotanicaParams {
  return structuredClone(defaultBotanicaParams);
}
