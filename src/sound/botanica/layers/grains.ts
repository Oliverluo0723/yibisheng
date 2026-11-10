import * as Tone from 'tone';
import type { Bus } from '../audio/bus';
import type { Loader } from '../audio/loader';
import { GrainPool } from '../audio/voices';
import { LayerBase } from './base';
import type { GrainLayer, GrainOpts } from './types';

/** 顆粒（生長）：每個分枝事件丟一顆，用固定大小的 GrainPlayer 池。 */
export class Grains extends LayerBase implements GrainLayer {
  private readonly pool: GrainPool;
  /** 顆粒送進殘響的量 */
  private readonly sendLevel = new Tone.Gain(0.3);

  constructor(
    bus: Bus,
    private readonly loader: Loader,
  ) {
    super(bus, 'grains');
    this.sendLevel.connect(this.wet);
    this.pool = new GrainPool(this.out, this.sendLevel, 8);
  }

  grain(sampleId: string, opts: GrainOpts): void {
    if (!this.isOn) return;
    const buf = this.loader.buffer(sampleId, opts.reverse);
    if (buf) this.pool.play(buf, opts);
  }

  dispose(): void {
    this.pool.dispose();
    this.sendLevel.dispose();
    this.wet.dispose();
  }
}
