# 實驗 01「畫一筆，它會長」實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建好專案骨架，並做出第一個可以用滑鼠試玩的草稿：畫一筆，那一筆會像枝條一樣長出分枝，生長時發出柔和的音。

**Architecture:** 筆觸存成資料（`src/strokes`），生長演算法是純函式、可用種子重現（`src/growth`），畫面（`src/render`）和聲音（`src/sound`）都只是把資料「演出來」。實驗 `experiments/01-growth-branch` 只負責把這些模組接到 p5 和 lil-gui 上。這是給使用者「看了才知道要什麼」的草稿，視覺和聲音參數都做成滑桿。

**Tech Stack:** Vite 8、pnpm、TypeScript（strict）、p5.js 2.x（instance mode）、lil-gui、Vitest、Biome、Git。聲音這一版用原生 Web Audio API，不綁函式庫；調查結論（`docs/sound-libraries.md`）建議正式作品用 Tone.js + tonal，`SoundEngine` 介面讓之後可以直接替換。

**Spec:** `docs/concept.md`（第 1 節「已確定的元素」、1.1、1.2、6.1）

## Global Constraints

- 套件管理一律 `pnpm`；不產生 `package-lock.json`。
- `tsconfig.json`：`"strict": true`。
- p5.js 只用 instance mode：`new p5((p) => {...})`，不用 global mode。
- 筆觸座標存成 0 到 1 的比例（相對於畫布寬高）；時間 `t` 是該筆開始後的毫秒數。
- 匯出 JSON 格式：`{ "version": 1, "canvas": { "width", "height" }, "strokes": [...] }`。
- 畫布填滿瀏覽器視窗，視窗改變大小時重建並從資料重畫。
- 瀏覽器要等使用者互動後才能出聲：`SoundEngine.start()` 只能在滑鼠事件裡呼叫。
- 不使用 `alert`/`confirm`/`prompt`；狀態訊息顯示在 lil-gui 面板或 console。
- 只對「不用看畫面就能判斷對錯」的程式寫測試（筆觸、生長、音階）；畫面和聲音靠人眼人耳。
- Commit 訊息結尾加 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`。

## Review Focus

1. **只點一下沒有拖曳**（一個點的筆觸）：不能出現 NaN 或例外，植物照樣長或安靜地不長。→ Task 3 測試 `single-point stroke does not throw`。
2. **滑鼠拖到視窗外**：座標要夾在 0 到 1 之間。→ Task 2 測試 `clamps points outside canvas`。
3. **匯入壞掉或版本不對的 JSON**：要丟出帶訊息的 `Error`，不能讓頁面掛掉。→ Task 2 測試 `fromFile rejects unknown version`。
4. **還沒點畫面就有生長事件**（聲音引擎尚未 `start()`）：`onGrowth` 不能拋例外。→ Task 5 測試 `onGrowth before start is a no-op`。
5. **視窗大小改變**：同一個像素位置在不同大小的畫布，存出來的比例不同，重播時位置不跑掉。→ Task 2 測試 `normalizes by canvas size`。

---

### Task 1: 專案骨架

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `.gitignore`, `index.html`, `experiments/01-growth-branch/index.html`（佔位）
- Move: `concept.md` → `docs/concept.md`、`botanica-research.md` → `docs/botanica-research.md`

**Interfaces:**
- Produces: pnpm scripts `dev`、`build`、`test`、`typecheck`、`lint`；Vite 多頁面設定（首頁 + 每個實驗一頁）。

- [ ] **Step 1: 建立資料夾並移動文件**

```bash
cd /Users/bd/Desktop/P5 && mkdir -p docs src/strokes src/growth src/render src/sound experiments/01-growth-branch
mv concept.md botanica-research.md docs/
```

- [ ] **Step 2: 初始化 pnpm 並安裝套件**

```bash
pnpm init
pnpm add p5@^2.3 lil-gui@^0.21
pnpm add -D vite@^8 typescript@^5.9 vitest@^5 @biomejs/biome@^2
```

`package.json` 的 scripts：`"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`, `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`, `"lint": "biome check ."`。加 `"type": "module"`。

- [ ] **Step 3: 寫 `tsconfig.json`**

`target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`, `strict: true`, `noEmit: true`, `types: ["vite/client"]`, `include: ["src", "experiments"]`。

