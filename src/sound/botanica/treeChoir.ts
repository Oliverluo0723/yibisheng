// 所有樹的合唱：每株一個個性和格子、一個和弦聲部；每個 16 分音符決定誰響。
// 純邏輯，不 import Tone.js；引擎拿回 TreeHit 再去挑素材、算音高、丟顆粒層。
import type { Gesture } from '../../strokes/gesture';
import { activeTrees, densityFor, maxActiveFor } from './budget';
import { TreePattern } from './treePattern';
import { makeTreeVoice, type TreeVoice } from './treeVoice';

export type TreeHit = {
  treeId: number;
  voice: TreeVoice;
  /** 和弦聲部 0..3：0 根音、1 五度、2 三度、3 根音高八度 */
  slot: number;
};

export type ChoirOpts = {
  /** 同時幾株；0 = 依熱度 */
  maxActive: number;
  /** 密度倍率 */
  density: number;
};

const SLOTS = 4;

type Tree = { voice: TreeVoice; pattern: TreePattern; slot: number; born: number };

export class TreeChoir {
  private readonly trees = new Map<number, Tree>();
  private readonly usedSlots = new Set<number>();
  private added = 0;

  constructor(private readonly rng: () => number) {}

  /** 放開一株：建個性、發聲部（0..3 最小的空位；都滿了用「第幾次 add」% 4） */
  add(id: number, seed: number, g: Gesture, born: number): TreeVoice {
    const voice = makeTreeVoice(seed, g);
    let slot = this.added % SLOTS;
    for (let s = 0; s < SLOTS; s++) {
      if (!this.usedSlots.has(s)) {
        slot = s;
        break;
      }
    }
    this.usedSlots.add(slot);
    this.added++;
    this.trees.set(id, { voice, pattern: new TreePattern(voice), slot, born });
    return voice;
  }

  /** 分枝：點亮一格 */
  grow(id: number): void {
    this.trees.get(id)?.pattern.light();
  }

  /** 枝斷：熄一格；死了釋放聲部並移除 */
  wither(id: number): 'dimmed' | 'died' | 'none' {
    const t = this.trees.get(id);
    if (!t?.pattern.dim()) return 'none';
    if (!t.pattern.dead) return 'dimmed';
    this.remove(id);
    return 'died';
  }

  remove(id: number): void {
    const t = this.trees.get(id);
    if (!t) return;
    this.trees.delete(id);
    this.usedSlots.delete(t.slot);
  }

  get aliveCount(): number {
    return this.trees.size;
  }

  has(id: number): boolean {
    return this.trees.has(id);
  }

  /** 每個 16 分音符：這一拍誰響。sixteenth 0..15、bar 從 0 數 */
  tick(sixteenth: number, bar: number, heat: number, opts: ChoirOpts): TreeHit[] {
    const entries = [...this.trees].map(([treeId, t]) => ({ treeId, ...t }));
    const max = opts.maxActive > 0 ? opts.maxActive : maxActiveFor(heat);
    const gate = densityFor(entries.length) * opts.density;
    const hits: TreeHit[] = [];
    for (const t of activeTrees(entries, max, bar)) {
      if (!t.pattern.hitsAt(sixteenth)) continue;
      if (gate < 1 && this.rng() >= gate) continue;
      hits.push({ treeId: t.treeId, voice: t.voice, slot: t.slot });
    }
    return hits;
  }
}
