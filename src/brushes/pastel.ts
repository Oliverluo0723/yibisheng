import { rgba } from '../color/nippon';
import { Walker } from './pen';
import { type Brush, lerpSample } from './types';

/**
 * 苔衣：粉彩 / 蠟筆。紙面有一張固定的「紙紋」高低圖，粉只沾在凸起的地方，
 * 所以紙紋會透出來；壓得越重（畫得越慢）、來回越多次，凹處也會慢慢被填滿。
 */
export function createPastelBrush(): Brush {
  const walker = new Walker();
  const params = { coverage: 0.7, tooth: 0.35, alpha: 0.7, speck: 1.4 };
  /** 紙紋：高頻 + 低頻雜訊，同一個位置每次結果一樣 */
  const toothAt = (noise: (x: number, y?: number, z?: number) => number, x: number, y: number) =>
    noise(x * params.tooth, y * params.tooth, 7.7) * 0.7 + noise(x * 0.04, y * 0.04, 3.1) * 0.3;
  return {
    id: 'pastel',
    name: '苔衣',
    note: '粉彩：顆粒感，紙紋會透出來，慢慢塗會越塗越滿',
    params,
    specs: {
      coverage: { label: '覆蓋', min: 0.05, max: 1, step: 0.01 },
      tooth: { label: '紙紋細密', min: 0.05, max: 1.2, step: 0.01 },
      alpha: { label: '濃', min: 0.1, max: 1, step: 0.01 },
      speck: { label: '粉粒大小', min: 0.6, max: 4, step: 0.1 },
    },
    taper: true,
    begin() {
      walker.reset();
    },
    segment(env, a, b) {
      const { ctx } = env;
      ctx.fillStyle = rgba(env.color, params.alpha);
      walker.walk(a.x, a.y, b.x, b.y, 1.5, (t) => {
        const s = lerpSample(a, b, t);
        const r = Math.max(1, s.width * 0.6);
        const k = Math.round(r * r * 0.6);
        const threshold = 0.75 - params.coverage * 0.45 - s.pressure * 0.12;
        for (let i = 0; i < k; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rr = r * Math.sqrt(Math.random());
          const x = s.x + Math.cos(ang) * rr;
          const y = s.y + Math.sin(ang) * rr;
          // 越靠邊越難沾上，邊緣自然毛糙
          const edge = (rr / r) ** 2 * 0.15;
          if (toothAt(env.noise, x, y) > threshold + edge)
            ctx.fillRect(x, y, params.speck, params.speck);
        }
      });
    },
  };
}
