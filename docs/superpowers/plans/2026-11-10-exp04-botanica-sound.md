# 04 空間 Botanica 聲音 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 04 空間的聲音換成四層取樣引擎（底／和弦／顆粒／偶發），調可選、每筆隨機、舊引擎可切回。

**Architecture:** 樂理、素材清單、每筆配方、排程都是純函式或純狀態機（無 Tone.js），`BotanicaEngine` 透過「層」的介面驅動聲音，所以引擎本身用假的層就能測。Tone.js 只在 `src/sound/botanica/audio/` 與 `layers/` 出現；04 只換引擎、加兩個呼叫、改「聲」分頁。依賴單向：theory ← manifest ← audio ← layers ← engine ← experiments/04。

**Tech Stack:** TypeScript strict、Vite、Vitest、Biome、Tone.js 15.1.x、ffmpeg（轉檔腳本）、Node 24（腳本直接跑 .ts）。

**Spec:** `docs/superpowers/specs/2026-11-10-exp04-botanica-sound-design.md`

## Global Constraints

- 另一個 session 同時在改 `experiments/04-space` 與 `src/growth`：每個 commit 只 `git add` 自己那一步列出的檔案，**絕不 `git add -A`**；改 `main.ts`、`panel.ts` 前先 `git pull`／看 `git status`，改動只限計畫寫的那幾處。
- Tone.js 只能被 `src/sound/botanica/audio/**`、`src/sound/botanica/layers/**`、`src/sound/botanica/index.ts` import。
- `public/sounds/*.mp3` 不進 git；`public/sounds/README.md` 與腳本進 git。
- 顆粒總位移 ≤ ±7 半音；移調取 −6..+5 最短路徑；每秒顆粒上限預設 6；和弦同時最多兩筆；筆距 < 1.5 秒只推進和弦不綻放；閒置 12 秒後每 15–40 秒偶發、glitch 機率 1/4。
- 預設：調 C、隨機幅度 0.7、引擎 Botanica。
- 每步驗證：`pnpm test`、`pnpm typecheck`、`pnpm lint` 全綠才 commit。
- 文字全部繁體中文（面板標籤、註解、commit 訊息），commit 前綴照既有風格 `feat(exp04): …`、`feat(sound): …`。

## Review Focus

1. 素材還沒載好就來生長事件：引擎要靜靜略過，不排隊、不丟錯（Task 7 測）。
2. 畫線中（`onStrokePoint`）絕不出聲（Task 7 測）。
3. 隨機幅度 0 時同一筆重播、不同筆之間配方完全一樣；幅度 1 時仍不違反 ±7 與每秒上限（Task 3、Task 7 測）。
4. 換調後下一個顆粒、下一筆綻放就用新調；正在響的不動（Task 7 測）。
5. 清空（C）或復原後舊植物不再送事件，但閒置偶發仍會接著來；草永遠 alive，不觸發 onPlantDone（Task 8 人工驗收 + Task 4 測閒置重算）。

---

### Task 1: 樂理純函式 `theory/`

**Files:**
- Create: `src/sound/theory/keys.ts`、`src/sound/theory/chords.ts`、`src/sound/theory/register.ts`
- Test: `src/sound/theory/keys.test.ts`、`src/sound/theory/chords.test.ts`、`src/sound/theory/register.test.ts`

**Interfaces:**
- Produces:
  - `KEY_NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'] as const`、`type KeyName`
  - `keyPitchClass(k: KeyName): number`
  - `keyShift(from: KeyName, to: KeyName): number` — 回 −6..+5
  - `type Degree = 'I' | 'ii' | 'IV' | 'V' | 'vi'`、`PROGRESSION: readonly Degree[] = ['IV','V','vi','I']`
  - `chordTones(d: Degree): readonly number[]` — 相對主音的 pitch class（I: 0,4,7；ii: 2,5,9；IV: 5,9,0；V: 7,11,2；vi: 9,0,4）
  - `type ChordAction = 'advance' | 'stay' | 'substitute'`
  - `nextChordIndex(i: number, action: ChordAction): number` — advance 才 +1（mod 4），其餘不動
  - `chordAt(i: number, substitute: boolean): Degree` — substitute 時 IV→ii、I→vi，其他不變
  - `nearestOffset(pc: number): number` — 0..11 → −5..+6
  - `foldShift(semis: number, limit = 7): number` — 加減 12 直到 |x| ≤ limit
  - `grainShift(keyShiftSemis: number, tone: number): number` — `foldShift(keyShiftSemis + nearestOffset(tone))`
  - `type GrainCategory = 'kalimba' | 'bell' | 'glitch'`、`grainCategory(depth: number): GrainCategory` — depth ≤ 1 kalimba、2 bell、≥ 3 glitch

- [ ] **Step 1: 寫失敗的測試**

