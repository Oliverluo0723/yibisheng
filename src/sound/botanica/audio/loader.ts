import * as Tone from 'tone';
import type { SampleStore } from '../layers/types';
import { type SampleRole, SOUND_BASE, samplesByRole } from '../manifest';
import { reversedCopy } from './reverse';

/** 依用途載入素材；載好之前 ready() 是 false，層和引擎直接略過。 */
export class Loader implements SampleStore {
  private readonly buffers = new Map<string, Tone.ToneAudioBuffer>();
  private readonly reversed = new Map<string, Tone.ToneAudioBuffer>();
  private readonly loaded = new Set<SampleRole>();
  private readonly pending = new Map<SampleRole, Promise<void>>();

  constructor(private readonly base = SOUND_BASE) {}

  get(id: string): Tone.ToneAudioBuffer | undefined {
    return this.buffers.get(id);
  }

  /** 反轉版：第一次要時複製一份反轉後快取，原本那份不動。 */
  getReversed(id: string): Tone.ToneAudioBuffer | undefined {
    const cached = this.reversed.get(id);
    if (cached) return cached;
    const buf = this.buffers.get(id);
    if (!buf) return undefined;
    const data = buf.toArray();
    const rev = Tone.ToneAudioBuffer.fromArray(reversedCopy(Array.isArray(data) ? data : [data]));
    this.reversed.set(id, rev);
    return rev;
  }

  /** 依 reverse 拿正的或反的那份 */
  buffer(id: string, reverse: boolean): Tone.ToneAudioBuffer | undefined {
    return reverse ? this.getReversed(id) : this.get(id);
  }

  ready(role: SampleRole): boolean {
    return this.loaded.has(role);
  }

  loadRole(role: SampleRole): Promise<void> {
    const p = this.pending.get(role);
    if (p) return p;
    const job = Promise.all(
      samplesByRole(role).map(async (s) => {
        try {
          this.buffers.set(s.id, await Tone.ToneAudioBuffer.fromUrl(this.base + s.file));
        } catch (err) {
          console.warn(`[聲音] 載不到 ${s.file}（跑過 node scripts/convert-sounds.ts 嗎？）`, err);
        }
      }),
    ).then(() => {
      if (samplesByRole(role).some((s) => this.buffers.has(s.id))) this.loaded.add(role);
    });
    this.pending.set(role, job);
    return job;
  }

  /** 依序一類一類載，不同時發太多請求。 */
  async loadAll(order: readonly SampleRole[]): Promise<void> {
    for (const r of order) await this.loadRole(r);
  }

  /** 這一類裡已經載好的素材 id */
  loadedIds(role: SampleRole): string[] {
    return samplesByRole(role)
      .filter((s) => this.buffers.has(s.id))
      .map((s) => s.id);
  }
}
