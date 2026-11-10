import * as Tone from 'tone';
import { loopBars, loopsNear } from '../../theory/tempo';
import type { Bus } from '../audio/bus';
import type { Clock } from '../audio/clock';
import type { Loader } from '../audio/loader';
import { type SampleRole, sampleById, samplesByRole } from '../manifest';
import { LayerBase } from './base';
import type { DrumLayer } from './types';

const SWAP_FADE = 0.03;
/** 音量歸零多久之後停掉播放器 */
const IDLE_STOP_MS = 4000;

type Deck = { player: Tone.Player; gain: Tone.Gain };

type Lane = {
  role: SampleRole;
  gain: Tone.Gain;
  decks: [Deck, Deck];
  active: number;
  playing: boolean;
  currentId: string | null;
  barsLeft: number;
  level: number;
  silentSince: number | null;
};

/**
 * 鼓：打擊、鼓組兩條 loop，跟著熱度從遠處（低通、小聲）淡進來。
 * 每條 loop 用 playbackRate 對齊這次的速度、loopEnd 設成整數小節；
 * 每 12–20 小節在小節線上換一段，兩個 deck 交叉 30 ms 避免喀聲。
 */
export class Drums extends LayerBase implements DrumLayer {
  private readonly filter = new Tone.Filter(600, 'lowpass');
  private readonly sendLevel = new Tone.Gain(0.15);
  private readonly lanes: [Lane, Lane];
  private bpm = 100;
  private stopBarTick: (() => void) | null = null;

  constructor(
    bus: Bus,
    private readonly loader: Loader,
    private readonly clock: Clock,
    private readonly rng: () => number,
  ) {
    super(bus, 'drums');
    this.filter.connect(this.out);
    this.filter.connect(this.sendLevel);
    this.sendLevel.connect(this.wet);
    const lane = (role: SampleRole): Lane => {
      const gain = new Tone.Gain(0).connect(this.filter);
      const deck = (): Deck => {
        const g = new Tone.Gain(0).connect(gain);
        return { player: new Tone.Player({ loop: true }).connect(g), gain: g };
      };
      return {
        role,
        gain,
        decks: [deck(), deck()],
        active: 0,
        playing: false,
        currentId: null,
        barsLeft: 0,
        level: 0,
        silentSince: null,
      };
    };
    this.lanes = [lane('perc'), lane('kit')];
  }

  start(bpm: number): void {
    if (this.stopBarTick) return;
    this.bpm = bpm;
    this.clock.start(bpm);
    void this.loader.loadRole('perc');
    void this.loader.loadRole('kit');
    this.stopBarTick = this.clock.everyBar((time) => this.onBar(time));
  }

  setLevels(perc: number, kit: number, lowpassHz: number): void {
    const [p, k] = this.lanes;
    p.level = perc;
    k.level = kit;
    this.filter.frequency.rampTo(lowpassHz, 1);
    for (const l of this.lanes) l.gain.gain.rampTo(l.level * 0.7, 1);
  }

  /** 每個小節線：該開的開、該換的換、該停的停 */
  private onBar(time: number): void {
    const nowMs = performance.now();
    for (const l of this.lanes) {
      if (l.level > 0.001) {
        l.silentSince = null;
        if (!l.playing) this.swap(l, time);
        else if (--l.barsLeft <= 0) this.swap(l, time);
      } else if (l.playing) {
        l.silentSince ??= nowMs;
        if (nowMs - l.silentSince > IDLE_STOP_MS) this.stopLane(l, time);
      }
    }
  }

  private swap(l: Lane, time: number): void {
    const near = loopsNear(
      samplesByRole(l.role)
        .filter((s) => s.bpm !== undefined && this.loader.get(s.id))
        .map((s) => ({ id: s.id, bpm: s.bpm as number })),
      this.bpm,
    );
    const choices = near.length > 1 ? near.filter((x) => x.id !== l.currentId) : near;
    const pick = choices[Math.floor(this.rng() * choices.length)];
    const buf = pick ? this.loader.get(pick.id) : undefined;
    if (!pick || !buf) return;
    const inc = l.decks[(l.active + 1) % 2] as Deck;
    const out = l.decks[l.active] as Deck;
    const bars = loopBars(buf.duration, pick.bpm);
    if (inc.player.state === 'started') inc.player.stop(time);
    inc.player.buffer = buf;
    inc.player.playbackRate = this.bpm / pick.bpm;
    inc.player.loopStart = 0;
    inc.player.loopEnd = (bars * 240) / pick.bpm;
    inc.gain.gain.setValueAtTime(0, time);
    inc.gain.gain.linearRampToValueAtTime(
      Tone.dbToGain(sampleById(pick.id)?.gainDb ?? 0),
      time + SWAP_FADE,
    );
    inc.player.start(time + 0.001, 0);
    if (l.playing) {
      out.gain.gain.setValueAtTime(out.gain.gain.getValueAtTime(time), time);
      out.gain.gain.linearRampToValueAtTime(0, time + SWAP_FADE);
      out.player.stop(time + SWAP_FADE + 0.01);
    }
    l.active = (l.active + 1) % 2;
    l.playing = true;
    l.currentId = pick.id;
    l.barsLeft = 12 + Math.floor(this.rng() * 9);
  }

  private stopLane(l: Lane, time: number): void {
    const d = l.decks[l.active] as Deck;
    d.gain.gain.setValueAtTime(0, time);
    d.player.stop(time + 0.01);
    l.playing = false;
    l.currentId = null;
    l.silentSince = null;
  }

  dispose(): void {
    this.stopBarTick?.();
    for (const l of this.lanes) {
      for (const d of l.decks) {
        d.player.dispose();
        d.gain.dispose();
      }
      l.gain.dispose();
    }
    this.filter.dispose();
    this.sendLevel.dispose();
    this.wet.dispose();
  }
}
