import type { PenParams } from '../../src/brushes/pen';
import type { BrushPalette } from '../../src/color/nippon';
import type { Growth3DParams } from '../../src/growth/branching3d';
import type { BotanicaParams } from '../../src/sound/botanica/params';
import { KEY_NAMES, type KeyName } from '../../src/sound/theory/keys';
import {
  button,
  fold,
  Panel,
  region,
  section,
  segmented,
  slider,
  type Thumb,
  tabs,
  thumbs,
  toggle,
} from '../../src/ui/panels';
import type { LeafStyle, StemStyle } from './plantView';

export type State = {
  growth: Growth3DParams;
  grow: { enabled: boolean };
  /** kind 是 SPECIES 的索引 */
  species: { kind: number; useSwatch: boolean; density: number; height: number };
  leaf: LeafStyle;
  stem: StemStyle;
  view: { autoRotate: boolean; rotateSpeed: number; fog: number; shadow: number };
  sound: {
    enabled: boolean;
    volume: number;
    /** basic = 第一版三角波；botanica = 四層取樣 */
    engine: 'basic' | 'botanica';
    botanica: BotanicaParams;
  };
  bg: { choice: string };
};

export const SPECIES = [
  { name: '押花樹', note: '分枝 + 真實葉片照片' },
  { name: '草', note: '一叢細長草葉，隨風晃' },
  { name: '曼珠沙華', note: '無葉直莖，頂端一圈紅花，花瓣後捲、花絲上翹' },
  { name: '紫羅蘭', note: '下半部披針葉，上半部花穗由下往上開' },
];

const TABS = ['此種', '鏡', '景', '聲', '筆尖'] as const;
type Tab = (typeof TABS)[number];

