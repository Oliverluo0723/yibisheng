# 一株一個聲音（俳句）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每株押花樹放開時從「這一筆的手勢 + 種子」生出自己的節奏物件（細分、音域、素材、效果、稀疏 pattern），枝長出來點亮格子、枯掉熄格子；所有樹鎖在引擎的拍子上，各拿和弦的一個聲部、輪流發言，株數越多每株越稀。

**Architecture:** 純資料和純邏輯放在 `src/strokes/gesture.ts`（手勢分析）、`src/sound/botanica/treeVoice.ts`（個性）、`treePattern.ts`（格子）、`budget.ts`（留白預算）、`treeChoir.ts`（所有樹、每個 16 分音符決定誰響）；都不 import Tone.js，用 Vitest 測。`BotanicaEngine` 只多做翻譯：放開 → `choir.add`、分枝 → `choir.grow`、枝斷 → `choir.wither`、時鐘的 16 分音符 → `choir.tick` → `grains.grain(…, at)`。Tone.js 只在 `audio/clock.ts`（加 16 分音符回呼）、`audio/voices.ts`（顆粒可指定時間）改。

**Tech Stack:** TypeScript strict、Vitest、Tone.js 15（Transport、GrainPlayer）、three.js 實驗 04。

**Spec:** [docs/design-philosophy-notes.md](../../design-philosophy-notes.md) 第 1、2、3、5 節；回饋見 [docs/process-log.md](../../process-log.md) 的 exp04-p 列。

## Global Constraints

- 純邏輯檔不 import Tone.js；引擎測試用假的層（沿用 `engine.test.ts` 的 `fake()`）。
- 只接押花樹（voice 名 `'押花樹'`）；草、曼珠沙華、紫羅蘭、丁香走原本的路徑不動。
- 面板「聲」分頁「俳句」關掉時，行為和現在完全一樣（分枝直接掉顆粒）。
- 同一個種子 + 同一個手勢永遠得到同一個個性（`mulberry32`）。
- 完成後打 tag `exp04-q`，`docs/process-log.md` 加一列（回饋欄「（待填）」），依 [feedback-process-record]。
- 全程 `pnpm test`、`pnpm typecheck`、`pnpm lint` 綠。

## Review Focus

1. 樹出生時它的素材角色還沒載好（`store.ready(role)` 為 false）：那一拍安靜跳過、不丟錯、下次載好了就響 → Task 6 測試「素材沒載好不出聲」。
2. 點一下沒拖（沒有手勢樣本）：`analyzeGesture([])` 回 `EMPTY_GESTURE`，仍能生出個性 → Task 1 測試「空樣本」。
3. 二十株同時活著：每拍最多 `maxActive` 株響、每株密度 1/√20，顆粒池（8 聲）不被塞爆 → Task 5 測試「二十株」。
4. 一株還沒長就枯（出生只亮兩格）：熄兩次就死、尾音只響一次，之後再來枝斷事件不再響 → Task 6 測試「死過的樹不再響」。
5. 玩到一半關掉「俳句」：之後的分枝回到舊路徑直接掉顆粒、時鐘回呼不再產生 hit → Task 6 測試「關掉就回舊路」。

---

### Task 1: 手勢分析 `analyzeGesture`

**Files:**
- Create: `src/strokes/gesture.ts`
- Test: `src/strokes/gesture.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type GestureSample = { t: number; speed: number }; // t 毫秒；speed 0..1（筆速 ÷ PenParams.maxSpeed，超過截成 1）
  export type Gesture = {
    durationMs: number;
    /** 平均速度 0..1 */
    energy: number;
    /** 停頓次數：連續 ≥ 130 ms、speed < 0.05 算一次 */
    pauses: number;
    /** 停頓分布 0..1：1 = 均勻（像呼吸），0 = 擠在一起（像掙扎）；停頓 ≤ 1 次時為 1 */
    evenness: number;
  };
  export const EMPTY_GESTURE: Gesture; // { durationMs: 0, energy: 0.5, pauses: 0, evenness: 1 }
  export function analyzeGesture(samples: readonly GestureSample[]): Gesture;
  ```
- evenness 算法：取每次停頓的中點時間，加上 0 與 durationMs 當頭尾，算相鄰間隔的變異係數 cv = 標準差 ÷ 平均，`evenness = clamp01(1 − cv)`。

- [ ] **Step 1: 寫測試**

