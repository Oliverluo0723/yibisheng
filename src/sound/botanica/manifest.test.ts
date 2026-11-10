import { expect, test } from 'vitest';
import { SAMPLES, type SampleRole, sampleById, samplesByRole } from './manifest';

const ROLES: SampleRole[] = [
  'bed',
  'rain',
  'strings',
  'piano',
  'swell',
  'clarinet',
  'kalimba',
  'bell',
  'glitch',
  'drip',
  'glitchfx',
  'kit',
  'perc',
  'keys',
  'ostr',
];

test('清單一致：id、file 不重複，每個 role 都有素材', () => {
  const ids = SAMPLES.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(SAMPLES.map((s) => s.file)).size).toBe(ids.length);
  for (const r of ROLES) expect(samplesByRole(r).length).toBeGreaterThan(0);
  expect(samplesByRole('strings').length).toBe(24);
  expect(sampleById('clarinet-01')?.sourceKey).toBe('Bb');
  for (const s of SAMPLES) expect(s.file).toMatch(/^[a-z]+-[0-9a-z]+\.mp3$/);
});

test('源調照原檔名：swell 1–2 是 Db，glitchfx 1–6 是 F', () => {
  expect(sampleById('swell-01')?.sourceKey).toBe('Db');
  expect(sampleById('swell-03')?.sourceKey).toBe('C');
  expect(sampleById('glitchfx-06')?.sourceKey).toBe('F');
  expect(sampleById('glitchfx-07')?.sourceKey).toBe('C');
});

test('鼓組、打擊有 BPM；鋼琴有 MIDI 音高與下載網址', () => {
  expect(samplesByRole('kit').length).toBe(13);
  expect(samplesByRole('perc').length).toBe(21);
  expect(samplesByRole('keys').length).toBe(17);
  for (const s of [...samplesByRole('kit'), ...samplesByRole('perc')]) {
    expect(s.bpm).toBeGreaterThanOrEqual(70);
    expect(s.bpm).toBeLessThanOrEqual(120);
  }
  expect(sampleById('kit-05')?.bpm).toBe(86);
  expect(sampleById('perc-17')?.bpm).toBe(100);
  const keys = samplesByRole('keys');
  expect(keys.map((k) => k.midi)).toEqual([
    36, 39, 42, 45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84,
  ]);
  for (const k of keys)
    expect(k.url).toMatch(/^https:\/\/tonejs\.github\.io\/audio\/salamander\/[A-G]s?\d\.mp3$/);
});

test('弦樂單音：11 個，C/F 交替，MIDI 正確，來源在家目錄', () => {
  const o = samplesByRole('ostr');
  expect(o.map((s) => s.midi)).toEqual([24, 29, 36, 41, 48, 53, 60, 65, 72, 77, 84]);
  for (const s of o) expect(s.source.startsWith('~/')).toBe(true);
});
