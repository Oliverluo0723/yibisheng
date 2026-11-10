export type IdleEvent = 'drip' | 'glitch';

export type IdleOptions = {
  /** 多久沒活動算閒置 */
  idleMs?: number;
  minGapMs?: number;
  maxGapMs?: number;
  glitchChance?: number;
};

/**
 * 閒置偶發：最後一次活動之後 idleMs 才進入閒置，之後每隔 minGap..maxGap 掉一個事件。
 * 一有活動就清掉排好的下一次。沒有任何活動時，從第一次 poll 開始算。
 */
export class IdleScheduler {
  private readonly idleMs: number;
  private readonly minGapMs: number;
  private readonly maxGapMs: number;
  private readonly glitchChance: number;
  private lastActivity: number | null = null;
  private nextAt: number | null = null;

  constructor(
    private readonly rng: () => number,
    opts: IdleOptions = {},
  ) {
    this.idleMs = opts.idleMs ?? 12000;
    this.minGapMs = opts.minGapMs ?? 15000;
    this.maxGapMs = opts.maxGapMs ?? 40000;
    this.glitchChance = opts.glitchChance ?? 0.25;
  }

  activity(nowMs: number): void {
    this.lastActivity = nowMs;
    this.nextAt = null;
  }

  poll(nowMs: number): IdleEvent | null {
    if (this.lastActivity === null) this.lastActivity = nowMs;
    const idleSince = this.lastActivity + this.idleMs;
    if (nowMs < idleSince) return null;
    if (this.nextAt === null) this.nextAt = idleSince + this.gap();
    if (nowMs < this.nextAt) return null;
    this.nextAt = nowMs + this.gap();
    return this.rng() < this.glitchChance ? 'glitch' : 'drip';
  }

  private gap(): number {
    return this.minGapMs + this.rng() * (this.maxGapMs - this.minGapMs);
  }
}
