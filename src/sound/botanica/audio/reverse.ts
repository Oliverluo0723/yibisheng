/**
 * 反轉音訊資料：複製一份再反轉，不動原本的陣列。
 * 不能用 Tone 播放器的 .reverse：它會把共用的 AudioBuffer 原地翻掉，
 * 之後別的播放器拿到同一個素材就是倒的。
 */
export function reversedCopy(channels: readonly Float32Array[]): Float32Array[] {
  return channels.map((c) => Float32Array.from(c).reverse());
}
