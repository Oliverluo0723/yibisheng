import * as Tone from 'tone';
import type { GrainOpts } from '../layers/types';

type Voice = { player: Tone.GrainPlayer; panner: Tone.Panner; gain: Tone.Gain; startedAt: number };

/** 固定大小的 GrainPlayer 池；滿了就搶最舊的那個。 */
export class GrainPool {
  private readonly voices: Voice[] = [];

  /** out = 乾聲；send = 送殘響（顆粒也要糊進同一個空間，不能是乾乾的「叮」）；省略 = 由 out 之後的節點自己分 */
  constructor(out: Tone.ToneAudioNode, send: Tone.ToneAudioNode | undefined, size = 8) {
    for (let i = 0; i < size; i++) {
      const player = new Tone.GrainPlayer({ grainSize: 0.2, overlap: 0.1 });
      const panner = new Tone.Panner(0);
      const gain = new Tone.Gain(1);
      player.chain(panner, gain, out);
      if (send) gain.connect(send);
      this.voices.push({ player, panner, gain, startedAt: Number.NEGATIVE_INFINITY });
    }
  }

  /** buffer 由呼叫端依 opts.reverse 挑好正的或反的那份；opts.at 可以排在拍子上 */
  play(buffer: Tone.ToneAudioBuffer, opts: GrainOpts): void {
    const v = this.voices.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
    // 審查發現：Transport 回呼給的 time 一定 ≤ Tone.now()（now 含 lookAhead），用 max(Tone.now(), at)
    // 會把排程時間蓋掉、顆粒晚 0–50 ms 隨機抖。要對拍就以 at 為準，只防止排到過去。
    const now = opts.at !== undefined ? Math.max(Tone.immediate(), opts.at) : Tone.now();
    if (v.player.state === 'started') v.player.stop(now);
    v.player.buffer = buffer;
    v.player.detune = opts.shift * 100;
    v.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), now);
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(Tone.dbToGain(opts.gainDb), now);
    // 長素材切片：從 offsetFrac 處開始、播 durationSec 就停
    const dur = opts.durationSec;
    const offset =
      dur !== undefined ? (opts.offsetFrac ?? 0) * Math.max(0, buffer.duration - dur) : 0;
    v.player.start(now + 0.01, offset);
    if (dur !== undefined) {
      v.gain.gain.setValueAtTime(Tone.dbToGain(opts.gainDb), now + 0.01 + dur - 0.05);
      v.gain.gain.linearRampToValueAtTime(0, now + 0.01 + dur);
      v.player.stop(now + 0.01 + dur);
    }
    v.startedAt = now;
  }

  dispose(): void {
    for (const v of this.voices) {
      v.player.dispose();
      v.panner.dispose();
      v.gain.dispose();
    }
  }
}
