import p5 from 'p5';
import { BRUSH_FACTORIES, type Brush, type BrushEnv, createBrushes } from '../../src/brushes';
import { type LeafSprite, loadAllLeaves } from '../../src/brushes/leaves';
import { defaultPenParams, type PenSample, SpringPen } from '../../src/brushes/pen';
import { defaultBranchStyle, PlantPainter } from '../../src/brushes/plantPainter';
import { hexToRgb, type NipponColor, PALETTES } from '../../src/color/nippon';
import { BranchingPlant } from '../../src/growth/branching';
import { hashString } from '../../src/growth/rng';
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
import { WebAudioEngine } from '../../src/sound/webaudio';
import { StrokeRecorder } from '../../src/strokes/recorder';
import type { Thumb } from '../../src/ui/panels';
import { BG_PAPER, BG_SAMPLES, BG_USER, type BgState } from './backgrounds';
import { createPanel, type GrowState } from './panel';

const PAPER_GRAIN_DOTS = 6000;
const UNDO_LEVELS = 6;

const brushes = createBrushes();
const penParams = { ...defaultPenParams };
const pen = new SpringPen(penParams);
const grow: GrowState = {
  enabled: true,
  growth: { ...defaultGrowthParams },
  branch: { ...defaultBranchStyle },
  sound: { enabled: true, volume: 0.8 },
};
const engine = new WebAudioEngine(7);
let audioStarted = false;
const ui = {
  brush: 0,
  palette: 0,
  color: 0,
  auto: false,
  autoNext: 0,
  lastColor: undefined as NipponColor | undefined,
};
let leaves: LeafSprite[] = [];
const bg: BgState = { choice: BG_PAPER, params: { ...defaultBackdropParams } };
/** 已載入的背景（範例照名字快取；使用者的檔案只留最新一個） */
const backdrops = new Map<string, Backdrop>();

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const status = (msg: string) => {
  $('status').textContent = msg;
};

status('葉片素材載入中…');
loadAllLeaves()
  .then((l) => {
    leaves = l;
    status('');
  })
  .catch((err) => {
    console.error(err);
    status('葉片素材載入失敗（看 console），押花筆暫時不能用');
  });

const palette = () => PALETTES[ui.palette] ?? (PALETTES[0] as (typeof PALETTES)[number]);
const currentBrush = () => brushes[ui.brush] as Brush;

type Active = {
  brushIndex: number;
  brush: Brush;
  env: BrushEnv;
  last: PenSample;
  lifted: boolean;
  tx: number;
  ty: number;
};

