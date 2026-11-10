import type { KeyName } from '../theory/keys';

/** 素材在作品裡的用途。 */
export type SampleRole =
  | 'bed' // 底：環境 foley、雨聲
  | 'rain' // 底：偶爾淡進來的 rain synth
  | 'strings' // 綻放：弦樂句
  | 'piano' // 綻放：granular 鋼琴 pad
  | 'swell' // 綻放：botanical swell
  | 'clarinet' // 綻放：單簧管句
  | 'kalimba' // 顆粒：淺層
  | 'bell' // 顆粒：中層
  | 'glitch' // 顆粒：深層
  | 'drip' // 偶發：水滴
  | 'glitchfx' // 偶發：glitch
  | 'kit' // 鼓：鼓組 loop
  | 'perc' // 鼓：打擊 loop
  | 'keys'; // 鋼琴：Salamander 單音取樣

export type Sample = {
  id: string;
  /** public/sounds/ 底下的檔名 */
  file: string;
  role: SampleRole;
  /** 原檔的調；無音高的素材記 C */
  sourceKey: KeyName;
  gainDb: number;
  /** 原檔路徑，相對 ~/Downloads/Floral/ */
  source: string;
  /** 轉檔時只取前幾秒 */
  trimSec?: number;
  /** loop 的速度 */
  bpm?: number;
  /** 單音取樣的音高 */
  midi?: number;
  /** 不在 Floral 裡、要下載的素材 */
  url?: string;
};

export const SOUND_BASE = '/sounds/';

const V1 = 'bespoke - Floral v.1';
const V2 = 'bespoke - Floral v.2';
const pad = (n: number) => String(n).padStart(2, '0');

function series(
  role: SampleRole,
  count: number,
  source: (n: number) => string,
  sourceKey: (n: number) => KeyName,
  extra: Partial<Sample> = {},
): Sample[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `${role}-${pad(n)}`,
      file: `${role}-${pad(n)}.mp3`,
      role,
      sourceKey: sourceKey(n),
      gainDb: 0,
      source: source(n),
      ...extra,
    };
  });
}

const C = (): KeyName => 'C';

const named = (role: SampleRole, sources: string[], extra: Partial<Sample> = {}): Sample[] =>
  series(role, sources.length, (n) => sources[n - 1] as string, C, extra);

type Loop = [path: string, bpm: number];

const loops = (role: SampleRole, list: Loop[]): Sample[] =>
  list.map(([path, bpm], i) => ({
    id: `${role}-${pad(i + 1)}`,
    file: `${role}-${pad(i + 1)}.mp3`,
    role,
    sourceKey: 'C',
    gainDb: 0,
    source: path,
    bpm,
  }));

const KIT: Loop[] = [
  ...[1, 2, 3].map((n): Loop => [`${V1}/drum loops/drum loop ${n} 104bpm.wav`, 104]),
  [`${V1}/drum loops/drum loop 4 100bpm swung.wav`, 100],
  ...[5, 6, 7, 8].map((n): Loop => [`${V1}/drum loops/drum loop ${n} 86bpm.wav`, 86]),
  ...[9, 10].map((n): Loop => [`${V1}/drum loops/drum loop ${n} 119bpm.wav`, 119]),
  [`${V1}/drum loops/drum loop 11 106bpm.wav`, 106],
  [`${V2}/drums/loops/drum loop 1 120bpm.wav`, 120],
  [`${V2}/drums/loops/drum loop 2 118bpm.wav`, 118],
];

const PERC: Loop[] = [
  ...[1, 2, 3, 4, 5, 6, 7].map(
    (n): Loop => [`${V1}/percussion loops/guitar percussion ${pad(n)} 100bpm.wav`, 100],
  ),
  ...[1, 2, 3].map(
    (n): Loop => [`${V1}/percussion loops/percussion loop ${pad(n)} 104bpm.wav`, 104],
  ),
  ...[4, 5].map((n): Loop => [`${V1}/percussion loops/percussion loop ${n} 113bpm.wav`, 113]),
  ...[1, 2].map((n): Loop => [`${V1}/percussion loops/shaker swung 100bpm ${pad(n)}.wav`, 100]),
  ...[1, 2, 3].map(
    (n): Loop => [`${V1}/percussion loops/swung percussion loop 100bpm ${pad(n)}.wav`, 100],
  ),
  [`${V2}/drums/loops/perc loop 1 70bpm.wav`, 70],
  [`${V2}/drums/loops/perc loop 2 100 bpm.wav`, 100],
  [`${V2}/drums/loops/perc loop 3 120bpm.wav`, 120],
  [`${V2}/drums/loops/shaker loop 118bpm.wav`, 118],
];

