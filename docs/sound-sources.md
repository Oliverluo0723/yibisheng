# 聲音素材來源：哪裡找、能不能放在公開網站上

> 調查日期：2026-11-11。使用者要求「在 Splice 啊各種地方找更多可用的、優美的聲音」。
> 判斷基準：音檔放在網站 `public/sounds/`，任何人都能直接下載原始檔，所以
> **可** = 授權明文允許原樣再散布（CC0、CC-BY、公有領域、明文允許嵌入軟體）；
> **不可** = 授權明文禁止把樣本單獨提供給第三方。這不是法律意見。
> 本次沒有下載任何檔案。

## 0. 先講結論：手上已有的三樣

| 來源 | 狀況 |
|---|---|
| Floral（bespoke，Splice 類型的 pack） | **不可**原樣放 public。這類條款禁止「sublicense the Sounds in isolation」；經過重度處理、混進作品裡才算合法用法，但 public 資料夾裡的單獨 mp3 很難主張是「作品」。目前做法（不進 git、不公開）是對的，公開前要換或問作者 |
| Salamander Grand Piano | **可**（CC-BY 3.0），公開時放署名頁 |
| FL Studio Strings Section（ostr） | **不可／偏不可**。Image-Line 只允許用在你的音樂作品裡。用下面的 VSCO 2 CE 或 Iowa 弦樂換掉 |

## 1. 最推薦先拿的 10 個

1. **VCSL（CC0）** — 一次補齊 kalimba ×2、wine glasses、concert／folk harp、glockenspiel、tubular bells、hand chimes、mark tree、Nepalese hand bells、ocean drum、Kawai／Steinway 鋼琴。官網原文：「even make commercial software」。Botanica 的「金屬小音色 + 玻璃 + 撥弦」幾乎全在這。https://versilian-studios.com/vcsl/ ・ https://github.com/sgossner/VCSL
2. **VSCO 2 Community Edition（CC0）** — 弦樂 section／solo、clarinet、flute、oboe、harp、glockenspiel，1,952 個 wav。直接取代 FL Strings；弦樂 sustain 拿去 granular／reverse 很適合。https://versilian-studios.com/vsco-community/ ・ https://github.com/sgossner/VSCO-2-CE
3. **Adequate Sounds KALI（CC0）** — 乾淨的 kalimba 單音含 chromatic 版，可放 public。https://adequatesounds.carrd.co/
4. **University of Iowa MIS** — 24/96 的 vibraphone、bells、crotales、cello、flute、clarinet；官網「may be downloaded and used for any projects, without restrictions」（不是正式授權文本，小風險）。https://theremin.music.uiowa.edu/MIS.html
5. **Freesound CC0 篩選：music box／singing bowl／wind chimes** — Flying_Deer_Fx 的 Brahms music box、hollandm 的長 singing bowl、giddster／Anthousai 的風鈴。篩選網址樣板：`https://freesound.org/search/?q=關鍵字&f=license:%22Creative+Commons+0%22`
6. **BigSoundBank（CC0）** — plush music box、鳥鳴、森林、雨、雷，有 BWF／AIFF 原檔。https://bigsoundbank.com/
7. **Sonatina Symphonic Orchestra（CC Sampling Plus 1.0）** — 唯一免費又可散布的 **Celeste + Chorus（合唱 ah）+ Chimes／Crotales**；前提是網站非商業（不賣票、不放廣告）。https://github.com/peastman/sso
8. **NPS 美國國家公園 Sound Library（公有領域）** — 雨、雷、溪流、黎明鳥鳴；只有 mp3，適合遠景 bed。https://www.nps.gov/subjects/sound/gallery.htm
9. **Karoryfer Bigcat Cello／String Cyborgs（CC0）** — 弓弦 cello 單音、以弦樂為振盪器的合成 texture；下載後確認 LICENSE 檔（有一處標示矛盾）。https://sfzinstruments.github.io/strings
10. **FluidR3 GM（MIT）** — music box、celesta、choir aahs 的保險；音色偏 90 年代 GM，刻意 lo-fi + 顆粒化反而對味。https://musescore.org/en/node/41521

備選：Etherealwinds Harp II CE（CC-BY，但作者明說不希望被做成素材庫，用前寫信）；OpenGameArt park ambiences（CC0，雨前鳥鳴）。

