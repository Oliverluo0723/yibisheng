import * as Tone from 'tone';
import type { Bus } from '../audio/bus';
import type { Loader } from '../audio/loader';
import { LayerBase } from './base';
import type { DripLayer } from './types';

type Voice = { player: Tone.Player; panner: Tone.Panner; gain: Tone.Gain; startedAt: number };

/** 偶發：水滴、glitch。四個 Player 輪用。 */
export class Drips extends LayerBase implements DripLayer {
  private readonly voices: Voice[];

  constructor(
    bus: Bus,
    private readonly loader: Loader,
    private readonly rng: () => number,
  ) {
    super(bus.layer('drips'));
    this.voices = Array.from({ length: 4 }, () => {
      const player = new Tone.Player();
      const panner = new Tone.Panner(0);
      const gain = new Tone.Gain(1);
      player.chain(panner, gain, this.out);
      return { player, panner, gain, startedAt: Number.NEGATIVE_INFINITY };
    });
  }

  drip(sampleId: string): void {
    this.play(sampleId, 1, -6);
  }

  glitch(sampleId: string, shift: number): void {
    this.play(sampleId, 2 ** (shift / 12), -8);
  }

  private play(id: string, rate: number, db: number): void {
    if (!this.isOn) return;
    const buf = this.loader.get(id);
    if (!buf) return;
    const v = this.voices.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
    const now = Tone.now();
    if (v.player.state === 'started') v.player.stop(now);
    v.player.buffer = buf;
    v.player.playbackRate = rate;
    v.panner.pan.setValueAtTime((this.rng() * 2 - 1) * 0.6, now);
    v.gain.gain.setValueAtTime(Tone.dbToGain(db), now);
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
