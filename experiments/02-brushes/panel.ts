import type { Brush } from '../../src/brushes';
import type { PenParams } from '../../src/brushes/pen';
import type { defaultBranchStyle } from '../../src/brushes/plantPainter';
import type { GrowthParams } from '../../src/growth/types';
import type { BackdropParams } from '../../src/render/backdrop';
import {
  button,
  Dock,
  Panel,
  region,
  segmented,
  slider,
  type Thumb,
  thumbs,
  tiles,
  toggle,
} from '../../src/ui/panels';
import type { BgState } from './backgrounds';

export type GrowState = {
  enabled: boolean;
  growth: GrowthParams;
  branch: typeof defaultBranchStyle;
  sound: { enabled: boolean; volume: number };
};

export type PanelActions = {
  selectBrush(i: number): void;
  currentBrush(): number;
  clear(): void;
  undo(): void;
  save(): void;
  onChange(): void;
  selectBackground(choice: string): void;
  backgroundThumbs(): Thumb[];
  openFile(file: File): void;
};

/**
 * 五張卡片：筆、景（預設打開）、長、尖、聲（預設收在左上角圓鈕）。
 * 左上角圓鈕列後面接 復原 / 存圖 / 清空。
 */
export function createPanel(
  pen: PenParams,
  brushes: Brush[],
  grow: GrowState,
  bg: BgState,
  actions: PanelActions,
) {
  const changed = () => actions.onChange();

  // ---------- 筆 ----------
  const brushPanel = new Panel({ id: 'brush', title: '筆', sub: '1–6', right: 16, y: 16 });
  tiles(
    brushPanel,
    brushes.map((b, i) => ({ label: b.name, sub: String(i + 1), title: b.note })),
    (i) => actions.currentBrush() === i,
    (i) => actions.selectBrush(i),
  );
  const brushParams = region(brushPanel);
  function showBrush(i: number) {
    const b = brushes[i];
    if (!b) return;
    brushParams((parent) => {
      const note = document.createElement('div');
      note.className = 'ui-section';
      note.textContent = b.note;
      parent.append(note);
      for (const [key, spec] of Object.entries(b.specs)) {
        slider(
          brushPanel,
          spec.label,
          b.params,
          key,
          spec.min,
          spec.max,
          spec.step,
          changed,
          parent,
        );
      }
    });
    brushPanel.refresh();
  }

  // ---------- 景 ----------
  const bgPanel = new Panel({
    id: 'bg',
    title: '景',
    sub: 'B · 可拖檔案進畫面',
    right: 280,
    y: 16,
  });
  const rebuildThumbs = thumbs(
    bgPanel,
    () => actions.backgroundThumbs(),
    (label) => bg.choice === label,
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
  const p: BackdropParams = bg.params;
  slider(bgPanel, '紗', p, 'veil', 0, 1, 0.01, changed);
  slider(bgPanel, '褪色', p, 'fade', 0, 1, 0.01, changed);
  slider(bgPanel, '亮度', p, 'brightness', 0.2, 1.8, 0.01, changed);
  slider(bgPanel, '模糊', p, 'blur', 0, 30, 0.5, changed);
  segmented<BackdropParams['blend']>(
    bgPanel,
    [
      { label: '一般', value: 'source-over' },
      { label: '相乘', value: 'multiply' },
      { label: '變亮', value: 'screen' },
    ],
    () => p.blend,
    (v) => {
      p.blend = v;
      changed();
    },
  );

  // ---------- 長 ----------
  const growPanel = new Panel({
    id: 'grow',
    title: '長',
    sub: 'G',
    right: 16,
    y: 400,
    open: false,
  });
  toggle(growPanel, '放開後會長', grow, 'enabled', changed);
  const g = grow.growth;
  slider(growPanel, '速度', g, 'speed', 0.01, 0.3, 0.005, changed);
  slider(growPanel, '段長', g, 'segmentLength', 0.004, 0.04, 0.001, changed);
  slider(growPanel, '分岔機率', g, 'branchChance', 0, 1, 0.01, changed);
  slider(growPanel, '分岔夾角', g, 'spread', 0.1, 2.5, 0.05, changed);
  slider(growPanel, '彎曲', g, 'noise', 0, 1.5, 0.05, changed);
  slider(growPanel, '最深層數', g, 'maxDepth', 1, 8, 1, changed);
  slider(growPanel, '生命 ms', g, 'life', 1000, 20000, 250, changed);
  slider(growPanel, '起始芽數', g, 'tipsPerStroke', 1, 20, 1, changed);
  slider(growPanel, '芽上限', g, 'maxTips', 10, 800, 10, changed);
  slider(growPanel, '枝條粗細', grow.branch, 'width', 0.1, 1.5, 0.01, changed);
  slider(growPanel, '越老越細', grow.branch, 'ageThin', 0, 1, 0.01, changed);

  // ---------- 尖 ----------
  const penPanel = new Panel({
    id: 'pen',
    title: '尖',
    sub: '筆尖手感',
    right: 280,
    y: 400,
    open: false,
  });
  slider(penPanel, '粗細', pen, 'size', 2, 60, 0.5, changed);
  slider(penPanel, '彈力', pen, 'spring', 0.05, 1, 0.01, changed);
  slider(penPanel, '阻尼', pen, 'damping', 0.05, 0.95, 0.01, changed);
  slider(penPanel, '快則細', pen, 'thinning', 0, 1, 0.01, changed);
  slider(penPanel, '最快速度', pen, 'maxSpeed', 5, 120, 1, changed);
  slider(penPanel, '收筆幀數', pen, 'taperFrames', 1, 60, 1, changed);
  slider(penPanel, '筆寬反應', pen, 'widthEase', 0.02, 1, 0.01, changed);

  // ---------- 聲 ----------
  const soundPanel = new Panel({
    id: 'sound',
    title: '聲',
    sub: 'M',
    right: 544,
    y: 400,
    open: false,
  });
  toggle(soundPanel, '分枝時發聲', grow.sound, 'enabled', changed);
  slider(soundPanel, '音量', grow.sound, 'volume', 0, 1, 0.01, changed);

  // ---------- 圓鈕列 ----------
  const panels = [brushPanel, bgPanel, growPanel, penPanel, soundPanel];
  const dock = new Dock({ left: 16, top: 58 });
  for (const panel of panels) dock.add(panel);
  dock.action('復原', 'Z', () => actions.undo());
  dock.action('存圖', 'S', () => actions.save());
  dock.action('清空', 'C', () => actions.clear());

  window.addEventListener('resize', () => {
    for (const panel of panels) panel.clamp();
  });

  showBrush(0);

  return {
    showBrush,
    /** 背景清單或目前選擇變了 */
    updateBackground() {
      rebuildThumbs();
      bgPanel.refresh();
    },
    /** 外部（快捷鍵）改了狀態後，讓所有卡片重讀 */
    refresh() {
      for (const panel of panels) panel.refresh();
    },
  };
}