new p5((p: p5) => {
  /** 紙（底色 + 紙紋）。背景是圖片 / 影片時，它變成蓋在上面的「紗」 */
  let paper: p5.Graphics;
  /** 筆畫和枝條，透明底，疊在最上面 */
  let ink: p5.Graphics;
  let active: Active | null = null;
  const recorder = new StrokeRecorder();
  let painters: { painter: PlantPainter; seq: number }[] = [];
  let plantSeq = 0;
  /** 每個快照記下當時的植物編號，復原時把之後長出來的植物一起拿掉 */
  const undoStack: { snap: HTMLCanvasElement; seq: number }[] = [];

  const ctxOf = (g: p5.Graphics | p5) => g.drawingContext as CanvasRenderingContext2D;
  const canvasOf = (g: p5.Graphics) => g.elt as unknown as HTMLCanvasElement;

  function paintPaper(g: p5.Graphics) {
    const pal = palette();
    drawPaper(g, { paper: pal.paper.hex, ink: [pal.grain, pal.grain] }, PAPER_GRAIN_DOTS);
  }

  /** 依目前色盤重鋪紙，筆畫不動。 */
  function newPaper() {
    paper?.remove();
    paper = p.createGraphics(p.width, p.height);
    paintPaper(paper);
    document.body.classList.toggle('dark', palette().dark);
    document.body.style.background = palette().paper.hex;
  }

  /** 新的筆畫層。keep 有值時把舊筆畫原尺寸貼回來（視窗縮放用）。 */
  function newInk(keep?: p5.Graphics) {
    const next = p.createGraphics(p.width, p.height);
    if (keep) ctxOf(next).drawImage(canvasOf(keep), 0, 0, keep.width, keep.height);
    ink?.remove();
    ink = next;
    // 還在畫的筆、還在長的植物都改畫到新的這層
    const ctx = ctxOf(ink);
    if (active) active.env.ctx = ctx;
    for (const { painter } of painters) painter.env.ctx = ctx;
  }

  // ---------- 背景 ----------
  function currentBackdrop(): Backdrop | undefined {
    return bg.choice === BG_PAPER ? undefined : backdrops.get(bg.choice);
  }

  function pauseVideosExcept(keep: Backdrop | undefined) {
    for (const b of backdrops.values()) {
      if (b === keep || !(b.el instanceof HTMLVideoElement)) continue;
      b.el.pause();
    }
    if (keep?.el instanceof HTMLVideoElement) void keep.el.play().catch(() => {});
  }

  async function selectBackground(choice: string) {
    bg.choice = choice;
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
        status(`背景載入失敗：${choice}（看 console）`);
        return;
      }
    }
    pauseVideosExcept(currentBackdrop());
    document.body.classList.toggle('media', currentBackdrop() !== undefined);
  }

  async function useFile(file: File) {
    status(`載入 ${file.name}…`);
    try {
      const b = await backdropFromFile(file);
      disposeBackdrop(backdrops.get(BG_USER));
      backdrops.set(BG_USER, b);
      status('');
      await selectBackground(BG_USER);
    } catch (err) {
      console.error(err);
      status(err instanceof Error ? err.message : String(err));
    }
  }

  function backgroundChoices(): string[] {
    return backgroundThumbs().map((t) => t.label);
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

  function makeEnv(color: NipponColor, ctx: CanvasRenderingContext2D): BrushEnv {
    return {
      ctx,
      color: hexToRgb(color.hex),
      inks: palette().inks.map((c) => hexToRgb(c.hex)),
      dark: palette().dark,
      noise: (x, y, z) => p.noise(x, y ?? 0, z ?? 0),
      leaves,
    };
  }

  /** 放開後的這一筆變成一株植物，用同一支筆、同一個顏色長出分枝。 */
  function addPlant(a: Active, stroke: ReturnType<StrokeRecorder['end']>) {
    if (!stroke || stroke.points.length < 2) return;
    const make = BRUSH_FACTORIES[a.brushIndex];
    if (!make) return;
    const plant = new BranchingPlant(
      stroke,
      { ...grow.growth },
      hashString(stroke.id),
      p.width / p.height,
    );
    const env = { ...a.env, ctx: ctxOf(ink) };
    const painter = new PlantPainter(plant, make, { ...a.brush.params }, env, {
      ...grow.branch,
      size: penParams.size,
      life: grow.growth.life,
    });
    painters.push({ painter, seq: plantSeq++ });
  }

  function finishStroke() {
    if (!active) return;
    const stroke = recorder.end();
    if (grow.enabled) addPlant(active, stroke);
    active = null;
  }

  function pushUndo() {
    const src = canvasOf(ink);
    const snap = document.createElement('canvas');
    snap.width = src.width;
    snap.height = src.height;
    (snap.getContext('2d') as CanvasRenderingContext2D).drawImage(src, 0, 0);
    undoStack.push({ snap, seq: plantSeq });
    if (undoStack.length > UNDO_LEVELS) undoStack.shift();
  }

  function undo() {
    finishStroke();
    const entry = undoStack.pop();
    if (!entry) return;
    const { snap, seq } = entry;
    painters = painters.filter((x) => x.seq < seq);
    const g = ctxOf(ink);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, snap.width, snap.height);
    g.drawImage(snap, 0, 0);
    g.restore();
  }

  function clear() {
    finishStroke();
    painters = [];
    recorder.clear();
    undoStack.length = 0;
    ink.clear();
  }

  function pickColor(): NipponColor {
    const inks = palette().inks;
    const c = ui.auto ? inks[ui.autoNext++ % inks.length] : inks[ui.color];
    return c ?? (inks[0] as NipponColor);
  }

  // ---------- HUD ----------
  function renderHud() {
    const pal = palette();
    const b = currentBrush();
    $('brush-name').textContent = b.name;
    const shown = ui.auto ? ui.lastColor : pal.inks[ui.color];
    const small = (t: string) => Object.assign(document.createElement('small'), { textContent: t });
    const label = $('color-name');
    if (!shown) label.replaceChildren('自動配色');
    else if (ui.auto)
      label.replaceChildren(`${shown.kanji}　`, small(shown.romaji), '　', small('自動'));
    else label.replaceChildren(`${shown.kanji}　`, small(shown.romaji));
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
    auto.title = '自動：每一筆輪流換色 (A)';
    auto.onclick = () => {
      ui.auto = !ui.auto;
      renderHud();
    };
    row.append(auto);
  }

  function selectBrush(i: number) {
    if (!brushes[i]) return;
    ui.brush = i;
    panel.showBrush(i);
    renderHud();
  }

  function renderToggles() {
    $('toggles').textContent =
      `生長${grow.enabled ? '開' : '關'} · 聲音${grow.sound.enabled ? '開' : '關'}`;
  }

  const panel = createPanel(penParams, brushes, grow, bg, {
    selectBrush,
    clear,
    undo,
    save: () => p.saveCanvas(`02-${currentBrush().name}-${Date.now()}`, 'png'),
    onChange: () => {
      engine.setVolume(grow.sound.volume);
      renderToggles();
    },
    selectBackground: (choice) => void selectBackground(choice),
    backgroundThumbs,
    currentBrush: () => ui.brush,
    openFile: (file) => void useFile(file),
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement || ev.metaKey || ev.ctrlKey) return;
    const k = ev.key.toLowerCase();
    const n = Number.parseInt(k, 10);
    if (n >= 1 && n <= brushes.length) selectBrush(n - 1);
    else if (k === 'p') {
      // 換色盤只換紙和色票，畫好的筆畫留著
      ui.palette = (ui.palette + 1) % PALETTES.length;
      ui.color = 0;
      newPaper();
      renderHud();
      panel.updateBackground();
    } else if (k === 'a') {
      ui.auto = !ui.auto;
      renderHud();
    } else if (k === 'z') undo();
    else if (k === 's') p.saveCanvas(`02-${currentBrush().name}-${Date.now()}`, 'png');
    else if (k === 'c') clear();
    else if (k === 'h') document.body.classList.toggle('hide-hud');
    else if (k === 'b') {
      const list = backgroundChoices();
      void selectBackground(list[(list.indexOf(bg.choice) + 1) % list.length] ?? BG_PAPER);
    } else if (k === 'g') {
      grow.enabled = !grow.enabled;
      panel.refresh();
      renderToggles();
    } else if (k === 'm') {
      grow.sound.enabled = !grow.sound.enabled;
      panel.refresh();
      renderToggles();
    }
  });

  // ---------- p5 ----------
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(Math.min(2, p.displayDensity()));
    newPaper();
    newInk();
    renderHud();
    renderToggles();
    panel.updateBackground();
  };

  const isOnCanvas = (ev: Event | undefined) => !ev || ev.target instanceof HTMLCanvasElement;

  p.mousePressed = (ev?: Event) => {
    if (!isOnCanvas(ev)) return;
    if (!audioStarted) {
      audioStarted = true;
      void engine.start().then(() => engine.setVolume(grow.sound.volume));
    }
    finishStroke();
    pushUndo();
    const brush = currentBrush();
    const color = pickColor();
    ui.lastColor = color;
    if (ui.auto) renderHud();
    const env = makeEnv(color, ctxOf(ink));
    const first = pen.reset(p.mouseX, p.mouseY);
    brush.begin(env, first);
    recorder.begin(first.x, first.y, p.width, p.height, p.millis());
    active = {
      brushIndex: ui.brush,
      brush,
      env,
      last: first,
      lifted: false,
      tx: p.mouseX,
      ty: p.mouseY,
    };
  };

  p.mouseReleased = () => {
    if (!active || active.lifted) return;
    active.lifted = true;
    active.tx = p.mouseX;
    active.ty = p.mouseY;
    pen.lift();
  };

  p.draw = () => {
    if (active) {
      const s = active.lifted ? pen.step(active.tx, active.ty) : pen.step(p.mouseX, p.mouseY);
      active.brush.segment(active.env, active.last, s);
      active.last = s;
      // 植物的主幹記錄筆尖實際走過的路（不是滑鼠），收筆漸細的尾巴不算
      if (!active.lifted) recorder.extend(s.x, s.y, p.width, p.height, p.millis());
      if (active.lifted && (!active.brush.taper || pen.done)) finishStroke();
    }

    const dt = Math.min(100, p.deltaTime);
    for (const { painter } of painters) {
      const events = painter.plant.step(dt);
      painter.paint(p.width, p.height);
      if (grow.sound.enabled) for (const e of events) engine.onGrowth(e);
    }
    painters = painters.filter((x) => x.painter.alive);

    composite();
  };

  /** 背景 → 紙（或紙紗）→ 筆畫 */
  function composite() {
    const ctx = ctxOf(p);
    const b = currentBackdrop();
    if (b) {
      ctx.fillStyle = palette().paper.hex;
      ctx.fillRect(0, 0, p.width, p.height);
      drawBackdrop(ctx, b, p.width, p.height, bg.params);
      if (bg.params.veil > 0) {
        ctx.save();
        ctx.globalAlpha = bg.params.veil;
        ctx.drawImage(canvasOf(paper), 0, 0, p.width, p.height);
        ctx.restore();
      }
      ctx.save();
      ctx.globalCompositeOperation = bg.params.blend;
      ctx.drawImage(canvasOf(ink), 0, 0, p.width, p.height);
      ctx.restore();
    } else {
      ctx.drawImage(canvasOf(paper), 0, 0, p.width, p.height);
      ctx.drawImage(canvasOf(ink), 0, 0, p.width, p.height);
    }
  }

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  p.windowResized = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      finishStroke();
      const old = ink;
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      undoStack.length = 0;
      newPaper();
      newInk(old);
    }, 150);
  };
});
