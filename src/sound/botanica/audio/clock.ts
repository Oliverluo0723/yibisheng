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

  /**
   * 每個 16 分音符呼叫一次：time 是那一拍的 AudioContext 時間，sixteenth 0..15、bar 從 0 數。
   * 回傳取消函式。和 everyBar 一樣用 ticks 對齊格線。
   */
  everySixteenth(fn: (time: number, sixteenth: number, bar: number) => void): () => void {
    const t = Tone.getTransport();
    const stepTicks = t.PPQ / 4;
    const nextStep = Math.ceil((t.ticks + 1) / stepTicks) * stepTicks;
    const id = t.scheduleRepeat(
      (time) => {
        const ticks = t.getTicksAtTime(time);
        const step = Math.round(ticks / stepTicks);
        fn(time, step % 16, Math.floor(step / 16));
      },
      '16n',
      `${nextStep}i`,
    );
    return () => t.clear(id);
  }

  /** 每小節呼叫一次，time 是小節線的 AudioContext 時間；回傳取消函式 */
  everyBar(fn: (time: number) => void): () => void {
    const t = Tone.getTransport();
    // 第三個參數是「拍子時鐘上的位置」，不是 AudioContext 的秒數：
    // 用 ticks 算出下一個小節線，才會真的落在格線上（否則每小節都晚 lookAhead 約 100 ms）
    const barTicks = t.PPQ * 4;
    const nextBarTicks = Math.ceil((t.ticks + 1) / barTicks) * barTicks;
    const id = t.scheduleRepeat(fn, '1m', `${nextBarTicks}i`);
    return () => t.clear(id);
  }
}