- [ ] **Step 4: 寫 `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  appType: 'mpa',
  build: { rollupOptions: { input: {
    main: resolve(__dirname, 'index.html'),
    exp01: resolve(__dirname, 'experiments/01-growth-branch/index.html'),
  } } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```
（`test` 欄位需 `/// <reference types="vitest/config" />` 在檔首。）

- [ ] **Step 5: 寫 `biome.json`（預設規則 + 2 空白縮排 + 單引號）和 `.gitignore`（`node_modules`, `dist`）**

- [ ] **Step 6: 寫首頁 `index.html`**

標題「P5 × Botanica 實驗」，一個 `<ul>` 列出實驗：`01 畫一筆，它會長` 連到 `experiments/01-growth-branch/index.html`，附一句說明「滑鼠畫一筆，它會像枝條一樣長出分枝，生長時發出聲音」。`experiments/01-growth-branch/index.html` 先放最小 HTML（含 `<script type="module" src="./main.ts">`）和一個空的 `main.ts`。

- [ ] **Step 7: 驗證**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: typecheck 無錯；lint 無錯；vitest 回報 "No test files found" 且結束碼 0（若 vitest 對零測試回傳非 0，在 `test` 設定加 `passWithNoTests: true`）。
Run: `pnpm dev` 後開 `http://localhost:5173/`，首頁列出實驗 01，連結可開（空白頁）。

- [ ] **Step 8: Git 初始化並 commit**

```bash
git init && git add -A && git commit -m "chore: scaffold Vite + pnpm + TypeScript project with experiment index"
```

---

### Task 2: 筆觸資料與記錄器

**Files:**
- Create: `src/strokes/types.ts`, `src/strokes/recorder.ts`, `src/strokes/file.ts`
- Test: `src/strokes/recorder.test.ts`, `src/strokes/file.test.ts`

**Interfaces:**
- Produces:
```ts
// types.ts
export type StrokePoint = { x: number; y: number; t: number }; // x,y ∈ [0,1]；t = 筆開始後毫秒
export type Stroke = { id: string; startedAt: number; points: StrokePoint[] };
export type StrokeFile = { version: 1; canvas: { width: number; height: number }; strokes: Stroke[] };
// recorder.ts
export class StrokeRecorder {
  readonly strokes: Stroke[];
  constructor(opts?: { minDistance?: number }); // 預設 0.002（比例單位）
  begin(px: number, py: number, w: number, h: number, now: number): Stroke;
  extend(px: number, py: number, w: number, h: number, now: number): StrokePoint | null; // 無進行中筆觸或太近 → null
  end(): Stroke | null;
  clear(): void;
}
// file.ts
export function toFile(strokes: Stroke[], canvas: { width: number; height: number }): StrokeFile;
export function fromFile(json: unknown): StrokeFile; // 格式錯或 version ≠ 1 → throw Error
```

- [ ] **Step 1: 寫失敗測試 `recorder.test.ts`**

```ts
test('normalizes by canvas size', () => {
  const r = new StrokeRecorder();
  const s = r.begin(200, 100, 400, 200, 1000);
  expect(s.points[0]).toEqual({ x: 0.5, y: 0.5, t: 0 });
  const r2 = new StrokeRecorder();
  expect(r2.begin(200, 100, 800, 400, 0).points[0]).toMatchObject({ x: 0.25, y: 0.25 });
});
test('clamps points outside canvas', () => {
  const r = new StrokeRecorder();
  r.begin(0, 0, 100, 100, 0);
  expect(r.extend(-50, 250, 100, 100, 16)).toEqual({ x: 0, y: 1, t: 16 });
});
test('skips points closer than minDistance and records t relative to start', () => {
  const r = new StrokeRecorder({ minDistance: 0.01 });
  r.begin(0, 0, 1000, 1000, 500);
  expect(r.extend(1, 1, 1000, 1000, 516)).toBeNull();
  expect(r.extend(20, 0, 1000, 1000, 532)).toEqual({ x: 0.02, y: 0, t: 32 });
});
test('end returns the stroke and pushes it; extend without begin is null', () => {
  const r = new StrokeRecorder();
  expect(r.extend(1, 1, 10, 10, 0)).toBeNull();
  r.begin(1, 1, 10, 10, 0);
  const s = r.end();
  expect(s?.points).toHaveLength(1);
  expect(r.strokes).toHaveLength(1);
  expect(r.end()).toBeNull();
});
```

