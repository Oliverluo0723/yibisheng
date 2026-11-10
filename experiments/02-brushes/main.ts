import p5 from 'p5';
import { BRUSH_FACTORIES, type Brush, type BrushEnv, createBrushes } from '../../src/brushes';
import { type LeafSprite, loadAllLeaves } from '../../src/brushes/leaves';
import { defaultPenParams, type PenSample, SpringPen } from '../../src/brushes/pen';
import { defaultBranchStyle, PlantPainter } from '../../src/brushes/plantPainter';
import { hexToRgb, type NipponColor, PALETTES } from '../../src/color/nippon';
import { BranchingPlant } from '../../src/growth/branching';
import { hashString } from '../../src/growth/rng';
import { defaultGrowthParams } from '../../src/growth/types';
import { drawPaper } from '../../src/render/paper';
import { WebAudioEngine } from '../../src/sound/webaudio';
import { StrokeRecorder } from '../../src/strokes/recorder';
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
  let base: p5.Graphics;
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

  /** 新的一張紙。keep 有值時把舊畫面原尺寸貼回來（視窗縮放用）。 */
  function newSheet(keep?: p5.Graphics) {
    const next = p.createGraphics(p.width, p.height);
    paintPaper(next);
    if (keep) ctxOf(next).drawImage(canvasOf(keep), 0, 0, keep.width, keep.height);
    base?.remove();
    base = next;
    document.body.classList.toggle('dark', palette().dark);
    document.body.style.background = palette().paper.hex;
  }

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
    const env = { ...a.env, ctx: ctxOf(base) };
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
    const src = canvasOf(base);
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
    const g = ctxOf(base);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(snap, 0, 0);
    g.restore();
  }

  function clear() {
    finishStroke();
    painters = [];
    recorder.clear();
    undoStack.length = 0;
    newSheet();
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

  const panel = createPanel(penParams, brushes, grow, {
    selectBrush,
    clear,
    undo,
    save: () => p.saveCanvas(`02-${currentBrush().name}-${Date.now()}`, 'png'),
    onChange: () => {
      engine.setVolume(grow.sound.volume);
      renderToggles();
    },
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement || ev.metaKey || ev.ctrlKey) return;
    const k = ev.key.toLowerCase();
    const n = Number.parseInt(k, 10);
    if (n >= 1 && n <= brushes.length) selectBrush(n - 1);
    else if (k === 'p') {
      ui.palette = (ui.palette + 1) % PALETTES.length;
      ui.color = 0;
      clear();
      renderHud();
    } else if (k === 'a') {
      ui.auto = !ui.auto;
      renderHud();
    } else if (k === 'z') undo();
    else if (k === 's') p.saveCanvas(`02-${currentBrush().name}-${Date.now()}`, 'png');
    else if (k === 'c') clear();
    else if (k === 'h') document.body.classList.toggle('hide-hud');
    else if (k === 'g') {
      grow.enabled = !grow.enabled;
      for (const c of panel.gui.controllersRecursive()) c.updateDisplay();
      renderToggles();
    } else if (k === 'm') {
      grow.sound.enabled = !grow.sound.enabled;
      for (const c of panel.gui.controllersRecursive()) c.updateDisplay();
      renderToggles();
    }
  });

  // ---------- p5 ----------
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(Math.min(2, p.displayDensity()));
    newSheet();
    renderHud();
    renderToggles();
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
    const env = makeEnv(color, ctxOf(base));
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

    p.image(base, 0, 0);
  };

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  p.windowResized = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      finishStroke();
      const old = base;
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      undoStack.length = 0;
      newSheet(old);
    }, 150);
  };
});
