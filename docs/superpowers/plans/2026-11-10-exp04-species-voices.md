# 04 空間：一種植物一種聲音（含丁香）實作計畫

> 使用者 2026-11-10 的回饋：「開花每個聽起來都像手機鈴聲，希望每朵花有不同的聲音代表」；並要加丁香。
> 核可的描述見聊天。架構規則不變：純程式不碰 Tone；Tone 只在 audio/、layers/、index.ts。

## 決定

- **聲音（voice）用植物名字對應**：押花樹、草、曼珠沙華、紫羅蘭、丁香。不認識的名字用押花樹。丁香的植物本身由生長 session 做；名字一對上就自動接。
- **綻放改成「拉長的和弦」**：新層 `pad`：FL Studio「Strings Section」11 個單音（C1–C6、F1–F5，各 3 秒）做成 GrainPlayer 循環中段（0.6–2.6 s）、detune 到和弦音、慢起音慢收。同時最多 3 個和弦（12 個 voice）。
- **綻放的顏色擴充**：`pad`（中音域）、`padLow`、`padHigh`、`keys`（Salamander 慢分解和弦）、`cluster`（丁香：高音弦樂墊 + 一串密集小鋼琴音）；原本的 strings／piano／swell／clarinet／none 保留。每種植物一組權重。
- **顆粒依植物**：每種植物三個深度各一個素材池、音量、密度倍率；長素材（granular piano、glitch）切 0.4–1.2 秒隨機片段（GrainOpts 加 offsetSec、durationSec）。
- **鼓、鋼琴依植物**：每種植物一個 0..1 的比例，最近放開的那種決定目標，1 秒滑過去。
- **事件帶植物名**：`SoundEngine.onPlantStart?(seed, voice?)`、`onGrowth(e, voice?)`；04 的 Item 記 voice，放開與生長事件都傳。
- **素材**：manifest 加 `ostr`（11 音，`source` 以 `~/` 開頭表示不在 Floral 裡）；轉檔腳本支援 `~/` 與絕對路徑；README 註明 FL Studio 素材授權待確認。

## 任務（TDD，每項一個 commit）

1. 純函式：`theory/chords.ts` 加 `chordMidis(keyPc, tones, register)`；`theory/phrase.ts` 加 `brokenChord`、`cluster`；`botanica/voices.ts`（表 + `voiceFor(name)`）；`recipe.ts` 吃 voice 的權重。
2. manifest `ostr` + 轉檔腳本 + README。
3. `layers/types.ts`：`PadLayer.chord(midis, opts)`、GrainOpts 加 offsetSec／durationSec；`layers/pad.ts`；`audio/voices.ts` 支援 offset／duration。
4. 引擎：voice 狀態、綻放分派、顆粒依 voice、鼓鋼琴比例；index.ts 組裝；`src/sound/engine.ts` 介面。
5. 04 接線（Item.voice、兩個呼叫）；瀏覽器驗收；tag `exp04-j`；process log。
