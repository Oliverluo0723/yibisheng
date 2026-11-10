/** 和弦級數（大調）。 */
export type Degree = 'I' | 'ii' | 'IV' | 'V' | 'vi';

/** 王道進行 IV–V–vi–I。 */
export const PROGRESSION: readonly Degree[] = ['IV', 'V', 'vi', 'I'];

/** 每一筆對和弦進行做的事：往前一步、停在原地、或代換（不前進，換成代理和弦）。 */
export type ChordAction = 'advance' | 'stay' | 'substitute';

const TONES: Record<Degree, readonly number[]> = {
  I: [0, 4, 7],
  ii: [2, 5, 9],
  IV: [5, 9, 0],
  V: [7, 11, 2],
  vi: [9, 0, 4],
};

/** 和弦音，以「相對主音的 pitch class」表示。 */
export function chordTones(d: Degree): readonly number[] {
  return TONES[d];
}

export function nextChordIndex(i: number, action: ChordAction): number {
  return action === 'advance' ? (i + 1) % PROGRESSION.length : i;
}

const SUBSTITUTE: Partial<Record<Degree, Degree>> = { IV: 'ii', I: 'vi' };

/** 進行中第 i 個和弦；substitute 時 IV→ii、I→vi，其他不變。 */
export function chordAt(i: number, substitute: boolean): Degree {
  const n = PROGRESSION.length;
  const d = PROGRESSION[((i % n) + n) % n] as Degree;
  return substitute ? (SUBSTITUTE[d] ?? d) : d;
}

/** pitch class 0..11 → 最近的位移 −5..+6。 */
export function nearestOffset(pc: number): number {
  const p = ((pc % 12) + 12) % 12;
  return p > 6 ? p - 12 : p;
}

/** 加減八度，直到 |x| ≤ limit。 */
export function foldShift(semis: number, limit = 7): number {
  let s = semis;
  while (s > limit) s -= 12;
  while (s < -limit) s += 12;
  return s;
}

/** 顆粒的總位移：調的位移 + 和弦音的位移，折回 ±7 內。 */
export function grainShift(keyShiftSemis: number, tone: number): number {
  return foldShift(keyShiftSemis + nearestOffset(tone));
}
