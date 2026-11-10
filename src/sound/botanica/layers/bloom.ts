import * as Tone from 'tone';
import type { Bus } from '../audio/bus';
import type { Loader } from '../audio/loader';
import { sampleById } from '../manifest';
import { LayerBase } from './base';
import type { BloomLayer, BloomOpts } from './types';

const MAX_SOUNDING = 2;
const FADE_OUT = 2;

type Slot = {
  player: Tone.Player;
  filter: Tone.Filter;
  panner: Tone.Panner;
  env: Tone.Gain;
  send: Tone.Gain;
  startedAt: number;
  /** 預計自然結束的時間（Tone 秒） */
  endsAt: number;
  fading: boolean;
};

/** 和弦（綻放）：放開一筆時播一段樂句，同時最多兩筆在響，第三筆來時最舊的淡出。 */
export class Bloom extends LayerBase implements BloomLayer {
  private readonly slots: Slot[];

  constructor(
    bus: Bus,
    private readonly loader: Loader,
  ) {
    super(bus, 'bloom');
    // 兩個在響 + 一個正在淡出
    this.slots = Array.from({ length: MAX_SOUNDING + 1 }, () => {
      const player = new Tone.Player();
      const filter = new Tone.Filter(8000, 'lowpass');
      const panner = new Tone.Panner(0);
      const env = new Tone.Gain(0);
      const send = new Tone.Gain(0.5);
      player.chain(filter, panner, env, this.out);
      env.chain(send, this.wet);
      return { player, filter, panner, env, send, startedAt: -1, endsAt: -1, fading: false };
    });
  }

  bloom(sampleId: string, o: BloomOpts): void {
    const buf = this.loader.buffer(sampleId, o.reverse);
    if (!buf) return;
    const now = Tone.now();
    const sounding = this.slots.filter((s) => !s.fading && s.endsAt > now);
    if (sounding.length >= MAX_SOUNDING) {
      const oldest = sounding.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
      this.fadeOut(oldest, now);
    }
    // 優先用閒著的槽；沒有就搶最早開始的那個（一定是正在淡出的）
    const s =
      this.slots.find((x) => x.endsAt <= now) ??
      this.slots.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
    // 搶到還在響（通常正在淡出）的槽：先用 50 ms 滑到 0 再停，不要硬切出「喀」聲；
    // 新的稍晚一點再開始，避免同一時間點 stop / start 互相蓋掉
    const busy = s.player.state === 'started';
    const t0 = now + (busy ? 0.06 : 0.02);

    const rate = 2 ** ((o.shift + 12 * o.octave) / 12);
    const offset = Math.min(o.sliceStart, 0.95) * buf.duration;
    const bufDur = Math.min(o.sliceLen, buf.duration - offset);
    const realDur = bufDur / rate;
    const attack = Math.min(o.attack, realDur * 0.6);
    const release = Math.min(1.5, realDur * 0.35);
    const peak = o.gain * Tone.dbToGain(sampleById(sampleId)?.gainDb ?? 0);

    const g = s.env.gain;
    g.cancelAndHoldAtTime(now);
    if (busy) {
      g.linearRampToValueAtTime(0, now + 0.05);
      s.player.stop(now + 0.05);
    }
    s.player.buffer = buf;
    s.player.playbackRate = rate;
    s.filter.frequency.setValueAtTime(o.lowpassHz, t0);
    s.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, o.pan)), t0);
    s.send.gain.setValueAtTime(o.reverbSend, t0);
    g.setValueAtTime(0, t0);
    g.linearRampToValueAtTime(peak, t0 + attack);
    g.setValueAtTime(peak, t0 + realDur - release);
    g.linearRampToValueAtTime(0, t0 + realDur);
    s.player.start(t0, offset, bufDur);
    s.startedAt = t0;
    s.endsAt = t0 + realDur;
    s.fading = false;
  }

  private fadeOut(s: Slot, now: number): void {
    const g = s.env.gain;
    g.cancelAndHoldAtTime(now);
    g.linearRampToValueAtTime(0, now + FADE_OUT);
    // 不排未來的 stop：這個槽可能在淡完之前被重用，排好的 stop 會切掉新的聲音。
    // 音量已經滑到 0，播放器會在切片結束時自己停。
    s.fading = true;
    s.endsAt = now + FADE_OUT;
  }

  dispose(): void {
    for (const s of this.slots) {
      s.player.dispose();
      s.filter.dispose();
      s.panner.dispose();
      s.env.dispose();
      s.send.dispose();
    }
    this.wet.dispose();
  }
}
