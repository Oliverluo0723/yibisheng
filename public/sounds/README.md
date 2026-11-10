# 聲音素材

來源：**bespoke「Floral v.1 / Floral v.2 — Botanica Sample Pack」**（Gumroad：https://bespokesamples.gumroad.com/l/ddxue），使用者自己的取樣包，原檔在 `~/Downloads/Floral/`。

**授權：待使用者確認。確認前這些音檔只留在本機，不進 git、不公開。**

音檔（mp3）不在 git 裡。要產生：

```sh
node scripts/convert-sounds.ts            # 預設讀 ~/Downloads/Floral
node scripts/convert-sounds.ts /別的/路徑  # 或指定來源
```

腳本用 ffmpeg 轉成 44.1 kHz 立體聲 mp3（VBR q4），可重跑。清單本體在 `src/sound/botanica/manifest.ts`，這張表由它產生。

| 檔案 | 作品裡的用途 | 原檔（相對 Floral/） | 源調 |
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
