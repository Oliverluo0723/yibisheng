/** 王道進行 E♭–F–Gm–B♭ 所在的 B♭ 大調：B♭ C D E♭ F G A */
export const BB_MAJOR_PITCH_CLASSES: readonly number[] = [10, 0, 2, 3, 5, 7, 9];

const LOW = 48; // C3
const HIGH = 84; // C6

/** 依 depth 挑一個 B♭ 大調的 MIDI 音：depth 越深音域越高，範圍 [48, 84]。 */
export function pickNote(rng: () => number, depth: number): number {
  const d = Math.max(0, Math.min(6, depth));
  // 每層往上移約 4 個半音，再在一個八度內隨機
  const base = LOW + d * 4 + rng() * 12;
  let midi = Math.round(base);
  // 往下找最近的調內音
  for (let i = 0; i < 12; i++) {
    if (BB_MAJOR_PITCH_CLASSES.includes(((midi % 12) + 12) % 12)) break;
    midi -= 1;
  }
  return Math.max(LOW, Math.min(HIGH, midi));
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
