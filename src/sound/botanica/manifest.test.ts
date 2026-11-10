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
