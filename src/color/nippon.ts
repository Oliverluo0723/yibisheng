/**
 * 日本の伝統色（nipponcolors.com）。數值取自該站 2026-11-10。
 * 要加顏色：到 https://nipponcolors.com/php/io.php?color=<ROMAJI> 查 rgb。
 */
export type NipponColor = { kanji: string; romaji: string; hex: string };

const c = (kanji: string, romaji: string, hex: string): NipponColor => ({ kanji, romaji, hex });

export const NIPPON = {
  TAIKOH: c('退紅', 'TAIKOH', '#F8C3CD'),
  HAIZAKURA: c('灰桜', 'HAIZAKURA', '#D7C4BB'),
  KOKE: c('苔', 'KOKE', '#838A2D'),
  RIKYUCHA: c('利休茶', 'RIKYUCHA', '#897D55'),
  KUCHIBA: c('朽葉', 'KUCHIBA', '#E2943B'),
  TORINOKO: c('鳥の子', 'TORINOKO', '#DAC9A6'),
  SUMI: c('墨', 'SUMI', '#1C1C1C'),
  TETSUKON: c('鉄紺', 'TETSUKON', '#261E47'),
  KAMENOZOKI: c('瓶覗', 'KAMENOZOKI', '#A5DEE4'),
  FUJI: c('藤', 'FUJI', '#8B81C3'),
  NANOHANA: c('菜の花', 'NANOHANA', '#F7D94C'),
  SHIRONERI: c('白練', 'SHIRONERI', '#FCFAF2'),
  ASAGI: c('浅葱', 'ASAGI', '#33A6B8'),
  KARAKURENAI: c('韓紅花', 'KARAKURENAI', '#D0104C'),
  TSUTSUJI: c('躑躅', 'TSUTSUJI', '#E03C8A'),
  YAMABUKI: c('山吹', 'YAMABUKI', '#FFB11B'),
  WAKATAKE: c('若竹', 'WAKATAKE', '#5DAC81'),
  GOFUN: c('胡粉', 'GOFUN', '#FFFFFB'),
  MURASAKI: c('紫', 'MURASAKI', '#592C63'),
} as const;

export type BrushPalette = {
  name: string;
  /** 紙（底色） */
  paper: NipponColor;
  /** 紙上顆粒的顏色 */
  grain: string;
  /** 深色底：疊色改用變亮（screen）而不是相乘（multiply） */
  dark: boolean;
  inks: NipponColor[];
};

const N = NIPPON;

export const PALETTES: BrushPalette[] = [
  {
    name: '侘寂',
    paper: N.TORINOKO,
    grain: N.RIKYUCHA.hex,
    dark: false,
    inks: [N.TAIKOH, N.HAIZAKURA, N.KOKE, N.RIKYUCHA, N.KUCHIBA, N.SUMI],
  },
  {
    name: '夜園',
    paper: N.TETSUKON,
    grain: N.FUJI.hex,
    dark: true,
    inks: [N.KAMENOZOKI, N.ASAGI, N.FUJI, N.NANOHANA, N.SHIRONERI],
  },
  {
    name: '花宴',
    paper: N.GOFUN,
    grain: N.HAIZAKURA.hex,
    dark: false,
    inks: [N.KARAKURENAI, N.TSUTSUJI, N.YAMABUKI, N.WAKATAKE, N.MURASAKI],
  },
];

export type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) throw new Error(`不是 #RRGGBB 色碼：${hex}`);
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(c: RGB, a: number): string {
  return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a))})`;
}

/** 線性混色，t=0 是 a、t=1 是 b。 */
export function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}
