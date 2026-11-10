import * as Tone from 'tone';
import type { LayerName } from '../params';

/**
 * 主混音：各層 Gain → master → Limiter → 輸出；
 * 另有一條 send → 共用 Reverb → master。
 */
export class Bus {
  readonly master = new Tone.Gain(0.8);
  readonly limiter = new Tone.Limiter(-3);
  readonly reverb = new Tone.Reverb({ decay: 6, preDelay: 0.03, wet: 1 });
  private readonly sendGain = new Tone.Gain(0.35);
  private readonly layers = new Map<LayerName, Tone.Gain>();

  constructor() {
    this.master.chain(this.limiter, Tone.getDestination());
    this.sendGain.chain(this.reverb, this.master);
  }

  layer(name: LayerName): Tone.Gain {
    let g = this.layers.get(name);
    if (!g) {
      g = new Tone.Gain(1);
      g.connect(this.master);
      this.layers.set(name, g);
    }
    return g;
  }

  /** 進殘響的 aux 輸入 */
  send(): Tone.Gain {
    return this.sendGain;
  }

  setMasterVolume(v: number, rampSec = 0.1): void {
    this.master.gain.rampTo(v, rampSec);
  }

  dispose(): void {
    for (const g of this.layers.values()) g.dispose();
    this.sendGain.dispose();
    this.reverb.dispose();
    this.limiter.dispose();
    this.master.dispose();
  }
}