## 2. Splice（全部「不可」原樣散布，列出來挑靈感）

條款（https://splice.com/terms §2.3.1.4）禁止「sublicense the Sounds in isolation as sound effects, loops」、「transfer the Sounds to a third party except as incorporated into a New Recording」；FAQ：「you may not distribute any Splice Sounds as royalty-free samples or loops.」互動網站算不算「Creative Work」（像遊戲把 wav 打包）條款沒說；public 資料夾比遊戲資源檔更像「in isolation」，保守判斷不可。

Botanica tag 有 41 個 pack、約 7.1K 樣本：https://splice.com/sounds/tags/botanica/packs

| Pack | 有什麼 |
|---|---|
| Vocal Botanica（Michael Bruner） | vocal chops、自然擬態 sound design、field recording 質感的人聲 |
| Resonance Botanica, a phritz moment | 175 樣本：soft echoes synth loops、vocal／guitar chops、吉他泛音、string tremolo、rainstick、fragile swarm pads |
| Lakeshore Afterimage, an Alexander Panos moment | 228 樣本：atmosphere、tonal phrase、glitch loops、vocal loops、glockenspiel-ish synth grain、木質打擊 |
| Serum 2 Botanica（Splice Originals） | 99 presets + 99 樣本：granular pads、handpan plucks、flute／bells／mallets |
| Botanica Essentials（SplicePicks） | 79 樣本：grass-type grains、dulcimer、bells、pitched bird riffs |
| Field Notes, a Holly Waxwing moment | 307 樣本：昆蟲／鳥 foley、液體與機械 texture、marimba、bells、duduk |
| echo glen, a bio moment | 238 樣本：bells、kalimba、tongue drum、xylophone、watery kick |
| droplets, a demotapes moment | 222 樣本：tiny snares、ambient tonal textures、bells、kalimba |
| Botanica – Petalcore Pop（Komorebi Audio） | 252 樣本：vocal loop、foley、piano、guitar、ukulele、harp、kalimba、flute |
| 其他同 tag | re:grow（Tennyson）、utopia tone（shinju）、Comfort Collage、HYPERBOTANICA、Outside Voice（phritz）、Terraforming、Seeds、Photosynth |
| Splice INSTRUMENT：Music Box、Felt Piano（Spitfire 錄） | 外掛 preset，連 wav 都拿不到 |

## 3. 免費、可再散布的單音樂器庫（完整表）

