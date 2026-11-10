import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadAllLeaves } from '../../src/brushes/leaves';
import { defaultPenParams, type PenSample, SpringPen } from '../../src/brushes/pen';
import { type NipponColor, PALETTES } from '../../src/color/nippon';
import { defaultGrowth3DParams, Plant3D, type V3 } from '../../src/growth/branching3d';
import { hashString } from '../../src/growth/rng';
import {
  type Backdrop,
  backdropFromFile,
  disposeBackdrop,
  loadBackdrop,
} from '../../src/render/backdrop';
import { WebAudioEngine } from '../../src/sound/webaudio';
import type { Thumb } from '../../src/ui/panels';
import { BG_PAPER, BG_SAMPLES, BG_USER } from '../02-brushes/backgrounds';
import { createPanel, type State } from './panel';
import {
  defaultLeafStyle,
  defaultStemStyle,
  type LeafTex,
  makeLeafTextures,
  PlantView,
} from './plantView';

const state: State = {
  growth: { ...defaultGrowth3DParams },
  grow: { enabled: true },
  leaf: { ...defaultLeafStyle },
  stem: { ...defaultStemStyle },
  view: { autoRotate: true, rotateSpeed: 0.6, fog: 0.08, shadow: 0.22 },
  sound: { enabled: true, volume: 0.8 },
  bg: { choice: BG_PAPER },
};
const ui = { palette: 0, color: 0, auto: false, autoNext: 0 };
const penParams = { ...defaultPenParams };
const pen = new SpringPen(penParams);
const engine = new WebAudioEngine(13);
let audioStarted = false;
let leafTex: LeafTex[] = [];
const backdrops = new Map<string, Backdrop>();

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const status = (msg: string) => {
  $('status').textContent = msg;
};
const palette = () => PALETTES[ui.palette] ?? (PALETTES[0] as (typeof PALETTES)[number]);

// ---------- three.js 場景 ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 100);
const HOME = new THREE.Vector3(0, 0.25, 4.2);
camera.position.copy(HOME);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
// 左鍵留給畫畫；右鍵轉、中鍵 / 滾輪縮放
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1;
controls.maxDistance = 12;
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
let lastInteract = -1e9;
controls.addEventListener('start', () => {
  lastInteract = performance.now();
});
controls.addEventListener('end', () => {
  lastInteract = performance.now();
});

