/** 從池子裡抽素材，最近用過的 memory 個不重抽；池子太小時至少不連續重複。 */
export class FreshPicker {
  private readonly recent: string[] = [];

  constructor(private readonly memory: number) {}

  pick<T extends { id: string }>(pool: readonly T[], rng: () => number): T {
    if (pool.length === 0) throw new Error('FreshPicker: 池子是空的');
    const keep = Math.min(this.memory, pool.length - 1);
    const blocked = new Set(this.recent.slice(this.recent.length - keep));
    const fresh = keep > 0 ? pool.filter((x) => !blocked.has(x.id)) : pool;
    const choice = fresh[Math.floor(rng() * fresh.length)] as T;
    this.recent.push(choice.id);
    if (this.recent.length > this.memory) this.recent.shift();
    return choice;
  }
}
