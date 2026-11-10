# 聲音素材

來源：**bespoke「Floral v.1 / Floral v.2 — Botanica Sample Pack」**（Gumroad：https://bespokesamples.gumroad.com/l/ddxue），使用者自己的取樣包，原檔在 `~/Downloads/Floral/`。

**授權：待使用者確認。確認前這些音檔只留在本機，不進 git、不公開。**

音檔（mp3）不在 git 裡。要產生：

```sh
node scripts/convert-sounds.ts            # 預設讀 ~/Downloads/Floral
node scripts/convert-sounds.ts /別的/路徑  # 或指定來源
```

腳本用 ffmpeg 轉成 44.1 kHz 立體聲 mp3（VBR q4），可重跑。清單本體在 `src/sound/botanica/manifest.ts`，下面的表由它產生。

## Floral（使用者的取樣包）

| 檔案 | 作品裡的用途 | 原檔（相對 Floral/） | 源調／速度 |
|---|---|---|---|
| bed-01.mp3 | 底：環境錄音 | bespoke - Floral v.1/fx/foley1.wav（取前 60 秒） | C |
| bed-02.mp3 | 底：環境錄音 | bespoke - Floral v.1/fx/foley2.wav（取前 60 秒） | C |
| bed-03.mp3 | 底：環境錄音 | bespoke - Floral v.1/fx/foley3.wav（取前 60 秒） | C |
| bed-04.mp3 | 底：環境錄音 | bespoke - Floral v.1/fx/foley4.wav（取前 60 秒） | C |
| bed-05.mp3 | 底：環境錄音 | bespoke - Floral v.1/oneshots/raindrops.wav | C |
| rain-01.mp3 | 底：偶爾淡進的雨 | bespoke - Floral v.1/fx/rain synth 01.wav | C |
| rain-02.mp3 | 底：偶爾淡進的雨 | bespoke - Floral v.1/fx/rain synth 02.wav | C |
| rain-03.mp3 | 底：偶爾淡進的雨 | bespoke - Floral v.1/fx/rain synth 03.wav | C |
| strings-01.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 01 Cmaj 100bpm.wav | C |
| strings-02.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 02 Cmaj 100bpm.wav | C |
| strings-03.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 03 Cmaj 100bpm.wav | C |
| strings-04.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 04 Cmaj 100bpm.wav | C |
| strings-05.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 05 Cmaj 100bpm.wav | C |
| strings-06.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 06 Cmaj 100bpm.wav | C |
| strings-07.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 07 Cmaj 100bpm.wav | C |
| strings-08.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 08 Cmaj 100bpm.wav | C |
| strings-09.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 09 Cmaj 100bpm.wav | C |
| strings-10.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 10 Cmaj 100bpm.wav | C |
| strings-11.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 11 Cmaj 100bpm.wav | C |
| strings-12.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 12 Cmaj 100bpm.wav | C |
| strings-13.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 13 Cmaj 100bpm.wav | C |
| strings-14.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 14 Cmaj 100bpm.wav | C |
| strings-15.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 15 Cmaj 100bpm.wav | C |
| strings-16.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 16 Cmaj 100bpm.wav | C |
| strings-17.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 17 Cmaj 100bpm.wav | C |
| strings-18.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 18 Cmaj 100bpm.wav | C |
| strings-19.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 19 Cmaj 100bpm.wav | C |
| strings-20.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 20 Cmaj 100bpm.wav | C |
| strings-21.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 21 Cmaj 100bpm.wav | C |
| strings-22.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 22 Cmaj 100bpm.wav | C |
| strings-23.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 23 Cmaj 100bpm.wav | C |
| strings-24.mp3 | 綻放：弦樂句 | bespoke - Floral v.1/live string phrases/string phrase 24 Cmaj 100bpm.wav | C |
| piano-01.mp3 | 綻放：顆粒鋼琴 pad | bespoke - Floral v.2/granular/piano/granular piano 1 Cmaj.wav | C |
| piano-02.mp3 | 綻放：顆粒鋼琴 pad | bespoke - Floral v.2/granular/piano/granular piano 2 Cmaj.wav | C |
| piano-03.mp3 | 綻放：顆粒鋼琴 pad | bespoke - Floral v.2/granular/piano/granular piano 3 Cmaj.wav | C |
| piano-04.mp3 | 綻放：顆粒鋼琴 pad | bespoke - Floral v.2/granular/piano/granular piano 4 Cmaj.wav | C |
| piano-05.mp3 | 綻放：顆粒鋼琴 pad | bespoke - Floral v.2/granular/piano/granular piano 5 Cmaj.wav | C |
| piano-06.mp3 | 綻放：顆粒鋼琴 pad | bespoke - Floral v.2/granular/piano/granular piano 6 Cmaj.wav | C |
| piano-07.mp3 | 綻放：顆粒鋼琴 pad | bespoke - Floral v.2/granular/piano/granular piano 7 Cmaj.wav | C |
| piano-08.mp3 | 綻放：顆粒鋼琴 pad | bespoke - Floral v.2/granular/piano/granular piano 8 Cmaj.wav | C |
| piano-09.mp3 | 綻放：顆粒鋼琴 pad | bespoke - Floral v.2/granular/piano/granular piano 9 Cmaj.wav | C |
| piano-10.mp3 | 綻放：顆粒鋼琴 pad | bespoke - Floral v.2/granular/piano/granular piano 10 Cmaj.wav | C |
| swell-01.mp3 | 綻放：botanical swell | bespoke - Floral v.1/melodies/botanical swell 1 Db 108bpm.wav | Db |
| swell-02.mp3 | 綻放：botanical swell | bespoke - Floral v.1/melodies/botanical swell 2 Db 108bpm.wav | Db |
| swell-03.mp3 | 綻放：botanical swell | bespoke - Floral v.1/melodies/botanical swell 3 Cmaj 108bpm.wav | C |
| clarinet-01.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 1 Bbmaj 100bpm.wav | Bb |
| clarinet-02.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 2 Bbmaj 100bpm.wav | Bb |
| clarinet-03.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 3 Bbmaj 100bpm.wav | Bb |
| clarinet-04.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 4 Bbmaj 100bpm.wav | Bb |
| clarinet-05.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 5 Bbmaj 100bpm.wav | Bb |
| clarinet-06.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 6 Bbmaj 100bpm.wav | Bb |
| clarinet-07.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 7 Bbmaj 100bpm.wav | Bb |
| clarinet-08.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 8 Bbmaj 100bpm.wav | Bb |
| clarinet-09.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 9 Bbmaj 100bpm.wav | Bb |
| clarinet-10.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 10 Bbmaj 100bpm.wav | Bb |
| clarinet-11.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 11 Bbmaj 100bpm.wav | Bb |
| clarinet-12.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 12 Bbmaj 100bpm.wav | Bb |
| clarinet-13.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 13 Bbmaj 100bpm.wav | Bb |
| clarinet-14.mp3 | 綻放：單簧管句 | bespoke - Floral v.2/live clarinet phrases/clarinet phrase 14 Bbmaj 100bpm.wav | Bb |
| kalimba-01.mp3 | 顆粒（淺） | bespoke - Floral v.2/granular/accents/granular kalimba accent 1 Cmaj.wav | C |
| kalimba-02.mp3 | 顆粒（淺） | bespoke - Floral v.2/granular/accents/granular kalimba accent 2 Cmaj.wav | C |
| kalimba-03.mp3 | 顆粒（淺） | bespoke - Floral v.2/granular/accents/granular kalimba accent 3 Cmaj.wav | C |
| kalimba-04.mp3 | 顆粒（淺） | bespoke - Floral v.2/granular/accents/granular kalimba accent 4 Cmaj.wav | C |
| kalimba-05.mp3 | 顆粒（淺） | bespoke - Floral v.2/granular/accents/granular kalimba accent 5 Cmaj.wav | C |
| kalimba-06.mp3 | 顆粒（淺） | bespoke - Floral v.2/granular/accents/granular kalimba accent 6 Cmaj.wav | C |
| kalimba-07.mp3 | 顆粒（淺） | bespoke - Floral v.2/granular/accents/granular kalimba accent 7 Cmaj.wav | C |
| kalimba-08.mp3 | 顆粒（淺） | bespoke - Floral v.2/granular/accents/granular kalimba accent 8 Cmaj.wav | C |
| kalimba-09.mp3 | 顆粒（淺） | bespoke - Floral v.2/granular/accents/granular kalimba accent 9 Cmaj.wav | C |
| bell-01.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 1 Cmaj.wav | C |
| bell-02.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 2 Cmaj.wav | C |
| bell-03.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 3 Cmaj.wav | C |
| bell-04.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 4 Cmaj.wav | C |
| bell-05.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 5 Cmaj.wav | C |
| bell-06.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 6 Cmaj.wav | C |
| bell-07.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 7 Cmaj.wav | C |
| bell-08.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 8 Cmaj.wav | C |
| bell-09.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 9 Cmaj.wav | C |
| bell-10.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 10 Cmaj.wav | C |
| bell-11.mp3 | 顆粒（中） | bespoke - Floral v.2/granular/accents/granular bell accent 11 Cmaj.wav | C |
| glitch-01.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 1 Cmaj.wav | C |
| glitch-02.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 2 Cmaj.wav | C |
| glitch-03.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 3 Cmaj.wav | C |
| glitch-04.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 4 Cmaj.wav | C |
| glitch-05.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 5 Cmaj.wav | C |
| glitch-06.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 6 Cmaj.wav | C |
| glitch-07.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 7 Cmaj.wav | C |
| glitch-08.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 8 Cmaj.wav | C |
| glitch-09.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 9 Cmaj.wav | C |
| glitch-10.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 10 Cmaj.wav | C |
| glitch-11.mp3 | 顆粒（深） | bespoke - Floral v.2/granular/accents/bell glitch 11 Cmaj.wav | C |
| drip-01.mp3 | 偶發：水滴 | bespoke - Floral v.1/fx/water droplet.wav | C |
| drip-02.mp3 | 偶發：水滴 | bespoke - Floral v.1/fx/water droplet impact.wav | C |
| drip-03.mp3 | 偶發：水滴 | bespoke - Floral v.1/fx/plop.wav | C |
| drip-04.mp3 | 偶發：水滴 | bespoke - Floral v.1/fx/watery sweeper.wav | C |
| glitchfx-01.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch1 Fmaj.wav | F |
| glitchfx-02.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch2 Fmaj.wav | F |
| glitchfx-03.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch3 Fmaj.wav | F |
| glitchfx-04.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch4 Fmaj.wav | F |
| glitchfx-05.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch5 Fmaj.wav | F |
| glitchfx-06.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch6 Fmaj.wav | F |
| glitchfx-07.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch7 Cmaj.wav | C |
| glitchfx-08.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch8 Cmaj.wav | C |
| glitchfx-09.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch9 Cmaj.wav | C |
| glitchfx-10.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch10 Cmaj.wav | C |
| glitchfx-11.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch11 Cmaj.wav | C |
| glitchfx-12.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch12 Cmaj.wav | C |
| glitchfx-13.mp3 | 偶發：glitch | bespoke - Floral v.1/fx/glitches/glitch13 Cmaj.wav | C |
| kit-01.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 1 104bpm.wav | 104 BPM |
| kit-02.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 2 104bpm.wav | 104 BPM |
| kit-03.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 3 104bpm.wav | 104 BPM |
| kit-04.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 4 100bpm swung.wav | 100 BPM |
| kit-05.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 5 86bpm.wav | 86 BPM |
| kit-06.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 6 86bpm.wav | 86 BPM |
| kit-07.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 7 86bpm.wav | 86 BPM |
| kit-08.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 8 86bpm.wav | 86 BPM |
| kit-09.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 9 119bpm.wav | 119 BPM |
| kit-10.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 10 119bpm.wav | 119 BPM |
| kit-11.mp3 | 鼓：鼓組 loop | bespoke - Floral v.1/drum loops/drum loop 11 106bpm.wav | 106 BPM |
| kit-12.mp3 | 鼓：鼓組 loop | bespoke - Floral v.2/drums/loops/drum loop 1 120bpm.wav | 120 BPM |
| kit-13.mp3 | 鼓：鼓組 loop | bespoke - Floral v.2/drums/loops/drum loop 2 118bpm.wav | 118 BPM |
| perc-01.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/guitar percussion 01 100bpm.wav | 100 BPM |
| perc-02.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/guitar percussion 02 100bpm.wav | 100 BPM |
| perc-03.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/guitar percussion 03 100bpm.wav | 100 BPM |
| perc-04.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/guitar percussion 04 100bpm.wav | 100 BPM |
| perc-05.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/guitar percussion 05 100bpm.wav | 100 BPM |
| perc-06.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/guitar percussion 06 100bpm.wav | 100 BPM |
| perc-07.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/guitar percussion 07 100bpm.wav | 100 BPM |
| perc-08.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/percussion loop 01 104bpm.wav | 104 BPM |
| perc-09.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/percussion loop 02 104bpm.wav | 104 BPM |
| perc-10.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/percussion loop 03 104bpm.wav | 104 BPM |
| perc-11.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/percussion loop 4 113bpm.wav | 113 BPM |
| perc-12.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/percussion loop 5 113bpm.wav | 113 BPM |
| perc-13.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/shaker swung 100bpm 01.wav | 100 BPM |
| perc-14.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/shaker swung 100bpm 02.wav | 100 BPM |
| perc-15.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/swung percussion loop 100bpm 01.wav | 100 BPM |
| perc-16.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/swung percussion loop 100bpm 02.wav | 100 BPM |
| perc-17.mp3 | 鼓：打擊 loop | bespoke - Floral v.1/percussion loops/swung percussion loop 100bpm 03.wav | 100 BPM |
| perc-18.mp3 | 鼓：打擊 loop | bespoke - Floral v.2/drums/loops/perc loop 1 70bpm.wav | 70 BPM |
| perc-19.mp3 | 鼓：打擊 loop | bespoke - Floral v.2/drums/loops/perc loop 2 100 bpm.wav | 100 BPM |
| perc-20.mp3 | 鼓：打擊 loop | bespoke - Floral v.2/drums/loops/perc loop 3 120bpm.wav | 120 BPM |
| perc-21.mp3 | 鼓：打擊 loop | bespoke - Floral v.2/drums/loops/shaker loop 118bpm.wav | 118 BPM |

