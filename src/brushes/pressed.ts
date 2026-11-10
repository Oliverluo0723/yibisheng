import { type RGB, rgba } from '../color/nippon';
import type { LeafSprite } from './leaves';
import { Walker } from './pen';
import { type Brush, direction, lerpSample } from './types';

/**
 * 押花：沿著筆畫一條細莖，兩側交錯蓋上真實的葉片照片（CC0 素材），
 * 葉柄朝向莖、葉尖朝外。畫得慢葉子大，畫得快葉子小而稀。
 * 葉片可以染上一點目前的顏色，帶淡淡的陰影像壓在紙上。
 */
/** 染色後的葉片快取，所有押花筆（包含每支分枝各自的筆）共用 */
const tintCache = new Map<string, HTMLCanvasElement>();

export function createPressedBrush(): Brush {
  const walker = new Walker();
  let side = 1;
  let dirPrev = { x: 1, y: 0 };
  const params = { leafSize: 1, spacing: 1, angle: 55, tint: 0.25, stem: 1, shadow: 0.18, sets: 0 };

  function tinted(leaf: LeafSprite, index: number, color: RGB): HTMLCanvasElement {
    if (params.tint <= 0) return leaf.canvas;
    const key = `${index}|${color.r},${color.g},${color.b}|${params.tint}`;
    const hit = tintCache.get(key);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = leaf.canvas.width;
    c.height = leaf.canvas.height;
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.drawImage(leaf.canvas, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = rgba(color, params.tint);
    g.fillRect(0, 0, c.width, c.height);
    if (tintCache.size > 400) tintCache.clear();
    tintCache.set(key, c);
    return c;
  }

  return {
    id: 'pressed',
    name: '押花',
    note: '沿路蓋上真實葉片的紋理，順著筆的方向',
    params,
    specs: {
      leafSize: { label: '葉大小', min: 0.3, max: 3, step: 0.05 },
      spacing: { label: '間距', min: 0.3, max: 3, step: 0.05 },
      angle: { label: '張角', min: 0, max: 90, step: 1 },
      tint: { label: '染色', min: 0, max: 1, step: 0.01 },
      stem: { label: '莖粗', min: 0, max: 4, step: 0.1 },
      shadow: { label: '陰影', min: 0, max: 0.5, step: 0.01 },
      sets: { label: '葉種（0=全部）', min: 0, max: 4, step: 1 },
    },
    taper: true,
    begin() {
      walker.reset();
      side = Math.random() < 0.5 ? 1 : -1;
    },
    segment(env, a, b) {
      const { ctx } = env;
      const dir = direction(a, b, dirPrev);
      dirPrev = dir;
      if (params.stem > 0) {
        ctx.strokeStyle = rgba(env.color, 0.85);
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(0.4, b.width * 0.08 * params.stem);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      const setIds = [...new Set(env.leaves.map((l) => l.set))];
      const chosen = params.sets > 0 ? setIds[Math.round(params.sets) - 1] : undefined;
      const pool = chosen ? env.leaves.filter((l) => l.set === chosen) : env.leaves;
      if (pool.length === 0 || b.lifting) return;
      const base = 3.2 * params.leafSize;
      walker.walk(a.x, a.y, b.x, b.y, Math.max(6, b.width * base * 0.55 * params.spacing), (t) => {
        const s = lerpSample(a, b, t);
        const index = Math.floor(Math.random() * pool.length);
        const leaf = pool[index] as LeafSprite;
        const img = tinted(leaf, env.leaves.indexOf(leaf), env.color);
        const longest = Math.max(img.width, img.height);
        const len = s.width * base * (0.7 + Math.random() * 0.5) * (0.6 + 0.4 * s.pressure);
        const k = len / longest;
        const w = img.width * k;
        const h = img.height * k;
        const tip =
          Math.atan2(dir.y, dir.x) +
          side * ((params.angle * Math.PI) / 180) +
          (Math.random() - 0.5) * 0.4;
        // 圖上葉柄方向要轉到「指回莖」= tip + π
        const rot = tip + Math.PI - leaf.stemAngle;
        // 葉子沿葉柄軸的長度，用來把葉柄端貼在莖上
        const along =
          Math.abs(w * Math.cos(leaf.stemAngle)) + Math.abs(h * Math.sin(leaf.stemAngle));
        const cx = s.x + Math.cos(tip) * along * 0.45;
        const cy = s.y + Math.sin(tip) * along * 0.45;
        ctx.save();
        if (params.shadow > 0 && !env.dark) {
          ctx.shadowColor = `rgba(40,30,20,${params.shadow})`;
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1.5;
          ctx.shadowOffsetY = 2;
        }
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
        side = -side;
      });
    },
  };
}
