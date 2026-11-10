import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  add,
  type Growth3DEvent,
  norm,
  rotate,
  scale,
  type V3,
} from '../../src/growth/branching3d';
import {
  frameFor,
  type GrassBlade,
  type LilyStalk,
  type StockStalk,
} from '../../src/growth/species3d';

/**
 * 草、曼珠沙華、紫羅蘭在場景裡的樣子。全部用 InstancedMesh（同一種零件一次畫完），
 * 每幀依時間算每個零件的大小、開合角度。花瓣與花絲的形狀都用程式產生。
 */
export interface Grower {
  readonly group: THREE.Group;
  /** 這一株還在長或還在動（草會一直隨風晃） */
  readonly alive: boolean;
  step(nowMs: number): Growth3DEvent[];
  dispose(): void;
}

const Y = new THREE.Vector3(0, 1, 0);
const ease = (k: number) => 1 - (1 - Math.max(0, Math.min(1, k))) ** 3;
const vec = (p: V3) => new THREE.Vector3(p.x, p.y, p.z);
const basis = (x: V3, y: V3, z: V3) => new THREE.Matrix4().makeBasis(vec(x), vec(y), vec(z));

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// ---------- 共用幾何 ----------
const CYL = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0);
const SPHERE = new THREE.SphereGeometry(1, 8, 6);

/** 一條沿 +Y 的帶子：寬度 width(t)，往 -Z 彎 curl(t)，給草葉和花瓣用 */
function ribbon(
  segments: number,
  width: (t: number) => number,
  bendZ: (t: number) => number,
  wave = 0,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const w = width(t) * (1 + wave * Math.sin(t * 28));
    const z = bendZ(t);
    pos.push(-w / 2, t, z, w / 2, t, z);
    uv.push(0, t, 1, t);
    if (i < segments) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** 草葉：底寬、尖端收細、往前彎 */
const BLADE = ribbon(
  8,
  (t) => (1 - t) ** 0.7,
  (t) => -0.35 * t * t,
);
/** 曼珠沙華花瓣：細長、邊緣起伏、尖端往後捲 */
const LILY_PETAL = ribbon(
  12,
  (t) => 0.16 * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.6,
  (t) => -0.55 * t ** 2.2,
  0.18,
);
/** 紫羅蘭花瓣：基部窄（爪）、前端圓、微微凹成杯狀 */
const STOCK_PETAL = ribbon(
  10,
  (t) => 0.95 * Math.sin(Math.PI * (0.15 + 0.85 * t)) ** 0.8 * Math.min(1, 0.35 + t * 1.6),
  (t) => 0.18 * t * t,
);
/** 紫羅蘭的葉：披針形 */
const LANCE = ribbon(
  10,
  (t) => 0.22 * Math.sin(Math.PI * t) ** 0.9,
  (t) => -0.12 * t * t,
);
/** 花絲：往前伸再往上翹的細管 */
const STAMEN = (() => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.35, 0.03),
    new THREE.Vector3(0, 0.7, 0.2),
    new THREE.Vector3(0, 0.95, 0.5),
  ]);
  return new THREE.TubeGeometry(curve, 16, 0.006, 4, false);
})();
const ANTHER = new THREE.SphereGeometry(1, 6, 4).scale(0.025, 0.012, 0.012).translate(0, 0.95, 0.5);
const STAMEN_FULL = mergeGeometries([STAMEN, ANTHER]) ?? STAMEN;

/** 花瓣貼圖：基部深、尖端淺、中間一條淡淡的中肋與細紋 */
function petalTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const grad = g.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, '#9a9a9a');
  grad.addColorStop(0.5, '#ececec');
  grad.addColorStop(1, '#ffffff');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(32, 256);
  g.lineTo(32, 10);
  g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.06)';
  g.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const x = 6 + i * 4 + Math.random() * 2;
    g.beginPath();
    g.moveTo(32 + (x - 32) * 0.2, 256);
    g.quadraticCurveTo(x, 140, x + (Math.random() - 0.5) * 6, 0);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const PETAL_TEX = petalTexture();

const matPlain = (rough = 0.8) =>
  new THREE.MeshStandardMaterial({ roughness: rough, side: THREE.DoubleSide });
const matPetal = () =>
  new THREE.MeshStandardMaterial({ map: PETAL_TEX, roughness: 0.55, side: THREE.DoubleSide });

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, count: number) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
  // InstancedMesh 預設每格都是單位矩陣（會在世界中心畫出一個原尺寸的零件），先全部縮成零
  for (let i = 0; i < m.instanceMatrix.count; i++) m.setMatrixAt(i, ZERO);
  m.count = 0;
  m.castShadow = true;
  m.receiveShadow = true;
  m.frustumCulled = false;
  return m;
}