```ts
// keys.test.ts
test('keyShift 取最短路徑', () => {
  expect(keyShift('C', 'G')).toBe(-5);
  expect(keyShift('C', 'F')).toBe(5);
  expect(keyShift('Bb', 'C')).toBe(2);
  expect(keyShift('C', 'Gb')).toBe(-6);
  expect(keyShift('Db', 'C')).toBe(-1);
});
// chords.test.ts
test('王道進行與代換', () => {
  expect(PROGRESSION).toEqual(['IV', 'V', 'vi', 'I']);
  expect(nextChordIndex(3, 'advance')).toBe(0);
  expect(nextChordIndex(1, 'stay')).toBe(1);
  expect(chordAt(0, true)).toBe('ii');
  expect(chordAt(3, true)).toBe('vi');
  expect(chordAt(1, true)).toBe('V');
});
test('位移折回 ±7', () => {
  expect(foldShift(9)).toBe(-3);
  expect(foldShift(-8)).toBe(4);
  expect(foldShift(7)).toBe(7);
  expect(nearestOffset(9)).toBe(-3);
  expect(nearestOffset(6)).toBe(6);
  for (const k of [-6, -5, 0, 5]) for (const t of [0, 4, 7, 9, 11]) expect(Math.abs(grainShift(k, t))).toBeLessThanOrEqual(7);
});
// register.test.ts
test('深度對素材類別', () => {
  expect(grainCategory(0)).toBe('kalimba');
  expect(grainCategory(2)).toBe('bell');
  expect(grainCategory(5)).toBe('glitch');
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `pnpm vitest run src/sound/theory`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作三個檔案的函式（簽名如 Interfaces）**

- [ ] **Step 4: 跑測試確認通過；`pnpm typecheck && pnpm lint`**

- [ ] **Step 5: Commit**

```bash
git add src/sound/theory
git commit -m "feat(sound): 樂理純函式：調、王道進行、位移折回、深度對素材類別"
```

---

### Task 2: 素材清單、轉檔腳本、來源 README

**Files:**
- Create: `src/sound/botanica/manifest.ts`、`src/sound/botanica/manifest.test.ts`、`scripts/convert-sounds.ts`、`public/sounds/README.md`
- Modify: `.gitignore`（加 `public/sounds/*.mp3`）

**Interfaces:**
- Consumes: `KeyName`（Task 1）
- Produces:
  - `type SampleRole = 'bed' | 'rain' | 'strings' | 'piano' | 'swell' | 'clarinet' | 'kalimba' | 'bell' | 'glitch' | 'drip' | 'glitchfx'`
  - `type Sample = { id: string; file: string; role: SampleRole; sourceKey: KeyName; gainDb: number; source: string; trimSec?: number }` — `file` 是 `public/sounds/` 下的檔名；`source` 是相對 `~/Downloads/Floral/` 的原檔路徑
  - `SAMPLES: readonly Sample[]`、`samplesByRole(role: SampleRole): readonly Sample[]`、`sampleById(id: string): Sample | undefined`、`SOUND_BASE = '/sounds/'`
  - 子集（照 spec §5）：bed = foley1–4（`trimSec: 60`）+ raindrops；rain = rain synth 01–03；strings = string phrase 01–24（C）；piano = granular piano 1–10（C）；swell = botanical swell 1–2（Db）、3（C）；clarinet = clarinet phrase 1–14（Bb）；kalimba = granular kalimba accent 1–9（C）；bell = granular bell accent 1–11（C）；glitch = bell glitch 1–11（C）；drip = water droplet、water droplet impact、plop、watery sweeper（sourceKey 'C'，無音高）；glitchfx = glitch1–6（F）、glitch7–13（C）。id 用 `role-編號`（例如 `strings-07`）。`gainDb` 先全部 0，foley −6。

- [ ] **Step 1: 寫失敗的測試**

```ts
test('清單一致：id、file 不重複，每個 role 都有素材', () => {
  const ids = SAMPLES.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(SAMPLES.map((s) => s.file)).size).toBe(ids.length);
  for (const r of ['bed','rain','strings','piano','swell','clarinet','kalimba','bell','glitch','drip','glitchfx'] as const)
    expect(samplesByRole(r).length).toBeGreaterThan(0);
  expect(samplesByRole('strings').length).toBe(24);
  expect(sampleById('clarinet-01')?.sourceKey).toBe('Bb');
  for (const s of SAMPLES) expect(s.file).toMatch(/^[a-z]+-[0-9a-z]+\.mp3$/);
});
```

- [ ] **Step 2: 跑測試確認失敗**

- [ ] **Step 3: 寫 `manifest.ts`**

- [ ] **Step 4: 寫 `scripts/convert-sounds.ts`**

Node 24 直接跑 .ts。從 `../src/sound/botanica/manifest.ts` import `SAMPLES`；來源根目錄預設 `~/Downloads/Floral`，可用第一個參數覆蓋；對每筆用 `child_process.execFileSync('ffmpeg', ['-y','-i',src, ...(trimSec ? ['-t', String(trimSec)] : []), '-ac','2','-ar','44100','-codec:a','libmp3lame','-q:a','4', dest])`；目標已存在且比來源新就跳過；來源不存在就列出並以非零碼結束。結尾印總檔數與總大小。

- [ ] **Step 5: 跑腳本並確認**

Run: `node scripts/convert-sounds.ts && du -sh public/sounds && ls public/sounds | wc -l`
Expected: 沒有缺檔；總量 < 30 MB；檔數 = `SAMPLES.length`

- [ ] **Step 6: 寫 `public/sounds/README.md`（格式照 `public/backgrounds/README.md`）、加 `.gitignore`**

README 寫：來源 bespoke「Floral v.1 / v.2 — Botanica Sample Pack」（Gumroad）、**授權待使用者確認、確認前不公開**、轉檔方式一句、表格（檔名／作品裡的用途／原檔／源調）。

- [ ] **Step 7: `pnpm test && pnpm typecheck && pnpm lint`；確認 `git status` 沒出現 mp3**

- [ ] **Step 8: Commit**

```bash
git add src/sound/botanica/manifest.ts src/sound/botanica/manifest.test.ts scripts/convert-sounds.ts public/sounds/README.md .gitignore
git commit -m "feat(sound): Floral 素材清單與轉檔腳本（mp3 不進 git）"
```

---

### Task 3: 每筆配方 `recipe.ts` 與不重抽 `pick.ts`

**Files:**
- Create: `src/sound/botanica/recipe.ts`、`src/sound/botanica/recipe.test.ts`、`src/sound/botanica/pick.ts`、`src/sound/botanica/pick.test.ts`

**Interfaces:**
- Consumes: `mulberry32`（`src/growth/rng`）、`ChordAction`、`GrainCategory`（Task 1）
- Produces:
  - `type BloomColour = 'strings' | 'piano' | 'swell' | 'clarinet' | 'none'`
  - `type Recipe = { colour: BloomColour; sliceStart: number /*0..1*/; sliceLen: number /*秒，Infinity=整句*/; reverse: boolean; attack: number /*秒*/; reverbSend: number /*0..1*/; octave: -1 | 0; pan: number /*-1..1*/; lowpassHz: number; gain: number; chord: ChordAction; grains: { maxPerSec: number; bias: -1 | 0 | 1; reverseChance: number } }`
  - `DEFAULT_RECIPE: Recipe` = `{ colour:'strings', sliceStart:0, sliceLen:Infinity, reverse:false, attack:1.5, reverbSend:0.5, octave:0, pan:0, lowpassHz:8000, gain:1, chord:'advance', grains:{ maxPerSec:6, bias:0, reverseChance:0 } }`
  - `makeRecipe(seed: number, amount: number): Recipe` — amount 0 回 `DEFAULT_RECIPE`；amount 1 全範圍：colour 權重 strings 4、piano 3、swell 2、clarinet 1、none 1.5；sliceStart 0..0.6；sliceLen 1.5..Infinity（1/3 機率整句）；reverse 1/4；attack 0.5..3；reverbSend 0.2..0.9；octave −1 機率 1/6；pan −0.7..0.7；lowpassHz 2000..8000；gain 0.7..1；chord stay 1/4、substitute 1/6、其餘 advance；grains.maxPerSec 3..8、bias 等機率、reverseChance 0..0.3。amount 在 0..1 之間：機率乘以 amount，範圍往預設值收縮（線性插值）。
  - `class FreshPicker { constructor(memory: number); pick<T extends { id: string }>(pool: readonly T[], rng: () => number): T }` — 最近 `memory` 個 id 不重抽；池子比記憶小時退化成「不連續重複」。

- [ ] **Step 1: 寫失敗的測試**

```ts
test('amount 0 永遠是預設配方', () => {
  for (const s of [1, 2, 99]) expect(makeRecipe(s, 0)).toEqual(DEFAULT_RECIPE);
});
test('同種子同配方，不同種子會不同', () => {
  expect(makeRecipe(7, 1)).toEqual(makeRecipe(7, 1));
  const set = new Set(Array.from({ length: 50 }, (_, i) => JSON.stringify(makeRecipe(i, 1))));
  expect(set.size).toBeGreaterThan(40);
});
test('amount 1 的分布與邊界', () => {
  const rs = Array.from({ length: 2000 }, (_, i) => makeRecipe(i, 1));
  const share = (c: BloomColour) => rs.filter((r) => r.colour === c).length / rs.length;
  expect(share('strings')).toBeGreaterThan(0.28); expect(share('strings')).toBeLessThan(0.42);
  expect(share('none')).toBeGreaterThan(0.08); expect(share('none')).toBeLessThan(0.18);
  expect(rs.filter((r) => r.chord === 'stay').length / rs.length).toBeCloseTo(0.25, 1);
  for (const r of rs) {
    expect(r.grains.maxPerSec).toBeGreaterThanOrEqual(3); expect(r.grains.maxPerSec).toBeLessThanOrEqual(8);
    expect(Math.abs(r.pan)).toBeLessThanOrEqual(0.7);
    expect(r.sliceLen === Infinity || r.sliceLen >= 1.5).toBe(true);
  }
});
test('FreshPicker 不重抽最近用過的', () => {
  const pool = Array.from({ length: 24 }, (_, i) => ({ id: `s${i}` }));
  const p = new FreshPicker(8);
  const rng = mulberry32(3);
  const seen: string[] = [];
  for (let i = 0; i < 200; i++) {
    const x = p.pick(pool, rng).id;
    expect(seen.slice(-8)).not.toContain(x);
    seen.push(x);
  }
});
```

- [ ] **Step 2: 跑測試確認失敗**
- [ ] **Step 3: 實作 `recipe.ts`、`pick.ts`**
- [ ] **Step 4: 跑測試確認通過；typecheck、lint**
- [ ] **Step 5: Commit**

```bash
git add src/sound/botanica/recipe.ts src/sound/botanica/recipe.test.ts src/sound/botanica/pick.ts src/sound/botanica/pick.test.ts
git commit -m "feat(sound): 每筆隨機配方與不重抽的素材挑選"
```

---

### Task 4: 排程狀態機 `schedule/`

**Files:**
- Create: `src/sound/botanica/schedule/rateLimit.ts`、`rateLimit.test.ts`、`idle.ts`、`idle.test.ts`

**Interfaces:**
- Produces:
  - `class RateLimiter { constructor(maxPerSec: number); setMax(n: number): void; allow(nowMs: number): boolean }` — 滑動 1 秒窗；同一 `nowMs` 第二次一律 false。
  - `type IdleEvent = 'drip' | 'glitch'`
  - `class IdleScheduler { constructor(rng: () => number, opts?: { idleMs?: number; minGapMs?: number; maxGapMs?: number; glitchChance?: number }); activity(nowMs: number): void; poll(nowMs: number): IdleEvent | null }` — 預設 12000 / 15000 / 40000 / 0.25。`activity` 之後要等 `idleMs` 才進入閒置，進入時排第一次（閒置開始 + 隨機 gap）；每次 `poll` 回傳事件後排下一次；再有 `activity` 就清掉。

- [ ] **Step 1: 寫失敗的測試**

```ts
test('每秒上限與同毫秒去重', () => {
  const r = new RateLimiter(3);
  expect([r.allow(0), r.allow(0), r.allow(100), r.allow(200), r.allow(300)]).toEqual([true, false, true, true, false]);
  expect(r.allow(1001)).toBe(true);
  r.setMax(1); expect(r.allow(1002)).toBe(false);
});
test('閒置 12 秒後才開始，間隔 15–40 秒，活動就重算', () => {
  const s = new IdleScheduler(mulberry32(1));
  s.activity(0);
  for (let t = 0; t < 12000; t += 500) expect(s.poll(t)).toBeNull();
  let first = -1;
  for (let t = 12000; t <= 60000; t += 100) { if (s.poll(t)) { first = t; break; } }
  expect(first).toBeGreaterThanOrEqual(27000); expect(first).toBeLessThanOrEqual(52000);
  s.activity(first + 1);
  for (let t = first + 1; t < first + 12000; t += 500) expect(s.poll(t)).toBeNull();
});
test('glitch 約四分之一', () => {
  const s = new IdleScheduler(mulberry32(2), { idleMs: 0, minGapMs: 1, maxGapMs: 1 });
  s.activity(0);
  const ev: IdleEvent[] = [];
  for (let t = 1; ev.length < 400; t += 2) { const e = s.poll(t); if (e) ev.push(e); }
  expect(ev.filter((e) => e === 'glitch').length / 400).toBeCloseTo(0.25, 1);
});
```

- [ ] **Step 2: 跑測試確認失敗**
- [ ] **Step 3: 實作**
- [ ] **Step 4: 跑測試確認通過；typecheck、lint**
- [ ] **Step 5: Commit**

```bash
git add src/sound/botanica/schedule
git commit -m "feat(sound): 顆粒每秒上限與閒置偶發排程（純狀態機）"
```

---

### Task 5: 參數、層的介面、Tone 音訊底層 `audio/`

**Files:**
- Create: `src/sound/botanica/params.ts`、`src/sound/botanica/layers/types.ts`、`src/sound/botanica/audio/bus.ts`、`src/sound/botanica/audio/loader.ts`、`src/sound/botanica/audio/voices.ts`
- Modify: `package.json`（`pnpm add tone@^15.1.22`）

**Interfaces:**
- Consumes: `SAMPLES`、`SOUND_BASE`、`SampleRole`（Task 2）
- Produces:
  - `params.ts`：`type LayerParams = { enabled: boolean; volume: number }`；`type LayerName = 'bed' | 'bloom' | 'grains' | 'drips'`；`type BotanicaParams = { key: KeyName; randomness: number; bed: LayerParams; bloom: LayerParams; grains: LayerParams; drips: LayerParams }`；`defaultBotanicaParams: BotanicaParams` = key 'C'、randomness 0.7、bed {true, 0.35}、bloom {true, 0.8}、grains {true, 0.7}、drips {true, 0.6}。
  - `layers/types.ts`（無 Tone）：
    - `interface Layer { setEnabled(b: boolean): void; setVolume(v: number): void; dispose(): void }`
    - `type BloomOpts = { shift: number; sliceStart: number; sliceLen: number; reverse: boolean; attack: number; reverbSend: number; octave: -1 | 0; pan: number; lowpassHz: number; gain: number }`
    - `type GrainOpts = { shift: number; pan: number; reverse: boolean; gainDb: number }`
    - `interface BedLayer extends Layer { start(): void }`
    - `interface BloomLayer extends Layer { bloom(sampleId: string, opts: BloomOpts): void }`
    - `interface GrainLayer extends Layer { grain(sampleId: string, opts: GrainOpts): void }`
    - `interface DripLayer extends Layer { drip(sampleId: string): void; glitch(sampleId: string, shift: number): void }`
    - `interface SampleStore { ready(role: SampleRole): boolean; loadRole(role: SampleRole): Promise<void> }`
  - `audio/bus.ts`：`class Bus { readonly master: Tone.Gain; readonly reverb: Tone.Reverb /*decay 6, wet 0.35*/; readonly limiter: Tone.Limiter /*-3*/; layer(name: LayerName): Tone.Gain; send(): Tone.Gain /*進 reverb 的 aux*/; setMasterVolume(v: number): void; dispose(): void }` — 鏈：layer gains → master → limiter → destination；send → reverb → master。
  - `audio/loader.ts`：`class Loader implements SampleStore { constructor(base = SOUND_BASE); get(id: string): Tone.ToneAudioBuffer | undefined; ready(role): boolean; loadRole(role): Promise<void>; loadAll(order: readonly SampleRole[]): Promise<void> /*依序，不並行太多*/ }`
  - `audio/voices.ts`：`class GrainPool { constructor(out: Tone.ToneAudioNode, size = 8); play(buffer: Tone.ToneAudioBuffer, opts: GrainOpts): void /*搶最舊的*/; dispose(): void }` — 每個 voice：`Tone.GrainPlayer`（grainSize 0.2、overlap 0.1）→ `Tone.Panner` → `Tone.Gain`。

- [ ] **Step 1: `pnpm add tone@^15.1.22`；確認 `node_modules/tone/package.json` 版本 15.1.x**
- [ ] **Step 2: 寫 `params.ts`、`layers/types.ts`**
- [ ] **Step 3: 寫 `bus.ts`、`loader.ts`、`voices.ts`**（無單元測試；靠 typecheck）
- [ ] **Step 4: `pnpm typecheck && pnpm lint && pnpm test`**
- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/sound/botanica/params.ts src/sound/botanica/layers/types.ts src/sound/botanica/audio
git commit -m "feat(sound): Tone.js 匯流排、載入器、顆粒 voice 池與層的介面"
```

