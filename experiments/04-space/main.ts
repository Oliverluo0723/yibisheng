import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadAllLeaves } from '../../src/brushes/leaves';
import { defaultPenParams, type PenSample, SpringPen } from '../../src/brushes/pen';
import { type NipponColor, PALETTES } from '../../src/color/nippon';
import { ARC_HEAT_BUMP, arcGrowth, arcLevel, defaultArcParams } from '../../src/growth/arc';
import {
  defaultGrowth3DParams,
  type Growth3DEvent,
  Plant3D,
  type V3,
} from '../../src/growth/branching3d';
import { hashString, mulberry32 } from '../../src/growth/rng';
import { planGrass, planLilac, planLily, planStock } from '../../src/growth/species3d';
import { PlantWither, WitherClock } from '../../src/growth/wither';
import { StableCount } from '../../src/input/fingers';
import { HandTracker } from '../../src/input/hand';
import {
  type Backdrop,
  backdropFromFile,
  disposeBackdrop,
  loadBackdrop,
} from '../../src/render/backdrop';
import { orbitOffset } from '../../src/render/orbit';
import { createBotanicaEngine, freshBotanicaParams } from '../../src/sound/botanica';
import type { SoundEngine, WitherEvent } from '../../src/sound/engine';
import { Heat } from '../../src/sound/theory/heat';
import { WebAudioEngine } from '../../src/sound/webaudio';
import { analyzeGesture, type GestureSample } from '../../src/strokes/gesture';
import type { Thumb } from '../../src/ui/panels';
import { BG_PAPER, BG_SAMPLES, BG_USER } from '../02-brushes/backgrounds';
import { createUI, SPECIES, type State } from './panel';
import {
  defaultFallStyle,
  defaultLeafStyle,
  defaultStemStyle,
  type LeafTex,
  makeLeafTextures,
  PlantView,
} from './plantView';
import { GrassView, type Grower, LILY_RED, LilacView, LilyView, StockView } from './species';

const state: State = {
  growth: { ...defaultGrowth3DParams },
  grow: { enabled: true },
  species: { kind: 0, useSwatch: false, density: 1, height: 1 },
  leaf: { ...defaultLeafStyle },
  stem: { ...defaultStemStyle },
  wither: { auto: true, manual: 0, graceSec: 25, heatThreshold: 0.5, fullSec: 100 },
  fall: { ...defaultFallStyle },
  arc: { ...defaultArcParams },
  view: { autoRotate: true, rotateSpeed: 0.6, fog: 0.08, shadow: 0.22 },
  sound: { enabled: true, volume: 0.8, engine: 'botanica', botanica: freshBotanicaParams() },
  bg: { choice: BG_PAPER },
};
const ui = { palette: 0, color: 0, auto: false, autoNext: 0, hand: false };
const penParams = { ...defaultPenParams };
const pen = new SpringPen(penParams);
// 聲音：原本的三角波引擎與 Botanica 四層引擎，面板可切換
const basic = new WebAudioEngine(13);
const botanica = createBotanicaEngine(state.sound.botanica);
const engine = (): SoundEngine => (state.sound.engine === 'botanica' ? botanica : basic);
let audioStarted = false;
/** 把面板上的聲音設定推給引擎；Botanica 在關聲音或切到原本時整個靜音（含底） */
function syncSound() {
  basic.setVolume(state.sound.volume);
  botanica.applyParams();
  botanica.setVolume(state.sound.volume);
  botanica.setMuted(!state.sound.enabled || state.sound.engine !== 'botanica');
}
let leafTex: LeafTex[] = [];
const backdrops = new Map<string, Backdrop>();
/**
 * 畫面自己的熱度（草稿）：和聲音引擎同一套衰減，但權重不同（筆重、枝葉輕，見 ARC_HEAT_BUMP），
 * 也不受聲音開關影響。放開一筆、長出一枝、一片葉都加一點；停手後以半衰期退。
 */
