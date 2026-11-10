// BotanicaEngine：唯一的翻譯者。把 SoundEngine 的事件翻成各層的呼叫，
// 持有唯一的音樂狀態（調由 params 提供、和弦進行到第幾步、這一筆的配方）。
// 這個檔不 import Tone.js；聲音全部透過 deps 裡的層發出，所以可以用假的層測。
import { mulberry32 } from '../../growth/rng';
import type { GrowthEvent } from '../../growth/types';
import type { StrokePoint } from '../../strokes/types';
import type { SoundEngine, WitherEvent } from '../engine';
import {
  chordAt,
  chordMidis,
  chordTones,
  grainShift,
  nextChordIndex,
  PROGRESSION,
  type Register,
} from '../theory/chords';
import { drumLevels, HEAT_BUMP, Heat } from '../theory/heat';
import { keyPitchClass, keyShift } from '../theory/keys';
import { brokenChord, cluster, makePhrase, phraseGapMs } from '../theory/phrase';
import { grainCategory } from '../theory/register';
import { tempoChoices } from '../theory/tempo';
import type {
  BedLayer,
  BloomLayer,
  DripLayer,
  DrumLayer,
  GrainLayer,
  Layer,
  PadLayer,
  PianoLayer,
  SampleStore,
} from './layers/types';
import { type Sample, type SampleRole, samplesByRole } from './manifest';
import type { BotanicaParams, LayerName } from './params';
import { FreshPicker } from './pick';
import { type BloomColour, DEFAULT_RECIPE, makeRecipe, type Recipe } from './recipe';
import { IdleScheduler } from './schedule/idle';
import { RateLimiter } from './schedule/rateLimit';
import { grainRole, type Voice, voiceFor } from './voices';

/** 主輸出：真正的實作在 index.ts（Tone.js），測試時省略。 */
export type EngineOutput = {
  start(): Promise<void>;
  setVolume(v: number): void;
  dispose(): void;
};

export type EngineDeps = {
  bed: BedLayer;
  bloom: BloomLayer;
  grains: GrainLayer;
  drips: DripLayer;
  drums: DrumLayer;
  piano: PianoLayer;
  pad: PadLayer;
  store: SampleStore;
  now: () => number;
  seed?: number;
  output?: EngineOutput;
};

/** 兩筆綻放之間至少隔這麼久，太近的只推進和弦 */
const BLOOM_GAP_MS = 1500;
const POLL_MS = 500;

/** 播一段素材的顏色 → 用哪一類素材 */
const SAMPLE_COLOURS: Partial<Record<BloomColour, SampleRole>> = {
  strings: 'strings',
  piano: 'piano',
  swell: 'swell',
  clarinet: 'clarinet',
};
/** 弦樂和弦的顏色 → 音域 */
const PAD_COLOURS: Partial<Record<BloomColour, Register>> = {
  pad: 'mid',
  padLow: 'low',
  padHigh: 'high',
};
/** 這些類別是幾秒到十幾秒的長素材，當顆粒用時要切片 */
const LONG_ROLES = new Set<SampleRole>(['piano', 'glitchfx', 'strings', 'swell', 'clarinet']);

export class BotanicaEngine implements SoundEngine {
  private chord = PROGRESSION.length - 1; // 從 I 開始，第一筆走到 IV
  private recipe: Recipe = DEFAULT_RECIPE;
  private lastBloomAt = Number.NEGATIVE_INFINITY;
  private volume = 0.8;
  private muted = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly rng: () => number;
  private readonly rate = new RateLimiter(DEFAULT_RECIPE.grains.maxPerSec);
  private readonly idle: IdleScheduler;
  private readonly pickers = new Map<SampleRole, FreshPicker>();
  private readonly heatState = new Heat();
  private nextPhraseAt: number | null = null;
  /** 最近放開的植物的聲音：決定鼓與鋼琴的份量 */
  private voice: Voice = voiceFor(undefined);
  private mix = { drums: 1, piano: 1 };
  /** 這次的速度：從「鼓組與打擊都有 loop 可配」的速度裡抽 */
  readonly bpm: number;

  constructor(
    private readonly params: BotanicaParams,
    private readonly deps: EngineDeps,
  ) {
    this.rng = mulberry32(deps.seed ?? Date.now());
    this.idle = new IdleScheduler(this.rng);
    const loopInfo = (role: SampleRole) =>
      samplesByRole(role).flatMap((s) => (s.bpm ? [{ id: s.id, bpm: s.bpm }] : []));
    const choices = tempoChoices(loopInfo('kit'), loopInfo('perc'));
    this.bpm = choices[Math.floor(this.rng() * choices.length)] ?? 100;
  }

  /** 整幅畫目前的熱度 0..1 */
  heat(nowMs = this.deps.now()): number {
    return this.heatState.value(nowMs);
  }

