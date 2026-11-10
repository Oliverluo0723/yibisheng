import type * as Tone from 'tone';
import type { Layer } from './types';

/** 各層共用的開關與音量：關掉是把層的音量滑到 0，不停播。 */
export abstract class LayerBase implements Layer {
  private enabled = true;
  private volume = 1;

  constructor(protected readonly out: Tone.Gain) {}

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
    this.out.gain.rampTo(this.enabled ? this.volume : 0, 0.3);
  }

  abstract dispose(): void;
}