const heat = new Heat({ halfLifeMs: state.arc.halfLifeMs });
/** 枯的時鐘：停手夠久、熱度夠低才走；每株從出生算，掉了的不回來 */
const witherClock = new WitherClock();
// 除錯：在 console 看熱度與乾燥時鐘（window.__exp04）
Object.assign(window as unknown as Record<string, unknown>, {
  __exp04: { heat, witherClock, botanica },
});

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
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 100);
const HOME = new THREE.Vector3(0, 0.25, 4.2);
camera.position.copy(HOME);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
// 左鍵留給畫畫；旋轉改用鍵盤 E / Q（見 stepOrbit）；中鍵 / 滾輪縮放
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: null };
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

const GROUND_Y = -1.25;
const groundMat = new THREE.ShadowMaterial({ opacity: state.view.shadow });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = GROUND_Y;
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
    fitBackground();
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

/**
 * three.js 會把背景圖硬撐滿整個畫面（會變形）；改成 cover：保持比例、裁掉多的部分。
 * 影片的尺寸要等第一格載入後才知道，所以每次換背景、縮放視窗都重算。
 */
function fitBackground() {
  const tex = scene.background;
  if (!(tex instanceof THREE.Texture)) return;
  const el = tex.image as HTMLImageElement | HTMLVideoElement | undefined;
  const iw = el instanceof HTMLVideoElement ? el.videoWidth : (el?.naturalWidth ?? 0);
  const ih = el instanceof HTMLVideoElement ? el.videoHeight : (el?.naturalHeight ?? 0);
  if (!iw || !ih) return;
  const screen = window.innerWidth / window.innerHeight;
  const image = iw / ih;
  tex.matrixAutoUpdate = true;
  if (image > screen) {
    tex.repeat.set(screen / image, 1);
    tex.offset.set((1 - screen / image) / 2, 0);
  } else {
    tex.repeat.set(1, image / screen);
    tex.offset.set(0, (1 - image / screen) / 2);
  }
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
  /** 這一筆要長什麼（SPECIES 的索引） */
  kind: number;
  color: THREE.Color;
  /** 每幀的筆速（0..1），放開後交給聲音分析手勢 */
  samples: GestureSample[];
};
let drawing: Drawing | null = null;
/** 每一筆：畫出來的主莖（PlantView）+ 放開後長出的東西 */
/** voice = 這株的植物名，聲音引擎用它決定「一種植物一種聲音」 */
type Item = {
  view: PlantView;
  grower?: Grower;
  wasAlive?: boolean;
  voice?: string;
  /** 押花樹才有：這株的枯（從出生時的乾燥時間算起） */
  wither?: PlantWither;
  /** 這株的識別（= 種子），聲音用它認出是哪一株 */
  id?: number;
  /** 上次告訴聲音的枯進度（押花樹） */
  witherSent?: number;
};
let items: Item[] = [];

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

/** 下筆（滑鼠左鍵或捏手指）：x、y 是螢幕像素 */
function beginDraw(x: number, y: number): boolean {
  if (!audioStarted) {
    audioStarted = true;
    void Promise.all([basic.start(), botanica.start()]).then(syncSound);
  }
  finishDrawing();
  mouseX = x;
  mouseY = y;
  // 畫在「穿過鏡頭注視點、正對鏡頭」的那個面上
  const normal = new THREE.Vector3();
  camera.getWorldDirection(normal).negate();
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, controls.target);
  const start = screenToPlane(x, y, plane);
  if (!start) return false;
  const dist = camera.position.distanceTo(controls.target);
  const worldPerPx =
    (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / window.innerHeight;
  const color = new THREE.Color(pickColor().hex);
  const view = new PlantView(color, leafTex, { ...state.leaf }, { ...state.stem });
  view.groundY = GROUND_Y;
  scene.add(view.group);
  items.push({ view });
  const first = pen.reset(x, y);
  drawing = {
    view,
    points: [start],
    last: first,
    lastWorld: start,
    lifted: false,
    tx: x,
    ty: y,
    plane,
    normal: { x: normal.x, y: normal.y, z: normal.z },
    worldPerPx,
    kind: state.species.kind,
    color,
    samples: [],
  };
  renderHud();
  return true;
}

/** 收筆：之後筆尖滑到 (x, y) 並漸細 */
function liftDraw(x: number, y: number) {
  if (!drawing || drawing.lifted) return;
  drawing.lifted = true;
  drawing.tx = x;
  drawing.ty = y;
  pen.lift();
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (beginDraw(e.clientX, e.clientY)) renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.button === 0) liftDraw(e.clientX, e.clientY);
});

