// 從 Floral 取樣包挑出作品用到的檔案，轉成 public/sounds/*.mp3。
// 用法：node scripts/convert-sounds.ts [來源根目錄，預設 ~/Downloads/Floral]
// 可重跑：目標比來源新就跳過。有 url 的素材（Salamander 鋼琴）直接下載，已存在就跳過。
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLES } from '../src/sound/botanica/manifest.ts';

const root = resolve(process.argv[2] ?? join(homedir(), 'Downloads', 'Floral'));
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sounds');
mkdirSync(out, { recursive: true });

const missing: string[] = [];
let converted = 0;
let skipped = 0;
let bytes = 0;

let downloaded = 0;

for (const s of SAMPLES) {
  const dest = join(out, s.file);
  if (s.url) {
    if (!existsSync(dest)) {
      const res = await fetch(s.url);
      if (!res.ok) {
        missing.push(`${s.url}（HTTP ${res.status}）`);
        continue;
      }
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      downloaded++;
    } else skipped++;
    bytes += statSync(dest).size;
    continue;
  }
  const src = join(root, s.source);
  if (!existsSync(src)) {
    missing.push(s.source);
    continue;
  }
  if (existsSync(dest) && statSync(dest).mtimeMs > statSync(src).mtimeMs) {
    skipped++;
  } else {
    const trim = s.trimSec ? ['-t', String(s.trimSec)] : [];
    execFileSync(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-i', src, ...trim, '-ac', '2', '-ar', '44100', '-codec:a', 'libmp3lame', '-q:a', '4', dest],
      { stdio: 'inherit' },
    );
    converted++;
  }
  bytes += statSync(dest).size;
}

console.log(`轉檔 ${converted}、下載 ${downloaded}、跳過 ${skipped}、共 ${SAMPLES.length - missing.length} 檔，${(bytes / 1e6).toFixed(1)} MB`);
if (missing.length > 0) {
  console.error(`找不到 ${missing.length} 個來源：\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