```ts
import { expect, test } from 'vitest';
import { analyzeGesture, EMPTY_GESTURE } from './gesture';

const run = (ms: number, speed: number, t0 = 0) =>
  Array.from({ length: Math.round(ms / 16) }, (_, i) => ({ t: t0 + i * 16, speed }));

test('空樣本回 EMPTY_GESTURE', () => {
  expect(analyzeGesture([])).toEqual(EMPTY_GESTURE);
});

test('一路快：能量高、沒有停頓、均勻度 1', () => {
  const g = analyzeGesture(run(1000, 0.9));
  expect(g.durationMs).toBeCloseTo(1000 - 16, -1);
  expect(g.energy).toBeCloseTo(0.9, 2);
  expect(g.pauses).toBe(0);
  expect(g.evenness).toBe(1);
});

test('短於 130 ms 的慢下來不算停頓', () => {
  const g = analyzeGesture([...run(500, 0.5), ...run(100, 0, 500), ...run(500, 0.5, 600)]);
  expect(g.pauses).toBe(0);
});

test('兩次停頓平均分布 → 均勻度接近 1', () => {
  const s = [...run(600, 0.5), ...run(200, 0, 600), ...run(600, 0.5, 800), ...run(200, 0, 1400), ...run(600, 0.5, 1600)];
  const g = analyzeGesture(s);
  expect(g.pauses).toBe(2);
  expect(g.evenness).toBeGreaterThan(0.85);
});

test('兩次停頓擠在中段 → 均勻度低', () => {
  const s = [...run(1200, 0.5), ...run(200, 0, 1200), ...run(60, 0.5, 1400), ...run(200, 0, 1460), ...run(1200, 0.5, 1660)];
  const g = analyzeGesture(s);
  expect(g.pauses).toBe(2);
  expect(g.evenness).toBeLessThan(0.5);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm vitest run src/strokes/gesture.test.ts`
Expected: FAIL，找不到模組。

- [ ] **Step 3: 實作 `src/strokes/gesture.ts`**

依 Interfaces 的型別與 evenness 算法；停頓偵測用「連續樣本 speed < 0.05 的一段，首尾 t 差 ≥ 130」。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm vitest run src/strokes/gesture.test.ts`
Expected: 5 passed。

- [ ] **Step 5: Commit**

```bash
git add src/strokes/gesture.ts src/strokes/gesture.test.ts
git commit -m "feat(strokes): 手勢分析：速度、停頓次數與分布（InkField「速度是急切、停頓是猶豫」）"
```

---

### Task 2: 一株的個性 `makeTreeVoice`

**Files:**
- Create: `src/sound/botanica/treeVoice.ts`
- Test: `src/sound/botanica/treeVoice.test.ts`

**Interfaces:**
- Consumes: `Gesture` (Task 1)、`Register` (`src/sound/theory/chords.ts`)、`SampleRole` (`manifest.ts`)、`mulberry32` (`src/growth/rng.ts`)。
- Produces:
  ```ts
  export type Subdivision = 4 | 8 | 16;
  export type TreeVoice = {
    subdivision: Subdivision;  // energy < 0.25 → 4；< 0.6 → 8；否則 16
    register: Register;        // energy < 0.25 → 'low'；< 0.6 → 'mid'；否則 'high'
    role: SampleRole;          // 依 register 從袋子抽：low ['piano','strings','clarinet']、mid ['piano','bell','kalimba']、high ['bell','glitch','kalimba']
    reverse: boolean;          // evenness < 0.5 → true；否則種子抽 20%
    lengthSec: number;         // 長素材切片長度：4 → 1.2、8 → 0.7、16 → 0.35
    sliceFrac: number;         // 長素材從哪裡切 0..1（種子）
    order: number[];           // 0..subdivision-1 的排列，第一個一定是 0（點亮順序）
    capacity: number;          // 最多亮幾格：max(2, round(subdivision × (0.3 + 0.3 × energy)))
    gainDb: number;            // 4 → −6、8 → −8、16 → −10
    pan: number;               // 種子 −0.6..0.6
  };
  export function makeTreeVoice(seed: number, g: Gesture): TreeVoice;
  /** 第 step 格落在小節的第幾個 16 分音符（0..15） */
  export function sixteenthOf(subdivision: Subdivision, step: number): number; // step × (16 / subdivision)
  ```

- [ ] **Step 1: 寫測試**

```ts
import { expect, test } from 'vitest';
import { EMPTY_GESTURE, type Gesture } from '../../strokes/gesture';
import { makeTreeVoice, sixteenthOf } from './treeVoice';

const g = (energy: number, evenness = 1): Gesture => ({ durationMs: 1000, energy, pauses: 0, evenness });

test('慢而穩的一筆：4 分、低音域、正放、長切片', () => {
  const v = makeTreeVoice(1, g(0.1));
  expect(v).toMatchObject({ subdivision: 4, register: 'low', lengthSec: 1.2, gainDb: -6 });
  expect(['piano', 'strings', 'clarinet']).toContain(v.role);
});

test('快而果決的一筆：16 分、高音域、短切片', () => {
  const v = makeTreeVoice(1, g(0.9));
  expect(v).toMatchObject({ subdivision: 16, register: 'high', lengthSec: 0.35, gainDb: -10 });
  expect(['bell', 'glitch', 'kalimba']).toContain(v.role);
});