---

### Task 6: 四個層 `layers/`

**Files:**
- Create: `src/sound/botanica/layers/bed.ts`、`bloom.ts`、`grains.ts`、`drips.ts`

**Interfaces:**
- Consumes: `Bus`、`Loader`、`GrainPool`（Task 5）、`samplesByRole`（Task 2）、`FreshPicker`（Task 3）
- Produces（都 `constructor(bus: Bus, loader: Loader, rng: () => number)`，實作 Task 5 的介面）：
  - `class Bed implements BedLayer` — `start()`：兩個 `Tone.Player`（loop、各隨機 offset）交叉淡入淡出，每 40–90 秒換一段（從 `bed` role 抽、不連續重複）；共用 `Tone.Filter` 低通 4000；每 60–180 秒淡進一段 `rain`（音量 −12 dB）。素材沒載好就等 `loader.loadRole('bed')` 再開始。
  - `class Bloom implements BloomLayer` — 兩個 slot（各 `Tone.Player` → `Tone.Filter` → `Tone.Panner` → `Tone.Gain`，另一條到 `bus.send()`）；`bloom()` 取最舊 slot，若在響先 2 秒淡出；`shift` 用 `playbackRate = 2^((shift + 12*octave)/12)`（Player 沒有 detune，長度會變，可接受）；`sliceStart` × buffer 長度為起點、`sliceLen` 為長度；`reverse` 用 `player.reverse`；`attack` 用 gain ramp。
  - `class Grains implements GrainLayer` — `grain()` 直接丟 `GrainPool.play(loader.get(id), opts)`。
  - `class Drips implements DripLayer` — 單一 `Tone.Player` 池 4 個；`drip()` 音量 −6 dB、隨機 pan；`glitch(id, shift)` 用 playbackRate。
  - 四個都：`setEnabled(false)` 把自己的 layer gain ramp 到 0（0.3 秒）而不是停播；`setVolume(v)` 設 layer gain；`dispose()` 釋放節點。

