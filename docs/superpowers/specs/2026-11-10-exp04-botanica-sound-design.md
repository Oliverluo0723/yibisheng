# 設計：04 空間的 Botanica 聲音（多層取樣）

> 寫於 2026-11-10。狀態：草稿，待使用者看過。
> 讀者：接手實作的人。讀完應該不用再問使用者就能排計畫。

## 1. 意圖

目前作品的聲音還是第一版的樣子：每長出一個分枝響一個三角波音（B♭ 大調、回授延遲）。使用者要的是 Botanica 那種**很多成份疊在一起**的聲音：弦樂、FX、水聲、風聲、和弦。這一輪把 04 空間（three.js 3D）的聲音換成**以原聲取樣為主、分成四層**的引擎，讓畫面長出來的時候，聲音像一首 Botanica 曲子的一個片段，而不是一串提示音。

素材來源是使用者電腦上的 **bespoke「Floral v.1 / v.2 — Botanica Sample Pack」**（`~/Downloads/Floral/`，279 MB wav），這套包本身就是為這個曲風做的，裡面有弦樂、單簧管、顆粒化的鐘與卡林巴、環境 foley、雨、水滴、glitch。

## 2. 目標、非目標、反目標

**目標**
- 一打開、第一次點畫面之後，就有風與水的底在呼吸；放開一筆、開始長的那一刻和弦綻放；分枝長出時掉下顆粒狀的鐘聲；久不動偶爾有一滴水或一聲 glitch。
- 聲音的調（key）可以在面板自由選，素材即時移調。
- 四層各自可開關、可調音量，使用者試玩時能一層一層聽。
- 舊的三角波引擎保留，可切回去比較。

**非目標（這一輪不做）**
- 畫線當下不出聲（使用者決定：維持「放開、開始長了才出聲」）。
- 不做節拍、不做鼓、不對齊 BPM 格線。
- 不做頻譜處理、共振峰移動這類即時 DSP；顆粒感直接用包裡已經做好的 granular 素材。
- 不做作品長度、結尾、凋零（本來就另案）。
- 不接進 02 筆、03 景深（使用者選 04）。

**反目標（做到也算失敗）**
- 聽起來像音效集：每個事件一個清楚的「叮」，層與層之間沒有糊在一起。
- **每次放開聽起來都差不多**（使用者明說：要的是隨機感）。
- 吵。分枝一多就變成鐘聲機關槍；素材一疊就糊成一團泥。
- 移調太遠讓弦樂變成卡通聲。
- 載入等很久才有聲音。

## 3. 限制

- 工具鏈不變：Vite + pnpm + TypeScript strict + Vitest + Biome；04 用 three.js。
- 聲音函式庫：**Tone.js 15**（文件 `docs/sound-libraries.md` 的結論；它內建型別）。不用 p5.sound、不用 Strudel。
- 瀏覽器規定使用者互動後才能出聲：04 已在第一次 `pointerdown` 呼叫 `engine.start()`，沿用。
- **另一個 session 同時在改 04 與 `src/growth`**：這一輪只動自己的路徑（見 §8），commit 只加自己的檔案，絕不 `git add -A`。對 `experiments/04-space/main.ts`、`panel.ts` 的改動要小、集中在接線處。
- 素材授權：Floral 是付費取樣包，條款還沒確認（Gumroad 頁要用瀏覽器開）。放上公開網頁等於音檔可被下載。**使用者會自己去看授權**；在他確認前，素材只放本機、不推到任何公開位置。無論如何，`public/sounds/README.md` 記下每個檔案的來源與授權。
- 體積：wav 不能直接用。轉成 **mp3**（每個瀏覽器的 `decodeAudioData` 都吃；ogg/opus 在 Safari 不穩）。只挑用到的子集，目標總量 30 MB 以內，底層先載、其餘背景載入。
- **mp3 不進 git（Claude 的 call）**：`.gitignore` 掉 `public/sounds/*.mp3`，只 commit `README.md` 與轉檔腳本。理由：授權未確認、音檔進了歷史就拿不掉。未追蹤的檔案切 tag 時不會消失，所以回看舊輪次不受影響；換機器要重跑腳本（需要 `~/Downloads/Floral`）。授權確認後再決定要不要進 git。

## 4. 已決定的事

| 事 | 決定 | 誰定的 |
|---|---|---|
| 什麼時候出聲 | 畫線時無聲；放開、開始長了才出聲。底層例外：第一次點畫面就開始 | 使用者 |
| 調 | 面板可選 12 個調；預設 C 大調（素材多數是 C） | 使用者（可選）；預設是 Claude 的 call |
| 接在哪 | 04 空間 | 使用者 |
| 分層 | 四層：底、和弦、顆粒、偶發（§5） | Claude 提案，使用者看過沒反對 |
| 和弦進行 | 王道進行 IV–V–vi–I（C 大調就是 F–G–Am–C），每放開一筆往前一步 | Claude 的 call |
| 函式庫 | Tone.js | 文件既有結論 |
| 素材 | Floral v.1/v.2 的子集 | 使用者提供 |
| 舊引擎 | 保留、可切換 | Claude 的 call |

