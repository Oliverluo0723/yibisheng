import * as THREE from 'three';
import type { LeafSprite } from '../../src/brushes/leaves';
import {
  add,
  cross,
  type Leaf3D,
  norm,
  type Plant3D,
  perpendicular,
  rotate,
  scale,
  type V3,
} from '../../src/growth/branching3d';

export type LeafStyle = {
  /** 葉長（世界單位） */
  size: number;
  /** 葉子和枝條的夾角（度） */
  angle: number;
  /** 捲曲 0..1 */
  curl: number;
  /** 染上目前顏色的程度 0..1 */
  tint: number;
  /** 0 = 全部葉種，1..n = 只用第 n 種 */
  sets: number;
};

export const defaultLeafStyle: LeafStyle = {
  size: 0.13,
  angle: 50,
  curl: 0.35,
  tint: 0.2,
  sets: 0,
};

export type StemStyle = {
  /** 第 0 層枝條半徑（世界單位） */
  radius: number;
  /** 老了變細 0..1 */
  ageThin: number;
};

export const defaultStemStyle: StemStyle = { radius: 0.012, ageThin: 0.4 };

/** 葉片貼圖：先把葉柄轉到圖的正下方，之後葉片幾何只要「底部 = 葉柄」就好。 */
export type LeafTex = { texture: THREE.CanvasTexture; aspect: number; set: string };

export function makeLeafTextures(sprites: LeafSprite[]): LeafTex[] {
  return sprites.map((s) => {
    const phi = Math.PI / 2 - s.stemAngle;
    const swap = Math.abs(Math.sin(phi)) > 0.5;
    const w = swap ? s.canvas.height : s.canvas.width;
    const h = swap ? s.canvas.width : s.canvas.height;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.translate(w / 2, h / 2);
    g.rotate(phi);
    g.drawImage(s.canvas, -s.canvas.width / 2, -s.canvas.height / 2);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { texture, aspect: w / h, set: s.set };
  });
}

const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0);
const STEM_MATERIAL = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
const Y = new THREE.Vector3(0, 1, 0);

// ---------- 枯（草稿）----------
/** 葉子乾掉往這個褐色走、枝往灰褐走 */
const LEAF_DRY = new THREE.Color('#9a7342');
const STEM_DRY = new THREE.Color('#6e6258');
/** 乾燥分幾階（材質會依階快取，階數少一點） */
const DRY_STEPS = 6;
/** 斷枝落下的重力（世界單位 / s²），比真實慢一點像慢動作 */
const GRAVITY = 2.2;
/** 葉子飄落的終端速度（世界單位 / s） */
const LEAF_FALL = 0.32;
/** 0..1 的固定亂數（同一個 id 永遠同一個值），決定每片葉、每條枝什麼時候掉 */
const hash01 = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const randomHorizontal = () => {
  const a = Math.random() * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
};

const leafGeoCache = new Map<number, THREE.BufferGeometry>();
/** 葉片：底部在原點、往 +Y 長 1，沿長邊彎、兩側微微捲起 */
function leafGeometry(curl: number): THREE.BufferGeometry {
  const key = Math.round(curl * 100);
  const hit = leafGeoCache.get(key);
  if (hit) return hit;
  const geo = new THREE.PlaneGeometry(1, 1, 4, 8).translate(0, 0.5, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, curl * (0.35 * y * y + 0.5 * x * x));
  }
  geo.computeVertexNormals();
  leafGeoCache.set(key, geo);
  return geo;
}

const matCache = new Map<
  string,
  { mat: THREE.MeshStandardMaterial; depth: THREE.MeshDepthMaterial }
