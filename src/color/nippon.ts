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
  // 2026-11-10 第二批：紅、藍、綠、紫、黃、灰各補幾個，讓每張紙都有十幾色
  SUOH: c('蘇芳', 'SUOH', '#8E354A'),
  ENJI: c('臙脂', 'ENJI', '#9F353A'),
  KURENAI: c('紅', 'KURENAI', '#CB1B45'),
  BENIHI: c('紅緋', 'BENIHI', '#F75C2F'),
  MOMO: c('桃', 'MOMO', '#F596AA'),
  NADESHIKO: c('撫子', 'NADESHIKO', '#DC9FB4'),
  UKON: c('鬱金', 'UKON', '#EFBB24'),
  KIHADA: c('黄檗', 'KIHADA', '#FBE251'),
  MOEGI: c('萌黄', 'MOEGI', '#7BA23F'),
  MATSUBA: c('松葉', 'MATSUBA', '#42602D'),
  TOKIWA: c('常磐', 'TOKIWA', '#1B813E'),
  SORA: c('空', 'SORA', '#58B2DC'),
  TSUYUKUSA: c('露草', 'TSUYUKUSA', '#2EA9DF'),
  GUNJYO: c('群青', 'GUNJYO', '#51A8DD'),
  RURI: c('瑠璃', 'RURI', '#005CAF'),
  HANADA: c('縹', 'HANADA', '#006284'),
  AI: c('藍', 'AI', '#0D5661'),
  KON: c('紺', 'KON', '#0F2540'),
  KIKYO: c('桔梗', 'KIKYO', '#6A4C9C'),
  AYAME: c('菖蒲', 'AYAME', '#6F3381'),
  EDOMURASAKI: c('江戸紫', 'EDOMURASAKI', '#77428D'),
  GINNEZUMI: c('銀鼠', 'GINNEZUMI', '#91989F'),
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
    inks: [
      N.TAIKOH,
      N.HAIZAKURA,
      N.SUOH,
      N.ENJI,
      N.KUCHIBA,
      N.UKON,
      N.KOKE,
      N.MATSUBA,
      N.RIKYUCHA,
      N.HANADA,
      N.AI,
      N.KIKYO,
      N.GINNEZUMI,
      N.SUMI,
    ],
  },
  {
    name: '夜園',
    paper: N.TETSUKON,
    grain: N.FUJI.hex,
    dark: true,
    inks: [
      N.SHIRONERI,
      N.MOMO,
      N.BENIHI,
      N.YAMABUKI,
      N.NANOHANA,
      N.MOEGI,
      N.WAKATAKE,
      N.KAMENOZOKI,
      N.SORA,
      N.TSUYUKUSA,
      N.ASAGI,
      N.FUJI,
      N.EDOMURASAKI,
      N.GINNEZUMI,
    ],
  },
  {
    name: '花宴',
    paper: N.GOFUN,
    grain: N.HAIZAKURA.hex,
    dark: false,
    inks: [
      N.NADESHIKO,
      N.TSUTSUJI,
      N.KARAKURENAI,
      N.BENIHI,
      N.YAMABUKI,
      N.KIHADA,
      N.WAKATAKE,
      N.TOKIWA,
      N.GUNJYO,
      N.RURI,
      N.KON,
      N.AYAME,
      N.MURASAKI,
      N.SUMI,
    ],
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