## 5. 四層

全部在同一個主混音匯流排上，匯流排後面接一個共用的殘響（Tone.Reverb，長尾、濕度中等）和一個柔和的限幅器。各層有自己的音量與開關。

### 5.1 底（風、水）
- 素材：`fx/foley1–4`（1–2 分鐘環境錄音）、`oneshots/raindrops`、`fx/rain synth 01–03`。
- 行為：引擎 `start()` 之後就開始。兩個 foley 迴圈交叉淡入淡出（各自隨機起點、隨機長度 40–90 秒換一次），很小聲，低通約 4 kHz，讓它像窗外。rain synth 偶爾（每 60–180 秒）淡進來一段。
- 不跟任何事件綁。它的存在是為了讓安靜時不是真的安靜。

### 5.2 和弦（綻放）
- 素材：`live string phrases 01–24`（C，約 5 秒）、`granular/piano 1–10`（C）、`melodies/botanical swell 1–3`（兩個 D♭、一個 C）。
- 觸發：**每次放開一筆、植物開始長**（04 的 `finishDrawing()` 成功建出植物的那一刻）。
- 行為：和弦進行往前一步。播一段弦樂片段（隨機挑），慢起音（約 1.5 秒）、長殘響；同時用 granular piano 疊一層更遠的、更糊的 pad，音量較低。偶爾（約 1/3 機率）改用 botanical swell 當這一筆的綻放。
- **和弦怎麼落在「樂句」上（Claude 的 call）**：素材是整段樂句，不是單音，整句照和弦根音移調會把句子裡的非和弦音拖出調外（IV 會冒出 B♭、vi 會變成 A 大調）。所以**弦樂與鋼琴只照「調」移調，不照和弦移**：C 大調的句子在 F、G、Am、C 上都還在調內。和弦的顏色由 §5.3 顆粒層挑和弦音來表現。之後若想更準，開放項目：逐句試聽、在清單裡標它適合哪幾個和弦（`fitsChords`）。
- 同時最多兩筆的和弦在響；第三筆來時最舊的那筆淡出 2 秒。
- 筆跟筆間隔太近（< 1.5 秒）就只推進和弦、不再疊新的弦樂，避免糊。

### 5.3 顆粒（生長）
- 素材：`granular/accents` 的 granular bell accent 1–11、granular kalimba accent 1–9、bell glitch 1–11（都 C）。
- 觸發：生長事件 `branch`（主要）、`leaf`（次要，更小聲、更短）。
- 行為：每個事件挑一個顆粒片段，移調到**當下和弦的一個和弦音**。用 Tone.GrainPlayer 移調，長度不變。
- **音高模型（Claude 的 call，取代第一版的絕對 MIDI 對應）**：素材只標調、沒標單音，所以不算「移到 MIDI 幾號」，只算**相對位移**：位移 = 調的位移 + 和弦音相對主音的位移（1、3、5 度，取 −5..+6 的最短路徑），**總位移限制在 ±7 個半音內**，超過就折回一個八度。音域高低不靠移調，靠**挑不同素材**：`depth` 淺用 granular kalimba（低、暖），中用 granular bell accent，深用 bell glitch（高、短）。這樣不會把鐘聲拉成卡通。
- 密度保護：每秒最多 6 個顆粒，超過的丟掉；同一毫秒內多個事件只取一個。`leaf` 事件再額外機率性丟一半。
- 聲音的立體位置跟著事件的 x（左右聲像），用 04 既有的 0..1 換算。

### 5.4 偶發（水滴、glitch）
- 素材：`fx/water droplet`、`water droplet impact`、`plop`、`watery sweeper`、`fx/glitches/glitch 1–13`（有 F 也有 C，要分別記源調）。
- 觸發：閒置。上一個生長事件之後超過 12 秒沒新事件，就開始每 15–40 秒隨機掉一個（水滴為主，glitch 約 1/4）；一有新的生長事件就停。
- 另外每棵植物**長完**（最後一個活芽停）時，掉一滴水。草（GrassView）會一直搖、`alive` 永遠是 true，**草不觸發這個**，不為它改 `Grower`（那是另一個 session 在動的檔）。

### 5.5 隨機感（使用者的要求：每次放開不能聽起來差不多）

「隨機」要發生在好幾個層次，只換素材不夠：