- [ ] **Step 1: 寫四個層**
- [ ] **Step 2: `pnpm typecheck && pnpm lint && pnpm test`**
- [ ] **Step 3: Commit**

```bash
git add src/sound/botanica/layers
git commit -m "feat(sound): 底、和弦、顆粒、偶發四層"
```

---

### Task 7: `BotanicaEngine`（用假層測）與工廠

**Files:**
- Create: `src/sound/botanica/engine.ts`、`src/sound/botanica/engine.test.ts`、`src/sound/botanica/index.ts`
- Modify: `src/sound/engine.ts`（`SoundEngine` 加可選 `onPlantStart?(seed: number): void; onPlantDone?(): void`）

**Interfaces:**
- Consumes: Task 1–6 全部
- Produces:
  - `type EngineDeps = { bed: BedLayer; bloom: BloomLayer; grains: GrainLayer; drips: DripLayer; store: SampleStore; now: () => number; seed?: number }`
  - `class BotanicaEngine implements SoundEngine { constructor(params: BotanicaParams, deps: EngineDeps); start(): Promise<void>; onStrokePoint(): void /*no-op*/; onGrowth(e: GrowthEvent): void; onPlantStart(seed: number): void; onPlantDone(): void; setVolume(v: number): void; setMuted(b: boolean): void; applyParams(): void /*params 物件被面板改了之後呼叫，把開關、音量推給層*/; poll(nowMs?: number): void /*閒置偶發；start() 後每 1 秒自動呼叫*/; readonly chordIndex: number; dispose(): void }`
  - `index.ts`：`createBotanicaEngine(params: BotanicaParams): BotanicaEngine` — 建 Bus、Loader、四層、`Tone.start()` 放在 `start()`；`now = () => performance.now()`。`loadAll` 順序 `['bed','kalimba','bell','glitch','strings','piano','swell','drip','glitchfx','rain','clarinet']`。
  - 行為（引擎內）：
    - `chordIndex` 初始為 3（I），第一筆 advance 後落在 0（IV）。
    - `onPlantStart(seed)`：`recipe = makeRecipe(seed, params.randomness)`；`chordIndex = nextChordIndex(chordIndex, recipe.chord)`；若 `now - lastBloomAt < 1500` 或 `recipe.colour === 'none'` 或 `!store.ready(role)` 就不叫 `bloom`；否則用 `FreshPicker(8)` 從該 colour 的 role 抽、`shift = keyShift(sample.sourceKey, params.key)`，呼叫 `bloom.bloom(id, {...})`；記 `lastBloomAt`；`rateLimiter.setMax(recipe.grains.maxPerSec)`；`idle.activity(now)`。
    - `onGrowth(e)`：`idle.activity(now)`；`kind === 'leaf'` 先丟一半（rng）；`!rateLimiter.allow(now)` 就略過；`cat = grainCategory(e.depth)`；`!store.ready(cat)` 略過；從該 role 抽、tone 從 `chordTones(chordAt(chordIndex, recipe.chord === 'substitute'))` 依 bias 挑（−1 最低、+1 最高、0 隨機）；`shift = grainShift(keyShift(src, key), tone)`；`pan = (e.x - 0.5) * 1.6`；`reverse = rng() < recipe.grains.reverseChance`；`gainDb = kind === 'leaf' ? -8 : 0`。
    - `onPlantDone()`：`store.ready('drip')` 才 `drips.drip(抽一個)`。
    - `poll(now)`：`idle.poll(now)` 回 drip → `drips.drip`；glitch → `drips.glitch(id, keyShift(src, key))`。
    - `setMuted(true)` 把 master ramp 到 0，`false` 回到 volume。