## Salamander Grand Piano（鋼琴）

**Salamander Grand Piano V3**，作者 **Alexander Holm**，授權 **CC-BY 3.0**（可商用，公開時要標註作者）。
從 Tone.js 官方範例的托管下載（https://tonejs.github.io/audio/salamander/），每小三度取一個音，播放時由 Tone.Sampler 補中間的音。
下載日期：2026-11-10。轉檔腳本遇到這些檔案會直接下載，不轉檔。

| 檔案 | 音高 | 來源 |
|---|---|---|
| keys-c2.mp3 | MIDI 36 | https://tonejs.github.io/audio/salamander/C2.mp3 |
| keys-ds2.mp3 | MIDI 39 | https://tonejs.github.io/audio/salamander/Ds2.mp3 |
| keys-fs2.mp3 | MIDI 42 | https://tonejs.github.io/audio/salamander/Fs2.mp3 |
| keys-a2.mp3 | MIDI 45 | https://tonejs.github.io/audio/salamander/A2.mp3 |
| keys-c3.mp3 | MIDI 48 | https://tonejs.github.io/audio/salamander/C3.mp3 |
| keys-ds3.mp3 | MIDI 51 | https://tonejs.github.io/audio/salamander/Ds3.mp3 |
| keys-fs3.mp3 | MIDI 54 | https://tonejs.github.io/audio/salamander/Fs3.mp3 |
| keys-a3.mp3 | MIDI 57 | https://tonejs.github.io/audio/salamander/A3.mp3 |
| keys-c4.mp3 | MIDI 60 | https://tonejs.github.io/audio/salamander/C4.mp3 |
| keys-ds4.mp3 | MIDI 63 | https://tonejs.github.io/audio/salamander/Ds4.mp3 |
| keys-fs4.mp3 | MIDI 66 | https://tonejs.github.io/audio/salamander/Fs4.mp3 |
| keys-a4.mp3 | MIDI 69 | https://tonejs.github.io/audio/salamander/A4.mp3 |
| keys-c5.mp3 | MIDI 72 | https://tonejs.github.io/audio/salamander/C5.mp3 |
| keys-ds5.mp3 | MIDI 75 | https://tonejs.github.io/audio/salamander/Ds5.mp3 |
| keys-fs5.mp3 | MIDI 78 | https://tonejs.github.io/audio/salamander/Fs5.mp3 |
| keys-a5.mp3 | MIDI 81 | https://tonejs.github.io/audio/salamander/A5.mp3 |
| keys-c6.mp3 | MIDI 84 | https://tonejs.github.io/audio/salamander/C6.mp3 |
