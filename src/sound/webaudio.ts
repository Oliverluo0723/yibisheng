import { mulberry32 } from '../growth/rng';
import type { GrowthEvent } from '../growth/types';
import type { StrokePoint } from '../strokes/types';
import type { SoundEngine } from './engine';
import { midiToHz, pickNote } from './scale';

const MIN_GAP_MS = 80;

/**
 * 原生 Web Audio 的簡單實作：三角波 + 音量包絡 → 回授延遲 + 低通 → 主音量。
 * start() 之前（或環境沒有 AudioContext）一切都是 no-op。
 */
export class WebAudioEngine implements SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wet: GainNode | null = null;
  private volume = 0.8;
  private lastNoteAt = -Infinity;
  private readonly rng: () => number;

  constructor(seed = 1) {
    this.rng = mulberry32(seed);
  }

  async start(): Promise<void> {
    if (typeof AudioContext === 'undefined') return;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);

    // 回授延遲：讓每個音像漣漪一樣慢慢散開
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.38;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.45;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2400;
    delay.connect(lowpass);
    lowpass.connect(feedback);
    feedback.connect(delay);
    lowpass.connect(master);

    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    wet.connect(delay);
    wet.connect(master);

    this.ctx = ctx;
    this.master = master;
    this.wet = wet;
    if (ctx.state === 'suspended') await ctx.resume();
  }

  onStrokePoint(_p: StrokePoint): void {
    // 這一版畫線時不出聲（生長時才發聲）
  }

  onGrowth(e: GrowthEvent): void {
    if (!this.ctx || !this.wet) return;
    const nowMs = this.ctx.currentTime * 1000;
    if (nowMs - this.lastNoteAt < MIN_GAP_MS) return;
    this.lastNoteAt = nowMs;

    const midi = pickNote(this.rng, e.depth) + (e.kind === 'leaf' ? 12 : 0);
    const peak = e.kind === 'leaf' ? 0.1 : 0.18;
    const release = e.kind === 'leaf' ? 0.9 : 1.8;
    this.playNote(midiToHz(Math.min(96, midi)), peak, release, e.x);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  private playNote(hz: number, peak: number, release: number, pan01: number): void {
    const ctx = this.ctx;
    const wet = this.wet;
    if (!ctx || !wet) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = hz;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(peak, t0 + 0.25);
    env.gain.setTargetAtTime(peak * 0.4, t0 + 0.25, 0.15);
    env.gain.setTargetAtTime(0.0001, t0 + 0.6, release / 4);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan01 * 1.6 - 0.8;
    osc.connect(env);
    env.connect(panner);
    panner.connect(wet);
    osc.start(t0);
    osc.stop(t0 + 0.6 + release * 1.5);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
      panner.disconnect();
    };
  }
}