- [ ] **Step 1: 寫失敗的測試（用假層記錄呼叫）**

```ts
const fake = () => {
  const calls: string[] = [];
  const layer = { setEnabled: () => {}, setVolume: () => {}, dispose: () => {} };
  const ready = new Set<SampleRole>(['bed','kalimba','bell','glitch','strings','piano','swell','drip','glitchfx']);
  let t = 0;
  const deps: EngineDeps = {
    bed: { ...layer, start: () => calls.push('bed.start') },
    bloom: { ...layer, bloom: (id, o) => calls.push(`bloom ${id} shift=${o.shift}`) },
    grains: { ...layer, grain: (id, o) => calls.push(`grain ${id} shift=${o.shift}`) },
    drips: { ...layer, drip: (id) => calls.push(`drip ${id}`), glitch: (id) => calls.push(`glitch ${id}`) },
    store: { ready: (r) => ready.has(r), loadRole: async () => {} },
    now: () => t, seed: 1,
  };
  return { calls, deps, ready, tick: (ms: number) => { t += ms; } };
};
const ev = (depth: number, x = 0.5): GrowthEvent => ({ kind: 'branch', x, y: 0.5, depth, age: 0 });

test('畫線中無聲；放開才綻放並推進和弦', () => {
  const f = fake(); const e = new BotanicaEngine({ ...defaultBotanicaParams, randomness: 0 }, f.deps);
  e.onStrokePoint({ x: 0, y: 0, t: 0 } as StrokePoint);
  expect(f.calls).toEqual([]);
  e.onPlantStart(1); expect(e.chordIndex).toBe(0); // 第一筆落在 IV
  expect(f.calls.some((c) => c.startsWith('bloom strings-'))).toBe(true);
});
test('1.5 秒內的第二筆只推進和弦', () => {
  const f = fake(); const e = new BotanicaEngine({ ...defaultBotanicaParams, randomness: 0 }, f.deps);
  e.onPlantStart(1); f.tick(500); e.onPlantStart(2);
  expect(f.calls.filter((c) => c.startsWith('bloom')).length).toBe(1); expect(e.chordIndex).toBe(1);
});
test('素材沒載好就略過，不丟錯', () => {
  const f = fake(); f.ready.clear();
  const e = new BotanicaEngine(defaultBotanicaParams, f.deps);
  e.onPlantStart(1); e.onGrowth(ev(1)); e.onPlantDone(); expect(f.calls).toEqual([]);
});
test('顆粒受每秒上限，位移在 ±7 內，深度決定素材類別', () => {
  const f = fake(); const e = new BotanicaEngine({ ...defaultBotanicaParams, randomness: 0 }, f.deps);
  e.onPlantStart(1);
  for (let i = 0; i < 20; i++) { f.tick(10); e.onGrowth(ev(0)); }
  const g = f.calls.filter((c) => c.startsWith('grain'));
  expect(g.length).toBeLessThanOrEqual(6);
  for (const c of g) { expect(c).toMatch(/grain kalimba-/); expect(Math.abs(Number(c.split('shift=')[1]))).toBeLessThanOrEqual(7); }
  f.tick(1100); e.onGrowth(ev(4)); expect(f.calls.at(-1)).toMatch(/grain glitch-/);
});
test('換調後下一個顆粒用新調', () => {
  // 第一筆後和弦是 IV（F：5,9,0 → 最短位移 5,-3,0）；換到 G 後 keyShift(C,G) = -5 → 0,-8→4,-5
  const f = fake(); const p = { ...defaultBotanicaParams, randomness: 0 }; const e = new BotanicaEngine(p, f.deps);
  const shift = (c: string) => Number(c.split('shift=')[1]);
  e.onPlantStart(1);
  for (let i = 0; i < 6; i++) { f.tick(200); e.onGrowth(ev(2)); expect([5, -3, 0]).toContain(shift(f.calls.at(-1) ?? '')); }
  p.key = 'G'; e.applyParams();
  for (let i = 0; i < 6; i++) { f.tick(200); e.onGrowth(ev(2)); expect([0, 4, -5]).toContain(shift(f.calls.at(-1) ?? '')); }
});
test('長完掉一滴水；閒置後偶發', () => {
  const f = fake(); const e = new BotanicaEngine(defaultBotanicaParams, f.deps);
  e.onPlantStart(1); e.onPlantDone(); expect(f.calls.at(-1)).toMatch(/^drip /);
  const before = f.calls.length;
  for (let i = 0; i < 12; i++) { f.tick(1000); e.poll(); }
  expect(f.calls.length).toBe(before); // 12 秒內不偶發
  for (let i = 0; i < 60; i++) { f.tick(1000); e.poll(); }
  expect(f.calls.length).toBeGreaterThan(before); // 之後 60 秒內至少一次
  expect(f.calls.slice(before).every((c) => /^(drip|glitch) /.test(c))).toBe(true);
});
test('隨機幅度 0：不同種子的綻放參數相同', () => {
  const f = fake(); const e = new BotanicaEngine({ ...defaultBotanicaParams, randomness: 0 }, f.deps);
  const seen = new Set<string>();
  for (const s of [1, 2, 3]) { e.onPlantStart(s); f.tick(2000); }
  for (const c of f.calls) if (c.startsWith('bloom')) seen.add(c.replace(/strings-\d+/, 'strings-*'));
  expect(seen.size).toBe(1);
});
```

