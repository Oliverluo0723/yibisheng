import * as Tone from 'tone';

/** 鼓與鋼琴共用的拍子：Tone.Transport 以這次的速度一直跑。 */
export class Clock {
  private started = false;
  private bpmValue = 100;

  start(bpm: number): void {
    if (this.started) return;
    this.started = true;
    this.bpmValue = bpm;
    const t = Tone.getTransport();
    t.bpm.value = bpm;
    t.start();
  }

  get bpm(): number {
    return this.bpmValue;
  }

  get running(): boolean {
    return this.started;
  }

  /** 一個八分音符幾秒 */
  get eighthSec(): number {
    return 30 / this.bpmValue;
  }

  /** 下一個小節線（AudioContext 時間） */
  nextBar(): number {
    return Tone.getTransport().nextSubdivision('1m');
  }

  /** 下一個八分音符（AudioContext 時間） */
  nextEighth(): number {
    return Tone.getTransport().nextSubdivision('8n');
  }

  /** 每小節呼叫一次，time 是小節線的 AudioContext 時間；回傳取消函式 */
  everyBar(fn: (time: number) => void): () => void {
    const t = Tone.getTransport();
    const id = t.scheduleRepeat(fn, '1m', t.nextSubdivision('1m'));
    return () => t.clear(id);
  }
}