/** Salamander Grand Piano V3（Alexander Holm，CC-BY 3.0），Tone.js 官方範例的托管 */
const SALAMANDER = 'https://tonejs.github.io/audio/salamander/';
const NOTE_NAMES: [name: string, pc: number][] = [
  ['C', 0],
  ['Ds', 3],
  ['Fs', 6],
  ['A', 9],
];
const KEYS: Sample[] = [2, 3, 4, 5]
  .flatMap((oct) =>
    NOTE_NAMES.map(([n, pc]) => ({ name: `${n}${oct}`, midi: 12 * (oct + 1) + pc })),
  )
  .concat([{ name: 'C6', midi: 84 }])
  .map(({ name, midi }) => ({
    id: `keys-${name.toLowerCase()}`,
    file: `keys-${name.toLowerCase()}.mp3`,
    role: 'keys' as const,
    sourceKey: 'C' as KeyName,
    gainDb: 0,
    source: `salamander/${name}.mp3`,
    midi,
    url: `${SALAMANDER}${name}.mp3`,
  }));

export const SAMPLES: readonly Sample[] = [
  ...named(
    'bed',
    [1, 2, 3, 4].map((n) => `${V1}/fx/foley${n}.wav`),
    { gainDb: -6, trimSec: 60 },
  ),
  ...named('bed', [`${V1}/oneshots/raindrops.wav`]).map((s) => ({
    ...s,
    id: 'bed-05',
    file: 'bed-05.mp3',
  })),
  ...series('rain', 3, (n) => `${V1}/fx/rain synth ${pad(n)}.wav`, C),
  ...series(
    'strings',
    24,
    (n) => `${V1}/live string phrases/string phrase ${pad(n)} Cmaj 100bpm.wav`,
    C,
  ),
  ...series('piano', 10, (n) => `${V2}/granular/piano/granular piano ${n} Cmaj.wav`, C),
  ...named('swell', [
    `${V1}/melodies/botanical swell 1 Db 108bpm.wav`,
    `${V1}/melodies/botanical swell 2 Db 108bpm.wav`,
    `${V1}/melodies/botanical swell 3 Cmaj 108bpm.wav`,
  ]).map((s, i) => ({ ...s, sourceKey: (i < 2 ? 'Db' : 'C') as KeyName })),
  ...series(
    'clarinet',
    14,
    (n) => `${V2}/live clarinet phrases/clarinet phrase ${n} Bbmaj 100bpm.wav`,
    () => 'Bb',
  ),
  ...series('kalimba', 9, (n) => `${V2}/granular/accents/granular kalimba accent ${n} Cmaj.wav`, C),
  ...series('bell', 11, (n) => `${V2}/granular/accents/granular bell accent ${n} Cmaj.wav`, C),
  ...series('glitch', 11, (n) => `${V2}/granular/accents/bell glitch ${n} Cmaj.wav`, C),
  ...named('drip', [
    `${V1}/fx/water droplet.wav`,
    `${V1}/fx/water droplet impact.wav`,
    `${V1}/fx/plop.wav`,
    `${V1}/fx/watery sweeper.wav`,
  ]),
  ...series(
    'glitchfx',
    13,
    (n) => `${V1}/fx/glitches/glitch${n} ${n <= 6 ? 'Fmaj' : 'Cmaj'}.wav`,
    (n) => (n <= 6 ? 'F' : 'C'),
  ),
  ...loops('kit', KIT),
  ...loops('perc', PERC),
  ...KEYS,
];

export function samplesByRole(role: SampleRole): readonly Sample[] {
  return SAMPLES.filter((s) => s.role === role);
}

export function sampleById(id: string): Sample | undefined {
  return SAMPLES.find((s) => s.id === id);
}
