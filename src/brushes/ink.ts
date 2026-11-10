import { mix, rgba } from '../color/nippon';
import { Walker } from './pen';
import { type Brush, lerpSample } from './types';

/**
 * 宿墨：毛筆。很淡的圓點一顆顆疊，慢的地方疊得多就濃、快的地方細而淡；
 * 停筆時原地繼續滴墨（會暈開變濃）；邊緣灑一點纖維，偶爾有宿墨的墨渣。
 */
export function createInkBrush(): Brush {
  const walker = new Walker();
  const params = { alpha: 0.22, fiber: 0.6, dregs: 0.25, pool: 0.5 };
  return {
    id: 'ink',
    name: '宿墨',
    note: '毛筆：越快越細越淡，停筆墨會積，收筆尖',
    params,
    specs: {
      alpha: { label: '墨濃', min: 0.03, max: 0.5, step: 0.01 },
      fiber: { label: '毛邊', min: 0, max: 2, step: 0.05 },
      dregs: { label: '墨渣', min: 0, max: 1, step: 0.05 },
      pool: { label: '停筆積墨', min: 0, max: 1, step: 0.05 },
    },
    taper: true,
    begin() {
      walker.reset();
    },
    segment(env, a, b) {
      const { ctx } = env;
      const dark = mix(env.color, { r: 0, g: 0, b: 0 }, 0.45);
      const stamp = (x: number, y: number, w: number, pressure: number, alphaScale: number) => {
        const r = Math.max(0.3, w / 2);
        const al = params.alpha * (0.6 + 0.4 * pressure) * alphaScale;
        ctx.fillStyle = rgba(env.color, al);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        // 毛邊：邊緣的細纖維
        const fibers = Math.round(params.fiber * 3);
        for (let i = 0; i < fibers; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rr = r * (0.85 + Math.random() * 0.3);
          ctx.fillStyle = rgba(env.color, al * 1.5);
          ctx.fillRect(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, 0.8, 0.8);
        }
        // 墨渣：偶爾一顆較深的小點
        if (Math.random() < params.dregs * 0.08) {
          const ang = Math.random() * Math.PI * 2;
          const rr = r * Math.random() * 0.8;
          ctx.fillStyle = rgba(dark, 0.5);
          ctx.beginPath();
          ctx.arc(
            x + Math.cos(ang) * rr,
            y + Math.sin(ang) * rr,
            0.5 + Math.random() * 1.2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      };
      const n = walker.walk(a.x, a.y, b.x, b.y, Math.max(0.6, b.width * 0.12), (t) => {
        const s = lerpSample(a, b, t);
        stamp(s.x, s.y, s.width, s.pressure, 1);
      });
      // 幾乎沒動：原地積墨，筆寬略微擴張
      if (n === 0 && b.speed < 1 && !b.lifting && params.pool > 0) {
        stamp(b.x, b.y, b.width * (1 + params.pool * 0.3), 1, params.pool);
      }
    },
  };
}