- [ ] **Step 2: 執行確認失敗** — Run: `pnpm vitest run src/strokes` Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作 `types.ts` 與 `recorder.ts`**

`id` 用 `crypto.randomUUID()`（Node 24 與瀏覽器都有）。`end()` 把進行中的筆觸推進 `strokes`。

- [ ] **Step 4: 寫失敗測試 `file.test.ts`**

```ts
test('toFile wraps strokes with version 1', () => {
  expect(toFile([], { width: 10, height: 20 })).toEqual({ version: 1, canvas: { width: 10, height: 20 }, strokes: [] });
});
test('fromFile round-trips', () => {
  const f = toFile([{ id: 'a', startedAt: 0, points: [{ x: 0, y: 0, t: 0 }] }], { width: 1, height: 1 });
  expect(fromFile(JSON.parse(JSON.stringify(f)))).toEqual(f);
});
test('fromFile rejects unknown version', () => {
  expect(() => fromFile({ version: 2, canvas: { width: 1, height: 1 }, strokes: [] })).toThrow(/version/);
  expect(() => fromFile(null)).toThrow();
  expect(() => fromFile({ version: 1 })).toThrow();
});
```

- [ ] **Step 5: 執行確認失敗，實作 `file.ts`，執行確認通過** — Run: `pnpm vitest run src/strokes` Expected: PASS（7 tests）

- [ ] **Step 6: Commit** — `git add src/strokes && git commit -m "feat(strokes): normalized stroke recorder and JSON file format"`

---

### Task 3: 生長演算法（遞迴分枝 + 雜訊）

**Files:**
- Create: `src/growth/rng.ts`, `src/growth/types.ts`, `src/growth/branching.ts`
- Test: `src/growth/branching.test.ts`

**Interfaces:**
- Consumes: `Stroke`, `StrokePoint`（Task 2）
- Produces:
```ts
// rng.ts
export function mulberry32(seed: number): () => number; // [0,1)
export function hashString(s: string): number;          // 字串 → 32-bit 整數，給 stroke.id 當種子
// types.ts
export type Segment = { x1: number; y1: number; x2: number; y2: number; depth: number; born: number }; // 比例座標；born = 植物年齡 ms
export type GrowthEvent = { kind: 'branch' | 'leaf'; x: number; y: number; depth: number; age: number };
export type GrowthParams = {
  speed: number;         // 比例單位/秒，預設 0.08
  segmentLength: number; // 預設 0.012
  branchChance: number;  // 每段分岔機率，預設 0.25
  spread: number;        // 分岔夾角（弧度），預設 0.6
  noise: number;         // 每段方向擾動幅度（弧度），預設 0.35
  maxDepth: number;      // 預設 5
  life: number;          // 生命（ms），預設 6000
  tipsPerStroke: number; // 從筆觸抽出的起始芽數，預設 6
  maxTips: number;       // 單株同時活著的芽上限，預設 300（避免分岔爆炸拖垮效能）
};
export const defaultGrowthParams: GrowthParams;
// branching.ts
export class BranchingPlant {
  constructor(stroke: Stroke, params: GrowthParams, seed: number);
  readonly stroke: Stroke;
  readonly segments: Segment[];
  readonly age: number;          // ms
  get alive(): boolean;          // 還有活著的芽
  step(dtMs: number): GrowthEvent[]; // 推進時間，回傳這一步新發生的事件
}
```

- [ ] **Step 1: 寫失敗測試**

