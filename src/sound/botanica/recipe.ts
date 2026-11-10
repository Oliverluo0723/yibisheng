import { mulberry32 } from '../../growth/rng';
import type { ChordAction } from '../theory/chords';

/**
 * 這一筆綻放的「顏色」；none = 只有顆粒、沒有綻放。
 * strings／piano／swell／clarinet 是播一段素材；pad／padLow／padHigh 是弦樂拉長的和弦；
 * keys 是鋼琴慢分解和弦；cluster 是丁香的一串小音符加高音弦樂墊。
 */
export type BloomColour =
  | 'strings'
  | 'piano'
  | 'swell'
  | 'clarinet'
  | 'pad'
  | 'padLow'
  | 'padHigh'
  | 'keys'
  | 'cluster'
  | 'none';

/** 一筆的隨機配方。同一個種子、同一個幅度永遠得到同一份。 */
export type Recipe = {
  colour: BloomColour;
  /** 切片起點，佔整句的比例 0..1 */
  sliceStart: number;
  /** 切片長度（秒）；Infinity = 播到底 */
  sliceLen: number;
  reverse: boolean;
  /** 起音（秒） */
  attack: number;
  /** 送進殘響的量 0..1 */
  reverbSend: number;
  /** -1 = 低八度 */
  octave: -1 | 0;
  /** 左右聲像 -1..1 */
  pan: number;
  lowpassHz: number;
  /** 線性音量倍數 */
  gain: number;
  chord: ChordAction;
  grains: {
    maxPerSec: number;
    /** 挑和弦音的傾向：-1 偏低、0 隨機、1 偏高 */
    bias: -1 | 0 | 1;
    reverseChance: number;
  };
};

export const DEFAULT_RECIPE: Recipe = {
  colour: 'pad',
  sliceStart: 0,
  sliceLen: Number.POSITIVE_INFINITY,
  reverse: false,
  attack: 1.5,
  reverbSend: 0.5,
  octave: 0,
  pan: 0,
  lowpassHz: 8000,
  gain: 1,
  chord: 'advance',
  grains: { maxPerSec: 6, bias: 0, reverseChance: 0 },
};

/** 沒給聲音時的權重（押花樹） */
const DEFAULT_WEIGHTS: readonly [BloomColour, number][] = [
  ['pad', 4],
  ['piano', 2],
  ['strings', 1.5],
  ['swell', 1],
  ['none', 1],
];

function weighted<T>(items: readonly [T, number][], r: number): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [v, w] of items) {
    x -= w;
    if (x < 0) return v;
  }
  return (items[items.length - 1] as [T, number])[0];
}

/**
 * 給這一筆的種子與隨機幅度（0..1），抽出配方。
 * 幅度 0 = 預設配方；介於中間時，機率乘上幅度、範圍往預設值收縮。
 * 不論幅度，抽籤次數固定，所以同一筆在不同幅度下仍是「同一個方向」的變化。
 */
export function makeRecipe(
  seed: number,
  amount: number,
  voice: { bloom: readonly [BloomColour, number][] } = { bloom: DEFAULT_WEIGHTS },
): Recipe {
  const a = Math.min(1, Math.max(0, amount));
  const rng = mulberry32(seed);
  const r = () => rng();
  const lerp = (def: number, v: number) => def + (v - def) * a;
  const range = (lo: number, hi: number) => lo + r() * (hi - lo);
  const D = DEFAULT_RECIPE;

  const colourRoll = r();
  const colourPick = weighted(voice.bloom, r());
  const colourDefault = (voice.bloom[0] ?? DEFAULT_WEIGHTS[0])[0];
  const sliceRoll = r();
  const sliceLenRaw = range(1.5, 6);
  const sliceStartRaw = range(0, 0.6);
  const reverseRoll = r();
  const attackRaw = range(0.5, 3);
  const sendRaw = range(0.2, 0.9);
  const octaveRoll = r();
  const panRaw = range(-0.7, 0.7);
  const lpRaw = range(2000, 8000);
  const gainRaw = range(0.7, 1);
  const chordRoll = r();
  const maxRaw = range(3, 8);
  const biasRoll = r();
  const biasPick = (Math.floor(r() * 3) - 1) as -1 | 0 | 1;
  const revChanceRaw = range(0, 0.3);

  return {
    colour: colourRoll < a ? colourPick : colourDefault,
    sliceStart: sliceStartRaw * a,
    sliceLen: sliceRoll < (2 / 3) * a ? sliceLenRaw : D.sliceLen,
    reverse: reverseRoll < 0.25 * a,
    attack: lerp(D.attack, attackRaw),
    reverbSend: lerp(D.reverbSend, sendRaw),
    octave: octaveRoll < a / 6 ? -1 : 0,
    pan: lerp(D.pan, panRaw),
    lowpassHz: lerp(D.lowpassHz, lpRaw),
    gain: lerp(D.gain, gainRaw),
    chord:
      chordRoll < 0.25 * a ? 'stay' : chordRoll < (0.25 + 1 / 6) * a ? 'substitute' : 'advance',
    grains: {
      maxPerSec: Math.round(lerp(D.grains.maxPerSec, maxRaw)),
      bias: biasRoll < a ? biasPick : 0,
      reverseChance: revChanceRaw * a,
    },
  };
}
