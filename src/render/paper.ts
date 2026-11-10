import type p5 from 'p5';
import type { Segment } from '../growth/types';
import type { Stroke } from '../strokes/types';
import type { Palette } from './palette';

export type RenderParams = {
  /** 線條抖動幅度（px），做出顆粒感 */
  grain: number;
  /** 使用者筆觸的線寬（px） */
  strokeWeight: number;
  /** 分枝 depth 0 的線寬（px），之後每層 ×0.85 */
  branchWeight: number;
  /** 線條透明度 0..255 */
  alpha: number;
};

export const defaultRenderParams: RenderParams = {
  grain: 1.2,
  strokeWeight: 3,
  branchWeight: 1.4,
  alpha: 140,
};

const PASSES = 3;

/** 填底色並撒上淡色小點，做出紙張質感。 */
export function drawPaper(g: p5.Graphics, palette: Palette, grainDots: number): void {
  g.push();
  g.background(palette.paper);
  g.noStroke();
  const c = g.color(palette.ink[1] ?? palette.paper);
  const [r, gr, b] = [g.red(c), g.green(c), g.blue(c)];
  for (let i = 0; i < grainDots; i++) {
    g.fill(r, gr, b, 10 + Math.random() * 14);
    g.circle(Math.random() * g.width, Math.random() * g.height, 0.6 + Math.random() * 1.2);
  }
  g.pop();
}

/** 把一條線畫成幾次帶抖動的淡線，疊出顆粒感。座標已是像素。 */
function grainyLine(
  g: p5.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  weight: number,
  params: RenderParams,
): void {
  const c = g.color(color);
  c.setAlpha(params.alpha / PASSES + 20);
  g.stroke(c);
  g.strokeWeight(weight);
  for (let i = 0; i < PASSES; i++) {
    const j = () => (Math.random() * 2 - 1) * params.grain;
    g.line(x1 + j(), y1 + j(), x2 + j(), y2 + j());
  }
}

/** 畫使用者的筆觸（比例座標 → 像素）。 */
export function drawStroke(g: p5.Graphics, s: Stroke, color: string, params: RenderParams): void {
  g.push();
  g.strokeCap(g.ROUND);
  for (let i = 1; i < s.points.length; i++) {
    const a = s.points[i - 1] as (typeof s.points)[number];
    const b = s.points[i] as (typeof s.points)[number];
    grainyLine(
      g,
      a.x * g.width,
      a.y * g.height,
      b.x * g.width,
      b.y * g.height,
      color,
      params.strokeWeight,
      params,
    );
  }
  if (s.points.length === 1) {
    const p = s.points[0] as (typeof s.points)[number];
    g.noStroke();
    g.fill(color);
    g.circle(p.x * g.width, p.y * g.height, params.strokeWeight);
  }
  g.pop();
}

/** 畫一段枝條，線寬隨 depth 遞減。 */
export function drawSegment(
  g: p5.Graphics,
  seg: Segment,
  color: string,
  params: RenderParams,
): void {
  const weight = Math.max(0.5, params.branchWeight * 0.85 ** seg.depth);
  g.push();
  g.strokeCap(g.ROUND);
  grainyLine(
    g,
    seg.x1 * g.width,
    seg.y1 * g.height,
    seg.x2 * g.width,
    seg.y2 * g.height,
    color,
    weight,
    params,
  );
  g.pop();
}
