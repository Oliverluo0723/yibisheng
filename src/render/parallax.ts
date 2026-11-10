/**
 * 2.5D 景深：好幾層平面疊在一起，鏡頭（滑鼠、緩慢漂移、呼吸）一動，
 * 近的層移得多、遠的層移得少，看起來就有前後。全部是純函式。
 */

export type DepthParams = {
  /** 層數（遠 0 … 近 layers−1） */
  layers: number;
  /** 視差強度：最近一層最多位移幾 px */
  shift: number;
  /** 鏡頭自己漂移的幅度 0..1 */
  drift: number;
  /** 呼吸：近的層放大縮小的幅度 0..0.1 */
  breath: number;
  /** 最遠一層模糊幾 px（越近越清楚） */
  farBlur: number;
  /** 最遠一層的不透明度（越近越實） */
  farAlpha: number;
  /** 最遠一層的飽和度 0..1 */
  farSaturate: number;
};

export const defaultDepthParams: DepthParams = {
  layers: 6,
  shift: 60,
  drift: 0.35,
  breath: 0.02,
  farBlur: 3,
  farAlpha: 0.55,
  farSaturate: 0.6,
};

/** 第 i 層的深度 0（最遠）..1（最近）。 */
export function layerDepth(i: number, layers: number): number {
  return layers <= 1 ? 1 : Math.max(0, Math.min(1, i / (layers - 1)));
}

export type Camera = { x: number; y: number; z: number };

/**
 * 鏡頭位置：滑鼠相對畫面中心（−1..1）加上緩慢漂移，z 是呼吸（−1..1）。
 * t 是秒。
 */
export function cameraAt(mx: number, my: number, t: number, p: DepthParams): Camera {
  const dx = Math.sin(t * 0.13) * 0.6 + Math.sin(t * 0.071 + 1.3) * 0.4;
  const dy = Math.sin(t * 0.097 + 0.7) * 0.6 + Math.sin(t * 0.053 + 2.1) * 0.4;
  return {
    x: clamp(mx, -1, 1) * (1 - p.drift * 0.5) + dx * p.drift,
    y: clamp(my, -1, 1) * (1 - p.drift * 0.5) + dy * p.drift,
    z: Math.sin(t * 0.21),
  };
}

/** 平滑追上目標（每幀呼叫，k 0..1 越大越快）。 */
export function easeCamera(cur: Camera, target: Camera, k: number): Camera {
  return {
    x: cur.x + (target.x - cur.x) * k,
    y: cur.y + (target.y - cur.y) * k,
    z: cur.z + (target.z - cur.z) * k,
  };
}

export type LayerTransform = { dx: number; dy: number; scale: number };

/**
 * 深度 d 的層在螢幕上的位移與縮放（以畫面中心縮放）。
 * 背景可以給負的深度（比最遠一層還遠，幾乎不動）。
 * 鏡頭往右看時，近的東西往左移得多 → 位移和鏡頭方向相反。
 */
export function layerTransform(d: number, cam: Camera, p: DepthParams): LayerTransform {
  const k = 0.15 + 0.85 * d;
  return {
    dx: -cam.x * p.shift * k,
    dy: -cam.y * p.shift * k,
    scale: 1 + cam.z * p.breath * d,
  };
}

/** 層座標 → 螢幕座標（w、h 是畫面大小）。 */
export function toScreen(x: number, y: number, t: LayerTransform, w: number, h: number) {
  return { x: w / 2 + (x - w / 2) * t.scale + t.dx, y: h / 2 + (y - h / 2) * t.scale + t.dy };
}

/** 螢幕座標 → 層座標（在某一層上畫畫時，把滑鼠換算回那一層）。 */
export function toLayer(x: number, y: number, t: LayerTransform, w: number, h: number) {
  return { x: w / 2 + (x - t.dx - w / 2) / t.scale, y: h / 2 + (y - t.dy - h / 2) / t.scale };
}

/** 深度 d 的層要用的濾鏡與透明度（越遠越模糊、越淡、越灰）。 */
export function layerLook(d: number, p: DepthParams) {
  const far = 1 - d;
  const blur = p.farBlur * far;
  const sat = 1 - (1 - p.farSaturate) * far;
  const filter =
    blur < 0.05 && sat > 0.999 ? 'none' : `blur(${blur.toFixed(2)}px) saturate(${sat.toFixed(3)})`;
  return { filter, alpha: 1 - (1 - p.farAlpha) * far };
}

/** 「自動」深度：從最遠開始，每一筆往前一層，到最前面再回到最遠。 */
export function nextAutoLayer(prev: number | undefined, layers: number): number {
  if (prev === undefined) return 0;
  return (prev + 1) % Math.max(1, layers);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
