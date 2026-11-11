// 唯一把 Tone.js 物件組起來的地方。04 只需要 createBotanicaEngine。
import * as Tone from 'tone';
import { mulberry32 } from '../../growth/rng';
import { Bus } from './audio/bus';
import { Clock } from './audio/clock';
import { Loader } from './audio/loader';
import { BotanicaEngine } from './engine';
import { Bed } from './layers/bed';
import { Bloom } from './layers/bloom';
import { Drips } from './layers/drips';
import { Drums } from './layers/drums';
import { Grains } from './layers/grains';
import { Pad } from './layers/pad';
import { Piano } from './layers/piano';
import type { SampleRole } from './manifest';
import type { BotanicaParams } from './params';

export { BotanicaEngine } from './engine';
export { type BotanicaParams, freshBotanicaParams } from './params';

/** 先載最先要響的底，再依出聲的頻繁程度載其他 */
const LOAD_ORDER: readonly SampleRole[] = [
  'bed',
  'kalimba',
  'bell',
  'glitch',
  'strings',
  'ostr',
  'keys',
  'perc',
  'kit',
  'piano',
  'swell',
  'drip',
  'glitchfx',
  'rain',
  'clarinet',
];

export function createBotanicaEngine(params: BotanicaParams): BotanicaEngine {
  const seed = Date.now();
  const layerRng = mulberry32(seed ^ 0x9e3779b9);
  let bus: Bus | null = null;
  let clock: Clock | null = null;
  const loader = new Loader();
  // Tone 的節點要等 AudioContext 起來才建（瀏覽器規定使用者互動後才能出聲），
  // 所以層用延遲建立的代理包起來：start() 之前呼叫都是 no-op。
  let layers: {
    bed: Bed;
    bloom: Bloom;
    grains: Grains;
    drips: Drips;
    drums: Drums;
    piano: Piano;
    pad: Pad;
  } | null = null;
  const build = () => {
    bus = new Bus();
    clock = new Clock();
    layers = {
      drums: new Drums(bus, loader, clock, layerRng),
      piano: new Piano(bus, loader, clock, layerRng),
      pad: new Pad(bus, loader),
      bed: new Bed(bus, loader, layerRng),
      bloom: new Bloom(bus, loader),
      grains: new Grains(bus, loader),
      drips: new Drips(bus, loader, layerRng),
    };
  };
  return new BotanicaEngine(params, {
    seed,
    now: () => performance.now(),
    store: loader,
    // engine.start() 先 await output.start()（會 build）才註冊，所以 clock 已經在
    clock: { everySixteenth: (fn) => (clock ? clock.everySixteenth(fn) : () => {}) },
    bed: {
      start: () => layers?.bed.start(),
      setEnabled: (b) => layers?.bed.setEnabled(b),
      setVolume: (v) => layers?.bed.setVolume(v),
      dispose: () => layers?.bed.dispose(),
    },
    bloom: {
      bloom: (id, o) => layers?.bloom.bloom(id, o),
      setEnabled: (b) => layers?.bloom.setEnabled(b),
      setVolume: (v) => layers?.bloom.setVolume(v),
      dispose: () => layers?.bloom.dispose(),
    },
    grains: {
      grain: (id, o) => layers?.grains.grain(id, o),
      setEnabled: (b) => layers?.grains.setEnabled(b),
      setVolume: (v) => layers?.grains.setVolume(v),
      dispose: () => layers?.grains.dispose(),
    },
    drips: {
      drip: (id) => layers?.drips.drip(id),
      glitch: (id, s, o) => layers?.drips.glitch(id, s, o),
      setEnabled: (b) => layers?.drips.setEnabled(b),
      setVolume: (v) => layers?.drips.setVolume(v),
      dispose: () => layers?.drips.dispose(),
    },
    drums: {
      start: (bpm) => layers?.drums.start(bpm),
      setLevels: (p, k, lp) => layers?.drums.setLevels(p, k, lp),
      setEnabled: (b) => layers?.drums.setEnabled(b),
      setVolume: (v) => layers?.drums.setVolume(v),
      dispose: () => layers?.drums.dispose(),
    },
    piano: {
      start: (bpm) => layers?.piano.start(bpm),
      phrase: (n) => layers?.piano.phrase(n),
      setEnabled: (b) => layers?.piano.setEnabled(b),
      setVolume: (v) => layers?.piano.setVolume(v),
      dispose: () => layers?.piano.dispose(),
    },
    pad: {
      chord: (m, o) => layers?.pad.chord(m, o),
      setEnabled: (b) => layers?.pad.setEnabled(b),
      setVolume: (v) => layers?.pad.setVolume(v),
      dispose: () => layers?.pad.dispose(),
    },
    output: {
      start: async () => {
        await Tone.start();
        if (!bus) build();
        void loader.loadAll(LOAD_ORDER);
      },
      setVolume: (v) => bus?.setMasterVolume(v),
      dispose: () => bus?.dispose(),
    },
  });
}
