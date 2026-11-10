import type { RGB } from '../color/nippon';
import type { LeafSprite } from './leaves';
import type { PenSample } from './pen';

/** 筆刷作畫時拿得到的東西。座標都是 CSS 像素（p5 已處理 pixelDensity 的縮放）。 */
export type BrushEnv = {
  ctx: CanvasRenderingContext2D;
  color: RGB;
  /** 同一組色盤的其他顏色（落英會偶爾混進來） */
  inks: RGB[];
  /** 深色底：疊色用 screen，淺色底用 multiply */
  dark: boolean;
  /** 0..1 的雜訊（p5.noise） */
  noise: (x: number, y?: number, z?: number) => number;
  leaves: LeafSprite[];
  /** 筆尖面板上的基本筆寬（px），給不吃速度的筆用 */
  size: number;
};

export type ParamSpec = { label: string; min: number; max: number; step: number };

export interface Brush {
  id: string;
  /** 顯示用的名字（假掰版） */
  name: string;
  /** 一句話說明 */
  note: string;
  /** 可在面板上調的參數（值） */
  params: Record<string, number>;
  /** 每個參數的範圍與中文標籤 */
  specs: Record<string, ParamSpec>;
  /**
   * 有值時：整筆先不透明地畫在暫存層，放開後才以這個透明度疊上畫布，
   * 這樣同一筆自己重疊的地方不會變深（麥克筆需要）。
   */
  buffered?: { alpha: number };
  /** false：放開就結束，不做收筆漸細 */
  taper: boolean;
  begin(env: BrushEnv, s: PenSample): void;
  /** 每幀一次，畫 a→b 這一小段 */
  segment(env: BrushEnv, a: PenSample, b: PenSample): void;
}

/** 線性內插兩個筆尖狀態。 */
export function lerpSample(a: PenSample, b: PenSample, t: number): PenSample {
  const l = (u: number, v: number) => u + (v - u) * t;
  return {
    x: l(a.x, b.x),
    y: l(a.y, b.y),
    vx: l(a.vx, b.vx),
    vy: l(a.vy, b.vy),
    speed: l(a.speed, b.speed),
    pressure: l(a.pressure, b.pressure),
    width: l(a.width, b.width),
    dist: l(a.dist, b.dist),
    frame: b.frame,
    lifting: b.lifting,
  };
}

/** 單位方向向量；長度太短時沿用 fallback。 */
export function direction(a: PenSample, b: PenSample, fallback = { x: 1, y: 0 }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return fallback;
  return { x: dx / len, y: dy / len };
}