- [ ] **Step 2: 跑測試確認失敗**
- [ ] **Step 3: 改 `src/sound/engine.ts` 介面（可選方法）；寫 `engine.ts`、`index.ts`**
- [ ] **Step 4: 跑測試確認通過；`pnpm test`（舊的 webaudio 測試也要綠）；typecheck、lint**
- [ ] **Step 5: Commit**

```bash
git add src/sound/engine.ts src/sound/botanica/engine.ts src/sound/botanica/engine.test.ts src/sound/botanica/index.ts
git commit -m "feat(sound): BotanicaEngine：事件翻成四層呼叫、和弦進行、每筆配方、閒置偶發"
```

---

### Task 8: 接進 04 空間、面板、驗收、tag

**Files:**
- Modify: `experiments/04-space/panel.ts`（`State.sound` 型別、`'聲'` 分頁）、`experiments/04-space/main.ts`（state 預設、引擎建立、`finishDrawing`、主迴圈 alive 轉換、`changed`）
- Modify: `docs/process-log.md`

**Interfaces:**
- Consumes: `createBotanicaEngine`、`BotanicaEngine`、`defaultBotanicaParams`、`KEY_NAMES`
- Produces: `State.sound = { enabled: boolean; volume: number; engine: 'basic' | 'botanica'; botanica: BotanicaParams }`

