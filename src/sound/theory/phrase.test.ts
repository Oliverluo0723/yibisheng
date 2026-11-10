import { expect, test } from 'vitest';
import { mulberry32 } from '../../growth/rng';
import { chordTones } from './chords';
import { brokenChord, cluster, makePhrase, phraseGapMs } from './phrase';

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

test('brokenChord：和弦音由低到高分解，八分音符間隔 1–2，力度輕', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const p = brokenChord(mulberry32(seed), [53, 57, 60]);
    expect(p.map((n) => n.midi)).toEqual([53, 57, 60]);
    expect(p[0]?.eighth).toBe(0);
    for (let i = 1; i < p.length; i++) {
      const d = (p[i] as { eighth: number }).eighth - (p[i - 1] as { eighth: number }).eighth;
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(2);
    }
    for (const n of p) {
      expect(n.velocity).toBeGreaterThanOrEqual(0.2);
      expect(n.velocity).toBeLessThanOrEqual(0.4);
    }
  }
});

test('cluster：6–9 個高音小音符，調內、和弦音為主，可以同一拍、很輕', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const keyPc = seed % 12;
    const tones = chordTones('I');
    const p = cluster(mulberry32(seed), keyPc, tones);
    expect(p.length).toBeGreaterThanOrEqual(6);
    expect(p.length).toBeLessThanOrEqual(9);
    const rel = (m: number) => (((m - keyPc) % 12) + 12) % 12;
    let chordy = 0;
    for (const n of p) {
      expect(MAJOR).toContain(rel(n.midi));
      expect(n.midi).toBeGreaterThanOrEqual(72);
      expect(n.midi).toBeLessThanOrEqual(96);
      expect(n.velocity).toBeGreaterThanOrEqual(0.12);
      expect(n.velocity).toBeLessThanOrEqual(0.3);
      expect(n.eighth).toBeGreaterThanOrEqual(0);
      expect(n.eighth).toBeLessThanOrEqual(4);
      if (tones.includes(rel(n.midi))) chordy++;
    }
    expect(chordy / p.length).toBeGreaterThanOrEqual(0.5);
  }
});
