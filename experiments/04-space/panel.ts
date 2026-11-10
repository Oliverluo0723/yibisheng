import type { PenParams } from '../../src/brushes/pen';
import type { Growth3DParams } from '../../src/growth/branching3d';
import { button, Dock, Panel, slider, type Thumb, thumbs, toggle } from '../../src/ui/panels';
import type { LeafStyle, StemStyle } from './plantView';

export type State = {
  growth: Growth3DParams;
  grow: { enabled: boolean };
  leaf: LeafStyle;
  stem: StemStyle;
  view: { autoRotate: boolean; rotateSpeed: number; fog: number; shadow: number };
  sound: { enabled: boolean; volume: number };
  bg: { choice: string };
};

export type Actions = {
  onChange(): void;
  undo(): void;
  save(): void;
  clear(): void;
  resetView(): void;
  selectBackground(choice: string): void;
  backgroundThumbs(): Thumb[];
  openFile(file: File): void;
};

/** 卡片：葉、長、鏡（預設開）；景、尖、聲（收在圓鈕）。 */
export function createPanel(s: State, pen: PenParams, actions: Actions) {
  const changed = () => actions.onChange();

  // ---------- 葉 ----------
  const leafPanel = new Panel({
    id: 's4-leaf',
    title: '葉',
    sub: '真實葉片照片',
    right: 16,
    y: 16,
  });
  slider(leafPanel, '葉大小', s.leaf, 'size', 0.03, 0.4, 0.005, changed);
  slider(leafPanel, '每幾段一葉', s.growth, 'leafEvery', 1, 8, 1, changed);
  slider(leafPanel, '張角', s.leaf, 'angle', 0, 90, 1, changed);
  slider(leafPanel, '捲曲', s.leaf, 'curl', 0, 1, 0.01, changed);
  slider(leafPanel, '染色', s.leaf, 'tint', 0, 1, 0.01, changed);
  slider(leafPanel, '葉種 0=全', s.leaf, 'sets', 0, 4, 1, changed);

  // ---------- 長 ----------
  const growPanel = new Panel({ id: 's4-grow', title: '長', sub: '往空間裡長', right: 16, y: 250 });
  toggle(growPanel, '放開後會長', s.grow, 'enabled', changed);
  const g = s.growth;
  slider(growPanel, '往裡外長', g, 'outOfPlane', 0, 1, 0.01, changed);
  slider(growPanel, '速度', g, 'speed', 0.02, 0.5, 0.005, changed);
  slider(growPanel, '分岔機率', g, 'branchChance', 0, 1, 0.01, changed);
  slider(growPanel, '分岔夾角', g, 'spread', 0.1, 2, 0.01, changed);
  slider(growPanel, '彎曲', g, 'noise', 0, 2, 0.01, changed);
  slider(growPanel, '向上', g, 'tropism', 0, 1.5, 0.01, changed);
  slider(growPanel, '最深層數', g, 'maxDepth', 1, 6, 1, changed);
  slider(growPanel, '生命 ms', g, 'life', 1000, 30000, 250, changed);
  slider(growPanel, '起始芽數', g, 'tipsPerStroke', 1, 16, 1, changed);
  slider(growPanel, '枝粗', s.stem, 'radius', 0.002, 0.05, 0.001, changed);

  // ---------- 鏡 ----------
  const viewPanel = new Panel({ id: 's4-view', title: '鏡', sub: 'R 自轉', right: 280, y: 16 });
  toggle(viewPanel, '沒在動時自己轉', s.view, 'autoRotate', changed);
  slider(viewPanel, '自轉速度', s.view, 'rotateSpeed', 0.1, 4, 0.05, changed);
  slider(viewPanel, '霧', s.view, 'fog', 0, 0.4, 0.005, changed);
  slider(viewPanel, '影子', s.view, 'shadow', 0, 0.6, 0.01, changed);
  button(viewPanel, '鏡頭回正', () => actions.resetView());

  // ---------- 景 ----------
  const bgPanel = new Panel({
    id: 's4-bg',
    title: '景',
    sub: 'B',
    right: 280,
    y: 250,
    open: false,
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

  // ---------- 尖 ----------
  const penPanel = new Panel({
    id: 's4-pen',
    title: '尖',
    sub: '筆尖手感',
    right: 544,
    y: 250,
    open: false,
  });
  slider(penPanel, '粗細', pen, 'size', 2, 60, 0.5, changed);
  slider(penPanel, '彈力', pen, 'spring', 0.05, 1, 0.01, changed);
  slider(penPanel, '阻尼', pen, 'damping', 0.05, 0.95, 0.01, changed);

  // ---------- 聲 ----------
  const soundPanel = new Panel({
    id: 's4-sound',
    title: '聲',
    sub: 'M',
    right: 544,
    y: 16,
    open: false,
  });
  toggle(soundPanel, '分枝時發聲', s.sound, 'enabled', changed);
  slider(soundPanel, '音量', s.sound, 'volume', 0, 1, 0.01, changed);

  const panels = [leafPanel, growPanel, viewPanel, bgPanel, penPanel, soundPanel];
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
