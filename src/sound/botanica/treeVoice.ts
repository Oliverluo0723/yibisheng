// 一株一個個性（概念來自 Ooame：一個物件一首俳句，各有自己的細分、素材、效果、pattern）。
// 手勢決定細分、音域、長短；種子決定素材、順序、聲像。純資料，不 import Tone.js。
import { mulberry32 } from '../../growth/rng';
import type { Gesture } from '../../strokes/gesture';
import type { Register } from '../theory/chords';
import type { SampleRole } from './manifest';

export type Subdivision = 4 | 8 | 16;

export type TreeVoice = {
  /** 一小節切幾格：慢 4（能量 < 0.1）、中 8（< 0.3）、快 16 */
  subdivision: Subdivision;
  register: Register;
  /** 這株固定用的素材類別 */
  role: SampleRole;
  /** 停頓擠在一起（掙扎）的一筆倒著播 */
  reverse: boolean;
  /** 長素材切片長度（秒） */
  lengthSec: number;
  /** 長素材從哪裡切 0..1 */
  sliceFrac: number;
  /** 0..subdivision-1 的排列，第一個一定是 0：枝長出來照這個順序點亮 */
  order: number[];
  /** 最多亮幾格 */
  capacity: number;
  gainDb: number;
  /** −0.6..0.6 */
  pan: number;
};

const PALETTE: Record<Register, readonly SampleRole[]> = {
  low: ['piano', 'strings', 'clarinet'],
  mid: ['piano', 'bell', 'kalimba'],
  high: ['bell', 'glitch', 'kalimba'],
};

/** 能量低於這個是慢筆、低於下一個是中等 */
const SLOW_MAX = 0.1;
const MID_MAX = 0.3;

/** 素材的音量折減：弦樂句是整段樂團，比單音素材大很多（使用者：「押花樹的 string 太大聲」） */
const ROLE_TRIM_DB: Partial<Record<SampleRole, number>> = { strings: -12 };

const BY_SUBDIVISION: Record<Subdivision, { lengthSec: number; gainDb: number }> = {
  4: { lengthSec: 1.2, gainDb: -6 },
  8: { lengthSec: 0.7, gainDb: -8 },
  16: { lengthSec: 0.35, gainDb: -10 },
};

export function makeTreeVoice(seed: number, g: Gesture): TreeVoice {
  const rng = mulberry32(seed);
  // 門檻依實測校正：彈簧筆的速度 ÷ maxSpeed 很少超過 0.5，慢筆約 0.03、快筆約 0.4
  const subdivision: Subdivision = g.energy < SLOW_MAX ? 4 : g.energy < MID_MAX ? 8 : 16;
  const register: Register = g.energy < SLOW_MAX ? 'low' : g.energy < MID_MAX ? 'mid' : 'high';
  // 抽籤順序固定：素材 → 反轉 → 切片 → 聲像 → 順序
  const palette = PALETTE[register];
  const role = palette[Math.floor(rng() * palette.length)] as SampleRole;
  const reverseRoll = rng();
  const reverse = g.evenness < 0.5 || reverseRoll < 0.2;
  const sliceFrac = rng();
  const pan = (rng() * 2 - 1) * 0.6;
  const order = [...Array(subdivision).keys()];
  for (let i = order.length - 1; i > 1; i--) {
    const j = 1 + Math.floor(rng() * i);
    [order[i], order[j]] = [order[j] as number, order[i] as number];
  }
  const capacity = Math.max(2, Math.round(subdivision * (0.3 + 0.3 * g.energy)));
  const base = BY_SUBDIVISION[subdivision];
  return {
    subdivision,
    register,
    role,
    reverse,
    sliceFrac,
    order,
    capacity,
    pan,
    lengthSec: base.lengthSec,
    gainDb: base.gainDb + (ROLE_TRIM_DB[role] ?? 0),
  };
}

/** 第 step 格落在小節的第幾個 16 分音符（0..15） */
export function sixteenthOf(subdivision: Subdivision, step: number): number {
  return step * (16 / subdivision);
}
