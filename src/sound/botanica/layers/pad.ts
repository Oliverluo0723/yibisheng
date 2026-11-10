import * as Tone from 'tone';
import type { Bus } from '../audio/bus';
import type { Loader } from '../audio/loader';
import { samplesByRole } from '../manifest';
import { LayerBase } from './base';
import type { ChordOpts, PadLayer } from './types';

/** 3 秒的弦樂單音，循環這一段當持續音（顆粒循環，接縫自然） */
const LOOP_START = 0.6;
const LOOP_END = 2.6;
const VOICES = 12;

type Voice = {
  player: Tone.GrainPlayer;
  env: Tone.Gain;
  startedAt: number;
  endsAt: number;
};

/**
 * 弦樂拉長的和弦：每個和弦音一個循環的 GrainPlayer，detune 到最近的弦樂單音，
 * 音量慢起、撐住、慢收。同時最多 3 個和弦（12 個 voice），滿了搶最舊的。
 */
export class Pad extends LayerBase implements PadLayer {
  private readonly filter = new Tone.Filter(8000, 'lowpass');
  private readonly panner = new Tone.Panner(0);
  private readonly sendLevel = new Tone.Gain(0.5);
  private readonly voices: Voice[] = [];
  private notes: { id: string; midi: number }[] | null = null;

  constructor(
    bus: Bus,
    private readonly loader: Loader,
  ) {
    super(bus, 'pad');
    this.filter.chain(this.panner, this.out);
    this.panner.connect(this.sendLevel);
    this.sendLevel.connect(this.wet);
    for (let i = 0; i < VOICES; i++) {
      // 顆粒大一點、疊多一點，循環的持續音比較平滑、不會有 4 Hz 的抖
      const player = new Tone.GrainPlayer({ grainSize: 0.4, overlap: 0.25, loop: true });
      player.loopStart = LOOP_START;
      player.loopEnd = LOOP_END;
      const env = new Tone.Gain(0);
      player.chain(env, this.filter);
      this.voices.push({ player, env, startedAt: -1, endsAt: -1 });
    }
  }

  chord(midis: readonly number[], o: ChordOpts): void {
    if (!this.isOn || !this.loader.ready('ostr')) return;
    const notes = this.loadedNotes();
    if (notes.length === 0) return;
    const gainDb = samplesByRole('ostr')[0]?.gainDb ?? 0;
    const now = Tone.now();
    const t0 = now + 0.03;
    this.filter.frequency.rampTo(o.lowpassHz, 0.5);
    this.panner.pan.rampTo(Math.max(-1, Math.min(1, o.pan)), 0.5);
    this.sendLevel.gain.rampTo(o.reverbSend, 0.5);
    const peak = (o.velocity * 0.8 * Tone.dbToGain(gainDb)) / Math.max(1, Math.sqrt(midis.length));
    for (const midi of midis) {
      const near = notes.reduce((a, b) =>
        Math.abs(b.midi - midi) < Math.abs(a.midi - midi) ? b : a,
      );
      const buf = this.loader.get(near.id);
      if (!buf) continue;
      const v = this.voices.reduce((a, b) => (b.endsAt < a.endsAt ? b : a));
      const g = v.env.gain;
      g.cancelAndHoldAtTime(now);
      if (v.player.state === 'started') {
        g.linearRampToValueAtTime(0, now + 0.02);
        v.player.stop(now + 0.02);
      }
      v.player.buffer = buf;
      v.player.detune = (midi - near.midi) * 100;
      g.setValueAtTime(0, t0);
      g.linearRampToValueAtTime(peak, t0 + o.attack);
      g.setValueAtTime(peak, t0 + o.attack + o.hold);
      g.linearRampToValueAtTime(0, t0 + o.attack + o.hold + o.release);
      v.player.start(t0, LOOP_START);
      v.player.stop(t0 + o.attack + o.hold + o.release + 0.05);
      v.startedAt = t0;
      v.endsAt = t0 + o.attack + o.hold + o.release;
    }
  }

  private loadedNotes(): { id: string; midi: number }[] {
    if (this.notes) return this.notes;
    const list = samplesByRole('ostr')
      .filter((s) => s.midi !== undefined && this.loader.get(s.id))
      .map((s) => ({ id: s.id, midi: s.midi as number }));
    if (list.length === samplesByRole('ostr').length) this.notes = list;
    return list;
  }

  dispose(): void {
    for (const v of this.voices) {
      v.player.dispose();
      v.env.dispose();
    }
    this.filter.dispose();
    this.panner.dispose();
    this.sendLevel.dispose();
    this.wet.dispose();
  }
}
