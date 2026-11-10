import type { Brush } from '../../src/brushes';
import type { PenParams } from '../../src/brushes/pen';
import type { GrowthParams } from '../../src/growth/types';
import type { BackdropParams } from '../../src/render/backdrop';
import type { DepthParams } from '../../src/render/parallax';
import {
  button,
  Dock,
  Panel,
  segmented,
  slider,
  type Thumb,
  thumbs,
  toggle,
} from '../../src/ui/panels';

export type State = {
  /** 下一筆放第幾層；-1 = 自動（每筆往前一層） */
  layer: number;
  depth: DepthParams;
  grow: { enabled: boolean; random: boolean; amount: number; growth: GrowthParams };
  sound: { enabled: boolean; volume: number };
  bg: { choice: string; params: BackdropParams };
};

export type Actions = {
  onChange(): void;
  /** 景深的外觀參數改了，遠層要重算模糊 */
  onDepthLook(): void;
  undo(): void;
  save(): void;
  clear(): void;
  selectBackground(choice: string): void;
  backgroundThumbs(): Thumb[];
  openFile(file: File): void;
};

/** 卡片：深、押花、景（預設開）；長、尖、聲（收在圓鈕）。 */
export function createPanel(s: State, brush: Brush, pen: PenParams, actions: Actions) {
  const changed = () => actions.onChange();
  const look = () => actions.onDepthLook();

  // ---------- 深 ----------
  const depthPanel = new Panel({
    id: 'd3-depth',
    title: '深',
    sub: '下一筆放哪一層',
    right: 16,
    y: 16,
  });
  segmented<number>(
    depthPanel,
    [
      { label: '自動', value: -1 },
      ...Array.from({ length: s.depth.layers }, (_, i) => ({ label: String(i + 1), value: i })),
    ],
    () => s.layer,
    (v) => {
      s.layer = v;
      changed();
    },
  );
  slider(depthPanel, '視差', s.depth, 'shift', 0, 150, 1, changed);
  slider(depthPanel, '鏡頭漂移', s.depth, 'drift', 0, 1, 0.01, changed);
  slider(depthPanel, '呼吸', s.depth, 'breath', 0, 0.08, 0.002, changed);
  slider(depthPanel, '遠處模糊', s.depth, 'farBlur', 0, 10, 0.1, look);
  slider(depthPanel, '遠處淡', s.depth, 'farAlpha', 0.1, 1, 0.01, look);
  slider(depthPanel, '遠處灰', s.depth, 'farSaturate', 0, 1, 0.01, look);

  // ---------- 押花 ----------
  const brushPanel = new Panel({
    id: 'd3-brush',
    title: '押花',
    glyph: '花',
    sub: '葉片',
    right: 16,
    y: 300,
  });
  for (const [key, spec] of Object.entries(brush.specs)) {
    slider(brushPanel, spec.label, brush.params, key, spec.min, spec.max, spec.step, changed);
  }

  // ---------- 景 ----------
  const bgPanel = new Panel({
    id: 'd3-bg',
    title: '景',
    sub: 'B · 最遠的那一層',
    right: 280,
    y: 16,
  });
  const rebuildThumbs = thumbs(
    bgPanel,
    () => actions.backgroundThumbs(),
    (label) => s.bg.choice === label,
    (label) => actions.selectBackground(label),
  );
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*';
  fileInput.style.display = 'none';
  document.body.append(fileInput);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) actions.openFile(file);
    fileInput.value = '';
  });
  button(bgPanel, '＋ 選自己的圖片或影片', () => fileInput.click());
  slider(bgPanel, '紗', s.bg.params, 'veil', 0, 1, 0.01, changed);
  slider(bgPanel, '褪色', s.bg.params, 'fade', 0, 1, 0.01, changed);
  slider(bgPanel, '亮度', s.bg.params, 'brightness', 0.2, 1.8, 0.01, changed);
  slider(bgPanel, '模糊', s.bg.params, 'blur', 0, 30, 0.5, changed);

  // ---------- 長 ----------
  const growPanel = new Panel({
    id: 'd3-grow',
    title: '長',
    sub: 'G',
    right: 280,
    y: 420,
    open: false,
  });
  toggle(growPanel, '放開後會長', s.grow, 'enabled', changed);
  toggle(growPanel, '每筆隨機', s.grow, 'random', changed);
  slider(growPanel, '隨機幅度', s.grow, 'amount', 0, 1, 0.01, changed);
  const g = s.grow.growth;
  slider(growPanel, '速度', g, 'speed', 0.01, 0.3, 0.005, changed);
  slider(growPanel, '分岔機率', g, 'branchChance', 0, 1, 0.01, changed);
  slider(growPanel, '最深層數', g, 'maxDepth', 1, 8, 1, changed);
  slider(growPanel, '生命 ms', g, 'life', 1000, 20000, 250, changed);
  slider(growPanel, '向光', g, 'tropism', 0, 1, 0.01, changed);

  // ---------- 尖 ----------
  const penPanel = new Panel({
    id: 'd3-pen',
    title: '尖',
    sub: '筆尖手感',
    right: 544,
    y: 420,
    open: false,
  });
  slider(penPanel, '粗細', pen, 'size', 2, 60, 0.5, changed);
  slider(penPanel, '彈力', pen, 'spring', 0.05, 1, 0.01, changed);
  slider(penPanel, '阻尼', pen, 'damping', 0.05, 0.95, 0.01, changed);
  slider(penPanel, '快則細', pen, 'thinning', 0, 1, 0.01, changed);

  // ---------- 聲 ----------
  const soundPanel = new Panel({
    id: 'd3-sound',
    title: '聲',
    sub: 'M',
    right: 544,
    y: 300,
    open: false,
  });
  toggle(soundPanel, '分枝時發聲', s.sound, 'enabled', changed);
  slider(soundPanel, '音量', s.sound, 'volume', 0, 1, 0.01, changed);

  const panels = [depthPanel, brushPanel, bgPanel, growPanel, penPanel, soundPanel];
  const dock = new Dock({ left: 16, top: 58 });
  for (const panel of panels) dock.add(panel);
  dock.action('復原', 'Z', () => actions.undo());
  dock.action('存圖', 'S', () => actions.save());
  dock.action('清空', 'C', () => actions.clear());
  window.addEventListener('resize', () => {
    for (const panel of panels) panel.clamp();
  });

  return {
    updateBackground() {
      rebuildThumbs();
      bgPanel.refresh();
    },
    refresh() {
      for (const panel of panels) panel.refresh();
    },
  };
}
