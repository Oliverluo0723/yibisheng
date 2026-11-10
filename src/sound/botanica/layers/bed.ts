import * as Tone from 'tone';
import type { Bus } from '../audio/bus';
import type { Loader } from '../audio/loader';
import { sampleById } from '../manifest';
import { LayerBase } from './base';
import type { BedLayer } from './types';

const FADE = 8;

type Slot = { player: Tone.Player; gain: Tone.Gain; id: string | null };

/** 底：兩段環境錄音交叉淡入淡出，每 40–90 秒換一段；偶爾淡進一段雨。全部過 4 kHz 低通，像窗外。 */
export class Bed extends LayerBase implements BedLayer {
  private readonly filter = new Tone.Filter(4000, 'lowpass');
  private readonly slots: [Slot, Slot];
  private readonly rain = new Tone.Player({ fadeIn: 4, fadeOut: 4 });
  private readonly rainGain = new Tone.Gain(Tone.dbToGain(-12));
  private active = 0;
  private started = false;
  private timers: number[] = [];

  constructor(
    bus: Bus,
    private readonly loader: Loader,
    private readonly rng: () => number,
  ) {
    super(bus, 'bed');
    this.filter.connect(this.out);
    const slot = (): Slot => {
      const player = new Tone.Player({ loop: true });
      const gain = new Tone.Gain(0);
      player.chain(gain, this.filter);
      return { player, gain, id: null };
    };
    this.slots = [slot(), slot()];
    this.rain.chain(this.rainGain, this.filter);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.loader.loadRole('bed').then(() => {
      this.swap();
      this.scheduleRain();
    });
  }

  private swap(): void {
    const ids = this.loader.loadedIds('bed');
    const current = this.slots[this.active].id;
    const choices = ids.length > 1 ? ids.filter((x) => x !== current) : ids;
    const id = choices[Math.floor(this.rng() * choices.length)];
    const buf = id ? this.loader.get(id) : undefined;
    if (id && buf) {
      const next = (this.active + 1) % 2;
      const inc = this.slots[next];
      const out = this.slots[this.active];
      const now = Tone.now();
      if (inc.player.state === 'started') inc.player.stop(now);
      inc.player.buffer = buf;
      inc.id = id;
      const t0 = now + 0.02;
      inc.gain.gain.cancelScheduledValues(now);
      inc.gain.gain.setValueAtTime(0, t0);
      inc.gain.gain.linearRampToValueAtTime(Tone.dbToGain(sampleById(id)?.gainDb ?? 0), t0 + FADE);
      inc.player.start(t0, this.rng() * buf.duration * 0.8);
      out.gain.gain.cancelScheduledValues(now);
      out.gain.gain.setValueAtTime(out.gain.gain.value, now);
      out.gain.gain.linearRampToValueAtTime(0, now + FADE);
      if (out.player.state === 'started') out.player.stop(now + FADE + 0.1);
      this.active = next;
    }
    this.later(40000 + this.rng() * 50000, () => this.swap());
  }

  private scheduleRain(): void {
    this.later(60000 + this.rng() * 120000, () => {
      void this.loader.loadRole('rain').then(() => {
        const ids = this.loader.loadedIds('rain');
        const id = ids[Math.floor(this.rng() * ids.length)];
        const buf = id ? this.loader.get(id) : undefined;
        if (buf && this.isOn && this.rain.state !== 'started') {
          this.rain.buffer = buf;
          this.rain.start();
        }
        this.scheduleRain();
      });
    });
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  dispose(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    for (const s of this.slots) {
      s.player.dispose();
      s.gain.dispose();
    }
    this.rain.dispose();
    this.rainGain.dispose();
    this.filter.dispose();
    this.wet.dispose();
  }
}
