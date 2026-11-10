import p5 from 'p5';
import type { BrushEnv } from '../../src/brushes';
import { type LeafSprite, loadAllLeaves } from '../../src/brushes/leaves';
import { defaultPenParams, type PenSample, SpringPen } from '../../src/brushes/pen';
import { defaultBranchStyle, PlantPainter } from '../../src/brushes/plantPainter';
import { createPressedBrush } from '../../src/brushes/pressed';
import { hexToRgb, type NipponColor, PALETTES } from '../../src/color/nippon';
import { BranchingPlant } from '../../src/growth/branching';
import { randomizeGrowth } from '../../src/growth/randomize';
import { hashString, mulberry32 } from '../../src/growth/rng';
import { defaultGrowthParams } from '../../src/growth/types';
import {
  type Backdrop,
  backdropFromFile,
  defaultBackdropParams,
  disposeBackdrop,
  drawBackdrop,
  loadBackdrop,
} from '../../src/render/backdrop';
import { drawPaper } from '../../src/render/paper';
import {
  type Camera,
  cameraAt,
  defaultDepthParams,
  easeCamera,
  type LayerTransform,
  layerDepth,
  layerLook,
  layerTransform,
  nextAutoLayer,
  toLayer,
} from '../../src/render/parallax';
import { WebAudioEngine } from '../../src/sound/webaudio';
import { StrokeRecorder } from '../../src/strokes/recorder';
import type { Thumb } from '../../src/ui/panels';
import { BG_PAPER, BG_SAMPLES, BG_USER } from '../02-brushes/backgrounds';
import { createPanel, type State } from './panel';

/** 每層畫布四周多留的邊，視差位移時才不會露出被裁掉的筆畫 */
const MARGIN = 180;
/** 背景比最遠一層還遠一點 */
const BG_DEPTH = -0.2;
/** 遠層的模糊快取最快幾幀重算一次 */
const BLUR_EVERY = 3;
const UNDO_LEVELS = 8;

const brush = createPressedBrush();
const penParams = { ...defaultPenParams };
const pen = new SpringPen(penParams);
const state: State = {
  layer: -1,
  depth: { ...defaultDepthParams },
  grow: { enabled: true, random: true, amount: 0.5, growth: { ...defaultGrowthParams } },
  sound: { enabled: true, volume: 0.8 },
  bg: { choice: '朝霧', params: { ...defaultBackdropParams } },
};
const engine = new WebAudioEngine(11);
let audioStarted = false;
const ui = {
  palette: 0,
  color: 0,
  auto: false,
  autoNext: 0,
  lastLayer: undefined as number | undefined,
};
let leaves: LeafSprite[] = [];
const backdrops = new Map<string, Backdrop>();

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const status = (msg: string) => {
  $('status').textContent = msg;
};
const palette = () => PALETTES[ui.palette] ?? (PALETTES[0] as (typeof PALETTES)[number]);

status('葉片素材載入中…');
loadAllLeaves()
  .then((l) => {
    leaves = l;
    status('');
  })
  .catch((err) => {
    console.error(err);
    status('葉片素材載入失敗（看 console）');
  });

type Layer = {
  g: p5.Graphics;
  /** 套了模糊、褪色的版本（遠層才用） */
  cache: HTMLCanvasElement;
  dirty: boolean;
  cachedAt: number;
};

type Active = {
  layer: number;
  env: BrushEnv;
  last: PenSample;
  lifted: boolean;
  tx: number;
  ty: number;
};

