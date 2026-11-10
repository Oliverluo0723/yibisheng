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

export type GrainOpts = {
  shift: number;
  pan: number;
  reverse: boolean;
  gainDb: number;
  /** 長素材切片：從整段的這個比例處開始（0..1） */
  offsetFrac?: number;
  /** 長素材切片：播幾秒就停 */
  durationSec?: number;
};

export type ChordOpts = {
  attack: number;
  /** 撐多久（秒），之後開始收 */
  hold: number;
  release: number;
  /** 0..1 */
  velocity: number;
  pan: number;
  lowpassHz: number;
  reverbSend: number;
};

/** 弦樂拉長的和弦：每個音一個循環的顆粒播放器 */
export interface PadLayer extends Layer {
  chord(midis: readonly number[], opts: ChordOpts): void;
}

export interface BedLayer extends Layer {
  start(): void;
}

export interface BloomLayer extends Layer {
  bloom(sampleId: string, opts: BloomOpts): void;
}

export interface GrainLayer extends Layer {
  grain(sampleId: string, opts: GrainOpts): void;
}

export type DripOpts = { reverse?: boolean; gainDb?: number };

export interface DripLayer extends Layer {
  drip(sampleId: string): void;
  glitch(sampleId: string, shift: number, opts?: DripOpts): void;
}

/** 鼓：兩條 loop（打擊、鼓組），音量與低通由引擎依熱度推下來 */
export interface DrumLayer extends Layer {
  /** 開始這次的速度（時鐘跟著啟動） */
  start(bpm: number): void;
  /** perc、kit 是 0..1 */
  setLevels(perc: number, kit: number, lowpassHz: number): void;
}

export type PianoNote = { midi: number; eighth: number; velocity: number };

/** 鋼琴：排一句短句，對齊下一個八分音符 */
export interface PianoLayer extends Layer {
  start(bpm: number): void;
  phrase(notes: readonly PianoNote[]): void;
}

export interface SampleStore {
  ready(role: SampleRole): boolean;
  loadRole(role: SampleRole): Promise<void>;
}
