// 一種植物一種聲音。純資料：引擎照這張表決定綻放的顏色、顆粒的素材、鼓與鋼琴的份量。
import type { GrainCategory } from '../theory/register';
import type { SampleRole } from './manifest';
import type { BloomColour } from './recipe';

export const VOICE_NAMES = ['押花樹', '草', '曼珠沙華', '紫羅蘭', '丁香'] as const;
export type VoiceName = (typeof VOICE_NAMES)[number];
export const DEFAULT_VOICE: VoiceName = '押花樹';

export type Voice = {
  /** 綻放顏色的權重，第一個是幅度 0 時的預設 */
  bloom: readonly [BloomColour, number][];
  grains: {
    /** 淺、中、深三個深度各用哪一類素材 */
    roles: readonly [SampleRole, SampleRole, SampleRole];
    gainDb: number;
    /** 每秒上限的倍率 */
    density: number;
    /** 挑和弦音的傾向 */
    bias: -1 | 0 | 1;
  };
  /** 鼓、鋼琴的份量 0..1 */
  drums: number;
  piano: number;
};

export const VOICES: Record<VoiceName, Voice> = {
  押花樹: {
    bloom: [
      ['pad', 4],
      ['piano', 2],
      ['strings', 1.5],
      ['swell', 1],
      ['none', 1],
    ],
    grains: { roles: ['piano', 'piano', 'bell'], gainDb: -8, density: 1, bias: 0 },
    drums: 0.8,
    piano: 0.8,
  },
  草: {
    bloom: [
      ['none', 3],
      ['padHigh', 1],
      ['piano', 1],
    ],
    grains: { roles: ['kalimba', 'kalimba', 'kalimba'], gainDb: -14, density: 0.5, bias: 0 },
    drums: 0.5,
    piano: 0.4,
  },
  曼珠沙華: {
    bloom: [
      ['padLow', 3],
      ['swell', 2],
      ['clarinet', 1],
      ['none', 0.5],
    ],
    grains: { roles: ['glitchfx', 'glitch', 'glitch'], gainDb: -6, density: 1, bias: -1 },
    drums: 1,
    piano: 0.5,
  },
  紫羅蘭: {
    bloom: [
      ['keys', 3],
      ['pad', 1],
      ['piano', 1],
    ],
    grains: { roles: ['kalimba', 'kalimba', 'bell'], gainDb: -8, density: 1, bias: 1 },
    drums: 0.7,
    piano: 1,
  },
  丁香: {
    bloom: [
      ['cluster', 3],
      ['padHigh', 1],
    ],
    grains: { roles: ['bell', 'bell', 'glitch'], gainDb: -12, density: 1.5, bias: 1 },
    drums: 0.6,
    piano: 1,
  },
};

export function voiceFor(name: string | undefined): Voice {
  return (name && (VOICES as Record<string, Voice>)[name]) || VOICES[DEFAULT_VOICE];
}

/** 深度 → 這個聲音用的素材類別 */
export function grainRole(v: Voice, category: GrainCategory): SampleRole {
  const i = category === 'kalimba' ? 0 : category === 'bell' ? 1 : 2;
  return v.grains.roles[i];
}