// ---------- 手勢：捏起來就是下筆 ----------
const hand = new HandTracker();
const handUI = {
  cursor: Object.assign(document.createElement('div'), { className: 'hand-cursor' }),
  preview: hand.video,
};
handUI.cursor.hidden = true;
handUI.preview.className = 'hand-preview';
handUI.preview.hidden = true;
document.body.append(handUI.cursor, handUI.preview);

async function toggleHand() {
  if (hand.running) {
    if (drawing && !drawing.lifted) liftDraw(mouseX, mouseY);
    hand.stop();
    handUI.cursor.hidden = true;
    handUI.preview.hidden = true;
    status('');
  } else {
    status('開啟攝影機、載入手勢模型中…（第一次要連網，約幾秒）');
    try {
      await hand.start();
      handUI.preview.hidden = false;
      status(
        '伸出手：捏＝下筆，鬆開＝收筆；五指張開揮＝轉向；比 1、2、3、4 半秒＝換植物，比六（拇指小指）＝丁香',
      );
      setTimeout(() => status(''), 5000);
    } catch (err) {
      console.error(err);
      status(err instanceof Error ? err.message : String(err));
    }
  }
  ui.hand = hand.running;
  panel.refresh();
}

/** 張開手掌轉向：手掌每移動畫面寬度的 1 倍 = 轉幾弧度 */
const PALM_YAW = Math.PI * 1.6;
const PALM_PITCH = Math.PI * 0.9;
/** 手掌轉向的速度（弧度 / 幀），放開後慢慢衰減 = 慣性 */
const palmSpin = { yaw: 0, pitch: 0, lastX: 0, lastY: 0, tracking: false };

function stepPalmSpin(now: number) {
  const h = hand.state;
  if (h.seen && h.open) {
    if (palmSpin.tracking) {
      // 像用手撥地球儀：手往右揮，植物正面往右走（從上往下看是逆時針，所以 yaw 取負）
      const yaw = -(h.palmX - palmSpin.lastX) * PALM_YAW;
      const pitch = (h.palmY - palmSpin.lastY) * PALM_PITCH;
      palmSpin.yaw = palmSpin.yaw * 0.5 + yaw * 0.5;
      palmSpin.pitch = palmSpin.pitch * 0.5 + pitch * 0.5;
    }
    palmSpin.tracking = true;
    palmSpin.lastX = h.palmX;
    palmSpin.lastY = h.palmY;
    lastInteract = now;
  } else {
    palmSpin.tracking = false;
    palmSpin.yaw *= 0.93;
    palmSpin.pitch *= 0.93;
  }
  if (Math.abs(palmSpin.yaw) + Math.abs(palmSpin.pitch) > 1e-4) {
    orbitBy(palmSpin.yaw, palmSpin.pitch);
    lastInteract = now;
  }
}

/** 比 1、2、3、4 換植物：同一個數字連續比半秒才切，避免手指移動時誤切 */
const fingerVote = new StableCount(500);

/** 每幀：把手的位置當成滑鼠，捏 / 放開當成按下 / 放開，張開手掌轉向，比數字換植物 */
function stepHand(now: number) {
  if (!hand.running) return;
  const wasPinched = hand.state.pinched;
  const h = hand.update(now, window.innerWidth, window.innerHeight);
  stepPalmSpin(now);
  // 捏著或張開手掌時不數（那兩個手勢各有用途）
  const n = fingerVote.update(h.seen && !h.pinched && !h.open ? h.fingers : null, now);
  // 1–4 → 前四種；六（拇指小指）→ 第五種（丁香）
  const kind = n === 6 ? 4 : n !== null ? n - 1 : null;
  if (kind !== null && kind < SPECIES.length && state.species.kind !== kind) {
    state.species.kind = kind;
    renderHud();
    panel.refresh();
  }
  const c = handUI.cursor;
  c.hidden = !h.seen;
  c.classList.toggle('down', h.pinched);
  c.classList.toggle('open', h.open);
  c.style.transform = `translate(${h.x}px, ${h.y}px)`;
  if (!h.seen) {
    if (drawing && !drawing.lifted) liftDraw(mouseX, mouseY);
    return;
  }
  mouseX = h.x;
  mouseY = h.y;
  if (h.pinched && !wasPinched) beginDraw(h.x, h.y);
  else if (!h.pinched && wasPinched) liftDraw(h.x, h.y);
}

