import * as Tone from 'tone';
import type { Bus } from '../audio/bus';
import type { LayerName } from '../params';
import type { Layer } from './types';

/**
 * 各層共用的開關與音量：關掉是把層的音量滑到 0，不停播。
 * out 是乾聲，wet 是送進共用殘響的那條；兩條一起跟著開關與音量走，
 * 所以關掉一層時它的殘響尾巴也一起消失。
 */
export abstract class LayerBase implements Layer {
  private enabled = true;
  private volume = 1;
  protected readonly out: Tone.Gain;
  protected readonly wet = new Tone.Gain(1);

  constructor(bus: Bus, name: LayerName) {
    this.out = bus.layer(name);
    this.wet.connect(bus.send());
  }

  setEnabled(b: boolean): void {
    this.enabled = b;
    this.apply();
  }

  setVolume(v: number): void {
    this.volume = v;
    this.apply();
  }

  protected get isOn(): boolean {
    return this.enabled && this.volume > 0;
  }

  private apply(): void {
    const v = this.enabled ? this.volume : 0;
    this.out.gain.rampTo(v, 0.3);
    this.wet.gain.rampTo(v, 0.3);
  }

  abstract dispose(): void;
}
