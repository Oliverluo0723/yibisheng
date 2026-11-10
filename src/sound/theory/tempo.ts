export type LoopInfo = { id: string; bpm: number };

/** 速度在 bpm 的 ±tol 之內的 loop */
export function loopsNear<T extends LoopInfo>(loops: readonly T[], bpm: number, tol = 0.1): T[] {
  return loops.filter((l) => Math.abs(l.bpm - bpm) <= bpm * tol);
}

/** 可以當這次速度的 BPM：鼓組 loop 的速度裡，±tol 內也找得到打擊 loop 的 */
export function tempoChoices(
  kits: readonly LoopInfo[],
  percs: readonly LoopInfo[],
  tol = 0.1,
): number[] {
  const bpms = [...new Set(kits.map((k) => k.bpm))];
  return bpms.filter((b) => loopsNear(percs, b, tol).length > 0);
}

/** 一段 loop 有幾小節（4/4） */
export function loopBars(durationSec: number, bpm: number): number {
  return Math.max(1, Math.round((durationSec * bpm) / 240));
}

/**
 * 循環終點（音檔裡的秒數）：整數小節，但不超過音檔長度。
 * mp3 解碼後可能比理論長度短幾十微秒，超過的話 Tone 會丟 RangeError。
 */
export function loopEndSec(durationSec: number, bpm: number): number {
  return Math.min((loopBars(durationSec, bpm) * 240) / bpm, durationSec);
}
