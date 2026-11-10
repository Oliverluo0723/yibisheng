import {
  add,
  cross,
  len,
  norm,
  perpendicular,
  rotate,
  scale,
  sub,
  type V3,
  v3,
} from './branching3d';

/**
 * 草、曼珠沙華、紫羅蘭的「配置」：沿著畫的那一筆，決定每根草 / 每支花莖 / 每朵花
 * 放在哪、朝哪、多大、什麼時候長出來或打開。只算資料，不畫；世界座標 y 朝上。
 */

const UP = v3(0, 1, 0);
const GOLDEN = (137.5 * Math.PI) / 180;

export type Along = { p: V3; t: V3; u: number };

/** 折線總長 */
export function polylineLength(pts: V3[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += len(sub(pts[i] as V3, pts[i - 1] as V3));
  return L;
}

/** 在折線上取第 u（0..1，依長度）處的位置與切線 */
export function pointAt(pts: V3[], u: number): Along {
  const first = pts[0] ?? v3(0, 0, 0);
  if (pts.length < 2) return { p: first, t: v3(1, 0, 0), u: 0 };
  const total = polylineLength(pts);
  let target = Math.max(0, Math.min(1, u)) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1] as V3;
    const b = pts[i] as V3;
    const seg = len(sub(b, a));
    if (target <= seg || i === pts.length - 1) {
      const k = seg > 0 ? Math.min(1, target / seg) : 0;
      return { p: add(a, scale(sub(b, a), k)), t: norm(sub(b, a), v3(1, 0, 0)), u };
    }
    target -= seg;
  }
  return { p: pts[pts.length - 1] as V3, t: v3(1, 0, 0), u: 1 };
}

/** 稍微偏離正上方的方向（tilt 弧度以內，方位隨機） */
function leanUp(rng: () => number, tilt: number): V3 {
  const az = rng() * Math.PI * 2;
  const el = rng() * tilt;
  return norm(v3(Math.cos(az) * Math.sin(el), Math.cos(el), Math.sin(az) * Math.sin(el)));
}

// ---------- 草 ----------
export type GrassBlade = {
  base: V3;
  /** 草葉的主軸方向 */
  axis: V3;
  /** 草葉往哪邊彎（繞主軸的角度） */
  yaw: number;
  height: number;
  width: number;
  /** 搖晃的相位 */
  phase: number;
  /** 幾 ms 後開始冒出來 */
  delay: number;
  /** 0..1，挑綠色用 */
  hue: number;
};

export type GrassParams = { density: number; height: number };

export function planGrass(stroke: V3[], p: GrassParams, rng: () => number): GrassBlade[] {
  const L = polylineLength(stroke);
  const n = Math.max(6, Math.min(500, Math.round(L * 140 * p.density)));
  const blades: GrassBlade[] = [];
  for (let i = 0; i < n; i++) {
    const u = rng();
    const at = pointAt(stroke, u);
    // 草根在線的兩側散開一點
    const side = perpendicular(at.t);
    const base = add(
      at.p,
      add(scale(side, (rng() - 0.5) * 0.06), scale(at.t, (rng() - 0.5) * 0.02)),
    );
    blades.push({
      base,
      axis: leanUp(rng, 0.45),
      yaw: rng() * Math.PI * 2,
      height: (0.12 + rng() ** 1.5 * 0.45) * p.height,
      width: 0.008 + rng() * 0.01,
      phase: rng() * Math.PI * 2,
      // 依畫的順序一路冒出來
      delay: u * 900 + rng() * 500,
      hue: rng(),
    });
  }
  return blades;
}

// ---------- 曼珠沙華 ----------
export type LilyFloret = { dir: V3; delay: number; size: number };
export type LilyStalk = {
  base: V3;
  axis: V3;
  height: number;
  /** 花莖開始長的時間 */
  delay: number;
  /** 花莖長到頂要多久 */
  growMs: number;
  florets: LilyFloret[];
};

export type FlowerParams = { density: number; height: number };

export function planLily(stroke: V3[], p: FlowerParams, rng: () => number): LilyStalk[] {
  const L = polylineLength(stroke);
  const n = Math.max(1, Math.min(14, Math.round((L / 0.2) * p.density)));
  const stalks: LilyStalk[] = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : (i + (rng() - 0.5) * 0.6) / (n - 1);
    const at = pointAt(stroke, Math.max(0, Math.min(1, u)));
    const axis = leanUp(rng, 0.12);
    const height = (0.55 + rng() * 0.5) * p.height;
    const delay = Math.max(0, u) * 700 + rng() * 300;
    const growMs = 1500 + rng() * 700;
    const count = 5 + Math.floor(rng() * 3);
    const spin = rng() * Math.PI * 2;
    const ref = perpendicular(axis);
    const florets: LilyFloret[] = [];
    for (let k = 0; k < count; k++) {
      const az = spin + (k / count) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const radial = rotate(ref, axis, az);
      // 花朝外、略微朝上
      const el = 0.1 + rng() * 0.35;
      florets.push({
        dir: norm(add(scale(radial, Math.cos(el)), scale(axis, Math.sin(el)))),
        delay: delay + growMs + k * 140 + rng() * 200,
        size: 0.85 + rng() * 0.3,
      });
    }
    stalks.push({ base: at.p, axis, height, delay, growMs, florets });
  }
  return stalks;
}

// ---------- 紫羅蘭 ----------
export type StockLeaf = { t: number; dir: V3; size: number };
export type StockFlower = { t: number; dir: V3; delay: number; size: number; bud: boolean };
export type StockStalk = {
  base: V3;
  axis: V3;
  height: number;
  delay: number;
  growMs: number;
  /** 0..1，挑紫色用 */
  hue: number;
  leaves: StockLeaf[];
  flowers: StockFlower[];
};