  get chordIndex(): number {
    return this.chord;
  }

  async start(): Promise<void> {
    await this.deps.output?.start();
    this.applyParams();
    this.deps.output?.setVolume(this.muted ? 0 : this.volume);
    this.deps.bed.start();
    this.deps.drums.start(this.bpm);
    this.deps.piano.start(this.bpm);
    if (this.timer === null) this.timer = setInterval(() => this.poll(), POLL_MS);
  }

  /** 畫線中不出聲（使用者決定：放開、開始長了才出聲）。 */
  onStrokePoint(_p: StrokePoint): void {}

  onPlantStart(seed: number, voiceName?: string): void {
    const now = this.deps.now();
    this.idle.activity(now);
    this.heatState.add(now, HEAT_BUMP.plant);
    const v = voiceFor(voiceName);
    this.voice = v;
    const r = makeRecipe(seed, this.params.randomness, v);
    this.recipe = r;
    this.chord = nextChordIndex(this.chord, r.chord);
    this.rate.setMax(Math.max(1, Math.round(r.grains.maxPerSec * v.grains.density)));
    if (r.colour === 'none' || now - this.lastBloomAt < BLOOM_GAP_MS) return;
    if (this.bloomWith(r)) this.lastBloomAt = now;
  }

  /** 照配方的顏色綻放；回傳有沒有真的出聲 */
  private bloomWith(r: Recipe): boolean {
    const keyPc = keyPitchClass(this.params.key);
    const tones = this.currentTones();
    const sampleRole = SAMPLE_COLOURS[r.colour];
    if (sampleRole) {
      const s = this.pick(sampleRole);
      if (!s) return false;
      this.deps.bloom.bloom(s.id, {
        shift: keyShift(s.sourceKey, this.params.key),
        sliceStart: r.sliceStart,
        sliceLen: r.sliceLen,
        reverse: r.reverse,
        attack: r.attack,
        reverbSend: r.reverbSend,
        octave: r.octave,
        pan: r.pan,
        lowpassHz: r.lowpassHz,
        gain: r.gain,
      });
      return true;
    }
    const register = PAD_COLOURS[r.colour];
    if (register) return this.padChord(chordMidis(keyPc, tones, register), r, r.gain);
    if (r.colour === 'keys') {
      if (!this.deps.store.ready('keys')) return false;
      this.deps.piano.phrase(brokenChord(this.rng, chordMidis(keyPc, tones, 'mid')));
      return true;
    }
    if (r.colour === 'cluster') {
      // 丁香：高音弦樂軟墊 + 一串密集的小鋼琴音
      const padOk = this.padChord(chordMidis(keyPc, tones, 'high'), r, r.gain * 0.45);
      let keysOk = false;
      if (this.deps.store.ready('keys')) {
        this.deps.piano.phrase(cluster(this.rng, keyPc, tones));
        keysOk = true;
      }
      return padOk || keysOk;
    }
    return false;
  }

  private padChord(midis: number[], r: Recipe, velocity: number): boolean {
    if (!this.deps.store.ready('ostr')) return false;
    this.deps.pad.chord(midis, {
      attack: Math.max(1, r.attack * 1.5),
      hold: 4 + this.rng() * 6,
      release: 3 + this.rng() * 2,
      velocity,
      pan: r.pan,
      lowpassHz: r.lowpassHz,
      reverbSend: r.reverbSend,
    });
    return true;
  }

  private currentTones(): readonly number[] {
    return chordTones(chordAt(this.chord, this.recipe.chord === 'substitute'));
  }

  onGrowth(e: GrowthEvent, voiceName?: string): void {
    const now = this.deps.now();
    this.idle.activity(now);
    this.heatState.add(now, e.kind === 'leaf' ? HEAT_BUMP.leaf : HEAT_BUMP.branch);
    if (e.kind === 'leaf' && this.rng() < 0.5) return;
    // 同一毫秒算一次：performance.now() 帶小數，同一幀的好幾個分枝時間戳都不同
    if (!this.rate.allow(Math.floor(now))) return;
    // 顆粒的素材跟著「發事件的那株」的聲音；沒給就用最近放開的
    const v = voiceName === undefined ? this.voice : voiceFor(voiceName);
    this.grainFor(e.depth, e.x, v, {
      gainDb: v.grains.gainDb + (e.kind === 'leaf' ? -8 : 0),
      reverseChance: this.recipe.grains.reverseChance,
    });
  }

  /** 枯：葉落地＝很輕的顆粒，枝斷＝反轉的 swell 或 glitch。不算活動、不推熱度。 */
  onWither(e: WitherEvent, voiceName?: string): void {
    const now = this.deps.now();
    const v = voiceName === undefined ? this.voice : voiceFor(voiceName);
    if (e.kind === 'leaf') {
      if (this.rng() < 0.5) return;
      if (!this.rate.allow(Math.floor(now))) return;
      this.grainFor(e.depth, e.x, v, { gainDb: v.grains.gainDb - 16, reverseChance: 0.6 });
      return;
    }
    const s = this.pick(this.rng() < 0.5 ? 'swell' : 'glitchfx');
    if (!s) return;
    this.deps.drips.glitch(s.id, keyShift(s.sourceKey, this.params.key), {
      reverse: true,
      gainDb: -6,
    });
  }

