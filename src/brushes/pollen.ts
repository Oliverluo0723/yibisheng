import { rgba } from '../color/nippon';
import { type Brush, direction, lerpSample } from './types';

/**
 * 落英：點狀飛濺。筆越快灑得越多、越開，而且往前甩；
 * 偶爾一顆大滴帶幾顆衛星點，偶爾一片小花瓣；少數點混進同色盤的其他顏色。
 */
export function createPollenBrush(): Brush {
  let dirPrev = { x: 1, y: 0 };
  const params = { density: 1, scatter: 1, fling: 0.6, dot: 3, petals: 0.12, mixRate: 0.2 };
  return {
    id: 'pollen',
    name: '落英',
    note: '點狀飛濺，筆越快灑得越開',
    params,
    specs: {
      density: { label: '密度', min: 0.1, max: 4, step: 0.05 },
      scatter: { label: '散開', min: 0.1, max: 4, step: 0.05 },
      fling: { label: '往前甩', min: 0, max: 2, step: 0.05 },
      dot: { label: '點大小', min: 0.5, max: 10, step: 0.1 },
      petals: { label: '花瓣比例', min: 0, max: 0.6, step: 0.01 },
      mixRate: { label: '混色', min: 0, max: 1, step: 0.01 },
    },
    taper: true,
    begin() {},
    segment(env, a, b) {
      const { ctx } = env;
      const dir = direction(a, b, dirPrev);
      dirPrev = dir;
      const count = Math.round(
        params.density * (0.6 + b.speed * 0.35) * Math.max(0.3, b.width / 10),
      );
      const pick = () =>
        Math.random() < params.mixRate && env.inks.length > 0
          ? (env.inks[Math.floor(Math.random() * env.inks.length)] ?? env.color)
          : env.color;
      for (let i = 0; i < count; i++) {
        const s = lerpSample(a, b, Math.random());
        const ang = Math.random() * Math.PI * 2;
        const reach = s.width * 0.5 + params.scatter * (2 + s.speed * 1.2) * Math.random() ** 1.6;
        const forward = params.fling * s.speed * Math.random();
        const x = s.x + Math.cos(ang) * reach + dir.x * forward;
        const y = s.y + Math.sin(ang) * reach + dir.y * forward;
        const size = 0.5 + params.dot * Math.random() ** 3;
        const col = pick();
        ctx.fillStyle = rgba(col, 0.55 + Math.random() * 0.4);
        if (Math.random() < params.petals) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.random() * Math.PI);
          ctx.beginPath();
          ctx.ellipse(0, 0, size * 1.6 + 1.5, size * 0.7 + 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          continue;
        }
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        // 大滴帶衛星點
        if (size > params.dot * 0.6 && Math.random() < 0.5) {
          const sats = 2 + Math.floor(Math.random() * 4);
          for (let j = 0; j < sats; j++) {
            const sa = Math.random() * Math.PI * 2;
            const sr = size * (1.5 + Math.random() * 2.5);
            ctx.beginPath();
            ctx.arc(
              x + Math.cos(sa) * sr,
              y + Math.sin(sa) * sr,
              0.4 + Math.random() * size * 0.3,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }
    },
  };
}
