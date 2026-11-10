import './panels.css';

/**
 * 小型浮動面板：每張卡片可以拖動、收合（–）、隱藏（×），
 * 用 Dock 上的圓鈕叫回來。位置與開合狀態記在 localStorage（拿不到就算了）。
 */

type Saved = { x?: number; y?: number; open?: boolean; collapsed?: boolean };

const STORE_PREFIX = 'p5b.panel.';

function load(id: string): Saved {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + id);
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    return {};
  }
}

function save(id: string, s: Saved): void {
  try {
    localStorage.setItem(STORE_PREFIX + id, JSON.stringify(s));
  } catch {
    // 私密視窗等情況存不了，不影響使用
  }
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export type PanelOptions = {
  id: string;
  /** 標題（一兩個字） */
  title: string;
  /** 標題旁的小字說明 */
  sub?: string;
  /** Dock 圓鈕上的字，預設用 title */
  glyph?: string;
  /** 預設位置；right 有值時從右邊算 */
  x?: number;
  right?: number;
  y: number;
  open?: boolean;
  collapsed?: boolean;
};

export class Panel {
  readonly root: HTMLDivElement;
  readonly body: HTMLDivElement;
  private state: Required<Saved>;
  private refreshers: { fn: () => void; group?: object }[] = [];
  /** 目前新增的控制項歸屬的群組（region 用） */
  group?: object;
  onVisibility?: () => void;

  constructor(readonly opts: PanelOptions) {
    const saved = load(opts.id);
    const width = 252;
    const defaultX =
      opts.right !== undefined ? window.innerWidth - width - opts.right : (opts.x ?? 16);
    this.state = {
      x: saved.x ?? defaultX,
      y: saved.y ?? opts.y,
      open: saved.open ?? opts.open ?? true,
      collapsed: saved.collapsed ?? opts.collapsed ?? false,
    };

    this.root = el('div', 'ui-panel');
    const head = el('div', 'ui-head');
    head.append(el('span', 'ui-title', opts.title));
    if (opts.sub) head.append(el('span', 'ui-sub', opts.sub));
    const btns = el('div', 'ui-head-btns');
    const fold = el('button', undefined, '–');
    fold.title = '收合';
    fold.onclick = () => this.setCollapsed(!this.state.collapsed);
    const close = el('button', undefined, '×');
    close.title = '隱藏（用左上角圓鈕叫回來）';
    close.onclick = () => this.setOpen(false);
    btns.append(fold, close);
    head.append(btns);
    head.ondblclick = (ev) => {
      if (!(ev.target instanceof HTMLButtonElement)) this.setCollapsed(!this.state.collapsed);
    };
    this.body = el('div', 'ui-body');
    this.root.append(head, this.body);
    document.body.append(this.root);
    this.enableDrag(head);
    this.apply();
    if (this.state.open) this.clamp();
  }

  get open(): boolean {
    return this.state.open;
  }

  setOpen(open: boolean): void {
    this.state.open = open;
    this.persist();
    this.apply();
    this.onVisibility?.();
  }

  setCollapsed(collapsed: boolean): void {
    this.state.collapsed = collapsed;
    this.persist();
    this.apply();
  }

  /** 畫面縮放後，確保卡片還在視窗內 */
  clamp(): void {
    const r = this.root.getBoundingClientRect();
    this.state.x = Math.min(Math.max(0, this.state.x), Math.max(0, window.innerWidth - r.width));
    this.state.y = Math.min(Math.max(0, this.state.y), Math.max(0, window.innerHeight - 40));
    this.apply();
  }

  /** 讓所有控制項重新讀一次值（外部用快捷鍵改了狀態時呼叫） */
  refresh(): void {
    for (const r of this.refreshers) r.fn();
  }

  /** 控制項登記自己的更新函式 */
  track(fn: () => void): void {
    this.refreshers.push({ fn, group: this.group });
    fn();
  }

  /** 移除某個群組登記的更新函式（region 重建時） */
  dropGroup(group: object): void {
    this.refreshers = this.refreshers.filter((r) => r.group !== group);
  }

  private apply(): void {
    this.root.hidden = !this.state.open;
    this.root.classList.toggle('collapsed', this.state.collapsed);
    this.root.style.left = `${this.state.x}px`;
    this.root.style.top = `${this.state.y}px`;
  }

  private persist(): void {
    save(this.opts.id, this.state);
  }

  private enableDrag(handle: HTMLElement): void {
    let start: { px: number; py: number; x: number; y: number } | null = null;
    handle.addEventListener('pointerdown', (ev) => {
      if (ev.target instanceof HTMLButtonElement) return;
      start = { px: ev.clientX, py: ev.clientY, x: this.state.x, y: this.state.y };
      handle.setPointerCapture(ev.pointerId);
      this.root.classList.add('dragging');
    });
    handle.addEventListener('pointermove', (ev) => {
      if (!start) return;
      this.state.x = start.x + ev.clientX - start.px;
      this.state.y = start.y + ev.clientY - start.py;
      this.apply();
    });
    const end = () => {
      if (!start) return;
      start = null;
      this.root.classList.remove('dragging');
      this.clamp();
      this.persist();
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
}

/** 左上角一排圓鈕：每顆開關一張卡片；後面可以接幾個動作按鈕。 */
export class Dock {
  readonly root: HTMLDivElement;
  private buttons: { panel: Panel; btn: HTMLButtonElement }[] = [];

  constructor(pos: { left: number; top: number }) {
    this.root = el('div', 'ui-dock');
    this.root.style.left = `${pos.left}px`;
    this.root.style.top = `${pos.top}px`;
    document.body.append(this.root);
  }

  add(panel: Panel): void {
    const btn = el('button', 'ui-dock-btn', panel.opts.glyph ?? panel.opts.title);
    btn.title = `${panel.opts.title}${panel.opts.sub ? `：${panel.opts.sub}` : ''}`;
    btn.onclick = () => {
      panel.setOpen(!panel.open);
      if (panel.open) panel.setCollapsed(false);
    };
    panel.onVisibility = () => this.sync();
    this.buttons.push({ panel, btn });
    this.root.append(btn);
    this.sync();
  }

  action(label: string, title: string, fn: () => void): void {
    if (!this.root.querySelector('.ui-gap')) this.root.append(el('span', 'ui-gap'));
    const btn = el('button', 'ui-dock-btn ui-action', label);
    btn.title = title;
    btn.onclick = fn;
    this.root.append(btn);
  }

  sync(): void {
    for (const { panel, btn } of this.buttons) btn.classList.toggle('on', panel.open);
  }
}

// ---------- 控制項 ----------

type NumKeys<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T];
type BoolKeys<T> = { [K in keyof T]: T[K] extends boolean ? K : never }[keyof T];

function decimals(step: number): number {
  const s = String(step);
  return s.includes('.') ? (s.split('.')[1]?.length ?? 0) : 0;
}

export function section(panel: Panel, label: string, parent: HTMLElement = panel.body): void {
  parent.append(el('div', 'ui-section', label));
}

export function slider<T extends object>(
  panel: Panel,
  label: string,
  obj: T,
  key: NumKeys<T>,
  min: number,
  max: number,
  step: number,
  onChange?: () => void,
  parent: HTMLElement = panel.body,
): void {
  const row = el('div', 'ui-slider');
  const lab = el('label', undefined, label);
  lab.title = label;
  const input = el('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  const out = el('output');
  const d = decimals(step);
  const read = () => obj[key] as unknown as number;
  input.addEventListener('input', () => {
    (obj[key] as unknown as number) = Number(input.value);
    out.textContent = read().toFixed(d);
    onChange?.();
  });
  row.append(lab, input, out);
  parent.append(row);
  panel.track(() => {
    input.value = String(read());
    out.textContent = read().toFixed(d);
  });
}

export function toggle<T extends object>(
  panel: Panel,
  label: string,
  obj: T,
  key: BoolKeys<T>,
  onChange?: () => void,
  parent: HTMLElement = panel.body,
): void {
  const row = el('div', 'ui-toggle');
  row.append(el('span', 'ui-switch'), el('span', undefined, label));
  const read = () => obj[key] as unknown as boolean;
  row.onclick = () => {
    (obj[key] as unknown as boolean) = !read();
    row.classList.toggle('on', read());
    onChange?.();
  };
  parent.append(row);
  panel.track(() => row.classList.toggle('on', read()));
}

export function segmented<V extends string | number>(
  panel: Panel,
  options: { label: string; value: V }[],
  get: () => V,
  set: (v: V) => void,
  parent: HTMLElement = panel.body,
): void {
  const row = el('div', 'ui-seg');
  const btns = options.map((o) => {
    const b = el('button', undefined, o.label);
    b.onclick = () => {
      set(o.value);
      panel.refresh();
    };
    row.append(b);
    return { b, v: o.value };
  });
  parent.append(row);
  panel.track(() => {
    for (const { b, v } of btns) b.classList.toggle('on', v === get());
  });
}

export function tiles(
  panel: Panel,
  items: { label: string; sub?: string; title?: string }[],
  isOn: (i: number) => boolean,
  onPick: (i: number) => void,
  parent: HTMLElement = panel.body,
): void {
  const grid = el('div', 'ui-tiles');
  const btns = items.map((it, i) => {
    const b = el('button', 'ui-tile');
    b.append(it.label);
    if (it.sub) b.append(el('small', undefined, it.sub));
    if (it.title) b.title = it.title;
    b.onclick = () => onPick(i);
    grid.append(b);
    return b;
  });
  parent.append(grid);
  panel.track(() => {
    for (const [i, b] of btns.entries()) b.classList.toggle('on', isOn(i));
  });
}

export type Thumb = { label: string; kind: 'image' | 'video' | 'color'; src: string };

/** 縮圖方格。回傳一個函式，項目變了（例如拖進新檔案）時呼叫它重建。 */
export function thumbs(
  panel: Panel,
  getItems: () => Thumb[],
  isOn: (label: string) => boolean,
  onPick: (label: string) => void,
  parent: HTMLElement = panel.body,
): () => void {
  const grid = el('div', 'ui-thumbs');
  parent.append(grid);
  let btns: { b: HTMLButtonElement; label: string }[] = [];
  const build = () => {
    grid.replaceChildren();
    btns = getItems().map((it) => {
      const b = el('button', `ui-thumb${it.kind === 'color' ? ' plain' : ''}`);
      b.title = it.label;
      if (it.kind === 'color') b.style.background = it.src;
      else if (it.kind === 'image') {
        const img = el('img');
        img.src = it.src;
        img.loading = 'lazy';
        b.append(img);
      } else {
        const v = el('video');
        v.src = `${it.src}#t=1`;
        v.muted = true;
        v.preload = 'metadata';
        v.playsInline = true;
        b.append(v, el('span', 'ui-play', '▶'));
      }
      b.append(el('span', undefined, it.label));
      b.onclick = () => onPick(it.label);
      grid.append(b);
      return { b, label: it.label };
    });
    for (const { b, label } of btns) b.classList.toggle('on', isOn(label));
  };
  build();
  panel.track(() => {
    for (const { b, label } of btns) b.classList.toggle('on', isOn(label));
  });
  return build;
}

export function button(
  panel: Panel,
  label: string,
  onClick: () => void,
  parent: HTMLElement = panel.body,
): void {
  const b = el('button', 'ui-button', label);
  b.onclick = onClick;
  parent.append(b);
}

/**
 * 一個可以整個清掉重建的區塊（換筆時用來換參數）。
 * fill 裡新增的控制項都要把 parent 設成傳進去的元素。
 */
export function region(panel: Panel): (fill: (parent: HTMLElement) => void) => void {
  const d = el('div');
  d.style.display = 'grid';
  d.style.gap = '9px';
  panel.body.append(d);
  const group = {};
  return (fill) => {
    panel.dropGroup(group);
    d.replaceChildren();
    const prev = panel.group;
    panel.group = group;
    try {
      fill(d);
    } finally {
      panel.group = prev;
    }
  };
}

/** 可收合的「進階」區塊；回傳裡面的容器，控制項的 parent 設成它 */
export function fold(label: string, parent: HTMLElement, open = false): HTMLDivElement {
  const d = document.createElement('details');
  d.className = 'ui-fold';
  d.open = open;
  const sum = document.createElement('summary');
  sum.textContent = label;
  const inner = document.createElement('div');
  d.append(sum, inner);
  parent.append(d);
  return inner;
}

/** 分頁列：回傳一個函式，呼叫它重畫目前選中的分頁 */
export function tabs<T extends string>(
  panel: Panel,
  names: readonly T[],
  get: () => T,
  set: (t: T) => void,
): void {
  const row = document.createElement('div');
  row.className = 'ui-tabs';
  const btns = names.map((n) => {
    const b = document.createElement('button');
    b.className = 'ui-tab';
    b.textContent = n;
    b.onclick = () => set(n);
    row.append(b);
    return { b, n };
  });
  panel.body.append(row);
  panel.track(() => {
    for (const { b, n } of btns) b.classList.toggle('on', n === get());
  });
}
