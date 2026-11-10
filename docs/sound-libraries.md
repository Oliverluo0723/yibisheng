# 瀏覽器聲音函式庫調查

> 調查日期：2026-11-10（版本和授權都在 npm、GitHub 上核對過）
> 用途：替「p5.js × Botanica」作品挑聲音工具。需求：合成、免費音檔播放（反轉、移調、拉伸）、顆粒合成、殘響與延遲等效果、頻譜處理、音階輔助、聲音分析，並且要有 TypeScript 型別、能在 Vite 裡用。

## 結論

**核心用 Tone.js，音樂理論用 tonal，顆粒和頻譜處理自己寫一小層，分析用 Tone 加 Meyda。** 全部 MIT 授權、有型別。

| 需求 | 用什麼 |
|---|---|
| 合成（FM、撥弦、pad） | Tone.js（FMSynth、PluckSynth、PolySynth） |
| 音檔播放、反轉、移調 | Tone.Player（`reverse`、`playbackRate`）；高品質拉伸用 signalsmith-stretch |
| 顆粒合成 | 沒有現成又有人維護的函式庫。自己寫：每顆 grain 是一個 `AudioBufferSourceNode` + 音量包絡，用筆觸資料控制位置、密度、顆粒大小 |
| 殘響、延遲、濾波、bitcrush | Tone.js（Convolver、Reverb、FeedbackDelay、BitCrusher…）；shimmer 用 PitchShift(+12) 放進殘響的回授迴圈 |
| 頻譜凍結、模糊 | 沒有函式庫。要的話得自己寫 AudioWorklet（參考 olvb/phaze） |
| 音階、和弦 | tonal（E♭–F–Gm–B♭ 是 B♭ 大調的 IV–V–vi–I，音高量化到 B♭ 大調） |
| 分析（驅動畫面） | Tone.FFT / Meter 拿資料，Meyda.extract() 算頻譜重心、平坦度、色度 |
| 現成鋼琴音色 | smplr（可選） |

## 比較表（節錄）

| 函式庫 | 優點 | 缺點 | 型別 | 最新版 | 授權 | 適合度 |
|---|---|---|---|---|---|---|
| **Tone.js** | 最完整的高階工具箱，活躍開發 | GrainPlayer 很陽春（沒有位置、抖動、密度）；沒有頻譜處理 | 有 | 15.1.22（2025-04）；`next` 15.5.x 有更嚴格的 TS | MIT | 5 |
| 原生 Web Audio + AudioWorklet | 零依賴，最適合自己做顆粒和頻譜 | 什麼都要自己寫 | lib.dom + `@types/audioworklet` | — | — | 4（當補充層） |
| p5.sound | p5 官方 | 其實是包了一份舊版 Tone 的全域 IIFE，沒有 ESM、沒有型別；和 Tone 並用會有兩份 | 無 | 0.4.2 | LGPL-2.1 | 2 |
| Howler.js | 播放穩 | 沒效果、沒反轉、沒顆粒；2023 後沒更新 | @types | 2.2.4 | MIT | 1 |
| Elementary | 函數式 DSP，有 stretch/shift | 沒有顆粒原件，更新停滯 | 有 | 4.0.x（2024-12） | MIT | 3 |
| Faust（faustwasm） | 真正的 DSP 語言，殘響庫很強，活躍 | 要學新語言；建議離線預編譯 | 有 | 0.20.1 | LGPL-2.1 | 3.5（做特殊效果） |
| RNBO | Max 匯出，表現力強 | 要買 Max；匯出碼有 Cycling '74 授權條件 | 有 | 1.4.6 | 匯出碼：C74 授權或 GPLv3 | 3 |
| Strudel | 反轉、切碎、音階都有 | **AGPL**，整個專案都得跟著 AGPL；以 pattern 為中心，和筆觸事件不合 | 無 | 1.3.0 | AGPL-3.0 | 2 |
| Glicol、Gibberish | 有趣的 DSP | 多年沒發布、沒型別 | 無 | 2022–2023 | MIT | 1.5 |
| Meyda | 聲音特徵分析，只有 5 KB | 舊的 Analyzer 用了過時 API；直接用 `extract()` 即可 | 有 | 5.6.3 | MIT | 4（分析） |
| tonal | 音階、和弦、調性 | 純理論，不出聲 | 有 | 6.5.1 | MIT | 5（理論） |
| signalsmith-stretch | 高品質 WASM 拉伸與移調 | 沒有 .d.ts，要自己寫宣告 | 無 | 1.3.2 | MIT | 4 |
| smplr | 現成取樣樂器（鋼琴等），有反轉和殘響 | 每個樂器的取樣授權要個別確認 | 有 | 1.2.0 | MIT | 3.5 |

避開：rubberband-wasm（GPLv2）、essentia.js 和 audiomotion-analyzer（AGPL）、granular-js（2019 後無更新）。

## 注意事項

- **自動播放限制**：AudioContext 一開始是暫停的，要在真正的使用者操作（例如第一次 `mousePressed`）裡呼叫 `Tone.start()` 或 `ctx.resume()`。Firefox 不會自動恢復。
- **AudioWorklet**：需要 HTTPS 或 localhost；在 Vite 裡用 `new URL('./x.worklet.ts', import.meta.url)` 載入，並確認正式建置有轉譯。
- **記憶體**：解碼後是 float32，一分鐘雙聲道 48 kHz 約 23 MB。
- **格式**：Safari 相容性以 mp3 / m4a / wav 為優先，少用 Ogg。
- **Tone.Player 的 reverse 會反轉共用的 buffer**，要同時正放和倒放就複製一份。

## 免費素材

- **Freesound**：篩 CC0（免標註）或 CC BY（要標作者）；CC BY-NC 不能用在會賺錢的作品。網站可以自動產生致謝清單。
- **VSCO-2-CE**：CC0 的管弦樂取樣（弦樂、鍵盤、木管、銅管、打擊）。
- 蟲鳴、風、水等田野錄音在 Freesound 上有很多 CC0。

## 來源

Tone.js：https://github.com/Tonejs/Tone.js ・ p5.sound：https://github.com/processing/p5.sound.js ・ Elementary：https://github.com/elemaudio/elementary ・ Faust：https://github.com/grame-cncm/faustwasm ・ RNBO 授權：https://support.cycling74.com/hc/en-us/articles/10730031661587 ・ Strudel FAQ：https://live.strudel.cc/learn/faq/ ・ Meyda：https://github.com/meyda/meyda ・ tonal：https://github.com/tonaljs/tonal ・ signalsmith-stretch：https://github.com/Signalsmith-Audio/signalsmith-stretch ・ smplr：https://github.com/danigb/smplr ・ Freesound FAQ：https://freesound.org/help/faq/ ・ VSCO-2-CE：https://github.com/sgossner/VSCO-2-CE ・ 顆粒/頻譜參考：https://github.com/olvb/phaze
