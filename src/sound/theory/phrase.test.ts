import { expect, test } from 'vitest';
import { mulberry32 } from '../../growth/rng';
import { chordTones } from './chords';
import { makePhrase, phraseGapMs } from './phrase';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

test('短句：2–5 個音、在調內、頭尾是和弦音、拍點遞增、力度輕', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = mulberry32(seed);
    const keyPc = seed % 12;
    const tones = chordTones('vi');
    const p = makePhrase(rng, keyPc, tones);
    expect(p.length).toBeGreaterThanOrEqual(2);
    expect(p.length).toBeLessThanOrEqual(5);
    const rel = (m: number) => (((m - keyPc) % 12) + 12) % 12;
    for (const n of p) {
      expect(MAJOR).toContain(rel(n.midi));
      expect(n.midi).toBeGreaterThanOrEqual(48);
      expect(n.midi).toBeLessThanOrEqual(84);
      expect(n.velocity).toBeGreaterThanOrEqual(0.2);
      expect(n.velocity).toBeLessThanOrEqual(0.45);
    }
    expect(tones).toContain(rel((p[0] as { midi: number }).midi));
    expect(tones).toContain(rel((p.at(-1) as { midi: number }).midi));
    expect(p[0]?.eighth).toBe(0);
    for (let i = 1; i < p.length; i++)
      expect((p[i] as { eighth: number }).eighth).toBeGreaterThan(
        (p[i - 1] as { eighth: number }).eighth,
      );
  }
});

test('熱度不到兩成不彈；越熱間隔越短', () => {
  const rng = mulberry32(9);
  expect(phraseGapMs(0.19, rng)).toBeNull();
  const avg = (h: number) => {
    let s = 0;
    for (let i = 0; i < 200; i++) s += phraseGapMs(h, rng) as number;
    return s / 200;
  };
  expect(avg(0.25)).toBeGreaterThan(avg(0.9));
  for (let i = 0; i < 100; i++) {
    const g = phraseGapMs(1, rng) as number;
    expect(g).toBeGreaterThanOrEqual(2500 * 0.7);
    expect(g).toBeLessThanOrEqual(9000 * 1.3);
  }
});
