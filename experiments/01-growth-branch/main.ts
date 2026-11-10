import p5 from 'p5';
import { BranchingPlant } from '../../src/growth/branching';
import { hashString } from '../../src/growth/rng';
import { defaultGrowthParams } from '../../src/growth/types';
import { defaultPalette, inkFor } from '../../src/render/palette';
import { defaultRenderParams, drawPaper, drawSegment, drawStroke } from '../../src/render/paper';
import { WebAudioEngine } from '../../src/sound/webaudio';
import { fromFile, toFile } from '../../src/strokes/file';
import { StrokeRecorder } from '../../src/strokes/recorder';
import type { Stroke } from '../../src/strokes/types';
import { createPanel, type PanelState } from './panel';

const PAPER_GRAIN_DOTS = 6000;

const state: PanelState = {
  growth: { ...defaultGrowthParams },
  render: { ...defaultRenderParams },
  sound: { enabled: true, volume: 0.8 },
};

type Plant = { plant: BranchingPlant; drawn: number };

new p5((p: p5) => {
  let layer: p5.Graphics;
  const recorder = new StrokeRecorder();
  const plants: Plant[] = [];
  const engine = new WebAudioEngine(7);
  let started = false;

  const strokeColor = () => inkFor(defaultPalette, 0);

  /** 重建（或重設大小）離屏圖層並鋪紙。舊圖層一定要 remove，否則每次縮放都會留下一張隱藏 canvas。 */
  function resetLayer() {
    if (layer) layer.remove();
    layer = p.createGraphics(p.width, p.height);
    drawPaper(layer, defaultPalette, PAPER_GRAIN_DOTS);
  }

  const aspect = () => p.width / p.height;

  function redrawAll() {
    resetLayer();
    for (const s of recorder.strokes) drawStroke(layer, s, strokeColor(), state.render);
    for (const entry of plants) {
      for (const seg of entry.plant.segments) {
        drawSegment(layer, seg, inkFor(defaultPalette, seg.depth + 1), state.render);
      }
      entry.drawn = entry.plant.segments.length;
    }
  }

  function addPlant(s: Stroke) {
    const plant = new BranchingPlant(s, { ...state.growth }, hashString(s.id), aspect());
    plants.push({ plant, drawn: 0 });
  }

  function isOnCanvas(ev: Event | undefined): boolean {
    return !ev || ev.target instanceof HTMLCanvasElement;
  }

  const gui = createPanel(state, {
    clear() {
      recorder.clear();
      plants.length = 0;
      resetLayer();
      gui.title('01 畫一筆，它會長');
    },
    exportJson() {
      const file = toFile(recorder.strokes, { width: p.width, height: p.height });
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strokes-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    async importJson(file: File) {
      try {
        const parsed = fromFile(JSON.parse(await file.text()));
        recorder.clear();
        plants.length = 0;
        for (const s of parsed.strokes) {
          recorder.strokes.push(s);
          addPlant(s);
        }
        redrawAll();
        gui.title(`01 已匯入 ${parsed.strokes.length} 筆`);
      } catch (err) {
        console.error('匯入失敗', err);
        gui.title('01 匯入失敗（看 console）');
      }
    },
    onChange() {
      engine.setVolume(state.sound.volume);
    },
  });

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(Math.min(2, p.displayDensity()));
    resetLayer();
  };

  p.mousePressed = (ev?: Event) => {
    if (!isOnCanvas(ev)) return;
    if (!started) {
      started = true;
      void engine.start().then(() => engine.setVolume(state.sound.volume));
    }
    // 上一筆若因切換視窗等原因沒收到 mouseReleased，先讓它長出來，不要丟掉
    const dangling = recorder.end();
    if (dangling) addPlant(dangling);
    recorder.begin(p.mouseX, p.mouseY, p.width, p.height, p.millis());
  };

  p.mouseDragged = (ev?: Event) => {
    if (!isOnCanvas(ev)) return;
    const added = recorder.extend(p.mouseX, p.mouseY, p.width, p.height, p.millis());
    const pts = recorder.current?.points;
    if (!added || !pts || pts.length < 2) return;
    // 只畫最新的一小段，避免整筆重畫
    const tail: Stroke = { id: 'tail', startedAt: 0, points: pts.slice(-2) };
    drawStroke(layer, tail, strokeColor(), state.render);
  };

  p.mouseReleased = () => {
    const s = recorder.end();
    if (!s) return;
    if (s.points.length === 1) drawStroke(layer, s, strokeColor(), state.render);
    addPlant(s);
  };

  p.draw = () => {
    const dt = Math.min(100, p.deltaTime);
    for (const entry of plants) {
      const events = entry.plant.step(dt);
      const segs = entry.plant.segments;
      for (let i = entry.drawn; i < segs.length; i++) {
        const seg = segs[i] as (typeof segs)[number];
        drawSegment(layer, seg, inkFor(defaultPalette, seg.depth + 1), state.render);
      }
      entry.drawn = segs.length;
      if (state.sound.enabled) for (const e of events) engine.onGrowth(e);
    }
    p.image(layer, 0, 0);
  };

  // 拖曳視窗邊緣時 resize 事件每幀都來；等停下來再重畫一次
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  p.windowResized = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      redrawAll();
    }, 150);
  };
});