- [ ] **Step 1: `git status`、確認另一個 session 沒有未合併的改動在這兩個檔；有的話先等**

- [ ] **Step 2: `panel.ts`**：改 `State.sound` 型別；`'聲'` 分頁改成：`segmented(panel, [{label:'原本',value:'basic'},{label:'Botanica',value:'botanica'}], () => s.sound.engine, (v) => { s.sound.engine = v; changed(); }, parent)`；原本的 toggle（M）與音量；`section(panel, '調', parent)` + 12 個 `segmented`（label 用 `KEY_NAMES`，set 改 `s.sound.botanica.key`）；`slider('隨機幅度', s.sound.botanica, 'randomness', 0, 1, 0.01)`；四段 `section` 底／和弦／顆粒／偶發，各一個 `toggle('開', …, 'enabled')` + `slider('音量', …, 'volume', 0, 1, 0.01)`。

- [ ] **Step 3: `main.ts`**：
  - state：`sound: { enabled: true, volume: 0.8, engine: 'botanica', botanica: { ...defaultBotanicaParams } }`
  - `const basic = new WebAudioEngine(13); const botanica = createBotanicaEngine(state.sound.botanica); const engine = () => (state.sound.engine === 'botanica' ? botanica : basic);`，原本所有 `engine.` 改成 `engine().`
  - 第一次 `pointerdown`：兩個都 `start()`，之後 `setVolume`
  - `finishDrawing()`：建出 `Plant3D` 或 `grower` 之後 `engine().onPlantStart?.(seed)`
  - 主迴圈：每個 item 記 `wasAlive`；`p?.alive`／`grower?.alive` 由 true 變 false 時 `engine().onPlantDone?.()`
  - `changed()`／原本呼叫 `engine.setVolume` 的地方：加 `botanica.applyParams(); botanica.setMuted(!state.sound.enabled)`；`sound()` 回呼裡 `if (!state.sound.enabled) return;` 保留