const hemi = new THREE.HemisphereLight(0xfff6e8, 0x6b6150, 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.position.set(2.5, 4, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -3;
sun.shadow.camera.right = 3;
sun.shadow.camera.top = 3;
sun.shadow.camera.bottom = -3;
sun.shadow.bias = -0.0005;
scene.add(sun);

const groundMat = new THREE.ShadowMaterial({ opacity: state.view.shadow });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.25;
ground.receiveShadow = true;
scene.add(ground);

let bgKey = '';
function applyLook() {
  const paper = new THREE.Color(palette().paper.hex);
  const b = state.bg.choice === BG_PAPER ? undefined : backdrops.get(state.bg.choice);
  // 背景只有在換了背景或換了紙時才重建（拉滑桿不用）
  const key = `${state.bg.choice}|${ui.palette}|${b ? 1 : 0}`;
  if (key === bgKey) {
    scene.fog = state.view.fog > 0 ? new THREE.FogExp2(paper, state.view.fog) : null;
    groundMat.opacity = state.view.shadow;
    controls.autoRotateSpeed = state.view.rotateSpeed;
    return;
  }
  bgKey = key;
  if (b) {
    const tex =
      b.el instanceof HTMLVideoElement ? new THREE.VideoTexture(b.el) : new THREE.Texture(b.el);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    const old = scene.background;
    if (old instanceof THREE.Texture) old.dispose();
    scene.background = tex;
  } else {
    const old = scene.background;
    if (old instanceof THREE.Texture) old.dispose();
    scene.background = paper;
  }
  scene.fog = state.view.fog > 0 ? new THREE.FogExp2(paper, state.view.fog) : null;
  groundMat.opacity = state.view.shadow;
  controls.autoRotateSpeed = state.view.rotateSpeed;
  document.body.classList.toggle('dark', palette().dark);
  document.body.classList.toggle('media', b !== undefined);
  document.body.style.background = palette().paper.hex;
}

// ---------- 植物 ----------
type Drawing = {
  view: PlantView;
  points: V3[];
  last: PenSample;
  lastWorld: V3;
  lifted: boolean;
  tx: number;
  ty: number;
  /** 這一筆畫在哪個面上 */
  plane: THREE.Plane;
  /** 面的法線（朝鏡頭） */
  normal: V3;
  worldPerPx: number;
};
let drawing: Drawing | null = null;
let views: PlantView[] = [];

status('葉片素材載入中…');
loadAllLeaves()
  .then((sprites) => {
    leafTex = makeLeafTextures(sprites);
    status('');
  })
  .catch((err) => {
    console.error(err);
    status('葉片素材載入失敗（看 console）');
  });

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function screenToPlane(px: number, py: number, plane: THREE.Plane): V3 | null {
  ndc.set((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  return raycaster.ray.intersectPlane(plane, hit) ? { x: hit.x, y: hit.y, z: hit.z } : null;
}

function pickColor(): NipponColor {
  const inks = palette().inks;
  const c = ui.auto ? inks[ui.autoNext++ % inks.length] : inks[ui.color];
  return c ?? (inks[0] as NipponColor);
}

let mouseX = 0;
let mouseY = 0;
renderer.domElement.addEventListener('pointermove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (!audioStarted) {
    audioStarted = true;
    void engine.start().then(() => engine.setVolume(state.sound.volume));
  }
  finishDrawing();
  mouseX = e.clientX;
  mouseY = e.clientY;
  // 畫在「穿過鏡頭注視點、正對鏡頭」的那個面上
  const normal = new THREE.Vector3();
  camera.getWorldDirection(normal).negate();
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, controls.target);
  const start = screenToPlane(e.clientX, e.clientY, plane);
  if (!start) return;
  const dist = camera.position.distanceTo(controls.target);
  const worldPerPx =
    (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / window.innerHeight;
  const color = new THREE.Color(pickColor().hex);
  const view = new PlantView(color, leafTex, { ...state.leaf }, { ...state.stem });
  scene.add(view.group);
  views.push(view);
  const first = pen.reset(e.clientX, e.clientY);
  drawing = {
    view,
    points: [start],
    last: first,
    lastWorld: start,
    lifted: false,
    tx: e.clientX,
    ty: e.clientY,
    plane,
    normal: { x: normal.x, y: normal.y, z: normal.z },
    worldPerPx,
  };
  renderer.domElement.setPointerCapture(e.pointerId);
  renderHud();
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.button !== 0 || !drawing || drawing.lifted) return;
  drawing.lifted = true;
  drawing.tx = e.clientX;
  drawing.ty = e.clientY;
  pen.lift();
});

function finishDrawing() {
  const d = drawing;
  if (!d) return;
  drawing = null;
  if (!state.grow.enabled || d.points.length < 2) return;
  const seed = hashString(`${performance.now()}-${d.points.length}`);
  d.view.plant = new Plant3D(d.points, { ...state.growth }, seed, d.normal);
}

function stepDrawing() {
  const d = drawing;
  if (!d) return;
  const s = d.lifted ? pen.step(d.tx, d.ty) : pen.step(mouseX, mouseY);
  const w = screenToPlane(s.x, s.y, d.plane);
  if (w) {
    const r = Math.max(0.002, s.width * d.worldPerPx * 0.35);
    const dx = w.x - d.lastWorld.x;
    const dy = w.y - d.lastWorld.y;
    const dz = w.z - d.lastWorld.z;
    if (Math.hypot(dx, dy, dz) > d.worldPerPx * 1.5) {
      d.view.addStem(d.lastWorld, w, r);
      d.lastWorld = w;
      if (!d.lifted) d.points.push(w);
    }
  }
  d.last = s;
  if (d.lifted && pen.done) finishDrawing();
}

// ---------- 背景 ----------
async function selectBackground(choice: string) {
  state.bg.choice = choice;
  panel.updateBackground();
  if (choice !== BG_PAPER && !backdrops.has(choice)) {
    const sample = BG_SAMPLES.find((x) => x.name === choice);
    if (!sample) return;
    status(`背景載入中：${choice}…`);
    try {
      backdrops.set(choice, await loadBackdrop(sample.src, sample.kind, sample.name));
      status('');
    } catch (err) {
      console.error(err);
      status(`背景載入失敗：${choice}`);
      return;
    }
  }
  for (const b of backdrops.values()) {
    if (b.el instanceof HTMLVideoElement) {
      if (b.name === choice || (choice === BG_USER && b === backdrops.get(BG_USER)))
        void b.el.play().catch(() => {});
      else b.el.pause();
    }
  }
  applyLook();
}

async function useFile(file: File) {
  try {
    const b = await backdropFromFile(file);
    disposeBackdrop(backdrops.get(BG_USER));
    backdrops.set(BG_USER, b);
    await selectBackground(BG_USER);
  } catch (err) {
    status(err instanceof Error ? err.message : String(err));
  }
}

function backgroundThumbs(): Thumb[] {
  const user = backdrops.get(BG_USER);
  return [
    { label: BG_PAPER, kind: 'color', src: palette().paper.hex },
    ...BG_SAMPLES.map((x) => ({ label: x.name, kind: x.kind, src: x.src })),
    ...(user?.objectUrl ? [{ label: BG_USER, kind: user.kind, src: user.objectUrl }] : []),
  ];
}

window.addEventListener('dragover', (ev) => ev.preventDefault());
window.addEventListener('drop', (ev) => {
  ev.preventDefault();
  const file = ev.dataTransfer?.files[0];
  if (file) void useFile(file);
});

// ---------- 動作 ----------
function undo() {
  finishDrawing();
  views.pop()?.dispose();
}
function clear() {
  finishDrawing();
  for (const v of views) v.dispose();
  views = [];
}
function save() {
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `04-空間-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}
function resetView() {
  camera.position.copy(HOME);
  controls.target.set(0, 0, 0);
  controls.update();
}

// ---------- HUD ----------
function renderHud() {
  const pal = palette();
  $('brush-name').textContent = '押花';
  const shown = ui.auto ? undefined : pal.inks[ui.color];
  const small = (t: string) => Object.assign(document.createElement('small'), { textContent: t });
  $('color-name').replaceChildren(shown ? `${shown.kanji}　` : '自動配色　', small('空間'));
  const row = $('swatches');
  row.replaceChildren();
  const name = document.createElement('span');
  name.id = 'palette-name';
  name.textContent = pal.name;
  row.append(name);
  pal.inks.forEach((c, i) => {
    const el = document.createElement('button');
    el.className = `sw${!ui.auto && ui.color === i ? ' on' : ''}`;
    el.style.background = c.hex;
    el.title = `${c.kanji} ${c.romaji}`;
    el.onclick = () => {
      ui.auto = false;
      ui.color = i;
      renderHud();
    };
    row.append(el);
  });
  const auto = document.createElement('button');
  auto.className = `sw auto${ui.auto ? ' on' : ''}`;
  auto.textContent = '自';
  auto.onclick = () => {
    ui.auto = !ui.auto;
    renderHud();
  };
  row.append(auto);
}
function renderToggles() {
  $('toggles').textContent =
    `生長${state.grow.enabled ? '開' : '關'} · 聲音${state.sound.enabled ? '開' : '關'} · 自轉${state.view.autoRotate ? '開' : '關'}`;
}

const panel = createPanel(state, penParams, {
  onChange: () => {
    engine.setVolume(state.sound.volume);
    applyLook();
    renderToggles();
  },
  undo,
  save,
  clear,
  resetView,
  selectBackground: (c) => void selectBackground(c),
  backgroundThumbs,
  openFile: (f) => void useFile(f),
});

window.addEventListener('keydown', (ev) => {
  if (ev.target instanceof HTMLInputElement || ev.metaKey || ev.ctrlKey) return;
  const k = ev.key.toLowerCase();
  if (k === 'p') {
    ui.palette = (ui.palette + 1) % PALETTES.length;
    ui.color = 0;
    applyLook();
    panel.updateBackground();
  } else if (k === 'a') ui.auto = !ui.auto;
  else if (k === 'b') {
    const list = backgroundThumbs().map((t) => t.label);
    void selectBackground(list[(list.indexOf(state.bg.choice) + 1) % list.length] ?? BG_PAPER);
  } else if (k === 'r') state.view.autoRotate = !state.view.autoRotate;
  else if (k === 'g') state.grow.enabled = !state.grow.enabled;
  else if (k === 'm') state.sound.enabled = !state.sound.enabled;
  else if (k === 'z') undo();
  else if (k === 's') save();
  else if (k === 'c') clear();
  else if (k === 'h') document.body.classList.toggle('hide-hud');
  else return;
  panel.refresh();
  renderHud();
  renderToggles();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- 主迴圈 ----------
let prev = performance.now();
renderer.setAnimationLoop((now: number) => {
  const dt = Math.min(100, now - prev);
  prev = now;
  stepDrawing();
  for (const v of views) {
    const p = v.plant;
    if (p?.alive) {
      const events = p.step(dt);
      if (state.sound.enabled) {
        for (const e of events) {
          // 舊的聲音引擎吃 0..1 的畫面座標；用 x、y 大略換算
          engine.onGrowth({
            kind: e.kind,
            x: Math.min(1, Math.max(0, (e.at.x + 1.5) / 3)),
            y: Math.min(1, Math.max(0, 0.5 - e.at.y / 3)),
            depth: e.depth,
            age: e.age,
          });
        }
      }
    }
    v.sync(now);
  }
  // 畫畫時、剛轉過鏡頭的 3 秒內不自轉
  controls.autoRotate = state.view.autoRotate && !drawing && now - lastInteract > 3000;
  controls.update();
  renderer.render(scene, camera);
});

applyLook();
renderHud();
renderToggles();
