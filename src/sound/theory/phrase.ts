const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const LOW = 48;
const HIGH = 84;

export type PhraseNote = {
  midi: number;
  /** 第幾個八分音符（從 0 開始） */
  eighth: number;
  /** 0..1 */
  velocity: number;
};

const rel = (midi: number, keyPc: number) => (((midi - keyPc) % 12) + 12) % 12;

/**
 * 隨手彈的一句：2–5 個音，在調內，頭尾是和弦音，級進為主、偶爾跳到和弦音，力度輕。
 * chordTones 是「相對主音」的 pitch class（見 chords.ts）。
 */
export function makePhrase(
  rng: () => number,
  keyPc: number,
  chordTones: readonly number[],
): PhraseNote[] {
  const scale: number[] = [];
  for (let m = LOW; m <= HIGH; m++) if (MAJOR.includes(rel(m, keyPc))) scale.push(m);
  const isChord = (m: number) => chordTones.includes(rel(m, keyPc));
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)] as T;

  const starts = scale.filter((m) => m >= 60 && m <= 76 && isChord(m));
  let cur = pick(starts);
  const len = 2 + Math.floor(rng() * 4);
  const notes: PhraseNote[] = [{ midi: cur, eighth: 0, velocity: 0.2 + rng() * 0.25 }];
  let eighth = 0;

  for (let i = 1; i < len; i++) {
    const last = i === len - 1;
    const near = scale.filter((m) => m !== cur && Math.abs(m - cur) <= 7 && isChord(m));
    let next: number;
    if (last || rng() < 0.3) {
      next = near.length > 0 ? pick(near) : cur;
    } else {
      const idx = scale.indexOf(cur);
      const dir = rng() < 0.5 ? -1 : 1;
      next = scale[idx + dir] ?? scale[idx - dir] ?? cur;
    }
    cur = next;
    eighth += 1 + Math.floor(rng() * 3);
    notes.push({ midi: cur, eighth, velocity: 0.2 + rng() * 0.25 });
  }
  return notes;
}

/** 下一句隔多久（毫秒）；熱度不到兩成不彈（null） */
export function phraseGapMs(heat: number, rng: () => number): number | null {
  if (heat < 0.2) return null;
  const t = Math.min(1, (heat - 0.2) / 0.8);
  return (9000 + (2500 - 9000) * t) * (0.7 + rng() * 0.6);
}