| 層次 | 每一筆隨機的東西 |
|---|---|
| 綻放的「顏色」 | 每筆先抽一種：弦樂句／granular 鋼琴 pad／botanical swell／單簧管句（機率約 4:3:2:1）／**只有顆粒、沒有綻放**（約 1/8）。單簧管因此回到清單裡，B♭ 源調照 §6 移調 |
| 素材本身 | 從該顏色的整個池子抽，**最近用過的 N 個不重抽**（弦樂 24 句就記 8 個） |
| 切片 | 不一定從頭播：隨機起點、隨機長度（1.5 秒到整句），切片邊緣有淡入淡出 |
| 方向 | 約 1/4 機率整句反轉（Botanica 的 swell 手法） |
| 包絡 | 起音 0.5–3 秒隨機；尾巴殘響送量隨機 |
| 音域 | 八度隨機（在 ±7 半音的規則內，偶爾整句低八度用 playbackRate 0.5，變成 drone） |
| 聲像與距離 | 左右聲像、低通截止、音量都在一個範圍內抖 |
| 和弦 | 進行以王道進行為主，但 1/4 機率「停在原地」、1/6 機率代換（IV→ii、I→vi），不會每四筆一模一樣地繞一圈 |
| 顆粒層 | 每筆抽一組「顆粒個性」：密度上限（3–8/秒）、偏好的素材類別、位移傾向（偏高/偏低）、是否偶爾反轉；在這筆的生長期間固定 |
| 底層 | foley 起點、換段時間本來就隨機 |

規則：
- 每筆的隨機都從**這一筆的種子**出發（04 已經有每筆的 seed），同一筆重播會一樣，筆跟筆之間不同。
- 隨機的「範圍」可以在面板調（一個「隨機幅度」滑桿，0 = 每次都一樣，1 = 全開），跟 02 的「每筆隨機」是同樣的思路。
- 隨機不能破壞反目標：仍受 ±7 半音、每秒顆粒上限、同時最多兩筆綻放這些限制。

這些抽籤是純函式（給 seed 與幅度，回傳這一筆的「配方」），放 `botanica/recipe.ts`，Vitest 測分布與邊界。

## 6. 調與移調

- 面板選調：12 個大調（先只做大調；小調列為之後的開放項目）。預設 C。
- 每個素材在清單裡記源調（弦樂、鋼琴、鐘等多為 C；單簧管 B♭；某些 glitch F；botanical swell 1–2 是 D♭）。移調量 = 目標調 − 源調，取 −6..+5 半音的最短路徑。
- 和弦音計算與音高挑選是**純函式**，放 `src/sound/`，Vitest 測：給定調與和弦級數回傳和弦音的相對位移；總位移折回 ±7 內；深度對素材類別的對應；移調量取最短路徑。
- 單簧管用在 §5.5 的「顏色」抽籤裡，機率最低；因為它是旋律句，容易太有主角。

## 7. 面板（「聲」卡片）

沿用 04 既有的卡片系統，只改「聲」這張：

- 引擎：原本（三角波）／Botanica（預設 Botanica）
- 總音量
- 調：12 個按鈕一排
- 四層各一組「開關 + 音量」：底、和弦、顆粒、偶發
- 隨機幅度（0–1，預設 0.7）
- 快捷鍵 M 仍是整體靜音

## 8. 架構與接線

使用者的要求：**架構要拆乾淨**。原則：

1. **樂理、素材清單、排程邏輯不碰 Tone.js**，是純函式或純狀態機，Vitest 可測。
2. **Tone.js 只出現在 `src/sound/botanica/` 裡面**；04 與面板不 import Tone。
3. **每一層是一個獨立類別**，只認識「匯流排」和「素材庫」，不認識生長事件、不認識其他層。層之間不互相呼叫。
4. **引擎是唯一的翻譯者**：把 `SoundEngine` 的事件翻成各層的方法呼叫，並持有唯一的音樂狀態（調、和弦進行到第幾步）。
5. 依賴方向單向：`theory` ← `manifest` ← `audio（bus/loader/voices）` ← `layers` ← `engine` ← `experiments/04`。往回 import 就是錯。