function finishDrawing() {
  const d = drawing;
  if (!d) return;
  drawing = null;
  if (!state.grow.enabled || d.points.length < 2) return;
  const seed = hashString(`${performance.now()}-${d.points.length}`);
  const item = items.find((x) => x.view === d.view);
  if (!item) return;
  const rng = mulberry32(seed);
  const now = performance.now();
  const sp = state.species;
  const tint = sp.useSwatch ? d.color : undefined;
  const fp = { density: sp.density, height: sp.height };
  item.voice = SPECIES[d.kind]?.name;
  item.id = seed;
  const info = { id: seed, gesture: analyzeGesture(d.samples) };
  // 這一筆算進熱度；放開那一刻的熱度決定它長多少（押花樹）
  const h = heat.value(now);
  heat.add(now, ARC_HEAT_BUMP.plant);
  witherClock.activity(now);
  if (d.kind === 0) {
    const params = arcGrowth(state.growth, h, state.arc);
    d.view.plant = new Plant3D(d.points, params, seed, d.normal);
    d.view.salt = seed;
    item.wither = new PlantWither(witherClock.seconds);
    engine().onPlantStart?.(seed, item.voice, info);
    if (arcLevel(h, state.arc).burst) status('翻面：這一筆長滿');
    return;
  }
  let grower: Grower;
  if (d.kind === 1) grower = new GrassView(planGrass(d.points, fp, rng), now, tint);
  else if (d.kind === 2)
    grower = new LilyView(planLily(d.points, fp, rng), now, tint ?? new THREE.Color(LILY_RED));
  else if (d.kind === 4) grower = new LilacView(planLilac(d.points, fp, rng), now, tint);
  else grower = new StockView(planStock(d.points, fp, rng), now, tint);
  item.grower = grower;
  scene.add(grower.group);
  engine().onPlantStart?.(seed, item.voice, info);
}