| 來源 | 有什麼 | 格式 | 授權 | 可公開散布？ | 連結 |
|---|---|---|---|---|---|
| VSCO 2 CE | 弦樂、木管、銅管、glockenspiel、marimba、harp、鋼琴 | WAV + SFZ | CC0 | 可 | 見上 |
| VCSL | 4,000+ 樣本：harp、wine glasses、kalimba、mbira、鐘類、鋼琴、大鍵琴、recorder、ocarina | SFZ + WAV | CC0 | 可 | 見上 |
| Etherealwinds Harp II CE | Celtic harp sustain、glissandi、vocal phrases | SFZ + WAV | CC BY 4.0，作者說「you shouldn't make a sample library out of the harp」 | 不確定，先寫信 | https://versilian-studios.com/etherealwinds-harp/ |
| University of Iowa MIS | 管弦全編制、vibraphone、bells、crotales、鋼琴、吉他 | AIFF，2012 後 24/96 | 「without restrictions」 | 可（小風險） | 見上 |
| Sonatina Symphonic Orchestra 4.0 | 全編制 + celeste、chimes、crotales、harp、chorus | WAV + SFZ | CC Sampling Plus 1.0 | 可（非商業） | 見上 |
| Philharmonia Orchestra | 全編制數千單音 | MP3 | 「must not be … made available 'as is'」 | 不可 | https://philharmonia.co.uk/audio-sound-samples/ |
| Pianobook | music box、felt piano、toy piano、12 string harp、church bells | 各 pack 不同 | EULA：不可「give away」、不可上傳分享 | 不可 | https://www.pianobook.co.uk/terms-conditions/ |
| Karoryfer（CC0 的部分） | Bigcat Cello、String Cyborgs、double bass、Scarypiano、人聲 | WAV + SFZ | CC0（舊的有 CC-BY） | 可，看 LICENSE | https://sfzinstruments.github.io/strings |
| Adequate Sounds | KALI kalimba、melodica、pitch pipe、suling、stylophone | SFZ + WAV | CC0 | 可 | 見上 |
| Decent Samples 免費庫 | Box Harp、Dave Choir、Bowed Nagoya Harp、Resonator Glockenspiel | 多格式 | 「may not redistribute … on their own」 | 不可 | https://www.decentsamples.com/decent-samples-end-user-license-agreement/ |
| Soundpaint／8Dio 免費 | 鋼琴等 | 專屬引擎 | 禁止再散布、禁止嵌入軟體 | 不可 | https://soundpaint.com/policies/terms-of-service |
| Spitfire LABS、BBC SO Discover | Soft Piano、Frozen Strings、Choir、Glass Piano… | 外掛 | 「only for use as part of a … musical performance」 | 不可 | https://www.spitfireaudio.com/pages/spitfire-audio-end-user-license-agreement |
| FreePats | glass、hang、tubular bells、harp、kalimba、ocarina | SF2／SFZ | 各樂器頁自標 | 逐一確認 | https://freepats.zenvoid.org/ |
| Ethan Winer SoundFont | glockenspiel、tubular bells、wind chimes、sleigh bells、cello | SF2 | 「royalty free, no attribution」但頁尾 All rights reserved | 不確定偏可 | https://ethanwiner.com/ewsf2.html |
| FluidR3 GM | GM 全套 | SF2 | MIT | 可 | 見上 |
| tonejs-instruments | 切好給 Tone.js 的 harp、harmonium、piano、cello、flute、clarinet… | MP3 | CC-BY 3.0（來源未附清單） | 可（附署名；來源不明是風險） | https://github.com/nbrosowsky/tonejs-instruments |
| G-Town Church Sampling Project | 教堂裡錄的 27 件樂器 + 空間 FX | SFZ／WAV | CC Sampling Plus 1.0 | 可（非商業） | https://sfzinstruments.github.io/misc/g-town_church_sampling_project |

## 4. Freesound（逐檔不同，一定用 CC0 篩選）

| 搜尋／使用者 | 有什麼 | 授權 | 可公開散布？ | 連結 |
|---|---|---|---|---|
| `music box` CC0（484 筆） | Flying_Deer_Fx 的 Brahms music box、timgormly 古董 music box、Anthousai 上發條機械聲 | CC0 | 可 | 樣板網址 |
| `singing bowl` CC0（257 筆） | hollandm 長 singing bowl、alienistcog、Tpkmusic | CC0 | 可 | 樣板網址 |
| `wind chimes` CC0（448 筆） | giddster、Anthousai（整批 CC0 foley 很好用）、bassimat | CC0 | 可 | 樣板網址 |
| glass harp／harp glissando／choir ah／rain leaves／stream／dawn chorus／paper／matches／kalimba | 本次被限流沒確認數量，用同樣板自己開 | 篩 CC0 | 可 | 樣板網址 |
| thaighaudio | 「All my sounds are released under CC0」：溪流、木門、腳步 | CC0 | 可 | https://freesound.org/people/thaighaudio/ |
| 日本田野錄音 | 千葉柏市環境音、長野伊那農家 | CC0 | 可 | https://freesound.org/s/361865 |
| UbikPhonik「Music Box Samples」 | 手搖打孔 music box，兩個八度每音一檔 | 頁面未顯示 | 開頁確認 | https://freesound.org/people/UbikPhonik/packs/11206/ |
| InspectorJ | Glass Harp、Wind Chimes、高品質 foley | CC-BY 4.0，但作者禁止「redistributing in royalty-free libraries」 | 小心，用前寫信 | https://freesound.org/people/InspectorJ/ |
| klankbeeld | 荷蘭森林、dawn chorus、秋風、雷雨 | 多為 CC-BY | 可（署名） | https://freesound.org/people/klankbeeld/ |
| Philip_Goddard | 風鈴 | CC BY-NC | 不可 | — |

## 5. 其他來源

