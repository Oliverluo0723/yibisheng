import * as Tone from 'tone';
import type { Bus } from '../audio/bus';
import type { Clock } from '../audio/clock';
import type { Loader } from '../audio/loader';
import { samplesByRole } from '../manifest';
import { LayerBase } from './base';
import type { PianoLayer, PianoNote } from './types';

/** 鋼琴：Salamander 單音取樣組成的 Sampler，一句一句對齊八分音符彈，帶一點人味。 */
export class Piano extends LayerBase implements PianoLayer {
  private sampler: Tone.Sampler | null = null;
  private readonly panner = new Tone.Panner(0);
  private readonly sendLevel = new Tone.Gain(0.45);

  constructor(
    bus: Bus,
    private readonly loader: Loader,
    private readonly clock: Clock,
    private readonly rng: () => number,
  ) {
    super(bus, 'piano');
    this.panner.connect(this.out);
    this.panner.connect(this.sendLevel);
    this.sendLevel.connect(this.wet);
  }

  start(bpm: number): void {
    this.clock.start(bpm);
    void this.loader.loadRole('keys');
  }

  phrase(notes: readonly PianoNote[]): void {
    if (!this.isOn || notes.length === 0) return;
    const s = this.ensureSampler();
    if (!s) return;
    const step = this.clock.eighthSec;
    const t0 = this.clock.nextEighth() + step;
    this.panner.pan.setValueAtTime((this.rng() * 2 - 1) * 0.4, t0);
    for (const n of notes) {
      const human = (this.rng() - 0.5) * 0.03;
      const len = step * (2 + this.rng() * 3);
      s.triggerAttackRelease(
        Tone.Frequency(n.midi, 'midi').toNote(),
        len,
        t0 + n.eighth * step + human,
        n.velocity,
      );
    }
  }

  private ensureSampler(): Tone.Sampler | null {
    if (this.sampler) return this.sampler;
    if (!this.loader.ready('keys')) return null;
    const urls: Record<string, Tone.ToneAudioBuffer> = {};
    for (const k of samplesByRole('keys')) {
      const buf = this.loader.get(k.id);
      if (buf && k.midi !== undefined) urls[Tone.Frequency(k.midi, 'midi').toNote()] = buf;
    }
    this.sampler = new Tone.Sampler({ urls, release: 1.8 }).connect(this.panner);
    return this.sampler;
  }

  dispose(): void {
    this.sampler?.dispose();
    this.panner.dispose();
    this.sendLevel.dispose();
    this.wet.dispose();
  }
}
