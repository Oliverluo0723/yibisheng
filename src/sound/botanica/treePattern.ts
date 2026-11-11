// 一株的格子：出生亮兩格，枝長出來照 voice.order 點亮，枯掉從最後亮的熄回去，全熄就死。
import { sixteenthOf, type TreeVoice } from './treeVoice';

export class TreePattern {
  private readonly litSteps: number[] = [];
  private everLit = false;

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
    if (this.litSteps.length >= this.voice.capacity) return false;
    const next = this.voice.order[this.litSteps.length];
    if (next === undefined) return false;
    this.litSteps.push(next);
    this.everLit = true;
    return true;
  }

  /** 熄掉最後點亮的那格；沒得熄回 false */
  dim(): boolean {
    return this.litSteps.pop() !== undefined;
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