```ts
const stroke: Stroke = { id: 's', startedAt: 0, points: Array.from({ length: 20 }, (_, i) => ({ x: 0.2 + i * 0.03, y: 0.5, t: i * 16 })) };
test('same seed gives identical growth', () => {
  const a = new BranchingPlant(stroke, defaultGrowthParams, 42);
  const b = new BranchingPlant(stroke, defaultGrowthParams, 42);
  for (let i = 0; i < 60; i++) { a.step(50); b.step(50); }
  expect(a.segments).toEqual(b.segments);
  expect(a.segments.length).toBeGreaterThan(0);
});
test('dies after life elapses and emits leaf events', () => {
  const p = new BranchingPlant(stroke, { ...defaultGrowthParams, life: 1000 }, 1);
  const events: GrowthEvent[] = [];
  for (let i = 0; i < 30; i++) events.push(...p.step(50));
  expect(p.alive).toBe(false);
  expect(events.some((e) => e.kind === 'leaf')).toBe(true);
  expect(p.step(50)).toEqual([]);
});
test('never exceeds maxDepth', () => {
  const p = new BranchingPlant(stroke, { ...defaultGrowthParams, branchChance: 1, maxDepth: 3, maxTips: 50 }, 7);
  for (let i = 0; i < 60; i++) p.step(50);
  expect(Math.max(...p.segments.map((s) => s.depth))).toBeLessThanOrEqual(3);
});
test('respects maxTips', () => {
  const p = new BranchingPlant(stroke, { ...defaultGrowthParams, branchChance: 1, maxDepth: 8, maxTips: 20 }, 9);
  let branches = 0;
  for (let i = 0; i < 60; i++) branches += p.step(50).filter((e) => e.kind === 'branch').length;
  expect(branches).toBeLessThanOrEqual(20 - 6); // 起始 6 芽 + 分岔 ≤ 20
});
test('single-point stroke does not throw', () => {
  const p = new BranchingPlant({ id: 'one', startedAt: 0, points: [{ x: 0.5, y: 0.5, t: 0 }] }, defaultGrowthParams, 3);
  expect(() => { for (let i = 0; i < 20; i++) p.step(50); }).not.toThrow();
  for (const s of p.segments) for (const v of [s.x1, s.y1, s.x2, s.y2]) expect(Number.isFinite(v)).toBe(true);
});
```

- [ ] **Step 2: 執行確認失敗** — Run: `pnpm vitest run src/growth` Expected: FAIL

- [ ] **Step 3: 實作 `rng.ts`、`types.ts`、`branching.ts`**

演算法（簽名和測試沒決定的部分）：
- 建構時沿筆觸等距抽 `tipsPerStroke` 個點當「芽」。芽的初始方向 = 該處筆觸切線的法線，左右交替；筆觸只有 1 點時切線取 `(1,0)`。每個芽 `depth = 0`、`heading`、`pending = 0`（累積長度）、`x,y`。
- `step(dt)`：`age += dt`；每個活芽 `heading += (rng()*2-1) * noise * (dt/1000) * 6`；前進 `speed*dt/1000`，`pending` 累積；當 `pending ≥ segmentLength`，推一個 `Segment`（上一個節點到現在位置），`pending = 0`，然後以 `branchChance` 機率分岔：原芽 `heading -= spread/2`，新芽 `heading += spread/2`、`depth + 1`，並推 `{kind:'branch'}` 事件；`depth > maxDepth` 的芽不建立；活芽數已達 `maxTips` 時也不分岔（不發 `branch` 事件）。
- `age ≥ life` 時所有活芽結束，各推一個 `{kind:'leaf'}` 事件並清空；之後 `alive` 為 false、`step` 回傳 `[]`。
- 所有隨機都來自 `mulberry32(seed)`，不碰 `Math.random`。

- [ ] **Step 4: 執行確認通過** — Run: `pnpm vitest run src/growth` Expected: PASS（5 tests）

- [ ] **Step 5: Commit** — `git add src/growth && git commit -m "feat(growth): seeded recursive branching with noise"`

---

### Task 4: 畫面（紙張質感 + 有顆粒的線）

**Files:**
- Create: `src/render/palette.ts`, `src/render/paper.ts`

**Interfaces:**
- Consumes: `Stroke`（Task 2）、`Segment`（Task 3）、p5 的 `p5.Graphics`
- Produces:
```ts
// palette.ts
export type Palette = { paper: string; ink: string[] };
export const defaultPalette: Palette = { paper: '#f3eee4', ink: ['#5b6b5a', '#8a7a6a', '#a3b18a', '#b08968', '#6b705c'] };
// paper.ts
export type RenderParams = { grain: number; strokeWeight: number; branchWeight: number; alpha: number }; // grain 預設 1.2px，strokeWeight 3，branchWeight 1.4，alpha 140
export const defaultRenderParams: RenderParams;
export function drawPaper(g: p5.Graphics, palette: Palette, grainDots: number): void;   // 填底色 + 撒 grainDots 個淡色小點
export function drawStroke(g: p5.Graphics, s: Stroke, color: string, params: RenderParams): void;
export function drawSegment(g: p5.Graphics, seg: Segment, color: string, params: RenderParams): void;
export function inkFor(palette: Palette, depth: number): string; // depth 0 用 ink[0]，之後循環
```
- 比例座標 → 像素用 `g.width`、`g.height`。
- 「顆粒感」做法：同一條線畫 3 次，每次兩端加 `±grain` 的隨機抖動，`alpha` 設低，線寬按 `depth` 遞減（`branchWeight * 0.85^depth`，最細 0.5）。
- 不寫自動測試；用 Task 6 的畫面檢查。

