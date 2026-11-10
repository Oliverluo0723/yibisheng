/** 滑動一秒窗的每秒上限；同一毫秒第二次一律拒絕。 */
export class RateLimiter {
  private readonly times: number[] = [];

  constructor(private max: number) {}

  setMax(n: number): void {
    this.max = n;
  }

  allow(nowMs: number): boolean {
    while (this.times.length > 0 && (this.times[0] as number) <= nowMs - 1000) this.times.shift();
    if (this.times.at(-1) === nowMs) return false;
    if (this.times.length >= this.max) return false;
    this.times.push(nowMs);
    return true;
  }
}
