import { rgba } from '../color/nippon';
import { type Brush, direction, lerpSample } from './types';

type Bristle = { offset: number; weight: number; ink: number; seed: number };

/**
 * 飛白：一束細毛各畫各的線。每根毛用雜訊決定哪裡沾到墨、哪裡斷掉；
 * 筆越快、畫得越長（墨用掉），斷得越多。
 */
export function createDryBrush(): Brush {
  let bristles: Bristle[] = [];
  let dirPrev = { x: 1, y: 0 };
  const params = { bristles: 22, spread: 1.6, dryness: 0.45, inkLength: 900, alpha: 0.6 };
  return {
    id: 'dry',
    name: '飛白',
    note: '一束細毛斷斷續續，有乾擦的空隙',
    params,
    specs: {
      bristles: { label: '毛數', min: 4, max: 60, step: 1 },
      spread: { label: '筆幅', min: 0.6, max: 3, step: 0.05 },
      dryness: { label: '乾', min: 0, max: 1, step: 0.01 },
      inkLength: { label: '墨能畫多長', min: 100, max: 4000, step: 50 },
      alpha: { label: '濃', min: 0.1, max: 1, step: 0.01 },
    },
    taper: true,
    begin() {
      bristles = Array.from({ length: Math.round(params.bristles) }, () => ({
        offset: Math.random() * 2 - 1,
        weight: 0.5 + Math.random() * 1.3,
        ink: Math.random(),
        seed: Math.random() * 1000,
      }));
    },
    segment(env, a, b) {
      const { ctx } = env;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const sub = Math.max(1, Math.ceil(len / 3));
      const dir = direction(a, b, dirPrev);
      dirPrev = dir;
      const nx = -dir.y;
      const ny = dir.x;
      ctx.lineCap = 'butt';
      for (let k = 0; k < sub; k++) {
        const s0 = lerpSample(a, b, k / sub);
        const s1 = lerpSample(a, b, (k + 1) / sub);
        const used = Math.min(1, s1.dist / params.inkLength);
        const fast = 1 - s1.pressure;
        for (const br of bristles) {
          const n = env.noise(br.seed, s1.dist * 0.035);
          const dryAt = params.dryness * 0.5 + fast * 0.35 + used * 0.45 - br.ink * 0.15;
          if (n < dryAt) continue;
          const h0 = (s0.width * params.spread) / 2;
          const h1 = (s1.width * params.spread) / 2;
          ctx.strokeStyle = rgba(env.color, params.alpha * (0.5 + 0.5 * br.ink));
          ctx.lineWidth = br.weight * Math.min(1, s1.width / 6);
          ctx.beginPath();
          ctx.moveTo(s0.x + nx * br.offset * h0, s0.y + ny * br.offset * h0);
          ctx.lineTo(s1.x + nx * br.offset * h1, s1.y + ny * br.offset * h1);
          ctx.stroke();
        }
      }
    },
  };
}