new p5((p: p5) => {
  let layers: Layer[] = [];
  let paper: p5.Graphics;
  let cam: Camera = { x: 0, y: 0, z: 0 };
  let active: Active | null = null;
  const recorder = new StrokeRecorder();
  let painters: { painter: PlantPainter; layer: number; seq: number }[] = [];
  let plantSeq = 0;
  const undoStack: { layer: number; snap: HTMLCanvasElement; seq: number }[] = [];

  const ctxOf = (g: p5.Graphics | p5) => g.drawingContext as CanvasRenderingContext2D;
  const canvasOf = (g: p5.Graphics) => g.elt as unknown as HTMLCanvasElement;
  const W = () => p.width;
  const H = () => p.height;

  // ---------- 圖層 ----------
  function makeLayer(old?: Layer): Layer {
    const g = p.createGraphics(W() + MARGIN * 2, H() + MARGIN * 2);
    const ctx = ctxOf(g);
    if (old) {
      const src = canvasOf(old.g);
      ctx.drawImage(src, 0, 0, old.g.width, old.g.height);
      old.g.remove();
    }
    // 之後所有筆畫都用「畫面座標」，留邊靠這個平移
    ctx.translate(MARGIN, MARGIN);
    const cache = document.createElement('canvas');
    cache.width = canvasOf(g).width;
    cache.height = canvasOf(g).height;
    return { g, cache, dirty: true, cachedAt: -999 };
  }

  function rebuildLayers(keep: boolean) {
    const old = layers;
    layers = Array.from({ length: state.depth.layers }, (_, i) =>
      makeLayer(keep ? old[i] : undefined),
    );
    if (!keep) for (const l of old) l.g.remove();
    for (const x of painters) {
      const l = layers[x.layer];
      if (l) x.painter.env.ctx = ctxOf(l.g);
    }
    if (active) {
      const l = layers[active.layer];
      if (l) active.env.ctx = ctxOf(l.g);
    }
  }

  function newPaper() {
    paper?.remove();
    paper = p.createGraphics(W(), H());
    const pal = palette();
    drawPaper(paper, { paper: pal.paper.hex, ink: [pal.grain, pal.grain] }, 6000);
    document.body.classList.toggle('dark', pal.dark);
    document.body.style.background = pal.paper.hex;
  }

  function markAllDirty() {
    for (const l of layers) l.dirty = true;
  }

  // ---------- 背景 ----------
  const currentBackdrop = () =>
    state.bg.choice === BG_PAPER ? undefined : backdrops.get(state.bg.choice);

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
    const cur = currentBackdrop();
    for (const b of backdrops.values()) {
      if (b.el instanceof HTMLVideoElement) {
        if (b === cur) void b.el.play().catch(() => {});
        else b.el.pause();
      }
    }
    document.body.classList.toggle('media', cur !== undefined);
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

  // ---------- 畫 ----------
  function targetLayer(): number {
    if (state.layer >= 0) return Math.min(state.layer, state.depth.layers - 1);
    return nextAutoLayer(ui.lastLayer, state.depth.layers);
  }

  function transformOf(layer: number): LayerTransform {
    return layerTransform(layerDepth(layer, state.depth.layers), cam, state.depth);
  }

  function pickColor(): NipponColor {
    const inks = palette().inks;
    const c = ui.auto ? inks[ui.autoNext++ % inks.length] : inks[ui.color];
    return c ?? (inks[0] as NipponColor);
  }

  function addPlant(a: Active) {
    const stroke = recorder.end();
    if (!state.grow.enabled || !stroke || stroke.points.length < 2) return;
    const seed = hashString(stroke.id);
    const growth = state.grow.random
      ? randomizeGrowth(state.grow.growth, state.grow.amount, mulberry32(seed ^ 0x9e3779b9))
      : { ...state.grow.growth };
    const plant = new BranchingPlant(stroke, growth, seed, W() / H());
    const painter = new PlantPainter(
      plant,
      createPressedBrush,
      { ...brush.params },
      { ...a.env },
      {
        ...defaultBranchStyle,
        size: penParams.size,
        life: growth.life,
      },
    );
    painters.push({ painter, layer: a.layer, seq: plantSeq++ });
  }

  function finishStroke() {
    if (!active) return;
    addPlant(active);
    active = null;
  }

  function pushUndo(layer: number) {
    const l = layers[layer];
    if (!l) return;
    const src = canvasOf(l.g);
    const snap = document.createElement('canvas');
    snap.width = src.width;
    snap.height = src.height;
    (snap.getContext('2d') as CanvasRenderingContext2D).drawImage(src, 0, 0);
    undoStack.push({ layer, snap, seq: plantSeq });
    if (undoStack.length > UNDO_LEVELS) undoStack.shift();
  }

  function undo() {
    finishStroke();
    const e = undoStack.pop();
    if (!e) return;
    painters = painters.filter((x) => x.seq < e.seq);
    const l = layers[e.layer];
    if (!l) return;
    const g = ctxOf(l.g);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, e.snap.width, e.snap.height);
    g.drawImage(e.snap, 0, 0);
    g.restore();
    l.dirty = true;
    ui.lastLayer = e.layer === 0 ? undefined : e.layer - 1;
    renderHud();
  }

  function clear() {
    finishStroke();
    painters = [];
    recorder.clear();
    undoStack.length = 0;
    ui.lastLayer = undefined;
    rebuildLayers(false);
    renderHud();
  }

  // ---------- HUD ----------
  function renderHud() {
    const pal = palette();
    $('brush-name').textContent = '押花';
    const shown = ui.auto ? undefined : pal.inks[ui.color];
    const next = targetLayer() + 1;
    const where = state.layer < 0 ? `自動・下一筆第${next}層` : `第${next}層`;
    const label = $('color-name');
    const small = (t: string) => Object.assign(document.createElement('small'), { textContent: t });
    label.replaceChildren(shown ? `${shown.kanji}　` : '自動配色　', small(where));
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
      `生長${state.grow.enabled ? '開' : '關'} · 聲音${state.sound.enabled ? '開' : '關'}`;
  }

  const save = () => p.saveCanvas(`03-景深-${Date.now()}`, 'png');
  const panel = createPanel(state, brush, penParams, {
    onChange: () => {
      engine.setVolume(state.sound.volume);
      renderHud();
      renderToggles();
    },
    onDepthLook: markAllDirty,
    undo,
    save,
    clear,
    selectBackground: (c) => void selectBackground(c),
    backgroundThumbs,
    openFile: (f) => void useFile(f),
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement || ev.metaKey || ev.ctrlKey) return;
    const k = ev.key.toLowerCase();
    const n = Number.parseInt(k, 10);
    if (n >= 1 && n <= state.depth.layers) state.layer = n - 1;
    else if (k === '0') state.layer = -1;
    else if (k === 'p') {
      ui.palette = (ui.palette + 1) % PALETTES.length;
      ui.color = 0;
      newPaper();
      panel.updateBackground();
    } else if (k === 'a') ui.auto = !ui.auto;
    else if (k === 'b') {
      const list = backgroundThumbs().map((t) => t.label);
      void selectBackground(list[(list.indexOf(state.bg.choice) + 1) % list.length] ?? BG_PAPER);
    } else if (k === 'g') state.grow.enabled = !state.grow.enabled;
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

  // ---------- p5 ----------
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(Math.min(2, p.displayDensity()));
    newPaper();
    rebuildLayers(false);
    renderHud();
    renderToggles();
    void selectBackground(state.bg.choice);
  };

  const isOnCanvas = (ev: Event | undefined) => !ev || ev.target instanceof HTMLCanvasElement;

  p.mousePressed = (ev?: Event) => {
    if (!isOnCanvas(ev)) return;
    if (!audioStarted) {
      audioStarted = true;
      void engine.start().then(() => engine.setVolume(state.sound.volume));
    }
    finishStroke();
    const layer = targetLayer();
    const l = layers[layer];
    if (!l) return;
    pushUndo(layer);
    ui.lastLayer = layer;
    const color = pickColor();
    const env: BrushEnv = {
      ctx: ctxOf(l.g),
      color: hexToRgb(color.hex),
      inks: palette().inks.map((c) => hexToRgb(c.hex)),
      dark: palette().dark,
      noise: (x, y, z) => p.noise(x, y ?? 0, z ?? 0),
      leaves,
    };
    const at = toLayer(p.mouseX, p.mouseY, transformOf(layer), W(), H());
    const first = pen.reset(at.x, at.y);
    brush.begin(env, first);
    recorder.begin(first.x, first.y, W(), H(), p.millis());
    active = { layer, env, last: first, lifted: false, tx: at.x, ty: at.y };
    renderHud();
  };

  p.mouseReleased = () => {
    if (!active || active.lifted) return;
    const at = toLayer(p.mouseX, p.mouseY, transformOf(active.layer), W(), H());
    active.lifted = true;
    active.tx = at.x;
    active.ty = at.y;
    pen.lift();
  };

  p.draw = () => {
    // 鏡頭：畫畫時停住（筆下的那一層才不會滑走），放開後再慢慢跟上滑鼠與漂移
    if (!active) {
      const mx = (p.mouseX - W() / 2) / (W() / 2);
      const my = (p.mouseY - H() / 2) / (H() / 2);
      cam = easeCamera(cam, cameraAt(mx, my, p.millis() / 1000, state.depth), 0.04);
    }

    if (active) {
      const l = layers[active.layer];
      const tgt = active.lifted
        ? { x: active.tx, y: active.ty }
        : toLayer(p.mouseX, p.mouseY, transformOf(active.layer), W(), H());
      const s = pen.step(tgt.x, tgt.y);
      brush.segment(active.env, active.last, s);
      active.last = s;
      if (l) l.dirty = true;
      if (!active.lifted) recorder.extend(s.x, s.y, W(), H(), p.millis());
      if (active.lifted && pen.done) finishStroke();
    }

    const dt = Math.min(100, p.deltaTime);
    for (const x of painters) {
      const events = x.painter.plant.step(dt);
      x.painter.paint(W(), H());
      const l = layers[x.layer];
      if (l) l.dirty = true;
      if (state.sound.enabled) for (const e of events) engine.onGrowth(e);
    }
    painters = painters.filter((x) => x.painter.alive);

    composite();
  };

  /** 背景（最遠）→ 紙紗 → 第 1 層 … 第 6 層（最近） */
  function composite() {
    const ctx = ctxOf(p);
    const w = W();
    const h = H();
    ctx.fillStyle = palette().paper.hex;
    ctx.fillRect(0, 0, w, h);

    // 背景也跟著一點點視差；放大一點蓋住位移露出的邊
    const bt = layerTransform(BG_DEPTH, cam, state.depth);
    const over = 1 + (Math.abs(state.depth.shift) * 0.3 * 2) / Math.min(w, h) + state.depth.breath;
    ctx.save();
    ctx.translate(w / 2 + bt.dx, h / 2 + bt.dy);
    ctx.scale(over, over);
    ctx.translate(-w / 2, -h / 2);
    const b = currentBackdrop();
    if (b) {
      drawBackdrop(ctx, b, w, h, state.bg.params);
      if (state.bg.params.veil > 0) {
        ctx.globalAlpha = state.bg.params.veil;
        ctx.drawImage(canvasOf(paper), 0, 0, w, h);
      }
    } else {
      ctx.drawImage(canvasOf(paper), 0, 0, w, h);
    }
    ctx.restore();

    const frame = p.frameCount;
    layers.forEach((l, i) => {
      const d = layerDepth(i, state.depth.layers);
      const look = layerLook(d, state.depth);
      const t = transformOf(i);
      let src: HTMLCanvasElement = canvasOf(l.g);
      if (look.filter !== 'none') {
        if (l.dirty && frame - l.cachedAt >= BLUR_EVERY) {
          const c = l.cache.getContext('2d') as CanvasRenderingContext2D;
          const pd = l.cache.width / l.g.width;
          c.clearRect(0, 0, l.cache.width, l.cache.height);
          // 模糊半徑是 CSS px，快取是實際像素，所以乘上像素密度
          c.filter = look.filter.replace(
            /blur\(([\d.]+)px\)/,
            (_m, v) => `blur(${Number(v) * pd}px)`,
          );
          c.drawImage(src, 0, 0);
          c.filter = 'none';
          l.dirty = false;
          l.cachedAt = frame;
        }
        src = l.cache;
      }
      ctx.save();
      ctx.globalAlpha = look.alpha;
      ctx.translate(w / 2 + t.dx, h / 2 + t.dy);
      ctx.scale(t.scale, t.scale);
      ctx.translate(-w / 2 - MARGIN, -h / 2 - MARGIN);
      ctx.drawImage(src, 0, 0, w + MARGIN * 2, h + MARGIN * 2);
      ctx.restore();
    });
  }

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  p.windowResized = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      finishStroke();
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      undoStack.length = 0;
      newPaper();
      rebuildLayers(true);
    }, 150);
  };
});