test('停頓擠在一起（掙扎）→ 反轉', () => {
  expect(makeTreeVoice(1, g(0.5, 0.2)).reverse).toBe(true);
});

test('同種子同手勢一樣；不同種子不同', () => {
  expect(makeTreeVoice(7, g(0.5))).toEqual(makeTreeVoice(7, g(0.5)));
  expect(makeTreeVoice(7, g(0.5))).not.toEqual(makeTreeVoice(8, g(0.5)));
});

test('點亮順序是排列、第一格是 0；容量至少 2、不超過細分', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const v = makeTreeVoice(seed, g(0.5));
    expect(v.order[0]).toBe(0);
    expect([...v.order].sort((a, b) => a - b)).toEqual([...Array(v.subdivision).keys()]);
    expect(v.capacity).toBeGreaterThanOrEqual(2);
    expect(v.capacity).toBeLessThanOrEqual(v.subdivision);
  }
});

test('空手勢也能生出個性', () => {
  expect(makeTreeVoice(1, EMPTY_GESTURE).subdivision).toBe(8);
});

test('格子對到 16 分音符', () => {
  expect(sixteenthOf(4, 1)).toBe(4);
  expect(sixteenthOf(8, 3)).toBe(6);
  expect(sixteenthOf(16, 15)).toBe(15);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm vitest run src/sound/botanica/treeVoice.test.ts`
Expected: FAIL。

- [ ] **Step 3: 實作 `treeVoice.ts`**

`order`：先放 0，其餘用 Fisher–Yates（`mulberry32(seed)`）打亂。抽籤順序固定（role → reverse → sliceFrac → pan → order），和 `recipe.ts` 一樣的原則。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm vitest run src/sound/botanica/treeVoice.test.ts`
Expected: 7 passed。

- [ ] **Step 5: Commit**

```bash
git add src/sound/botanica/treeVoice.ts src/sound/botanica/treeVoice.test.ts
git commit -m "feat(sound): 一株一個個性：手勢定細分、音域、長短；種子定素材、順序、聲像"
```

---

### Task 3: 格子 `TreePattern`

**Files:**
- Create: `src/sound/botanica/treePattern.ts`
- Test: `src/sound/botanica/treePattern.test.ts`

**Interfaces:**
- Consumes: `TreeVoice`、`sixteenthOf` (Task 2)。
- Produces:
  ```ts
  export class TreePattern {
    constructor(readonly voice: TreeVoice); // 建好就 light() 兩次
    /** 目前亮著的格子（step 編號） */
    get lit(): readonly number[];
    /** 照 voice.order 點亮下一格；到 capacity 回 false */
    light(): boolean;
    /** 熄掉最後點亮的那格；沒得熄回 false */
    dim(): boolean;
    /** 曾經亮過、現在全熄 = 死了 */
    get dead(): boolean;
    /** 這個 16 分音符（0..15）有沒有亮著的格子 */
    hitsAt(sixteenth: number): boolean;
  }
  ```

- [ ] **Step 1: 寫測試**

```ts
import { expect, test } from 'vitest';
import { makeTreeVoice } from './treeVoice';
import { TreePattern } from './treePattern';

const g = { durationMs: 1000, energy: 0.5, pauses: 0, evenness: 1 };

test('出生亮兩格、第一格是 0', () => {
  const p = new TreePattern(makeTreeVoice(1, g));
  expect(p.lit.length).toBe(2);
  expect(p.lit).toContain(0);
  expect(p.hitsAt(0)).toBe(true);
  expect(p.dead).toBe(false);
});

test('點亮到容量就停', () => {
  const v = makeTreeVoice(1, g);
  const p = new TreePattern(v);
  for (let i = 2; i < v.capacity; i++) expect(p.light()).toBe(true);
  expect(p.light()).toBe(false);
  expect(p.lit.length).toBe(v.capacity);
});

test('熄到零就死；死了再熄回 false', () => {
  const p = new TreePattern(makeTreeVoice(1, g));
  expect(p.dim()).toBe(true);
  expect(p.dim()).toBe(true);
  expect(p.dead).toBe(true);
  expect(p.dim()).toBe(false);
  expect(p.hitsAt(0)).toBe(false);
});

test('8 分的第 3 格落在第 6 個 16 分音符', () => {
  const v = { ...makeTreeVoice(1, g), subdivision: 8 as const, order: [0, 3, 1, 2, 4, 5, 6, 7], capacity: 8 };
  const p = new TreePattern(v);
  expect(p.hitsAt(6)).toBe(true);
  expect(p.hitsAt(5)).toBe(false);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm vitest run src/sound/botanica/treePattern.test.ts`
Expected: FAIL。

- [ ] **Step 3: 實作 `treePattern.ts`**

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm vitest run src/sound/botanica/treePattern.test.ts`
Expected: 4 passed。

- [ ] **Step 5: Commit**

```bash
git add src/sound/botanica/treePattern.ts src/sound/botanica/treePattern.test.ts
git commit -m "feat(sound): 一株的格子：枝長出來點亮、枯掉熄、全熄就死"
```

---

### Task 4: 留白預算與輪流 `budget.ts`

**Files:**
- Create: `src/sound/botanica/budget.ts`
- Test: `src/sound/botanica/budget.test.ts`

**Interfaces:**
- Produces:
  ```ts
  /** 同時最多幾株響：熱度 < 0.3 → 1、< 0.6 → 2、否則 4 */
  export function maxActiveFor(heat: number): number;
  /** 每株的密度倍率：1 / √max(1, aliveCount) */
  export function densityFor(aliveCount: number): number;
  /**
   * 這一小節誰在發言：最新的 maxActive − 1 株固定在；剩下一席每兩小節輪給更早的樹
   * （bar ÷ 2 取整，對更早的樹數取餘）。更早的樹不夠就全部都在。回傳順序＝輸入順序。
   */
  export function activeTrees<T extends { born: number }>(trees: readonly T[], maxActive: number, bar: number): T[];
  ```

- [ ] **Step 1: 寫測試**

```ts
import { expect, test } from 'vitest';
import { activeTrees, densityFor, maxActiveFor } from './budget';

test('熱度決定同時幾株', () => {
  expect(maxActiveFor(0)).toBe(1);
  expect(maxActiveFor(0.45)).toBe(2);
  expect(maxActiveFor(0.9)).toBe(4);
});

test('株數越多每株越稀', () => {
  expect(densityFor(0)).toBe(1);
  expect(densityFor(1)).toBe(1);
  expect(densityFor(4)).toBeCloseTo(0.5);
  expect(densityFor(20)).toBeCloseTo(1 / Math.sqrt(20));
});

const t = (born: number) => ({ born });

test('株數不超過上限就全部在', () => {
  const trees = [t(1), t(2)];
  expect(activeTrees(trees, 4, 0)).toEqual(trees);
});

test('最新的固定在，最後一席每兩小節輪給更早的樹', () => {
  const trees = [t(1), t(2), t(3), t(4), t(5)];
  expect(activeTrees(trees, 2, 0)).toEqual([t(1), t(5)]);
  expect(activeTrees(trees, 2, 1)).toEqual([t(1), t(5)]);
  expect(activeTrees(trees, 2, 2)).toEqual([t(2), t(5)]);
  expect(activeTrees(trees, 2, 8)).toEqual([t(1), t(5)]);
  expect(activeTrees(trees, 1, 2)).toEqual([t(2)]);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm vitest run src/sound/botanica/budget.test.ts`
Expected: FAIL。

- [ ] **Step 3: 實作 `budget.ts`**

`activeTrees`：`maxActive ≤ 0` 回空陣列；依 `born` 由新到舊取前 `maxActive − 1` 當固定席（maxActive 為 1 時固定席為 0 席、輪替席從全部樹裡輪）；其餘樹由舊到新排，輪替席 = `older[Math.floor(bar / 2) % older.length]`。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm vitest run src/sound/botanica/budget.test.ts`
Expected: 4 passed。

- [ ] **Step 5: Commit**

```bash
git add src/sound/botanica/budget.ts src/sound/botanica/budget.test.ts
git commit -m "feat(sound): 留白預算：熱度定同時幾株、株數定密度、最後一席兩小節輪一次"
```

---

### Task 5: 所有樹 `TreeChoir`

**Files:**
- Create: `src/sound/botanica/treeChoir.ts`
- Test: `src/sound/botanica/treeChoir.test.ts`

**Interfaces:**
- Consumes: Task 2、3、4。
- Produces:
  ```ts
  export type TreeHit = {
    treeId: number;
    voice: TreeVoice;
    /** 和弦聲部 0..3：0 根音、1 五度、2 三度、3 根音高八度 */
    slot: number;
  };
  export type ChoirOpts = { maxActive: number /* 0 = 依熱度 */; density: number /* 倍率 */ };
  export class TreeChoir {
    constructor(rng: () => number);
    /** 放開一株：建個性、發聲部（0..3 最小的空位；都滿了用「這是第幾次 add（從 0 數）」% 4） */
    add(id: number, seed: number, g: Gesture, born: number): TreeVoice;
    /** 分枝：點亮一格 */
    grow(id: number): void;
    /** 枝斷：熄一格；回傳這次熄完有沒有死（死了釋放聲部） */
    wither(id: number): 'dimmed' | 'died' | 'none';
    remove(id: number): void;
    get aliveCount(): number;
    has(id: number): boolean;
    /** 每個 16 分音符：這一拍誰響。sixteenth 0..15、bar 從 0 數 */
    tick(sixteenth: number, bar: number, heat: number, opts: ChoirOpts): TreeHit[];
  }
  ```
- `tick`：活著的樹 → `activeTrees(…, opts.maxActive || maxActiveFor(heat), bar)` → 其中 `pattern.hitsAt(sixteenth)` 的 → 再過一道 `rng() < densityFor(aliveCount) × opts.density` 的機率閘（density ≥ 1 時不擋）。

- [ ] **Step 1: 寫測試**

```ts
import { expect, test } from 'vitest';
import { mulberry32 } from '../../growth/rng';
import { EMPTY_GESTURE } from '../../strokes/gesture';
import { TreeChoir } from './treeChoir';

const g = EMPTY_GESTURE; // 8 分、mid
const full = { maxActive: 0, density: 1 };

test('一株在第 0 拍響、聲部 0', () => {
  const c = new TreeChoir(mulberry32(1));
  c.add(1, 1, g, 0);
  const hits = c.tick(0, 0, 0, full);
  expect(hits.map((h) => [h.treeId, h.slot])).toEqual([[1, 0]]);
  expect(c.tick(1, 0, 0, full)).toEqual([]); // 8 分的樹不在奇數 16 分音符上
});

test('聲部依序發、死了釋放', () => {
  const c = new TreeChoir(mulberry32(1));
  for (let i = 1; i <= 4; i++) c.add(i, i, g, i);
  c.add(5, 5, g, 5);
  const slots = (hits: { treeId: number; slot: number }[]) => Object.fromEntries(hits.map((h) => [h.treeId, h.slot]));
  expect(slots(c.tick(0, 0, 1, { maxActive: 9, density: 9 }))).toEqual({ 1: 0, 2: 1, 3: 2, 4: 3, 5: 0 });
  expect(c.wither(2)).toBe('dimmed');
  expect(c.wither(2)).toBe('died');
  expect(c.wither(2)).toBe('none');
  c.add(6, 6, g, 6);
  expect(slots(c.tick(0, 0, 1, { maxActive: 9, density: 9 }))[6]).toBe(1);
});

test('冷的時候只有最新一株響', () => {
  const c = new TreeChoir(mulberry32(1));
  c.add(1, 1, g, 1);
  c.add(2, 2, g, 2);
  expect(c.tick(0, 0, 0.1, { maxActive: 0, density: 9 }).map((h) => h.treeId)).toEqual([2]);
});

test('二十株：每拍最多 4 株、密度 1/√20', () => {
  const c = new TreeChoir(mulberry32(3));
  for (let i = 1; i <= 20; i++) c.add(i, i, g, i);
  let total = 0;
  for (let bar = 0; bar < 50; bar++) {
    const hits = c.tick(0, bar, 1, full);
    expect(hits.length).toBeLessThanOrEqual(4);
    total += hits.length;
  }
  // 4 席 × 50 小節 × 1/√20 ≈ 45，機率閘有抖動
  expect(total).toBeGreaterThan(20);
  expect(total).toBeLessThan(80);
});

test('分枝點亮更多格；死了不再響', () => {
  const c = new TreeChoir(mulberry32(1));
  const v = c.add(1, 1, g, 0);
  for (let i = 0; i < 20; i++) c.grow(1);
  let n = 0;
  for (let s = 0; s < 16; s++) n += c.tick(s, 0, 1, full).length;
  expect(n).toBe(v.capacity);
  for (let i = 0; i < 20; i++) c.wither(1);
  expect(c.aliveCount).toBe(0);
  expect(c.tick(0, 0, 1, full)).toEqual([]);
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm vitest run src/sound/botanica/treeChoir.test.ts`
Expected: FAIL。

- [ ] **Step 3: 實作 `treeChoir.ts`**

內部 `Map<number, { voice; pattern; slot; born }>`；聲部用 `Set<number>` 記占用。`wither` 對死掉的樹回 `'died'` 一次並 `remove`。

- [ ] **Step 4: 跑測試確認通過**

Run: `pnpm vitest run src/sound/botanica/treeChoir.test.ts`
Expected: 5 passed。

- [ ] **Step 5: Commit**

```bash
git add src/sound/botanica/treeChoir.ts src/sound/botanica/treeChoir.test.ts
git commit -m "feat(sound): 所有樹的合唱：和弦聲部、輪流發言、密度預算，每個 16 分音符決定誰響"
```

---

### Task 6: 引擎接線（放開、分枝、枝斷、時鐘、外部熱度、綻放讓位）

**Files:**
- Modify: `src/sound/engine.ts`（`onPlantStart`、`onGrowth`、`onWither` 簽名）
- Modify: `src/sound/botanica/layers/types.ts`（`GrainOpts.at`、新的 `ClockDep`）
- Modify: `src/sound/botanica/params.ts`（`trees`）
- Modify: `src/sound/botanica/engine.ts`
- Test: `src/sound/botanica/engine.test.ts`（加測試；既有測試的 `fake()` 加 `clock`）

**Interfaces:**
- Consumes: Task 1（`Gesture`）、Task 5（`TreeChoir`、`TreeHit`）。
- Produces / 改動：
  ```ts
  // src/sound/engine.ts
  export type PlantInfo = { id: number; gesture: Gesture };
  onPlantStart?(seed: number, voice?: string, info?: PlantInfo): void;
  onGrowth(e: GrowthEvent, voice?: string, plantId?: number): void;
  onWither?(e: WitherEvent, voice?: string, plantId?: number): void;

  // layers/types.ts
  export type GrainOpts = { …既有…; at?: number /* AudioContext 秒；省略＝現在 */ };
  export interface ClockDep {
    /** 每個 16 分音符呼叫；sixteenth 0..15、bar 從 0 數；回傳取消函式 */
    everySixteenth(fn: (time: number, sixteenth: number, bar: number) => void): () => void;
  }
  // engine.ts
  export type EngineDeps = { …既有…; clock: ClockDep };
  class BotanicaEngine {
    /** 畫面那份熱度；null = 用引擎自己的。鼓、鋼琴、合唱都用它 */
    setHeat(h: number | null): void;
  }
  // params.ts
  export type BotanicaParams = { …既有…; trees: { enabled: boolean; maxActive: number; density: number } };
  // 預設 { enabled: true, maxActive: 0, density: 1 }
  ```
- 引擎規則：
  - `onPlantStart(seed, '押花樹', info)` 且 `params.trees.enabled`：`choir.add(info.id, seed, info.gesture, now)`；為這株挑一個固定素材 `pick(voice.role)` 存進 `Map<id, Sample>`。綻放：12 秒內已經有 ≥ 2 次 pad 綻放就跳過（樹的第一拍就是它的登場），否則照舊。
  - `onGrowth(e, voice, id)`：`id` 在 choir 裡 → `choir.grow(id)`，不丟顆粒；熱度、閒置照舊。否則舊路徑。
  - `onWither(e, voice, id)`：`e.kind === 'branch'`、`voice === '押花樹'`、`id !== undefined` 且 `params.trees.enabled` → 只走合唱路徑：`choir.wither(id)`，`'died'` → 走既有的枝斷聲（反轉 swell／glitch，照 `BRANCH_SOUND_GAP_MS`）當尾音；`'dimmed'` 和 `'none'`（已經死過）都無聲。其他情況（沒 id、別的植物、俳句關著）走舊路徑。葉落照舊。
  - `start()` 之後 `deps.clock.everySixteenth((time, s, bar) => this.onSixteenth(time, s, bar))`；`onSixteenth`：`choir.tick(s, bar, heat, params.trees)` → 每個 hit：素材沒載好就跳過；否則 `grains.grain(sample.id, { shift: grainShift(keyShift(sample.sourceKey, key), tone) + (slot === 3 ? 12 : 0), pan: voice.pan, reverse: voice.reverse, gainDb: voice.gainDb, offsetFrac: voice.sliceFrac（長素材才給）, durationSec: voice.lengthSec（長素材才給）, at: time })`，tone = `currentTones()[slot % 3]`。
  - `heat()`／`poll()`：`externalHeat ?? heatState.value(now)`。

- [ ] **Step 1: `fake()` 加 `clock`，寫測試**

在 `engine.test.ts` 的 `fake()` 加：
```ts
let tick: ((time: number, s: number, bar: number) => void) | null = null;
// deps 裡：
clock: { everySixteenth: (fn) => { tick = fn; return () => { tick = null; }; } },
// 回傳物多一個：
sixteenth: (s: number, bar = 0) => tick?.(bar * 16 + s, s, bar),
```
新測試：
```ts
const info = (id: number) => ({ id, gesture: { durationMs: 1000, energy: 0.5, pauses: 0, evenness: 1 } });

test('押花樹放開後分枝不直接掉顆粒，第 0 拍由合唱響', async () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  await e.start();
  e.onPlantStart(1, '押花樹', info(1));
  f.calls.length = 0;
  e.onGrowth(ev(2), '押花樹', 1);
  expect(f.calls.filter((c) => c.startsWith('grain'))).toEqual([]);
  f.sixteenth(0);
  expect(f.calls.filter((c) => c.startsWith('grain')).length).toBe(1);
});

test('素材沒載好不出聲、不丟錯', async () => {
  const f = fake();
  f.ready.clear();
  const e = new BotanicaEngine(calm(), f.deps);
  await e.start();
  e.onPlantStart(1, '押花樹', info(1));
  expect(() => f.sixteenth(0)).not.toThrow();
  expect(f.calls.filter((c) => c.startsWith('grain'))).toEqual([]);
});

test('死過的樹只響一次尾音、之後不再響', async () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  await e.start();
  e.onPlantStart(1, '押花樹', info(1));
  f.calls.length = 0;
  const w = { kind: 'branch' as const, x: 0.5, y: 0.5, depth: 1 };
  e.onWither(w, '押花樹', 1);
  e.onWither(w, '押花樹', 1);
  f.tick(2000);
  e.onWither(w, '押花樹', 1);
  expect(f.calls.filter((c) => c.startsWith('glitch')).length).toBe(1);
  f.sixteenth(0);
  expect(f.calls.filter((c) => c.startsWith('grain'))).toEqual([]);
});

test('關掉俳句就回舊路：分枝直接掉顆粒、拍子沒 hit', async () => {
  const f = fake();
  const p = calm();
  p.trees.enabled = false;
  const e = new BotanicaEngine(p, f.deps);
  await e.start();
  e.onPlantStart(1, '押花樹', info(1));
  f.calls.length = 0;
  e.onGrowth(ev(2), '押花樹', 1);
  expect(f.calls.filter((c) => c.startsWith('grain')).length).toBe(1);
  f.calls.length = 0;
  f.sixteenth(0);
  expect(f.calls).toEqual([]);
});

test('12 秒內第三株不再疊弦樂墊', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.onPlantStart(1, '押花樹', info(1));
  f.tick(2000);
  e.onPlantStart(2, '押花樹', info(2));
  f.tick(2000);
  e.onPlantStart(3, '押花樹', info(3));
  expect(f.calls.filter((c) => c.startsWith('pad')).length).toBe(2);
});

test('外部熱度接管鼓', () => {
  const f = fake();
  const e = new BotanicaEngine(calm(), f.deps);
  e.setHeat(0.9);
  e.poll(0);
  // 鼓的份量會滑向植物的 drums（押花樹 0.8），所以不是剛好 1
  expect(f.levels.at(-1)?.perc).toBeGreaterThan(0.5);
  expect(f.levels.at(-1)?.kit).toBeGreaterThan(0.5);
  e.setHeat(null);
  e.poll(0);
  expect(f.levels.at(-1)).toMatchObject({ perc: 0, kit: 0 });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm vitest run src/sound/botanica/engine.test.ts`
Expected: 新的 6 個 FAIL（型別錯或行為錯），既有的因為 `clock` 型別缺少也會先 FAIL 於 typecheck。

- [ ] **Step 3: 改 `engine.ts`（`src/sound/engine.ts`）、`layers/types.ts`、`params.ts`、`botanica/engine.ts`**

照 Interfaces 的規則。`BLOOM_RECENT_MS = 12000`、`BLOOM_RECENT_MAX = 2`，pad 綻放時間戳記在陣列裡。

- [ ] **Step 4: 跑測試、typecheck**

Run: `pnpm vitest run src/sound/botanica/engine.test.ts && pnpm typecheck`
Expected: 全部 passed；typecheck 會在 `index.ts` 缺 `clock` 處失敗，Task 7 補。

- [ ] **Step 5: Commit**

```bash
git add src/sound/engine.ts src/sound/botanica/layers/types.ts src/sound/botanica/params.ts src/sound/botanica/engine.ts src/sound/botanica/engine.test.ts
git commit -m "feat(sound): 引擎接合唱：放開入隊、分枝點亮、枝斷熄格、16 分音符出聲、外部熱度、弦樂墊讓位"
```

---

### Task 7: Tone.js 端：16 分音符回呼、顆粒可排時間、組裝

**Files:**
- Modify: `src/sound/botanica/audio/clock.ts`
- Modify: `src/sound/botanica/audio/voices.ts`（`GrainPool.play` 用 `opts.at ?? Tone.now()`）
- Modify: `src/sound/botanica/index.ts`（`clock` 提到 `build()` 外、deps 加 `clock`）

**Interfaces:**
- Produces:
  ```ts
  // clock.ts
  everySixteenth(fn: (time: number, sixteenth: number, bar: number) => void): () => void;
  // 用 scheduleRepeat(cb, '16n', `${next16thTicks}i`)；cb 裡 ticks = transport.getTicksAtTime(time)，
  // sixteenth = Math.round(ticks / (PPQ / 4)) % 16，bar = Math.floor(ticks / (PPQ * 4))
  ```
- 這個檔案沒有單元測試（Tone.js 要瀏覽器）；驗證在 Task 9。

- [ ] **Step 1: 改 `clock.ts`、`voices.ts`、`index.ts`**

`index.ts`：`let clock: Clock | null = null`，`build()` 裡建；deps `clock: { everySixteenth: (fn) => (clock ? clock.everySixteenth(fn) : () => {}) }`。注意 `engine.start()` 先 `await output.start()`（會 build）再註冊，所以 clock 已存在。

- [ ] **Step 2: typecheck、lint、全部測試**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 全綠。

- [ ] **Step 3: Commit**

```bash
git add src/sound/botanica/audio/clock.ts src/sound/botanica/audio/voices.ts src/sound/botanica/index.ts
git commit -m "feat(sound): Transport 的 16 分音符回呼；顆粒可指定出聲時間"
```

---

### Task 8: 實驗 04 接線與面板

**Files:**
- Modify: `experiments/04-space/main.ts`
- Modify: `experiments/04-space/panel.ts`（「聲」分頁）

**Interfaces:**
- Consumes: Task 1（`analyzeGesture`、`GestureSample`）、Task 6（`PlantInfo`、`setHeat`、`params.trees`）。
- `main.ts` 改動：
  - `Drawing` 加 `samples: GestureSample[]`；`stepDrawing` 每幀（未 lifted 時）push `{ t: performance.now(), speed: Math.min(1, s.speed / penParams.maxSpeed) }`。
  - `Item` 加 `id: number`（= 這一筆的 `seed`）。
  - `finishDrawing`：`engine().onPlantStart?.(seed, item.voice, { id: seed, gesture: analyzeGesture(d.samples) })`（所有種類都傳，引擎只對押花樹用）。
  - 主迴圈 `sound(events, voice)` 改成 `sound(events, voice, id)` 把 `it.id` 傳進 `onGrowth` 第三個參數；枯的事件（找 `onWither` 呼叫處）也傳 `it.id`。
  - 每幀 `botanica.setHeat(heat.value(now))`（放在 `renderHeat` 前）。
- `panel.ts` 「聲」分頁 Botanica 區塊最後加：
  ```
  section '俳句：一株一個節奏物件（押花樹）'
  toggle '開' → b.trees.enabled
  slider '同時幾株（0 = 跟熱度）' → b.trees.maxActive, 0..6, 1
  slider '密度' → b.trees.density, 0.2..2, 0.05
  ```

- [ ] **Step 1: 改 `main.ts`、`panel.ts`**

- [ ] **Step 2: typecheck、lint、全部測試**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 全綠。

- [ ] **Step 3: Commit**

```bash
git add experiments/04-space/main.ts experiments/04-space/panel.ts
git commit -m "feat(exp04): 押花樹放開時把手勢交給聲音；分枝、枝斷帶株 id；鼓吃畫面熱度；面板「俳句」"
```

---

### Task 9: 瀏覽器驗收、紀錄、tag

**Files:**
- Modify: `docs/process-log.md`

- [ ] **Step 1: 瀏覽器驗收**

`pnpm dev`（已有的話用現有的，首頁進 04 空間），用 Chrome 工具在頁面上模擬滑鼠（參考 exp04-p 那輪的做法：`PointerEvent` 一筆 30 個 move、間隔 25 ms）：
1. 一筆慢（每步間隔 60 ms）、一筆快（10 ms）：`console` 讀不到個性，所以在 `main.ts` 的 `finishDrawing` 暫時 `console.log('[tree]', seed, gesture)`，驗完拿掉。預期慢筆 energy < 0.25、快筆 > 0.6。
2. 連畫四筆，`read_console_messages` 沒有 error。
3. 聽不到（自動化沒喇叭），改驗事件：在 `window.__exp04` 掛上 `botanica`，`setInterval` 1 秒內用 `javascript_tool` 數 `choir`… 引擎沒暴露；改成在 `Grains.grain` 暫時 `console.log('[grain]', sampleId, opts.at)` 數：四株活著、熱度 > 0.6 時每小節 ≤ 4 株 × 各自格數的 hit，`at` 遞增且相鄰差 ≈ 60/bpm/4 的整數倍。驗完拿掉。
4. 停手等到枯（面板把「停手幾秒」調 3、「全枯幾秒」調 20）：枝斷時 `[grain]` 變少、最後一聲 `glitch … rev`，之後安靜。

- [ ] **Step 2: process-log 加一列、打 tag**

列的格式照既有：`| \`exp04-q\` | 2026-11-11 | 04 空間 | …做了什麼、驗收數字… | （待填） |`。

```bash
git add docs/process-log.md
git commit -m "docs: process log exp04-q"
git tag exp04-q
```

---

## 自我檢查紀錄

- Spec 覆蓋：§1 一個物件一首俳句（Task 2、3）、連線（Task 4、5 聲部與輪流）、同一脈搏（Task 7）、厚薄（Task 4、6 setHeat）；§2 手勢帶狀態（Task 1、2）、停頓分布（Task 1 → Task 2 reverse）、留白（Task 4、6 綻放讓位）、靠種子（Task 2）、餘韻（Task 6 died 尾音）；§3 三條關聯（Task 5、6）；§5 第 1、2 輪都在。鄰近繼承、名字：spec 說之後再說，不做。
- 名稱一致：`TreeChoir.add/grow/wither/tick`、`ClockDep.everySixteenth`、`PlantInfo`、`params.trees` 在 Task 5–8 一致。
- 比例：spec 約 120 行，計畫約 400 行，其中一半是測試碼；程式本體只給簽名。
