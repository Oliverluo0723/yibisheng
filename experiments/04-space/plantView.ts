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
function leafMaterial(tex: LeafTex, index: number, color: THREE.Color, tint: number) {
  const tinted = new THREE.Color(1, 1, 1).lerp(color, tint);
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
  private readonly leaves: { mesh: THREE.Mesh; born: number; full: THREE.Vector3 }[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  plant?: Plant3D;

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
    if (length < 1e-6) return;
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

  /** 每幀：把植物新長的枝和葉加進場景，葉子從 0 慢慢展開 */
  sync(nowMs: number): void {
    const p = this.plant;
    if (p) {
      for (; this.segDone < p.segments.length; this.segDone++) {
        const s = p.segments[this.segDone];
        if (s) this.addStem(s.a, s.b, this.radiusFor(s.depth));
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
    this.leaves.push({ mesh, born: nowMs, full });
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