export function planStock(stroke: V3[], p: FlowerParams, rng: () => number): StockStalk[] {
  const L = polylineLength(stroke);
  const n = Math.max(1, Math.min(12, Math.round((L / 0.25) * p.density)));
  const stalks: StockStalk[] = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : (i + (rng() - 0.5) * 0.6) / (n - 1);
    const at = pointAt(stroke, Math.max(0, Math.min(1, u)));
    const axis = leanUp(rng, 0.15);
    const height = (0.45 + rng() * 0.4) * p.height;
    const delay = Math.max(0, u) * 600 + rng() * 300;
    const growMs = 1400 + rng() * 600;
    const ref = perpendicular(axis);
    let roll = rng() * Math.PI * 2;
    const leaves: StockLeaf[] = [];
    const nLeaves = 6 + Math.floor(rng() * 4);
    for (let k = 0; k < nLeaves; k++) {
      roll += GOLDEN;
      const radial = rotate(ref, axis, roll);
      const t = 0.04 + (k / nLeaves) * 0.42;
      leaves.push({
        t,
        dir: norm(add(scale(radial, 0.75), scale(axis, 0.65))),
        size: (1 - t) * (0.8 + rng() * 0.4),
      });
    }
    const flowers: StockFlower[] = [];
    const nFlowers = 10 + Math.floor(rng() * 7);
    for (let k = 0; k < nFlowers; k++) {
      roll += GOLDEN;
      const radial = rotate(ref, axis, roll);
      const t = 0.5 + (k / nFlowers) * 0.5;
      const bud = k >= nFlowers - 3;
      flowers.push({
        t,
        dir: norm(add(scale(radial, 0.85), scale(axis, 0.5))),
        // 由下往上依序開
        delay: delay + growMs + k * 170 + rng() * 120,
        size: 0.85 + rng() * 0.3 - (bud ? 0.3 : 0),
        bud,
      });
    }
    stalks.push({ base: at.p, axis, height, delay, growMs, hue: rng(), leaves, flowers });
  }
  return stalks;
}

// ---------- 丁香 ----------
export type LilacLeaf = { t: number; dir: V3; size: number };
/** 圓錐花序裡的一朵小花：h 是在花序軸上的高度（0 底、1 頂），r 是離軸的距離（0..1，越高越窄） */
export type LilacFloret = { h: number; r: number; dir: V3; delay: number; size: number };
export type LilacStalk = {
  base: V3;
  axis: V3;
  height: number;
  delay: number;
  growMs: number;
  hue: number;
  /** 心形葉，成對（相鄰兩片同高、方向相反） */
  leaves: LilacLeaf[];
  /** 花序長度（相對 height） */
  paniclLen: number;
  florets: LilacFloret[];
};

/**
 * 丁香：木質的直枝，下半段對生的心形葉，頂端一串圓錐花序，幾十朵小花由下往上開。
 */
export function planLilac(stroke: V3[], p: FlowerParams, rng: () => number): LilacStalk[] {
  const L = polylineLength(stroke);
  const n = Math.max(1, Math.min(8, Math.round((L / 0.3) * p.density)));
  const stalks: LilacStalk[] = [];
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : (i + (rng() - 0.5) * 0.5) / (n - 1);
    const at = pointAt(stroke, Math.max(0, Math.min(1, u)));
    const axis = leanUp(rng, 0.12);
    const height = (0.5 + rng() * 0.35) * p.height;
    const delay = Math.max(0, u) * 500 + rng() * 300;
    const growMs = 1600 + rng() * 600;
    const ref = perpendicular(axis);
    let roll = rng() * Math.PI * 2;
    const leaves: LilacLeaf[] = [];
    const pairs = 3 + Math.floor(rng() * 2);
    for (let k = 0; k < pairs; k++) {
      roll += Math.PI / 2 + (rng() - 0.5) * 0.4;
      const t = 0.12 + (k / pairs) * 0.5;
      const size = 0.9 + rng() * 0.3;
      for (const side of [0, Math.PI]) {
        const radial = rotate(ref, axis, roll + side);
        leaves.push({ t, dir: norm(add(scale(radial, 0.8), scale(axis, 0.45))), size });
      }
    }
    const paniclLen = 0.3 + rng() * 0.12;
    const florets: LilacFloret[] = [];
    const nF = 40 + Math.floor(rng() * 41);
    for (let k = 0; k < nF; k++) {
      roll += GOLDEN;
      const h = Math.min(1, (k + rng() * 0.8) / nF);
      // 圓錐：底寬頂窄，再加一點亂度
      const r = (1 - h) * (0.55 + rng() * 0.45);
      const radial = rotate(ref, axis, roll);
      florets.push({
        h,
        r,
        dir: norm(add(scale(radial, 0.9), scale(axis, 0.35 + h * 0.5))),
        // 由下往上開，每朵之間有點抖
        delay: delay + growMs + h * 2600 + rng() * 350,
        size: 0.8 + rng() * 0.4,
      });
    }
    stalks.push({
      base: at.p,
      axis,
      height,
      delay,
      growMs,
      hue: rng(),
      leaves,
      paniclLen,
      florets,
    });
  }
  return stalks;
}

/** 給一個「往前」的方向，算出一組正交基底（x 側、y 前、z 上），畫花時用 */
export function frameFor(forward: V3, upHint: V3 = UP): { x: V3; y: V3; z: V3 } {
  const y = norm(forward);
  let z = sub(upHint, scale(y, y.x * upHint.x + y.y * upHint.y + y.z * upHint.z));
  if (len(z) < 1e-4) z = perpendicular(y);
  z = norm(z);
  const x = norm(cross(y, z));
  return { x, y, z };
}
