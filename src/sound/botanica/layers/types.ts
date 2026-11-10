// 層的介面。這個檔不 import Tone.js，所以引擎可以用假的層來測。
import type { SampleRole } from '../manifest';

export interface Layer {
  setEnabled(b: boolean): void;
  /** 0..1 */
  setVolume(v: number): void;
  dispose(): void;
}

export type BloomOpts = {
  /** 調的位移（半音） */
  shift: number;
  sliceStart: number;
  sliceLen: number;
  reverse: boolean;
  attack: number;
  reverbSend: number;
  octave: -1 | 0;
  pan: number;
  lowpassHz: number;
  gain: number;
};

export type GrainOpts = { shift: number; pan: number; reverse: boolean; gainDb: number };

export interface BedLayer extends Layer {
  start(): void;
}

export interface BloomLayer extends Layer {
  bloom(sampleId: string, opts: BloomOpts): void;
}

export interface GrainLayer extends Layer {
  grain(sampleId: string, opts: GrainOpts): void;
}

export interface DripLayer extends Layer {
  drip(sampleId: string): void;
  glitch(sampleId: string, shift: number): void;
}

export interface SampleStore {
  ready(role: SampleRole): boolean;
  loadRole(role: SampleRole): Promise<void>;
}