/** 從 a 長到 b 的圓柱矩陣 */
function cylinderMatrix(a: THREE.Vector3, b: THREE.Vector3, r: number, out: THREE.Matrix4) {
  const dir = b.clone().sub(a);
  const L = dir.length();
  if (L < 1e-6) return out.makeScale(0, 0, 0).setPosition(a);
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize());
  return out.compose(a, q, new THREE.Vector3(r, L, r));
}

// ---------- 草 ----------
export const GRASS_GREENS = ['#5DAC81', '#7BA23F', '#838A2D', '#42602D', '#90B44B', '#A8D8B9'];

export class GrassView implements Grower {
  readonly group = new THREE.Group();
  private readonly mesh: THREE.InstancedMesh;
  private readonly m = new THREE.Matrix4();
  private readonly start: number;
  private spawned = 0;

  constructor(
    private readonly blades: GrassBlade[],
    nowMs: number,
    tint?: THREE.Color,
  ) {
    this.start = nowMs;
    this.mesh = instanced(BLADE, matPlain(0.75), blades.length);
    this.mesh.count = blades.length;
    blades.forEach((b, i) => {
      const c = new THREE.Color(GRASS_GREENS[Math.floor(b.hue * GRASS_GREENS.length)] ?? '#5DAC81');
      if (tint) c.lerp(tint, 0.55);
      c.offsetHSL(0, 0, (b.hue - 0.5) * 0.08);
      this.mesh.setColorAt(i, c);
      this.mesh.setMatrixAt(i, ZERO);
    });
    this.group.add(this.mesh);
  }

  get alive(): boolean {
    return true;
  }

