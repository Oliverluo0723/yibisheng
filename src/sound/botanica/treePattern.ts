// 一株的格子：出生亮兩格，枝長出來照 voice.order 點亮，枯掉從最後亮的熄回去，全熄就死。
import { sixteenthOf, type TreeVoice } from './treeVoice';

export class TreePattern {
  private readonly litSteps: number[] = [];
  private everLit = false;
  /** 最多亮過幾格：枯的時候照這個比例熄 */
  peakLit = 0;

  constructor(readonly voice: TreeVoice) {
    this.light();
    this.light();
  }

  /** 目前亮著的格子（step 編號） */
  get lit(): readonly number[] {
    return this.litSteps;
  }

  /** 照 voice.order 點亮下一格；到 capacity 回 false */
  light(): boolean {
    return this.lightTo(this.litSteps.length + 1);
  }

  /** 點亮到 n 格（只往上；超過容量截掉）；有變動回 true */
  lightTo(n: number): boolean {
    const target = Math.min(this.voice.capacity, Math.floor(n));
    let changed = false;
    while (this.litSteps.length < target) {
      const next = this.voice.order[this.litSteps.length];
      if (next === undefined) break;
      this.litSteps.push(next);
      changed = true;
    }
    if (changed) {
      this.everLit = true;
      this.peakLit = Math.max(this.peakLit, this.litSteps.length);
    }
    return changed;
  }

  /** 熄掉最後點亮的那格；沒得熄回 false */
  dim(): boolean {
    return this.dimTo(this.litSteps.length - 1);
  }

  /** 熄到剩 n 格（只往下）；有變動回 true */
  dimTo(n: number): boolean {
    const target = Math.max(0, Math.ceil(n));
    let changed = false;
    while (this.litSteps.length > target) {
      this.litSteps.pop();
      changed = true;
    }
    return changed;
  }

  /** 曾經亮過、現在全熄 = 死了 */
  get dead(): boolean {
    return this.everLit && this.litSteps.length === 0;
  }

  /** 這個 16 分音符（0..15）有沒有亮著的格子 */
  hitsAt(sixteenth: number): boolean {
    return this.litSteps.some((s) => sixteenthOf(this.voice.subdivision, s) === sixteenth);
  }
}