- [ ] **Step 1: 實作 `palette.ts` 與 `paper.ts`**
- [ ] **Step 2: 驗證** — Run: `pnpm typecheck && pnpm lint` Expected: 無錯
- [ ] **Step 3: Commit** — `git add src/render && git commit -m "feat(render): paper background and grainy ink lines"`

---

### Task 5: 聲音（介面 + 原生 Web Audio 實作）

**Files:**
- Create: `src/sound/engine.ts`, `src/sound/scale.ts`, `src/sound/webaudio.ts`
- Test: `src/sound/scale.test.ts`, `src/sound/webaudio.test.ts`

**Interfaces:**
- Consumes: `StrokePoint`（Task 2）、`GrowthEvent`（Task 3）
- Produces:
```ts
// engine.ts
export interface SoundEngine {
  start(): Promise<void>;                // 只能在使用者互動的事件裡呼叫
  onStrokePoint(p: StrokePoint): void;   // 這一版不出聲
  onGrowth(e: GrowthEvent): void;
  setVolume(v: number): void;            // 0..1
}
// scale.ts
export const BB_MAJOR_PITCH_CLASSES: readonly number[] = [10, 0, 2, 3, 5, 7, 9]; // 王道進行 E♭–F–Gm–B♭ 所在的 B♭ 大調
export function pickNote(rng: () => number, depth: number): number; // MIDI；depth 越深音域越高，範圍 [48, 84]，一定落在 B♭ 大調
export function midiToHz(midi: number): number;
// webaudio.ts
export class WebAudioEngine implements SoundEngine { constructor(seed?: number) }
```

- [ ] **Step 1: 寫失敗測試**

```ts
// scale.test.ts
test('midiToHz: A4 is 440', () => expect(midiToHz(69)).toBeCloseTo(440));
test('pickNote stays in Bb major and in range, higher depth never lower on average', () => {
  const rng = mulberry32(5);
  const shallow: number[] = [], deep: number[] = [];
  for (let i = 0; i < 200; i++) { shallow.push(pickNote(rng, 0)); deep.push(pickNote(rng, 5)); }
  for (const n of [...shallow, ...deep]) { expect(BB_MAJOR_PITCH_CLASSES).toContain(n % 12); expect(n).toBeGreaterThanOrEqual(48); expect(n).toBeLessThanOrEqual(84); }
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  expect(avg(deep)).toBeGreaterThan(avg(shallow));
});
// webaudio.test.ts（node 環境沒有 AudioContext）
test('onGrowth before start is a no-op', () => {
  const e = new WebAudioEngine(1);
  expect(() => e.onGrowth({ kind: 'branch', x: 0.5, y: 0.5, depth: 1, age: 100 })).not.toThrow();
  expect(() => e.setVolume(0.5)).not.toThrow();
});
```

- [ ] **Step 2: 執行確認失敗** — Run: `pnpm vitest run src/sound` Expected: FAIL

- [ ] **Step 3: 實作三個檔案**

`WebAudioEngine`：`start()` 建 `AudioContext`（已有就 `resume()`），鏈路 `osc(triangle) → gain(envelope) → [dry + feedback delay 0.38s, feedback 0.45, lowpass 2400Hz] → master gain`。`onGrowth`：`branch` 放一個音（attack 0.25s、sustain 到 0.4、release 1.8s、音量 0.18）；`leaf` 放高一個八度、較短的音（release 0.9s、音量 0.1）。同一時間最多每 80ms 一個音（丟掉多的）。`ctx` 為 `null` 時所有方法直接 return。隨機用 `mulberry32(seed)`。

- [ ] **Step 4: 執行確認通過** — Run: `pnpm vitest run src/sound` Expected: PASS（3 tests）
- [ ] **Step 5: Commit** — `git add src/sound && git commit -m "feat(sound): SoundEngine interface, Bb-major note picker, Web Audio implementation"`

