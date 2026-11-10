import { rgba } from '../color/nippon';
import type { Brush } from './types';

/**
 * 色紙：麥克筆 / 平筆。扁平的斜切筆頭，橫著走粗、順著筆頭走細（像書法平筆）。
 * 整筆先不透明地畫在暫存層，放開後才以半透明疊上去：同一筆自己不會疊深，
 * 但和別筆重疊的地方會變深（淺色紙 multiply）或變亮（深色底 screen）。
 */
export function createMarkerBrush(): Brush {
  const params = { nib: 2.2, angle: -45, alpha: 0.55 };
  const brush: Brush = {
    id: 'marker',
    name: '色紙',
    note: '麥克筆：硬邊、扁平、半透明，重疊處變深',
    params,
    specs: {
      nib: { label: '筆頭寬', min: 0.5, max: 6, step: 0.05 },
      angle: { label: '筆頭角度', min: -90, max: 90, step: 1 },
      alpha: { label: '透明度', min: 0.1, max: 1, step: 0.01 },
    },
    buffered: { alpha: params.alpha },
    taper: false,
    begin() {
      if (brush.buffered) brush.buffered.alpha = params.alpha;
    },
    segment(env, a, b) {
      const { ctx } = env;
      // 筆寬固定，不吃速度
      const half = (env.size * params.nib) / 2;
      const th = (params.angle * Math.PI) / 180;
      const ux = Math.cos(th) * half;
      const uy = Math.sin(th) * half;
      ctx.fillStyle = rgba(env.color, 1);
      ctx.strokeStyle = rgba(env.color, 1);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x - ux, a.y - uy);
      ctx.lineTo(a.x + ux, a.y + uy);
      ctx.lineTo(b.x + ux, b.y + uy);
      ctx.lineTo(b.x - ux, b.y - uy);
      ctx.closePath();
      ctx.fill();
      // 線段接縫處補一條筆頭，避免轉彎處缺角
      ctx.beginPath();
      ctx.moveTo(b.x - ux, b.y - uy);
      ctx.lineTo(b.x + ux, b.y + uy);
      ctx.stroke();
    },
  };
  return brush;
}