```
src/sound/
  engine.ts                 SoundEngine 介面（既有）＋ 可選 onPlantStart(seed) / onPlantDone
  webaudio.ts               第一版引擎（不動）
  theory/                   純函式，無 Tone
    keys.ts                 12 個調的名稱與主音 pitch class
    chords.ts               王道進行、和弦音、相對位移、最短移調、±7 折回
    register.ts             depth → 素材類別（kalimba / bell / glitch）
  botanica/
    manifest.ts             素材清單：{ id, file, role, sourceKey, gainDb }；純資料 + 查詢函式
    params.ts               BotanicaParams（調、各層開關與音量）— 面板綁的就是這個物件
    audio/
      bus.ts                主鏈：各層 Gain → Reverb → Limiter → destination
      loader.ts             依 role 載入 buffer；先底層、再其餘；查詢「這個 role 載好了嗎」
      voices.ts             固定大小 GrainPlayer / Player 池，voice stealing
    layers/
      bed.ts                底：交叉淡入淡出的 foley 迴圈 + 偶發 rain synth
      bloom.ts              和弦：onBloom(keyShift) 播弦樂 + 鋼琴 pad，最多兩筆
      grains.ts             顆粒：onGrain(category, semitoneShift, pan)
      drips.ts              偶發：onDrip() / onGlitch()
    schedule/
      rateLimit.ts          每秒上限、同毫秒去重；純狀態機（吃 now）
      idle.ts               閒置偵測與下一次偶發的時間；純狀態機（吃 now、rng）
    recipe.ts               每筆的隨機配方：(seed, 幅度) → { 顏色、切片、反轉、包絡、八度、顆粒個性、和弦動作 }；純函式
    engine.ts               BotanicaEngine implements SoundEngine：持有 params、進行狀態、
                            rateLimit、idle；把事件翻成各層呼叫
public/sounds/
  README.md                 來源清單（進 git）
  *.mp3                     不進 git
scripts/convert-sounds.sh   從 ~/Downloads/Floral 挑檔、ffmpeg 轉 mp3；可重跑
```

各層的介面長一樣：`constructor(bus, loader)`、`setEnabled(b)`、`setVolume(v)`、`dispose()`，再加自己的一兩個觸發方法。層不讀 params；引擎在 params 變動時把值推給層。

接線（改動最小）：
- `src/sound/engine.ts` — `SoundEngine` 加**可選**的 `onPlantStart?()`、`onPlantDone?()`；舊引擎不用改。
- `experiments/04-space/main.ts` — 建引擎處改成依 `state.sound.engine` 建 `WebAudioEngine` 或 `BotanicaEngine`；`finishDrawing()` 建出植物後呼叫 `engine.onPlantStart?.(seed)`（把這一筆的種子交給引擎，§5.5）；每幀看到 `alive` 由 true 變 false 時呼叫 `engine.onPlantDone?.()`（草永遠 alive，自然不觸發）。事件換算沿用現有程式。
- `experiments/04-space/panel.ts` — 「聲」卡片綁 `BotanicaParams`。

`SoundEngine.onGrowth` 吃第一版的 `GrowthEvent`（0..1 平面座標），04 已在換算，沿用。

## 9. 載入與效能

- `start()` 時先載底層兩段 foley（這是最先要響的），和弦與顆粒素材在背景載，載好前的事件直接略過（不排隊）。
- 顆粒層用固定大小的 voice pool（例如 8 個 GrainPlayer 輪用），不要每個事件 new 一個。
- 共用一個 Reverb；不要每層各一個。

## 10. 驗收（使用者試玩時要能做到的）

1. 開 04、點一下畫面：聽得到風水底，很小聲。
2. 畫一筆放開：和弦綻放，接著顆粒鐘聲跟著分枝掉下來；畫線中沒有新聲音。
3. 連畫四筆：和弦大致走 F–G–Am–C，不會糊成一片。
3b. 連畫八筆、每筆之間停幾秒：**沒有兩筆聽起來一樣**（顏色、長短、方向、音域至少有兩樣不同）。隨機幅度拉到 0 再畫，每筆就該很像。
4. 換調（例如換到 G）：再畫，整體音高跟著換；弦樂還聽得出是弦樂。
5. 關掉「顆粒」只留「和弦」，再反過來：各層單獨聽得清楚。
6. 停手 15 秒以上：偶爾一滴水。
7. 切回「原本」引擎：回到三角波。
8. 面板不卡、分枝多時不爆音。

## 11. 留給實作者

- 每層實際挑哪幾個檔（§5 給的是範圍）；mp3 位元率；殘響與低通的數值；各層預設音量；包絡時間。
- 底層迴圈怎麼無縫交叉淡入淡出。
- 和弦層兩筆同時響的實作（兩個 Player 輪替即可）。
- 「長完」訊號怎麼從 04 拿到。
- 素材 README 的格式照 `public/backgrounds/README.md`。
- 測試範圍：純函式必測；引擎本體用 Tone.js 的部分不強求單元測試，用 §10 人工驗收。

## 12. 開放項目（之後再說）

- 小調。
- 畫線當下的反轉 swell（使用者這輪說不要）。
- 單簧管旋律句要不要用、怎麼用。
- 素材授權確認後，能不能公開。
- 02 筆要不要接同一套引擎。
- LABS Soft Piano / Opia 是 `.spitfire` 格式，瀏覽器讀不了；要用得先在 DAW 裡 bounce 成 wav。

## 13. 流程

照 `docs/process-log.md` 的規矩：做完給使用者看時打 tag（04 的下一個字母）、記一列。這一輪的 commit 只加 §8 列的路徑。
