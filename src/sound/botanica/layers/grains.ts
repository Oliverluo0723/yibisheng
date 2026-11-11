import * as Tone from 'tone';
import type { Bus } from '../audio/bus';
import type { Loader } from '../audio/loader';
import { GrainPool } from '../audio/voices';
import { LayerBase } from './base';
import type { GrainLayer, GrainOpts } from './types';

/**
 * 顆粒（生長、俳句）：每顆用固定大小的 GrainPlayer 池。
 * 整層過一個低通再分到乾聲和殘響（使用者：「高頻太刺耳」），所以殘響尾巴也不刺。
 */
export class Grains extends LayerBase implements GrainLayer {
  private readonly pool: GrainPool;
  private readonly filter = new Tone.Filter(3000, 'lowpass');
  /** 顆粒送進殘響的量 */
  private readonly sendLevel = new Tone.Gain(0.3);

  constructor(
    bus: Bus,
    private readonly loader: Loader,
  ) {
    super(bus, 'grains');
    this.filter.connect(this.out);
    this.filter.connect(this.sendLevel);
    this.sendLevel.connect(this.wet);
    this.pool = new GrainPool(this.filter, undefined, 8);
  }

  setLowpass(hz: number): void {
    this.filter.frequency.rampTo(Math.max(200, hz), 0.2);
  }

  grain(sampleId: string, opts: GrainOpts): void {
    if (!this.isOn) return;
    const buf = this.loader.buffer(sampleId, opts.reverse);
    if (buf) this.pool.play(buf, opts);
  }

  dispose(): void {
    this.pool.dispose();
    this.filter.dispose();
    this.sendLevel.dispose();
    this.wet.dispose();
  }
}
