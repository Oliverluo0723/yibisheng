import p5 from 'p5';
import { type Brush, type BrushEnv, createBrushes } from '../../src/brushes';
import { type LeafSprite, loadAllLeaves } from '../../src/brushes/leaves';
import { defaultPenParams, type PenSample, SpringPen } from '../../src/brushes/pen';
import { hexToRgb, type NipponColor, PALETTES } from '../../src/color/nippon';
import { drawPaper } from '../../src/render/paper';
import { createPanel } from './panel';

const PAPER_GRAIN_DOTS = 6000;
const UNDO_LEVELS = 6;

const brushes = createBrushes();
const penParams = { ...defaultPenParams };
const pen = new SpringPen(penParams);
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
  brush: Brush;
  env: BrushEnv;
  last: PenSample;
  lifted: boolean;
  tx: number;
  ty: number;
};

new p5((p: p5) => {
  let base: p5.Graphics;
  let live: p5.Graphics;
  let active: Active | null = null;
  const undoStack: HTMLCanvasElement[] = [];

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
    live?.remove();
    live = p.createGraphics(p.width, p.height);
    document.body.classList.toggle('dark', palette().dark);
    document.body.style.background = palette().paper.hex;
  }

  /** 暫存層（麥克筆）以半透明 + 疊色模式畫到目標上 */
  function compositeLive(target: CanvasRenderingContext2D, alpha: number) {
    target.save();
    target.globalAlpha = alpha;
    target.globalCompositeOperation = palette().dark ? 'screen' : 'multiply';
    target.drawImage(canvasOf(live), 0, 0, p.width, p.height);
    target.restore();
  }

  function finishStroke() {
    if (!active) return;
    if (active.brush.buffered) compositeLive(ctxOf(base), active.brush.buffered.alpha);
    active = null;
  }

  function pushUndo() {
    const src = canvasOf(base);
    const snap = document.createElement('canvas');
    snap.width = src.width;
    snap.height = src.height;
    (snap.getContext('2d') as CanvasRenderingContext2D).drawImage(src, 0, 0);
    undoStack.push(snap);
    if (undoStack.length > UNDO_LEVELS) undoStack.shift();
  }

  function undo() {
    finishStroke();
    const snap = undoStack.pop();
    if (!snap) return;
    const g = ctxOf(base);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(snap, 0, 0);
    g.restore();
  }

  function clear() {
    finishStroke();
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

  const panel = createPanel(penParams, brushes, {
    selectBrush,
    clear,
    undo,
    save: () => p.saveCanvas(`02-${currentBrush().name}-${Date.now()}`, 'png'),
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
  });

  // ---------- p5 ----------
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(Math.min(2, p.displayDensity()));
    newSheet();
    renderHud();
  };

  const isOnCanvas = (ev: Event | undefined) => !ev || ev.target instanceof HTMLCanvasElement;

  p.mousePressed = (ev?: Event) => {
    if (!isOnCanvas(ev)) return;
    finishStroke();
    pushUndo();
    const brush = currentBrush();
    const color = pickColor();
    ui.lastColor = color;
    if (ui.auto) renderHud();
    if (brush.buffered) live.clear();
    const env: BrushEnv = {
      ctx: ctxOf(brush.buffered ? live : base),
      color: hexToRgb(color.hex),
      inks: palette().inks.map((c) => hexToRgb(c.hex)),
      dark: palette().dark,
      noise: (x, y, z) => p.noise(x, y ?? 0, z ?? 0),
      leaves,
      size: penParams.size,
    };
    const first = pen.reset(p.mouseX, p.mouseY);
    brush.begin(env, first);
    active = { brush, env, last: first, lifted: false, tx: p.mouseX, ty: p.mouseY };
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
      if (active.lifted && (!active.brush.taper || pen.done)) finishStroke();
    }
    p.image(base, 0, 0);
    if (active?.brush.buffered) compositeLive(ctxOf(p), active.brush.buffered.alpha);
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