---

### Task 6: 實驗 01 接線（p5 + lil-gui）

**Files:**
- Modify: `experiments/01-growth-branch/index.html`
- Create: `experiments/01-growth-branch/main.ts`, `experiments/01-growth-branch/panel.ts`

**Interfaces:**
- Consumes: Task 2–5 的所有匯出。
- Produces: 可試玩的頁面。

- [ ] **Step 1: `index.html`**

`<title>01 畫一筆，它會長</title>`；`body { margin:0; overflow:hidden; background:#f3eee4 }`；左下角一行提示文字「按住滑鼠畫一筆，放開後它會開始生長」（`position:fixed`，淡灰小字）；`<script type="module" src="./main.ts">`。

- [ ] **Step 2: `panel.ts`**

```ts
export type PanelState = { growth: GrowthParams; render: RenderParams; sound: { enabled: boolean; volume: number } };
export function createPanel(state: PanelState, actions: { clear(): void; exportJson(): void; importJson(file: File): void; onChange(): void }): GUI;
```
用 lil-gui：三個資料夾「生長」「畫面」「聲音」，各參數用 `GrowthParams`/`RenderParams` 的預設值為中心給合理範圍（例如 `speed 0.01–0.3`、`branchChance 0–1`、`maxDepth 1–8`、`life 1000–20000`、`grain 0–4`）。按鈕：「清除」「匯出 JSON」「匯入 JSON」（匯入用隱藏的 `<input type="file" accept=".json">`）。面板右上角。所有變更呼叫 `actions.onChange()`。

- [ ] **Step 3: `main.ts`**

`new p5((p) => {...})`：
- `setup`：`createCanvas(windowWidth, windowHeight)`；建 `layer = p.createGraphics(w, h)`，`drawPaper(layer, ...)`；建 `recorder`、`plants: BranchingPlant[]`、`engine = new WebAudioEngine()`、面板。
- `mousePressed`：若點在面板上（`event.target` 不是 canvas）就略過；否則 `engine.start()`（第一次）、`recorder.begin(...)`。
- `mouseDragged`：`recorder.extend(...)`，有新點就 `drawStroke` 新增的那一小段到 `layer`（只畫最後兩點）。
- `mouseReleased`：`const s = recorder.end()`；若有 → `plants.push(new BranchingPlant(s, state.growth, hashString(s.id)))`。
- `draw`：`for plant of plants: events = plant.step(p.deltaTime)`；新出現的 segments 畫到 `layer`（用 `segments.length` 記上次畫到哪）；每個 event 若 `sound.enabled` → `engine.onGrowth(e)`；最後 `p.image(layer, 0, 0)`。死掉的 plant 留在陣列（它的線已經在 layer 上）。
- `windowResized`：`resizeCanvas`，重建 `layer`，`drawPaper`，依 `recorder.strokes` 和每株 `plant.segments` 全部重畫。
- `clear`：清空 recorder、plants，重畫紙張。`exportJson`：`toFile(recorder.strokes, {width, height})` 轉 Blob 下載 `strokes-<timestamp>.json`。`importJson`：讀檔 → `fromFile` → 清空後重建每筆的 plant 並讓它們從頭長；失敗時 `console.error` 並在面板標題顯示「匯入失敗」。

- [ ] **Step 4: 手動驗證**

Run: `pnpm dev`，開 `http://localhost:5173/experiments/01-growth-branch/`
檢查：畫一筆放開後會長出分枝並有聲音；拉「生長速度」滑桿立即影響之後的生長；「清除」清空；「匯出」下載 JSON、「匯入」能重現；改變視窗大小後筆觸位置不跑；只點一下不拖曳不會噴錯（看 console）。
Run: `pnpm typecheck && pnpm lint && pnpm test` Expected: 全部通過。

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(exp01): draw a stroke and let it grow, with lil-gui panel and sound"`

- [ ] **Step 6: 更新 `docs/concept.md`**

在第 6 節待實驗清單下加一行：「實驗 01 已建立：`experiments/01-growth-branch`，對應問題 #2（生長）、#1（生長時發聲）、#5（紙感 + 顆粒線）。」Commit：`docs: link experiment 01 from concept`。
