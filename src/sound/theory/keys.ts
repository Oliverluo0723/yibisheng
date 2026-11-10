/** 12 個大調，依主音 pitch class 0..11 排列。 */
export const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export type KeyName = (typeof KEY_NAMES)[number];

export function keyPitchClass(k: KeyName): number {
  return KEY_NAMES.indexOf(k);
}

/** 從 from 調移到 to 調要移幾個半音，取最短路徑，結果在 −6..+5。 */
export function keyShift(from: KeyName, to: KeyName): number {
  const d = (((keyPitchClass(to) - keyPitchClass(from)) % 12) + 12) % 12;
  return d >= 6 ? d - 12 : d;
}