export type Actions = {
  onChange(): void;
  undo(): void;
  save(): void;
  clear(): void;
  resetView(): void;
  selectBackground(choice: string): void;
  backgroundThumbs(): Thumb[];
  openFile(file: File): void;
  palette(): BrushPalette;
  /** 目前選的色票；-1 = 自動 */
  colorIndex(): number;
  setColor(i: number): void;
  /** 手勢追蹤開著沒 */
  hand(): boolean;
  toggleHand(): void;
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/**
 * 介面分兩層：
 * - 前台：底部一條橫列（種｜色票｜景）＋ 左上角（調、復原、存圖、清空）。一直在。
 * - 後台：一張「調」卡片，分頁切換，內容跟著目前的種變；平常藏著，按 ` 或「調」打開。
 */
export function createUI(s: State, pen: PenParams, actions: Actions) {
  const changed = () => actions.onChange();
  let tab: Tab = '此種';

  // ---------- 後台：調 ----------
  const panel = new Panel({
    id: 's4-settings',
    title: '調',
    sub: '` 開關',
    right: 16,
    y: 16,
    open: false,
  });
  tabs(
    panel,
    TABS,
    () => tab,
    (t) => {
      tab = t;
      render();
    },
  );
  const content = region(panel);

  function render() {
    content((parent) => {
      if (tab === '此種') renderSpecies(parent);
      else if (tab === '鏡') {
        toggle(panel, '沒在動時自己轉（R）', s.view, 'autoRotate', changed, parent);
        slider(panel, '自轉速度', s.view, 'rotateSpeed', 0.1, 4, 0.05, changed, parent);
        slider(panel, '霧', s.view, 'fog', 0, 0.4, 0.005, changed, parent);
        slider(panel, '影子', s.view, 'shadow', 0, 0.6, 0.01, changed, parent);
        button(panel, '鏡頭回正', () => actions.resetView(), parent);
      } else if (tab === '景') {
        thumbs(
          panel,
          () => actions.backgroundThumbs(),
          (label) => s.bg.choice === label,
          (label) => actions.selectBackground(label),
          parent,
        );
        button(panel, '＋ 選自己的圖片或影片（也可以拖進畫面）', pickFile, parent);
      } else if (tab === '聲') {
        renderSound(parent);
      } else {
        slider(panel, '粗細', pen, 'size', 2, 60, 0.5, changed, parent);
        const adv = fold('進階', parent);
        slider(panel, '彈力', pen, 'spring', 0.05, 1, 0.01, changed, adv);
        slider(panel, '阻尼', pen, 'damping', 0.05, 0.95, 0.01, changed, adv);
        slider(panel, '快則細', pen, 'thinning', 0, 1, 0.01, changed, adv);
      }
    });
    panel.refresh();
  }

  /** 「此種」分頁：只放目前這種植物用得到的設定 */
  function renderSound(parent: HTMLElement) {
    const snd = s.sound;
    const b = snd.botanica;
    toggle(panel, '發聲（M）', snd, 'enabled', changed, parent);
    slider(panel, '音量', snd, 'volume', 0, 1, 0.01, changed, parent);
    segmented<'basic' | 'botanica'>(
      panel,
      [
        { label: '原本', value: 'basic' },
        { label: 'Botanica', value: 'botanica' },
      ],
      () => snd.engine,
      (v) => {
        snd.engine = v;
        changed();
      },
      parent,
    );
    section(panel, '調', parent);
    const label = (k: KeyName) => k.replace('b', '♭');
    for (const row of [KEY_NAMES.slice(0, 6), KEY_NAMES.slice(6)]) {
      segmented<KeyName>(
        panel,
        row.map((k) => ({ label: label(k), value: k })),
        () => b.key,
        (v) => {
          b.key = v;
          changed();
        },
        parent,
      );
    }
    slider(panel, '隨機幅度', b, 'randomness', 0, 1, 0.01, changed, parent);
    for (const [name, key] of [
      ['底：風、水', 'bed'],
      ['和弦：放開時綻放', 'bloom'],
      ['顆粒：分枝時', 'grains'],
      ['偶發：水滴、glitch', 'drips'],
    ] as const) {
      section(panel, name, parent);
      toggle(panel, '開', b[key], 'enabled', changed, parent);
      slider(panel, '音量', b[key], 'volume', 0, 1, 0.01, changed, parent);
    }
  }

  function renderSpecies(parent: HTMLElement) {
    const sp = SPECIES[s.species.kind];
    parent.append(el('div', 'ui-section', `${sp?.name ?? ''}　${sp?.note ?? ''}`));
    toggle(panel, '放開後會長（G）', s.grow, 'enabled', changed, parent);
    if (s.species.kind === 0) {
      slider(panel, '葉大小', s.leaf, 'size', 0.03, 0.4, 0.005, changed, parent);
      slider(panel, '每幾段一葉', s.growth, 'leafEvery', 1, 8, 1, changed, parent);
      slider(panel, '往裡外長', s.growth, 'outOfPlane', 0, 1, 0.01, changed, parent);
      slider(panel, '分岔機率', s.growth, 'branchChance', 0, 1, 0.01, changed, parent);
      slider(panel, '枝粗', s.stem, 'radius', 0.002, 0.05, 0.001, changed, parent);
      const adv = fold('進階', parent);
      slider(panel, '張角', s.leaf, 'angle', 0, 90, 1, changed, adv);
      slider(panel, '捲曲', s.leaf, 'curl', 0, 1, 0.01, changed, adv);
      slider(panel, '染色', s.leaf, 'tint', 0, 1, 0.01, changed, adv);
      slider(panel, '葉種 0=全', s.leaf, 'sets', 0, 4, 1, changed, adv);
      slider(panel, '速度', s.growth, 'speed', 0.02, 0.5, 0.005, changed, adv);
      slider(panel, '分岔夾角', s.growth, 'spread', 0.1, 2, 0.01, changed, adv);
      slider(panel, '彎曲', s.growth, 'noise', 0, 2, 0.01, changed, adv);
      slider(panel, '向上', s.growth, 'tropism', 0, 1.5, 0.01, changed, adv);
      slider(panel, '最深層數', s.growth, 'maxDepth', 1, 6, 1, changed, adv);
      slider(panel, '生命 ms', s.growth, 'life', 1000, 30000, 250, changed, adv);
      slider(panel, '起始芽數', s.growth, 'tipsPerStroke', 1, 16, 1, changed, adv);
    } else {
      toggle(panel, '用色票的顏色', s.species, 'useSwatch', changed, parent);
      slider(panel, '密度', s.species, 'density', 0.2, 3, 0.05, changed, parent);
      slider(panel, '高度', s.species, 'height', 0.3, 2.5, 0.05, changed, parent);
    }
  }

  // ---------- 前台：左上角 ----------
  const top = el('div', 'ui-top');
  const gear = el('button', 'ui-dock-btn', '調');
  gear.title = '調整（`）';
  gear.onclick = () => toggleSettings();
  top.append(gear);
  const handBtn = el('button', 'ui-dock-btn', '手');
  handBtn.title = '用手畫：捏起拇指和食指＝下筆；張開手掌左右上下揮＝轉向（要開攝影機）';
  handBtn.onclick = () => actions.toggleHand();
  top.append(handBtn);
  for (const [label, key, fn] of [
    ['復原', 'Z', actions.undo],
    ['存圖', 'S', actions.save],
    ['清空', 'C', actions.clear],
  ] as const) {
    const b = el('button', 'ui-dock-btn ui-action', label);
    b.title = key;
    b.onclick = () => fn();
    top.append(b);
  }
  document.body.append(top);

  const syncGear = () => gear.classList.toggle('on', panel.open);
  function toggleSettings() {
    panel.setOpen(!panel.open);
    if (panel.open) panel.setCollapsed(false);
    syncGear();
  }
  panel.onVisibility = syncGear;
  syncGear();

  // ---------- 前台：底部橫列 ----------
  const bar = el('div', 'ui-bar');
  document.body.append(bar);
  const pop = el('div', 'ui-pop');
  pop.hidden = true;
  document.body.append(pop);

  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,video/*';
  fileInput.style.display = 'none';
  document.body.append(fileInput);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) actions.openFile(file);
    fileInput.value = '';
  });
  function pickFile() {
    fileInput.click();
  }

  function thumbEl(t: Thumb, cls: string): HTMLButtonElement {
    const b = el('button', cls);
    b.title = t.label;
    if (t.kind === 'color') b.style.background = t.src;
    else if (t.kind === 'image') {
      const img = el('img');
      img.src = t.src;
      b.append(img);
    } else {
      const v = el('video');
      v.src = `${t.src}#t=1`;
      v.muted = true;
      v.preload = 'metadata';
      b.append(v);
    }
    return b;
  }

  function renderPop() {
    pop.replaceChildren();
    const grid = el('div', 'ui-thumbs');
    for (const t of actions.backgroundThumbs()) {
      const on = t.label === s.bg.choice ? ' on' : '';
      const b = thumbEl(t, `ui-thumb${t.kind === 'color' ? ' plain' : ''}${on}`);
      b.append(el('span', undefined, t.label));
      b.onclick = () => {
        actions.selectBackground(t.label);
        pop.hidden = true;
      };
      grid.append(b);
    }
    const more = el('button', 'ui-button', '＋ 自己的圖片或影片');
    more.style.marginTop = '8px';
    more.style.width = '100%';
    more.onclick = () => {
      pop.hidden = true;
      pickFile();
    };
    pop.append(grid, more);
  }

  function renderBar() {
    bar.replaceChildren();
    const species = el('div', 'ui-bar-group');
    SPECIES.forEach((sp, i) => {
      const b = el('button', `ui-chip${s.species.kind === i ? ' on' : ''}`, sp.name);
      b.title = `${i + 1}　${sp.note}`;
      b.onclick = () => {
        s.species.kind = i;
        renderBar();
        if (tab === '此種') render();
        changed();
      };
      species.append(b);
    });
    const colors = el('div', 'ui-bar-group');
    const pal = actions.palette();
    const name = el('span', 'ui-sub', pal.name);
    name.title = 'P 換紙';
    colors.append(name);
    pal.inks.forEach((c, i) => {
      const b = el('button', `ui-swatch${actions.colorIndex() === i ? ' on' : ''}`);
      b.style.background = c.hex;
      b.title = `${c.kanji} ${c.romaji}`;
      b.onclick = () => {
        actions.setColor(i);
        renderBar();
      };
      colors.append(b);
    });
    const auto = el('button', `ui-swatch auto${actions.colorIndex() < 0 ? ' on' : ''}`, '自');
    auto.title = '自動：每一筆輪流換色（A）';
    auto.onclick = () => {
      actions.setColor(actions.colorIndex() < 0 ? 0 : -1);
      renderBar();
    };
    colors.append(auto);
    const current = actions.backgroundThumbs().find((t) => t.label === s.bg.choice);
    const bgBtn = current ? thumbEl(current, 'ui-bgbtn') : el('button', 'ui-bgbtn');
    bgBtn.title = `景：${s.bg.choice}（B）`;
    bgBtn.onclick = () => {
      if (pop.hidden) {
        renderPop();
        const r = bgBtn.getBoundingClientRect();
        pop.style.left = `${Math.min(window.innerWidth - 276, Math.max(16, r.right - 260))}px`;
        pop.style.bottom = `${window.innerHeight - r.top + 12}px`;
      }
      pop.hidden = !pop.hidden;
    };
    bar.append(species, el('span', 'ui-bar-sep'), colors, el('span', 'ui-bar-sep'), bgBtn);
  }

  window.addEventListener('pointerdown', (ev) => {
    if (pop.hidden) return;
    const t = ev.target as Node;
    if (!pop.contains(t) && !bar.contains(t)) pop.hidden = true;
  });
  window.addEventListener('resize', () => panel.clamp());

  render();
  renderBar();

  return {
    /** 種、色、紙、景變了：重畫前台，「此種」分頁也跟著換 */
    refresh() {
      handBtn.classList.toggle('on', actions.hand());
      renderBar();
      render();
    },
    updateBackground() {
      renderBar();
      if (!pop.hidden) renderPop();
      if (tab === '景') render();
    },
    toggleSettings,
  };
}