function stepDrawing() {
  const d = drawing;
  if (!d) return;
  const s = d.lifted ? pen.step(d.tx, d.ty) : pen.step(mouseX, mouseY);
  if (!d.lifted) {
    witherClock.activity(performance.now());
    d.samples.push({ t: performance.now(), speed: Math.min(1, s.speed / penParams.maxSpeed) });
  }
  const w = screenToPlane(s.x, s.y, d.plane);
  if (w) {
    // 押花樹的主莖粗；草和花的那一筆只是細細的「種下去的線」
    const r = Math.max(0.0015, s.width * d.worldPerPx * (d.kind === 0 ? 0.35 : 0.1));
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
/** 這株從畫面上拿掉了：俳句的合唱也要知道，不然會留下看不見卻一直響的樹 */
function removedFromScene(it: Item) {
  if (it.id !== undefined) botanica.onPlantRemove(it.id);
}
function undo() {
  finishDrawing();
  const last = items.pop();
  if (!last) return;
  last.view.dispose();
  last.grower?.dispose();
  removedFromScene(last);
}
function clear() {
  finishDrawing();
  for (const it of items) {
    it.view.dispose();
    it.grower?.dispose();
    removedFromScene(it);
  }
  items = [];
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
  $('brush-name').textContent = SPECIES[state.species.kind]?.name ?? '押花';
  const shown = ui.auto ? undefined : pal.inks[ui.color];
  const small = (t: string) => Object.assign(document.createElement('small'), { textContent: t });
  $('color-name').replaceChildren(shown ? `${shown.kanji}　` : '自動配色　', small('空間'));
}
function renderToggles() {
  $('toggles').textContent =
    `生長${state.grow.enabled ? '開' : '關'} · 聲音${state.sound.enabled ? '開' : '關'} · 自轉${state.view.autoRotate ? '開' : '關'}`;
}
/** 正上方的熱度條：越熱越長，刻度是翻面門檻，過了整條變實 */
const heatEl = {
  root: $('heat'),
  fill: document.querySelector('#heat .fill') as HTMLElement,
  tick: document.querySelector('#heat .tick') as HTMLElement,
  num: document.querySelector('#heat .num') as HTMLElement,
};
let heatShown = -1;
let dryShown = -1;
function renderHeat(h: number, drySeconds: number) {
  const arc = state.arc;
  heatEl.root.hidden = !arc.enabled;
  if (!arc.enabled) return;
  const shown = Math.round(h * 100);
  const dry = Math.floor(drySeconds);
  if (shown === heatShown && dry === dryShown) return;
  heatShown = shown;
  dryShown = dry;
  heatEl.fill.style.width = `${shown}%`;
  heatEl.tick.style.left = `${arc.threshold * 100}%`;
  heatEl.num.textContent = `${(shown / 100).toFixed(2)}${dry > 0 ? `　枯 ${dry}s` : ''}`;
  heatEl.root.classList.toggle('burst', h >= arc.threshold);
}

const panel = createUI(state, penParams, {
  hand: () => ui.hand,
  toggleHand: () => void toggleHand(),
  palette,
  colorIndex: () => (ui.auto ? -1 : ui.color),
  setColor: (i) => {
    ui.auto = i < 0;
    if (i >= 0) ui.color = i;
    renderHud();
  },
  onChange: () => {
    syncSound();
    applyLook();
    renderHud();
    renderToggles();
    heat.halfLifeMs = state.arc.halfLifeMs;
    heatShown = -1;
  },
  undo,
  save,
  clear,
  resetView,
  selectBackground: (c) => void selectBackground(c),
  backgroundThumbs,
  openFile: (f) => void useFile(f),
});

// ---------- E / Q 旋轉 ----------
/** 按住的旋轉鍵：+1 = E（順時針）、-1 = Q（逆時針） */
const orbitKeys = new Set<string>();
/** 每秒轉幾度 */
const ORBIT_DEG_PER_SEC = 75;
window.addEventListener('keydown', (ev) => {
  if (ev.target instanceof HTMLInputElement || ev.metaKey || ev.ctrlKey) return;
  const k = ev.key.toLowerCase();
  if (k === 'e' || k === 'q') {
    orbitKeys.add(k);
    ev.preventDefault();
  }
});
window.addEventListener('keyup', (ev) => orbitKeys.delete(ev.key.toLowerCase()));
window.addEventListener('blur', () => orbitKeys.clear());

/**
 * 從上往下看：E 讓植物順時針轉、Q 逆時針。
 * 植物順時針轉 = 鏡頭繞注視點逆時針走（右手定則下繞 +Y 正方向轉）。
 */
function stepOrbit(dtMs: number, now: number) {
  const dir = (orbitKeys.has('e') ? 1 : 0) - (orbitKeys.has('q') ? 1 : 0);
  if (dir === 0) return;
  orbitBy(THREE.MathUtils.degToRad(ORBIT_DEG_PER_SEC) * (dtMs / 1000) * dir, 0);
  lastInteract = now;
}

/** 俯仰的範圍：離正上方、正下方至少這麼多（弧度），避免翻過頭 */
const PITCH_MARGIN = THREE.MathUtils.degToRad(12);

/**
 * 鏡頭繞注視點轉：yaw > 0 = 從上往下看植物順時針轉；pitch > 0 = 鏡頭往上（從上面看下來）。
 */
function orbitBy(yaw: number, pitch: number) {
  const o = camera.position.clone().sub(controls.target);
  const next = orbitOffset({ x: o.x, y: o.y, z: o.z }, yaw, pitch, PITCH_MARGIN);
  camera.position.set(
    controls.target.x + next.x,
    controls.target.y + next.y,
    controls.target.z + next.z,
  );
}

window.addEventListener('keydown', (ev) => {
  if (ev.target instanceof HTMLInputElement || ev.metaKey || ev.ctrlKey) return;
  if (ev.key.toLowerCase() === 'e' || ev.key.toLowerCase() === 'q') return;
  const k = ev.key.toLowerCase();
  const n = Number.parseInt(k, 10);
  if (n >= 1 && n <= SPECIES.length) state.species.kind = n - 1;
  else if (k === 'p') {
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
  else if (k === 'm') {
    state.sound.enabled = !state.sound.enabled;
    syncSound();
  } else if (k === 'z') undo();
  else if (k === 's') save();
  else if (k === 'c') clear();
  else if (k === 'h') document.body.classList.toggle('hide-hud');
  else if (k === '`') panel.toggleSettings();
  else return;
  panel.refresh();
  renderHud();
  renderToggles();
});

window.addEventListener('resize', () => {
  fitBackground();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- 主迴圈 ----------
let prev = performance.now();
renderer.setAnimationLoop((now: number) => {
  const dt = Math.min(100, now - prev);
  prev = now;
  stepHand(now);
  stepOrbit(dt, now);
  stepDrawing();
  // 舊的聲音引擎吃 0..1 的畫面座標；用 x、y 大略換算
  const screen01 = (at: V3) => ({
    x: Math.min(1, Math.max(0, (at.x + 1.5) / 3)),
    y: Math.min(1, Math.max(0, 0.5 - at.y / 3)),
  });
  // life = 這株的生命（ms），有的話給聲音「長到幾成」
  const sound = (
    events: Growth3DEvent[],
    voice: string | undefined,
    id: number | undefined,
    life?: number,
  ) => {
    for (const e of events)
      heat.add(now, e.kind === 'leaf' ? ARC_HEAT_BUMP.leaf : ARC_HEAT_BUMP.branch);
    if (events.length > 0) witherClock.activity(now);
    // Botanica 關聲音時是整個靜音，事件照送（俳句的格子才會跟著長）；原本的引擎沒有靜音，要擋
    if (!state.sound.enabled && state.sound.engine !== 'botanica') return;
    for (const e of events) {
      engine().onGrowth(
        {
          kind: e.kind,
          ...screen01(e.at),
          depth: e.depth,
          age: e.age,
          ...(life ? { progress: Math.min(1, e.age / life) } : {}),
        },
        voice,
        id,
      );
    }
  };
  // 鼓、鋼琴、俳句都吃畫面這份熱度（筆重枝葉輕）
  botanica.setHeat(heat.value(now));
  witherClock.opts.graceMs = state.wither.graceSec * 1000;
  witherClock.opts.heatThreshold = state.wither.heatThreshold;
  const dry = witherClock.tick(now, heat.value(now));
  for (const it of items) {
    const p = it.view.plant;
    if (p?.alive) sound(p.step(dt), it.voice, it.id, p.params.life);
    // 枯：跟著乾燥時鐘（只增不減）；「枯跟熱度」關掉時只看手動滑桿（除錯，可來回拉）
    if (it.wither) {
      it.view.wither = state.wither.auto
        ? it.wither.update(dry, state.wither.fullSec, state.wither.manual)
        : state.wither.manual;
    }
    // 枯的進度交給俳句（照比例熄格、到 1 響尾音）；每變 2% 說一次，到 1 一定說
    if (it.id !== undefined && it.wither) {
      const w = it.view.wither;
      const sent = it.witherSent ?? 0;
      if ((w > 0 && w - sent >= 0.02) || (w >= 1 && sent < 1)) {
        it.witherSent = w;
        botanica.onPlantWither(it.id, w, it.voice);
      }
    }
    it.view.fall = state.fall;
    const fell = it.view.sync(now);
    if (state.sound.enabled) {
      for (const e of fell) {
        const ev: WitherEvent = { kind: e.kind, ...screen01(e.at), depth: e.depth };
        engine().onWither?.(ev, it.voice, it.id);
      }
    }
    if (it.grower?.alive) sound(it.grower.step(now), it.voice, it.id);
    // 長完那一刻通知聲音（草一直隨風晃、永遠 alive，不會觸發）
    const alive = Boolean(p?.alive || it.grower?.alive);
    if (it.wasAlive && !alive && state.sound.enabled) engine().onPlantDone?.();
    it.wasAlive = alive;
  }
  // 畫畫時、剛轉過鏡頭的 3 秒內不自轉
  controls.autoRotate = state.view.autoRotate && !drawing && now - lastInteract > 3000;
  controls.update();
  renderHeat(heat.value(now), dry);
  renderer.render(scene, camera);
});

applyLook();
renderHud();
renderToggles();
