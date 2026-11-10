import type { BackdropKind, BackdropParams } from '../../src/render/backdrop';

export const BG_PAPER = '紙';
/** 一開始就用這個背景 */
export const DEFAULT_BG = '飛燕草';
export const BG_USER = '我的檔案';

export type BgState = { choice: string; params: BackdropParams };

const dir = `${import.meta.env.BASE_URL}backgrounds`;

/** 範例背景，素材來源與授權見 public/backgrounds/README.md */
export const BG_SAMPLES: { name: string; kind: BackdropKind; src: string }[] = [
  { name: '飛燕草', kind: 'video', src: `${dir}/blue-flowers.webm` },
  { name: '碧冬茄', kind: 'video', src: `${dir}/petunia.webm` },
  { name: '高美・風紋', kind: 'video', src: `${dir}/gaomei-water.webm` },
  { name: '花塵', kind: 'image', src: `${dir}/petals-ground.jpg` },
  { name: '朝霧', kind: 'image', src: `${dir}/fog-forest.jpg` },
];
