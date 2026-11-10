import * as Tone from 'tone';
import type { GrainOpts } from '../layers/types';

type Voice = { player: Tone.GrainPlayer; panner: Tone.Panner; gain: Tone.Gain; startedAt: number };

/** 固定大小的 GrainPlayer 池；滿了就搶最舊的那個。 */
export class GrainPool {
  private readonly voices: Voice[] = [];

  /** out = 乾聲；send = 送殘響（顆粒也要糊進同一個空間，不能是乾乾的「叮」） */
  constructor(out: Tone.ToneAudioNode, send: Tone.ToneAudioNode, size = 8) {
    for (let i = 0; i < size; i++) {
      const player = new Tone.GrainPlayer({ grainSize: 0.2, overlap: 0.1 });
      const panner = new Tone.Panner(0);
      const gain = new Tone.Gain(1);
      player.chain(panner, gain, out);
      gain.connect(send);
      this.voices.push({ player, panner, gain, startedAt: Number.NEGATIVE_INFINITY });
    }
  }

  /** buffer 由呼叫端依 opts.reverse 挑好正的或反的那份 */
  play(buffer: Tone.ToneAudioBuffer, opts: GrainOpts): void {
    const v = this.voices.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
    const now = Tone.now();
    if (v.player.state === 'started') v.player.stop(now);
    v.player.buffer = buffer;
    v.player.detune = opts.shift * 100;
    v.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), now);
    v.gain.gain.setValueAtTime(Tone.dbToGain(opts.gainDb), now);
    v.player.start(now + 0.01);
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