  step(nowMs: number): Growth3DEvent[] {
    const t = nowMs - this.start;
    const events: Growth3DEvent[] = [];
    const time = nowMs / 1000;
    const q = new THREE.Quaternion();
    const qYaw = new THREE.Quaternion();
    const qSway = new THREE.Quaternion();
    const axisX = new THREE.Vector3(1, 0, 0);
    this.blades.forEach((b, i) => {
      const k = ease((t - b.delay) / 900);
      if (k <= 0) {
        this.mesh.setMatrixAt(i, ZERO);
        return;
      }
      if (i >= this.spawned && k > 0) {
        this.spawned = i + 1;
        if (i % 25 === 0) events.push({ kind: 'leaf', at: b.base, depth: 2, age: t });
      }
      qYaw.setFromAxisAngle(Y, b.yaw);
      q.setFromUnitVectors(Y, vec(b.axis));
      const sway =
        Math.sin(time * 1.4 + b.phase) * 0.08 + Math.sin(time * 0.6 + b.phase * 2) * 0.05;
      qSway.setFromAxisAngle(axisX, sway);
      q.multiply(qYaw).multiply(qSway);
      this.m.compose(vec(b.base), q, new THREE.Vector3(b.width, b.height * k, b.height * k));
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    return events;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.mesh.dispose();
  }
}

// ---------- 曼珠沙華 ----------
export const LILY_RED = '#C8102E';

export class LilyView implements Grower {
  readonly group = new THREE.Group();
  private readonly stems: THREE.InstancedMesh;
  private readonly petals: THREE.InstancedMesh;
  private readonly stamens: THREE.InstancedMesh;
  private readonly m = new THREE.Matrix4();
  private readonly start: number;
  private readonly opened = new Set<string>();
  private done = false;
  private readonly endAt: number;

  constructor(
    private readonly stalks: LilyStalk[],
    nowMs: number,
    color: THREE.Color,
  ) {
    this.start = nowMs;
    const nFlorets = stalks.reduce((s, x) => s + x.florets.length, 0);
    this.stems = instanced(CYL, matPlain(0.7), stalks.length + nFlorets);
    this.petals = instanced(LILY_PETAL, matPetal(), nFlorets * 6);
    this.stamens = instanced(STAMEN_FULL, matPlain(0.5), nFlorets * 6);
    const stemColor = new THREE.Color('#4F6B3A');
    for (let i = 0; i < this.stems.instanceMatrix.count; i++) this.stems.setColorAt(i, stemColor);
    for (let i = 0; i < nFlorets * 6; i++) {
      const c = color
        .clone()
        .offsetHSL((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.06);
      this.petals.setColorAt(i, c);
      this.stamens.setColorAt(i, color.clone().offsetHSL(0, 0, -0.05));
    }
    this.stems.count = this.stems.instanceMatrix.count;
    this.petals.count = nFlorets * 6;
    this.stamens.count = nFlorets * 6;
    this.endAt = Math.max(...stalks.flatMap((s) => s.florets.map((f) => f.delay))) + 2000;
    this.group.add(this.stems, this.petals, this.stamens);
  }

  get alive(): boolean {
    return !this.done;
  }

  step(nowMs: number): Growth3DEvent[] {
    if (this.done) return [];
    const t = nowMs - this.start;
    const events: Growth3DEvent[] = [];
    let si = this.stalks.length;
    let pi = 0;
    this.stalks.forEach((s, i) => {
      const g = ease((t - s.delay) / s.growMs);
      const base = vec(s.base);
      const top = base.clone().add(vec(s.axis).multiplyScalar(s.height * g));
      this.stems.setMatrixAt(i, g > 0 ? cylinderMatrix(base, top, 0.006, this.m) : ZERO);
      for (const [fi, f] of s.florets.entries()) {
        const open = ease((t - f.delay) / 1400);
        const bud = g >= 1 ? ease((t - (s.delay + s.growMs)) / 500) : 0;
        const key = `${i}-${fi}`;
        if (open > 0.05 && !this.opened.has(key)) {
          this.opened.add(key);
          events.push({ kind: 'branch', at: s.base, depth: 1, age: t });
        }
        // 小花梗
        const L = 0.09 * f.size;
        const center = top.clone().add(vec(f.dir).multiplyScalar(0.05 * bud));
        this.stems.setMatrixAt(si++, bud > 0 ? cylinderMatrix(top, center, 0.003, this.m) : ZERO);
        const fr = frameFor(f.dir, s.axis);
        const forward = fr.y;
        for (let k = 0; k < 6; k++) {
          const radial = rotate(fr.z, forward, (k / 6) * Math.PI * 2);
          // 花瓣從「往前合起來」打開到「往後翻」
          const th = (0.15 + open * 1.75) * 1;
          const yv = norm(add(scale(forward, Math.cos(th)), scale(radial, Math.sin(th))));
          const zv = norm(add(scale(forward, Math.sin(th)), scale(radial, -Math.cos(th))));
          const xv = norm({
            x: yv.y * zv.z - yv.z * zv.y,
            y: yv.z * zv.x - yv.x * zv.z,
            z: yv.x * zv.y - yv.y * zv.x,
          });
          const size = L * (0.35 + 0.65 * bud) * (0.9 + 0.1 * open);
          this.m
            .copy(basis(xv, yv, zv))
            .scale(new THREE.Vector3(size, size, size))
            .setPosition(center);
          this.petals.setMatrixAt(pi, bud > 0 ? this.m : ZERO);
          // 花絲：花開了才伸出來，往前再往上翹
          const sRadial = rotate(fr.z, forward, ((k + 0.5) / 6) * Math.PI * 2);
          // 花絲往前伸、往天空翹，六根稍微散開成扇形
          const sf = frameFor(norm(add(forward, scale(sRadial, 0.3))), s.axis);
          const ss = L * 2.1 * open;
          this.m
            .copy(basis(sf.x, sf.y, sf.z))
            .scale(new THREE.Vector3(ss, ss, ss))
            .setPosition(center);
          this.stamens.setMatrixAt(pi, open > 0.02 ? this.m : ZERO);
          pi++;
        }
      }
    });
    for (const mesh of [this.stems, this.petals, this.stamens])
      mesh.instanceMatrix.needsUpdate = true;
    if (t > this.endAt) this.done = true;
    return events;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.stems.dispose();
    this.petals.dispose();
    this.stamens.dispose();
  }
}

// ---------- 紫羅蘭 ----------
export const STOCK_PURPLES = ['#77428D', '#66327C', '#8B81C3', '#B481BB', '#6F3381'];

export class StockView implements Grower {
  readonly group = new THREE.Group();
  private readonly stems: THREE.InstancedMesh;
  private readonly leaves: THREE.InstancedMesh;
  private readonly petals: THREE.InstancedMesh;
  private readonly buds: THREE.InstancedMesh;
  private readonly m = new THREE.Matrix4();
  private readonly start: number;
  private readonly opened = new Set<string>();
  private done = false;
  private readonly endAt: number;

  constructor(
    private readonly stalks: StockStalk[],
    nowMs: number,
    tint?: THREE.Color,
  ) {
    this.start = nowMs;
    const nLeaves = stalks.reduce((s, x) => s + x.leaves.length, 0);
    const nFlowers = stalks.reduce((s, x) => s + x.flowers.length, 0);
    this.stems = instanced(CYL, matPlain(0.75), stalks.length);
    this.leaves = instanced(LANCE, matPlain(0.8), nLeaves);
    this.petals = instanced(STOCK_PETAL, matPetal(), nFlowers * 4);
    this.buds = instanced(SPHERE, matPlain(0.6), nFlowers);
    const stem = new THREE.Color('#5B7046');
    const leaf = new THREE.Color('#7D8B6A');
    const budColor = new THREE.Color('#6E7E4A');
    for (let i = 0; i < stalks.length; i++) this.stems.setColorAt(i, stem);
    for (let i = 0; i < nLeaves; i++)
      this.leaves.setColorAt(i, leaf.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.06));
    let pi = 0;
    let bi = 0;
    for (const s of stalks) {
      const base =
        tint ??
        new THREE.Color(STOCK_PURPLES[Math.floor(s.hue * STOCK_PURPLES.length)] ?? '#77428D');
      for (const f of s.flowers) {
        const c = base.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
        for (let k = 0; k < 4; k++) this.petals.setColorAt(pi++, c);
        this.buds.setColorAt(bi++, f.bud ? budColor.clone().lerp(base, 0.35) : budColor);
      }
    }
    this.stems.count = stalks.length;
    this.leaves.count = nLeaves;
    this.petals.count = nFlowers * 4;
    this.buds.count = nFlowers;
    this.endAt = Math.max(...stalks.flatMap((s) => s.flowers.map((f) => f.delay))) + 2000;
    this.group.add(this.stems, this.leaves, this.petals, this.buds);
  }

  get alive(): boolean {
    return !this.done;
  }

  step(nowMs: number): Growth3DEvent[] {
    if (this.done) return [];
    const t = nowMs - this.start;
    const events: Growth3DEvent[] = [];
    let li = 0;
    let pi = 0;
    let bi = 0;
    this.stalks.forEach((s, i) => {
      const g = ease((t - s.delay) / s.growMs);
      const base = vec(s.base);
      const axis = vec(s.axis);
      const at = (u: number) => base.clone().add(axis.clone().multiplyScalar(s.height * u));
      this.stems.setMatrixAt(i, g > 0 ? cylinderMatrix(base, at(g), 0.0055, this.m) : ZERO);
      for (const l of s.leaves) {
        // 莖長過葉子的高度，葉子才展開
        const k = ease((g - l.t) / 0.25);
        if (k <= 0) {
          this.leaves.setMatrixAt(li++, ZERO);
          continue;
        }
        const fr = frameFor(l.dir, s.axis);
        const size = 0.17 * l.size * k;
        this.m
          .copy(basis(fr.x, fr.y, fr.z))
          .scale(new THREE.Vector3(size, size, size))
          .setPosition(at(l.t));
        this.leaves.setMatrixAt(li++, this.m);
      }
      for (const [fi, f] of s.flowers.entries()) {
        const appear = ease((g - f.t) / 0.15);
        const open = f.bud ? 0 : ease((t - f.delay) / 900);
        const key = `${i}-${fi}`;
        if (open > 0.05 && !this.opened.has(key)) {
          this.opened.add(key);
          events.push({ kind: 'leaf', at: s.base, depth: 2, age: t });
        }
        const center = at(f.t).add(vec(f.dir).multiplyScalar(0.018));
        const size = 0.042 * f.size;
        // 花苞：還沒開時看得到，開了就縮小藏在花心
        const bs = size * 0.32 * appear * (1 - open * 0.7);
        this.buds.setMatrixAt(
          bi++,
          appear > 0 ? this.m.makeScale(bs, bs * 1.4, bs).setPosition(center) : ZERO,
        );
        const fr = frameFor(f.dir, s.axis);
        const forward = fr.y;
        for (let k = 0; k < 4; k++) {
          const radial = rotate(fr.z, forward, (k / 4) * Math.PI * 2 + Math.PI / 4);
          // 十字形四瓣：從合起來（朝前）打開到幾乎攤平
          const th = 0.2 + open * 1.25;
          const yv = norm(add(scale(forward, Math.cos(th)), scale(radial, Math.sin(th))));
          const zv = norm(add(scale(forward, Math.sin(th)), scale(radial, -Math.cos(th))));
          const xv = norm({
            x: yv.y * zv.z - yv.z * zv.y,
            y: yv.z * zv.x - yv.x * zv.z,
            z: yv.x * zv.y - yv.y * zv.x,
          });
          const ps = size * open;
          this.m
            .copy(basis(xv, yv, zv))
            .scale(new THREE.Vector3(ps, ps, ps))
            .setPosition(center);
          this.petals.setMatrixAt(pi++, open > 0.01 ? this.m : ZERO);
        }
      }
    });
    for (const mesh of [this.stems, this.leaves, this.petals, this.buds])
      mesh.instanceMatrix.needsUpdate = true;
    if (t > this.endAt) this.done = true;
    return events;
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const mesh of [this.stems, this.leaves, this.petals, this.buds]) mesh.dispose();
  }
}