>();
function leafMaterial(tex: LeafTex, index: number, color: THREE.Color, tint: number, dry = 0) {
  const tinted = new THREE.Color(1, 1, 1).lerp(color, tint).lerp(LEAF_DRY, (dry / DRY_STEPS) * 0.9);
  const key = `${index}|${tinted.getHexString()}`;
  const hit = matCache.get(key);
  if (hit) return hit;
  const mat = new THREE.MeshStandardMaterial({
    map: tex.texture,
    color: tinted,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.7,
  });
  // 影子也要照葉形挖空，不然會投出方形的影子
  const depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: tex.texture,
    alphaTest: 0.5,
  });
  const entry = { mat, depth };
  matCache.set(key, entry);
  return entry;
}

const v = (p: V3) => new THREE.Vector3(p.x, p.y, p.z);

type LeafState = {
  mesh: THREE.Mesh;
  born: number;
  full: THREE.Vector3;
  tex: LeafTex;
  /** 長在枝上時的位置與朝向（拉回去時復原用） */
  home: { pos: THREE.Vector3; quat: THREE.Quaternion };
  /** 枯到幾成時脫離枝條 */
  detachAt: number;
  phase: 'on' | 'fall' | 'down';
  vel: THREE.Vector3;
  /** 翻轉：軸 × 角速度 */
  spin: THREE.Vector3;
  sway: number;
  /** 目前材質的乾燥階 0..DRY_STEPS */
  dry: number;
};

/** 植物長出來的一段枝（原始座標，掉下來時用它們算新位置） */
type PlantSeg = { a: V3; b: V3; radius: number; index: number };

/** 同一支芽長出來的所有段 = 一條枝，斷的時候整條一起 */
type Chain = {
  tip: number;
  segs: PlantSeg[];
  /** 斷點（這支芽出生的位置） */
  base: THREE.Vector3;
  breakAt: number;
  phase: 'on' | 'fall' | 'down';
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  vel: THREE.Vector3;
  axis: THREE.Vector3;
  angVel: number;
  angle: number;
};

/**
 * 一株植物在場景裡的樣子：主莖 + 枝條（InstancedMesh 細圓柱）+ 一片片葉子。
 * 主莖在畫的時候就一段段加；放開後接上 Plant3D，之後每幀 sync()。
 */
