import { rgba } from '../color/nippon';
import { Walker } from './pen';
import { type Brush, lerpSample } from './types';

/**
 * 洇：水彩暈染。沿路蓋不規則的半透明水漬，填色很淡、邊線稍深，
 * 疊多了就是中間淺、邊緣深的水痕。停住不動時水漬會慢慢擴大。
 * 淺色紙用 multiply（顏色相乘變深），深色底用 screen（變亮像發光）。
 */
export function createBleedBrush(): Brush {
  const walker = new Walker();
  let dwell = 0;
  const params = {
    spread: 2.2,
    fill: 0.045,
    edge: 0.06,
    edgeChance: 0.15,
    wobble: 0.6,
    bloom: 0.5,
  };
  const VERTS = 14;

  function blot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    noise: (x: number, y?: number, z?: number) => number,
  ) {
    const seed = Math.random() * 100;
    const pts: [number, number][] = [];
    for (let i = 0; i < VERTS; i++) {
      const th = (i / VERTS) * Math.PI * 2;
      const n = noise(Math.cos(th) * 1.6 + seed, Math.sin(th) * 1.6 + seed);
      const rr = r * (1 - params.wobble / 2 + params.wobble * n);
      pts.push([x + Math.cos(th) * rr, y + Math.sin(th) * rr]);
    }
    // 經過相鄰點的中點畫二次曲線，邊緣是圓滑的而不是多邊形折角
    const mid = (i: number) => {
      const p = pts[i % VERTS] as [number, number];
      const q = pts[(i + 1) % VERTS] as [number, number];
      return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as const;
    };
    ctx.beginPath();
    const m0 = mid(0);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 1; i <= VERTS; i++) {
      const p = pts[i % VERTS] as [number, number];
      const m = mid(i);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
  }

  return {
    id: 'bleed',
    name: '洇',
    note: '水彩暈染：半透明一層層疊，邊緣比中間深，停住會暈開',
    params,
    specs: {
      spread: { label: '暈開', min: 0.8, max: 5, step: 0.05 },
      fill: { label: '水色', min: 0.01, max: 0.2, step: 0.005 },
      edge: { label: '水痕', min: 0, max: 0.4, step: 0.01 },
      edgeChance: { label: '水痕出現率', min: 0, max: 1, step: 0.01 },
      wobble: { label: '不規則', min: 0, max: 0.9, step: 0.01 },
      bloom: { label: '停住擴散', min: 0, max: 1.5, step: 0.05 },
    },
    taper: true,
    begin() {
      walker.reset();
      dwell = 0;
    },
    segment(env, a, b) {
      const { ctx } = env;
      ctx.save();
      ctx.globalCompositeOperation = env.dark ? 'screen' : 'multiply';
      ctx.lineWidth = 1.1;
      // 深色底用 screen 變亮，同樣透明度看起來淡很多，補濃一點
      const boost = env.dark ? 2.5 : 1;
      const draw = (x: number, y: number, r: number) => {
        // 每團水漬位置、大小都抖一點，避免看起來像一串圓圈
        const jr = r * (0.75 + Math.random() * 0.5);
        const ja = Math.random() * Math.PI * 2;
        const jd = r * 0.3 * Math.random();
        blot(ctx, x + Math.cos(ja) * jd, y + Math.sin(ja) * jd, jr, env.noise);
        ctx.fillStyle = rgba(env.color, params.fill * boost);
        ctx.fill();
        if (Math.random() < params.edgeChance) {
          ctx.strokeStyle = rgba(env.color, params.edge * boost);
          ctx.stroke();
        }
      };
      const n = walker.walk(a.x, a.y, b.x, b.y, Math.max(2, b.width * 0.7), (t) => {
        const s = lerpSample(a, b, t);
        draw(s.x, s.y, (s.width / 2) * params.spread * (0.7 + 0.3 * s.pressure));
      });
      if (n === 0 && b.speed < 1 && !b.lifting) {
        dwell = Math.min(dwell + 1, 240);
        if (params.bloom > 0 && dwell % 3 === 0) {
          draw(
            b.x,
            b.y,
            (b.width / 2) * params.spread * (1 + params.bloom * Math.sqrt(dwell / 30)),
          );
        }
      } else {
        dwell = Math.max(0, dwell - 4);
      }
      ctx.restore();
    },
  };
}
