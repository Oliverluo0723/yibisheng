/**
 * 枯的時鐘（純函式，不碰畫面也不碰聲音）。
 *
 * D（秒）是全域的「乾燥時間」：停手夠久、而且整幅畫的熱度夠低時才走，永遠不倒退。
 * 每株記下出生時的 D，枯的程度 = 出生之後 D 走了多少 ÷ 全枯秒數。
 * 於是：新株從 0 開始；再畫一筆熱度回來，D 停住、所有株停住；掉了的不會回去。
 */
export type WitherClockOpts = {
  /** 最後一次活動之後要等多久（ms）才開始走 */
  graceMs: number;
  /** 熱度低於這個值才走（0..1） */
  heatThreshold: number;
};

export const defaultWitherClockOpts: WitherClockOpts = { graceMs: 25000, heatThreshold: 0.3 };

/** 一次 tick 最多算這麼多（ms）：分頁切走幾分鐘再回來，不會一回來葉子全掉 */
const MAX_STEP_MS = 100;

export class WitherClock {
  readonly opts: WitherClockOpts;
  private d = 0;
  private lastActivity: number | null = null;
  private lastTick: number | null = null;

  constructor(opts: Partial<WitherClockOpts> = {}) {
    this.opts = { ...defaultWitherClockOpts, ...opts };
  }

  /** D，秒；只進不退 */
  get seconds(): number {
    return this.d;
  }

  /** 放開、分枝、長葉、畫線中：都算活動 */
  activity(nowMs: number): void {
    this.lastActivity = nowMs;
  }

  /** 每幀呼叫；回傳 D */
  tick(nowMs: number, heat: number): number {
    if (this.lastActivity === null) this.lastActivity = nowMs;
    const dt =
      this.lastTick === null ? 0 : Math.min(MAX_STEP_MS, Math.max(0, nowMs - this.lastTick));
    this.lastTick = nowMs;
    // 只算「寬限過了之後」的那部分：寬限剛好在這一幀中間結束時不多算
    const sinceGrace = nowMs - (this.lastActivity + this.opts.graceMs);
    const credit = Math.min(dt, Math.max(0, sinceGrace));
    if (heat < this.opts.heatThreshold) this.d += credit / 1000;
    return this.d;
  }
}

export class PlantWither {
  private max = 0;

  constructor(private readonly bornSeconds: number) {}

  /** 回傳 0..1，只增不減；manual > 0 時取 max(自動, manual) */
  update(clockSeconds: number, fullSec: number, manual: number): number {
    const auto = Math.min(
      1,
      Math.max(0, (clockSeconds - this.bornSeconds) / Math.max(1e-6, fullSec)),
    );
    this.max = Math.max(this.max, auto, Math.min(1, Math.max(0, manual)));
    return this.max;
  }

  get value(): number {
    return this.max;
  }
}