export class PlantView {
  readonly group = new THREE.Group();
  private readonly stems: THREE.InstancedMesh;
  private readonly tipStems: THREE.InstancedMesh;
  private stemCount = 0;
  private segDone = 0;
  private leafDone = 0;
  private readonly leaves: LeafState[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  plant?: Plant3D;

  /** 枯 0..1（草稿：面板滑桿直接拉）。葉子先黃再落，細枝先斷，主幹留到最後 */
  wither = 0;
  /** 地面的 y，掉下來的東西停在這 */
  groundY = -1.25;
  private readonly segs: PlantSeg[] = [];
  private readonly chains = new Map<number, Chain>();
  private colorW = 0;
  private lastSync = 0;

  constructor(
    readonly color: THREE.Color,
    private readonly leafTex: LeafTex[],
    readonly leafStyle: LeafStyle,
    readonly stemStyle: StemStyle,
    capacity = 6000,
  ) {
    this.stems = new THREE.InstancedMesh(UNIT_CYLINDER, STEM_MATERIAL, capacity);
    this.stems.count = 0;
    this.stems.castShadow = true;
    this.stems.frustumCulled = false;
    this.tipStems = new THREE.InstancedMesh(UNIT_CYLINDER, STEM_MATERIAL, 400);
    this.tipStems.count = 0;
    this.tipStems.castShadow = true;
    this.tipStems.frustumCulled = false;
    this.group.add(this.stems, this.tipStems);
  }

  /** 加一段圓柱（a → b） */
  addStem(a: V3, b: V3, radius: number): void {
    if (this.stemCount >= (this.stems.instanceMatrix.count ?? 0)) return;
    this.setCylinder(this.stems, this.stemCount, a, b, radius);
    this.stems.setColorAt(this.stemCount, this.color);
    this.stemCount++;
    this.stems.count = this.stemCount;
    this.stems.instanceMatrix.needsUpdate = true;
    if (this.stems.instanceColor) this.stems.instanceColor.needsUpdate = true;
  }

  private setCylinder(mesh: THREE.InstancedMesh, i: number, a: V3, b: V3, radius: number) {
    const from = v(a);
    const dir = v(b).sub(from);
    const length = dir.length();
    if (length < 1e-6) {
      // 長度為零（芽剛長完一段）也一定要寫入矩陣：沒寫的那一格會是單位矩陣，
      // 等於在世界中心（螢幕正中間）畫一根半徑 1 的大圓柱，看起來就是一直閃
      this.m.makeScale(0, 0, 0).setPosition(from);
      mesh.setMatrixAt(i, this.m);
      return;
    }
    this.q.setFromUnitVectors(Y, dir.normalize());
    this.m.compose(from, this.q, new THREE.Vector3(radius, length, radius));
    mesh.setMatrixAt(i, this.m);
  }

  private radiusFor(depth: number): number {
    const p = this.plant;
    const age = p ? Math.min(1, p.age / Math.max(1, p.params.life)) : 0;
    return Math.max(
      0.0015,
      this.stemStyle.radius * 0.72 ** (depth + 1) * (1 - this.stemStyle.ageThin * age),
    );
  }

  /** 每幀：把植物新長的枝和葉加進場景，葉子從 0 慢慢展開；再走一步「枯」 */
  sync(nowMs: number): void {
    const dt = this.lastSync ? Math.min(0.1, (nowMs - this.lastSync) / 1000) : 0;
    this.lastSync = nowMs;
    const p = this.plant;
    if (p) {
      for (; this.segDone < p.segments.length; this.segDone++) {
        const s = p.segments[this.segDone];
        if (!s) continue;
        const radius = this.radiusFor(s.depth);
        const index = this.stemCount;
        this.addStem(s.a, s.b, radius);
        if (this.stemCount === index) continue;
        const seg: PlantSeg = { a: s.a, b: s.b, radius, index };
        this.segs.push(seg);
        this.chain(s.tip, s.depth, s.a).segs.push(seg);
      }
      for (; this.leafDone < p.leaves.length; this.leafDone++) {
        const leaf = p.leaves[this.leafDone];
        if (leaf) this.addLeaf(leaf, nowMs);
      }
      const tips = p.liveTips;
      let n = 0;
      for (const t of tips) {
        if (n >= 400) break;
        this.setCylinder(this.tipStems, n, t.node, t.pos, this.radiusFor(t.depth));
        this.tipStems.setColorAt(n, this.color);
        n++;
      }
      this.tipStems.count = n;
      this.tipStems.instanceMatrix.needsUpdate = true;
      if (this.tipStems.instanceColor) this.tipStems.instanceColor.needsUpdate = true;
    }
    for (const l of this.leaves) {
      const k = Math.min(1, (nowMs - l.born) / 600);
      if (k >= 1 && l.mesh.scale.equals(l.full)) continue;
      const e = 1 - (1 - k) ** 3;
      l.mesh.scale.copy(l.full).multiplyScalar(Math.max(0.001, e));
    }
    this.stepWither(dt, nowMs);
  }

  /** 同一支芽的段和葉算一條枝；第一次看到這支芽時決定它在枯到幾成時斷 */
  private chain(tip: number, depth: number, at: V3): Chain {
    const hit = this.chains.get(tip);
    if (hit) return hit;
    const maxDepth = Math.max(1, this.plant?.params.maxDepth ?? 3);
    // 越深（越細、越末梢）越早斷：最深 0.5 左右，第 0 層要拉到快滿才斷
    const breakAt = Math.min(0.98, 0.5 + 0.42 * (1 - depth / maxDepth) + hash01(tip + 0.5) * 0.08);
    const c: Chain = {
      tip,
      segs: [],
      base: v(at),
      breakAt,
      phase: 'on',
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      vel: new THREE.Vector3(),
      axis: randomHorizontal(),
      angVel: 0,
      angle: 0,
    };
    this.chains.set(tip, c);
    return c;
  }

  private stepWither(dt: number, nowMs: number): void {
    const w = this.wither;
    if (Math.abs(w - this.colorW) > 0.004) {
      this.colorW = w;
      const c = this.color.clone().lerp(STEM_DRY, 0.75 * w);
      for (const s of this.segs) this.stems.setColorAt(s.index, c);
      if (this.stems.instanceColor) this.stems.instanceColor.needsUpdate = true;
    }
    let moved = false;
    for (const c of this.chains.values()) {
      if (c.phase === 'on') {
        if (w >= c.breakAt) this.breakChain(c);
      } else if (w < c.breakAt) {
        this.restoreChain(c);
        moved = true;
      }
      if (c.phase === 'fall') {
        this.stepChainFall(c, dt);
        moved = true;
      }
    }
    if (moved) this.stems.instanceMatrix.needsUpdate = true;
    for (const l of this.leaves) {
      if (l.phase === 'on') {
        if (w >= l.detachAt) this.dropLeaf(l);
      } else if (w < l.detachAt) {
        this.restoreLeaf(l);
      }
      const dry =
        l.phase === 'on'
          ? Math.round(Math.min(1, Math.max(0, (w - (l.detachAt - 0.3)) / 0.3)) * DRY_STEPS)
          : DRY_STEPS;
      if (dry !== l.dry) {
        l.dry = dry;
        l.mesh.material = leafMaterial(
          l.tex,
          this.leafTex.indexOf(l.tex),
          this.color,
          this.leafStyle.tint,
          dry,
        ).mat;
      }
      if (l.phase === 'fall') this.stepLeafFall(l, dt, nowMs);
    }
  }

  private breakChain(c: Chain): void {
    c.phase = 'fall';
    c.pos.set(0, 0, 0);
    c.quat.identity();
    c.vel.set((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15);
    c.axis = randomHorizontal();
    c.angVel = (0.8 + Math.random() * 1.4) * (Math.random() < 0.5 ? -1 : 1);
    c.angle = 0;
  }

  private restoreChain(c: Chain): void {
    c.phase = 'on';
    for (const s of c.segs) this.setCylinder(this.stems, s.index, s.a, s.b, s.radius);
  }

  /** 整條枝當剛體：繞斷點翻滾著往下掉，最低點碰到地就停 */
  private stepChainFall(c: Chain, dt: number): void {
    c.vel.y -= GRAVITY * dt;
    c.pos.addScaledVector(c.vel, dt);
    c.angle += c.angVel * dt;
    let minY = this.placeChain(c);
    if (minY < this.groundY) {
      c.pos.y += this.groundY - minY;
      minY = this.placeChain(c);
      c.phase = 'down';
    }
  }

  private placeChain(c: Chain): number {
    c.quat.setFromAxisAngle(c.axis, c.angle);
    // 以斷點為軸心轉，再平移
    const M = new THREE.Matrix4()
      .makeTranslation(c.base.x + c.pos.x, c.base.y + c.pos.y, c.base.z + c.pos.z)
      .multiply(new THREE.Matrix4().makeRotationFromQuaternion(c.quat))
      .multiply(new THREE.Matrix4().makeTranslation(-c.base.x, -c.base.y, -c.base.z));
    let minY = Number.POSITIVE_INFINITY;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (const s of c.segs) {
      a.set(s.a.x, s.a.y, s.a.z).applyMatrix4(M);
      b.set(s.b.x, s.b.y, s.b.z).applyMatrix4(M);
      minY = Math.min(minY, a.y, b.y);
      this.setCylinder(this.stems, s.index, a, b, s.radius);
    }
    return minY;
  }

  private dropLeaf(l: LeafState): void {
    l.phase = 'fall';
    l.vel.set((Math.random() - 0.5) * 0.12, 0, (Math.random() - 0.5) * 0.12);
    l.spin.copy(randomHorizontal()).multiplyScalar(1.5 + Math.random() * 2.5);
    l.sway = Math.random() * Math.PI * 2;
  }

  private restoreLeaf(l: LeafState): void {
    l.phase = 'on';
    l.mesh.position.copy(l.home.pos);
    l.mesh.quaternion.copy(l.home.quat);
  }

  /** 葉子：慢慢往下飄，左右擺、翻轉，落地就躺平 */
  private stepLeafFall(l: LeafState, dt: number, nowMs: number): void {
    const t = nowMs / 1000;
    const m = l.mesh;
    m.position.y -= LEAF_FALL * dt;
    m.position.x += (l.vel.x + Math.sin(t * 2.3 + l.sway) * 0.18) * dt;
    m.position.z += (l.vel.z + Math.cos(t * 1.7 + l.sway) * 0.18) * dt;
    const dq = new THREE.Quaternion().setFromAxisAngle(
      l.spin.clone().normalize(),
      l.spin.length() * dt,
    );
    m.quaternion.premultiply(dq);
    if (m.position.y <= this.groundY + 0.01) {
      l.phase = 'down';
      m.position.y = this.groundY + 0.003 + Math.random() * 0.006;
      // 躺平：葉面朝上、葉尖隨便指一個方向
      const y = randomHorizontal();
      const z = new THREE.Vector3(0, 1, 0);
      const x = new THREE.Vector3().crossVectors(y, z);
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    }
  }

  private addLeaf(leaf: Leaf3D, nowMs: number): void {
    const pool = this.pickPool();
    if (pool.length === 0) return;
    const index = Math.floor(leaf.pick * pool.length) % pool.length;
    const tex = pool[index] as LeafTex;
    const st = this.leafStyle;
    // 葉子往外長的方向：繞枝條轉 roll，再離開枝條 angle 度
    const side = rotate(perpendicular(leaf.dir), leaf.dir, leaf.roll);
    const th = (st.angle * Math.PI) / 180;
    const out = norm(add(scale(leaf.dir, Math.cos(th)), scale(side, Math.sin(th))));
    const width = norm(cross(side, leaf.dir), perpendicular(out));
    const x = v(width);
    const y = v(out);
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    x.crossVectors(y, z).normalize();
    const { mat, depth } = leafMaterial(tex, this.leafTex.indexOf(tex), this.color, st.tint);
    const mesh = new THREE.Mesh(leafGeometry(st.curl), mat);
    mesh.customDepthMaterial = depth;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const L = st.size * leaf.size;
    mesh.matrixAutoUpdate = true;
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    mesh.position.copy(v(leaf.at));
    const full = new THREE.Vector3(L * tex.aspect, L, L);
    mesh.scale.setScalar(0.001);
    this.group.add(mesh);
    const chain = this.chain(leaf.tip, leaf.depth, leaf.at);
    // 葉子自己會掉（0.08..0.63），枝斷了也一起掉，取早的
    const fallAt = 0.08 + hash01(this.leaves.length + 0.25) * 0.55;
    this.leaves.push({
      mesh,
      born: nowMs,
      full,
      tex,
      home: { pos: mesh.position.clone(), quat: mesh.quaternion.clone() },
      detachAt: Math.min(fallAt, chain.breakAt),
      phase: 'on',
      vel: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      sway: 0,
      dry: 0,
    });
  }

  private pickPool(): LeafTex[] {
    const sets = [...new Set(this.leafTex.map((t) => t.set))];
    const chosen = this.leafStyle.sets > 0 ? sets[Math.round(this.leafStyle.sets) - 1] : undefined;
    return chosen ? this.leafTex.filter((t) => t.set === chosen) : this.leafTex;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.stems.dispose();
    this.tipStems.dispose();
  }
}