| 來源 | 有什麼 | 授權 | 可公開散布？ | 連結 |
|---|---|---|---|---|
| BigSoundBank | plush music box、鳥鳴、森林、雨、雷 | CC0 | 可 | https://bigsoundbank.com/ |
| OpenGameArt「park ambiences」 | 雨前鳥鳴、河流+蛙、開闊地風（48k wav） | CC0 | 可 | https://opengameart.org/content/park-ambiences |
| OpenGameArt JC Sounds「Nature Ambient Pack」 | light rain、winter wind、birds loops | CC-BY 4.0 | 可（署名） | https://opengameart.org/node/180349 |
| NPS Sound Library | 雨、雷、溪流、鳥、昆蟲（mp3） | 公有領域 | 可 | 見上 |
| Archive.org（licenseurl=CC0 篩） | 338 筆 CC0 音訊，很雜 | 逐項 | 可（CC0 者） | https://archive.org/advancedsearch.php |
| BBC Sound Effects | 33,000+ | RemArc：非商業、個人、研究 | 不可 | https://sound-effects.bbcrewind.co.uk/ |
| Sonniss GDC 免費包 | 商業級 SFX | 禁止當 sound effects 再供應 | 不可 | https://sonniss.com/gdc-bundle-license/ |
| Pixabay | 大量 | 禁止 standalone 散布 | 不可 | https://pixabay.com/service/terms/ |
| 亞洲聲景監測網（台灣） | 台灣自然聲景 | CC BY-NC | 不可 | https://soundscape.biodiv.tw/terms |
| 台灣聲音地圖（吳燦政） | 約 14,000 筆台灣環境音 | 未標 | 洽作者 | https://openmuseum.tw/ |
| xeno-canto | 鳥鳴 | 逐筆 | 只取 CC BY | https://xeno-canto.org/about/terms |

## 6. 授權要小心（原文，附來源）

- Splice：「sublicense the Sounds in isolation as sound effects, loops」被禁止 — https://splice.com/terms §2.3.1.4
- Splice FAQ：「you may not distribute any Splice Sounds as royalty-free samples or loops.」 — https://support.splice.com/en/articles/8652642-splice-sounds-licensing-faq
- Spitfire：「licensed to you only for use as part of a live or recorded musical performance」 — Spitfire EULA §5
- Pianobook：「You may not sell any Product(s), or give away any Product(s)」 — https://www.pianobook.co.uk/terms-conditions/ §5
- Philharmonia：「must not be sold or made available 'as is' (i.e. as samples)」 — https://philharmonia.co.uk/audio-sound-samples/
- Decent Samples：「You may not redistribute any of the samples or sample libraries on their own」
- CC Sampling Plus 1.0（SSO、G-Town）：整份分享限「for noncommercial uses」 — https://creativecommons.org/licenses/sampling+/1.0/
- Versilian 對 CC-BY 的解讀：「you shouldn't make a sample library out of the harp」 — https://versilian-studios.com/2024/11/27/regarding-the-use-of-cc-by/
- VCSL（反例，明文可）：「even make commercial software」 — https://versilian-studios.com/vcsl/

實務：CC-BY 素材（Salamander、klankbeeld、tonejs-instruments）要在網站放一頁 credits；CC0 不需要但列了比較好看。`public/sounds/README.md` 已經在做這件事。

## 7. 沒能驗證的

- Freesound 個別音檔授權要登入逐檔看；glass harp、choir、rain on leaves 等幾組搜尋被限流。
- Karoryfer 商店頁讀不到，CC0 判斷來自 sfzinstruments 目錄。
- BBC RemArc 授權頁被擋，引文來自轉貼。
- Spitfire LABS 已併入 Splice INSTRUMENT，免費清單拿不到。
- Iowa「without restrictions」是網頁敘述，不是授權文本。

## 8. 對我們的下一步（建議）

1. 公開前把 `ostr`（FL 弦樂）換成 VSCO 2 CE 的弦樂 sustain；Floral 的部分要嘛問 bespoke 能不能放、要嘛換成 VCSL／Freesound CC0。
2. 俳句的素材袋子可以多三類：**music box**（Freesound CC0 或 BigSoundBank）、**glass**（VCSL wine glasses）、**harp**（VCSL）。慢筆配 music box 或 glass，快筆配 harp 撥弦，會比現在的鋼琴／鐘／卡林巴差得更開。
3. manifest 的 `source` 欄位已經能記來源；加一個 `license` 欄位，公開時自動產生致謝頁。
