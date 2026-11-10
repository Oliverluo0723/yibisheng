// BotanicaEngine：唯一的翻譯者。把 SoundEngine 的事件翻成各層的呼叫，
// 持有唯一的音樂狀態（調由 params 提供、和弦進行到第幾步、這一筆的配方）。
// 這個檔不 import Tone.js；聲音全部透過 deps 裡的層發出，所以可以用假的層測。
import { mulberry32 } from '../../growth/rng';
import type { GrowthEvent } from '../../growth/types';
import type { StrokePoint } from '../../strokes/types';
import type { SoundEngine } from '../engine';
import { chordAt, chordTones, grainShift, nextChordIndex, PROGRESSION } from '../theory/chords';
import { drumLevels, HEAT_BUMP, Heat } from '../theory/heat';
import { keyPitchClass, keyShift } from '../theory/keys';
import { makePhrase, phraseGapMs } from '../theory/phrase';
import { grainCategory } from '../theory/register';
import { tempoChoices } from '../theory/tempo';
import type {
  BedLayer,
  BloomLayer,
  DripLayer,
  DrumLayer,
  GrainLayer,
  Layer,
  PianoLayer,
  SampleStore,
} from './layers/types';
import { type Sample, type SampleRole, samplesByRole } from './manifest';
import type { BotanicaParams, LayerName } from './params';
import { FreshPicker } from './pick';
import { type BloomColour, DEFAULT_RECIPE, makeRecipe, type Recipe } from './recipe';
import { IdleScheduler } from './schedule/idle';
import { RateLimiter } from './schedule/rateLimit';

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
  store: SampleStore;
  now: () => number;
  seed?: number;
  output?: EngineOutput;
};

/** 兩筆綻放之間至少隔這麼久，太近的只推進和弦 */
const BLOOM_GAP_MS = 1500;
const POLL_MS = 500;

const COLOUR_ROLE: Record<Exclude<BloomColour, 'none'>, SampleRole> = {
  strings: 'strings',
  piano: 'piano',
  swell: 'swell',
  clarinet: 'clarinet',
};

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

  onPlantStart(seed: number): void {
    const now = this.deps.now();
    this.idle.activity(now);
    this.heatState.add(now, HEAT_BUMP.plant);
    const r = makeRecipe(seed, this.params.randomness);
    this.recipe = r;
    this.chord = nextChordIndex(this.chord, r.chord);
    this.rate.setMax(r.grains.maxPerSec);
    if (r.colour === 'none' || now - this.lastBloomAt < BLOOM_GAP_MS) return;
    const s = this.pick(COLOUR_ROLE[r.colour]);
    if (!s) return;
    this.lastBloomAt = now;
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
  }

  onGrowth(e: GrowthEvent): void {
    const now = this.deps.now();
    this.idle.activity(now);
    this.heatState.add(now, e.kind === 'leaf' ? HEAT_BUMP.leaf : HEAT_BUMP.branch);
    if (e.kind === 'leaf' && this.rng() < 0.5) return;
    // 同一毫秒算一次：performance.now() 帶小數，同一幀的好幾個分枝時間戳都不同
    if (!this.rate.allow(Math.floor(now))) return;
    const s = this.pick(grainCategory(e.depth));
    if (!s) return;
    const g = this.recipe.grains;
    const ks = keyShift(s.sourceKey, this.params.key);
    const shifts = chordTones(chordAt(this.chord, this.recipe.chord === 'substitute')).map((t) =>
      grainShift(ks, t),
    );
    const shift =
      g.bias < 0
        ? Math.min(...shifts)
        : g.bias > 0
          ? Math.max(...shifts)
          : (shifts[Math.floor(this.rng() * shifts.length)] as number);
    this.deps.grains.grain(s.id, {
      shift,
      pan: (e.x - 0.5) * 1.6,
      reverse: this.rng() < g.reverseChance,
      gainDb: e.kind === 'leaf' ? -8 : 0,
    });
  }

  onPlantDone(): void {
    const s = this.pick('drip');
    if (s) this.deps.drips.drip(s.id);
  }

  /** 閒置偶發、鼓的音量、鋼琴的下一句；start() 之後每 500 ms 自動呼叫一次。 */
  poll(nowMs = this.deps.now()): void {
    const h = this.heatState.value(nowMs);
    const d = drumLevels(h);
    this.deps.drums.setLevels(d.perc, d.kit, d.lowpassHz);
    this.pianoTick(nowMs, h);
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
    const tones = chordTones(chordAt(this.chord, this.recipe.chord === 'substitute'));
    this.deps.piano.phrase(makePhrase(this.rng, keyPitchClass(this.params.key), tones));
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
    const { bed, bloom, grains, drips, drums, piano } = this.deps;
    for (const l of [bed, bloom, grains, drips, drums, piano]) l.dispose();
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