- [ ] **Step 4: `pnpm typecheck && pnpm lint && pnpm test`；`pnpm dev` 開 04**

- [ ] **Step 5: 人工驗收（spec §10，逐條）**

1. 點一下畫面 → 風水底很小聲。
2. 畫一筆放開 → 綻放 + 顆粒；畫線中無新聲音。
3. 連畫四筆 → 不糊。3b. 連畫八筆、每筆隔幾秒 → 沒有兩筆一樣；隨機幅度 0 再畫 → 每筆很像。
4. 換 G → 音高跟著換，弦樂仍像弦樂。
5. 單獨開關四層都聽得清楚。
6. 停手 15 秒以上 → 偶爾一滴水。
7. 切「原本」→ 三角波。
8. 分枝多時不爆音、面板不卡；Console 沒有紅字。
不過的項目回對應 task 修，修完重跑該 task 的測試。

- [ ] **Step 6: Commit、tag、process log**

```bash
git add experiments/04-space/main.ts experiments/04-space/panel.ts
git commit -m "feat(exp04): 接上 Botanica 四層聲音引擎，聲分頁可選調、隨機幅度、各層開關"
# tag：看 git tag 裡 exp04- 的最後一個字母，用下一個
git tag -a exp04-<x> -m "04 空間：Botanica 四層聲音（底、和弦、顆粒、偶發），調可選，每筆隨機"
```

`docs/process-log.md` 加一列（tag、2026-11-10、04 空間、這一輪做了什麼、使用者反應留空），單獨 commit：`docs: process log exp04-<x>`。告訴使用者 `git checkout exp04-<x>` 的回看指令，並提醒 mp3 要 `node scripts/convert-sounds.ts` 才會有。