  /** 挑這株、這個深度的顆粒素材，位移到目前和弦音上，丟給顆粒層 */
  private grainFor(
    depth: number,
    x: number,
    v: Voice,
    o: { gainDb: number; reverseChance: number },
  ): void {
    const role = grainRole(v, grainCategory(depth));
    const s = this.pick(role);
    if (!s) return;
    const g = this.recipe.grains;
    const ks = keyShift(s.sourceKey, this.params.key);
    const shifts = this.currentTones().map((t) => grainShift(ks, t));
    const bias = g.bias !== 0 ? g.bias : v.grains.bias;
    const shift =
      bias < 0
        ? Math.min(...shifts)
        : bias > 0
          ? Math.max(...shifts)
          : (shifts[Math.floor(this.rng() * shifts.length)] as number);
    const slice = LONG_ROLES.has(role)
      ? { offsetFrac: this.rng(), durationSec: 0.4 + this.rng() * 0.8 }
      : {};
    this.deps.grains.grain(s.id, {
      shift,
      pan: (x - 0.5) * 1.6,
      reverse: this.rng() < o.reverseChance,
      gainDb: o.gainDb,
      ...slice,
    });
  }

  onPlantDone(): void {
    const s = this.pick('drip');
    if (s) this.deps.drips.drip(s.id);
  }

  /** 閒置偶發、鼓的音量、鋼琴的下一句；start() 之後每 500 ms 自動呼叫一次。 */
  poll(nowMs = this.deps.now()): void {
    const h = this.heatState.value(nowMs);
    // 鼓與鋼琴的份量滑向最近放開的植物
    this.mix.drums += (this.voice.drums - this.mix.drums) * 0.5;
    this.mix.piano += (this.voice.piano - this.mix.piano) * 0.5;
    const d = drumLevels(h);
    this.deps.drums.setLevels(d.perc * this.mix.drums, d.kit * this.mix.drums, d.lowpassHz);
    this.pianoTick(nowMs, h * this.mix.piano);
    const ev = this.idle.poll(nowMs);
    if (ev === 'drip') this.onPlantDone();
    else if (ev === 'glitch') {
      const s = this.pick('glitchfx');
      if (s) this.deps.drips.glitch(s.id, keyShift(s.sourceKey, this.params.key));
    }
  }

  /** 熱度夠就隔一陣子彈一句；冷下來就停。第一句來得快一點。 */
  private pianoTick(now: number, h: number): void {
    const gap = phraseGapMs(h, this.rng);
    if (gap === null) {
      this.nextPhraseAt = null;
      return;
    }
    if (this.nextPhraseAt === null) {
      this.nextPhraseAt = now + gap * 0.3;
      return;
    }
    if (now < this.nextPhraseAt) return;
    this.nextPhraseAt = now + gap;
    if (!this.deps.store.ready('keys')) return;
    this.deps.piano.phrase(
      makePhrase(this.rng, keyPitchClass(this.params.key), this.currentTones()),
    );
  }

  /** 面板改了 params 之後呼叫：把各層的開關、音量推下去。調是每次事件即時讀的。 */
  applyParams(): void {
    const layers: [LayerName, Layer][] = [
      ['bed', this.deps.bed],
      ['bloom', this.deps.bloom],
      ['grains', this.deps.grains],
      ['drips', this.deps.drips],
      ['drums', this.deps.drums],
      ['piano', this.deps.piano],
      ['pad', this.deps.pad],
    ];
    for (const [name, layer] of layers) {
      layer.setEnabled(this.params[name].enabled);
      layer.setVolume(this.params[name].volume);
    }
  }

  setVolume(v: number): void {
    this.volume = v;
    this.deps.output?.setVolume(this.muted ? 0 : v);
  }

  setMuted(b: boolean): void {
    this.muted = b;
    this.deps.output?.setVolume(b ? 0 : this.volume);
  }

  dispose(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    const { bed, bloom, grains, drips, drums, piano, pad } = this.deps;
    for (const l of [bed, bloom, grains, drips, drums, piano, pad]) l.dispose();
    this.deps.output?.dispose();
  }

  private pick(role: SampleRole): Sample | undefined {
    if (!this.deps.store.ready(role)) return undefined;
    let p = this.pickers.get(role);
    if (!p) {
      p = new FreshPicker(8);
      this.pickers.set(role, p);
    }
    return p.pick(samplesByRole(role), this.rng);
  }
}
