# 04 空間：鼓與鋼琴（跟著熱度浮現）實作計畫

> 使用者在聊天中核可的描述（2026-11-10）：鼓跟鋼琴不綁在單一筆上，跟著「整幅畫的熱度」慢慢浮現。
> 延續 `docs/superpowers/specs/2026-11-10-exp04-botanica-sound-design.md` 的架構規則（純程式不碰 Tone；Tone 只在 audio/、layers/、index.ts）。

## 決定

- **熱度** `Heat`：能量 E，分枝 +0.03、葉 +0.01、放開一筆 +0.2；半衰期 20 秒；熱度 = 1 − e^(−E)。
- **鼓** `drumLevels(heat)`：打擊 = smoothstep(0.30, 0.45)、鼓組 = smoothstep(0.60, 0.75)；低通 600 Hz → 12 kHz 隨熱度（0.3→1）打開。
- **速度**：每次開啟作品從「鼓組與打擊都有 ±10% 內 loop」的 BPM 裡抽一個（Floral 的 86 BPM 沒有打擊，排除）；loop 用 playbackRate 對齊，loopEnd 設成整數小節。每 12–20 小節在小節線上換一段 loop。
- **鋼琴** `makePhrase`：2–5 個音，多半是當下和弦音、偶爾經過音（調內），音域 MIDI 48–84 偏 60–76，級進為主；力度 0.2–0.45；以八分音符為單位排在拍子上，加 ±15 ms 人味。間隔 `phraseGapMs(heat)` = lerp(9000, 2500, 熱度) × 0.7–1.3；熱度 < 0.2 不彈。
- **時鐘**：Tone.Transport 以這次的 BPM 一直跑；鼓與鋼琴都對齊它。
- **素材**：manifest 新增 `kit`（鼓組 loop 13 段）、`perc`（打擊 loop 23 段）、`keys`（Salamander 17 音，CC-BY 3.0 Alexander Holm，從 tonejs.github.io 下載）。Sample 加 `bpm?`、`bars?`、`midi?`、`url?`；轉檔腳本遇到 `url` 就下載。mp3 一樣不進 git。
- **面板**：BotanicaParams 加 `drums`、`piano` 兩層（預設開、0.6）；「聲」分頁多兩組開關與音量。
- 引擎每 500 ms tick 一次：推鼓的音量、到時間就排一句鋼琴。

## 任務（TDD，每項一個 commit）

1. `theory/heat.ts`、`theory/phrase.ts`、`theory/tempo.ts`（純函式＋測試）
2. manifest 加三類素材、轉檔腳本支援下載、README 加 Salamander 致謝
3. `audio/clock.ts`、`layers/drums.ts`、`layers/piano.ts`、params 兩層
4. 引擎接熱度、鼓、鋼琴（假層測試）；index.ts 組裝
5. 面板、瀏覽器驗收、tag、process log
