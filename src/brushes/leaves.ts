import { findIslands } from './islands';

/** 一組葉片圖集：顏色圖 + 去背遮罩，加上圖裡葉柄朝哪個方向。 */
export type LeafSet = {
  id: string;
  color: string;
  opacity: string;
  /** 葉柄方向（弧度，畫面座標：0 = 右，π/2 = 下） */
  stemAngle: number;
};

/** 一片切好的葉子。canvas 已經去背，最長邊不超過 maxSize。 */
export type LeafSprite = { canvas: HTMLCanvasElement; stemAngle: number; set: string };

const base = `${import.meta.env.BASE_URL}textures/ambientcg`;
const set = (id: string, stemAngle: number): LeafSet => ({
  id,
  color: `${base}/${id}/color.jpg`,
  opacity: `${base}/${id}/opacity.jpg`,
  stemAngle,
});

/** 素材說明見 public/textures/ambientcg/README.md */
export const LEAF_SETS: LeafSet[] = [
  set('LeafSet030', 0),
  set('LeafSet028', Math.PI),
  set('LeafSet016', Math.PI / 2),
  set('LeafSet024', Math.PI / 2),
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`載入失敗：${src}`));
    img.src = src;
  });
}

function pixels(img: HTMLImageElement): ImageData {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  g.drawImage(img, 0, 0);
  return g.getImageData(0, 0, c.width, c.height);
}

/** 把一組圖集切成一片片去背的葉子。 */
export async function loadLeafSet(s: LeafSet, maxSize = 220): Promise<LeafSprite[]> {
  const [colorImg, opacityImg] = await Promise.all([loadImage(s.color), loadImage(s.opacity)]);
  const col = pixels(colorImg);
  const op = pixels(opacityImg);
  const { width: w, height: h } = op;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = op.data[i * 4] ?? 0;

  const sprites: LeafSprite[] = [];
  for (const r of findIslands(mask, w, h, { cell: 4, minCells: 60, pad: 2 })) {
    const crop = new ImageData(r.w, r.h);
    for (let y = 0; y < r.h; y++) {
      for (let x = 0; x < r.w; x++) {
        const src = ((r.y + y) * w + (r.x + x)) * 4;
        const dst = (y * r.w + x) * 4;
        crop.data[dst] = col.data[src] ?? 0;
        crop.data[dst + 1] = col.data[src + 1] ?? 0;
        crop.data[dst + 2] = col.data[src + 2] ?? 0;
        crop.data[dst + 3] = mask[(r.y + y) * w + (r.x + x)] ?? 0;
      }
    }
    const full = document.createElement('canvas');
    full.width = r.w;
    full.height = r.h;
    (full.getContext('2d') as CanvasRenderingContext2D).putImageData(crop, 0, 0);

    const k = Math.min(1, maxSize / Math.max(r.w, r.h));
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(r.w * k));
    out.height = Math.max(1, Math.round(r.h * k));
    const g = out.getContext('2d') as CanvasRenderingContext2D;
    g.imageSmoothingQuality = 'high';
    g.drawImage(full, 0, 0, out.width, out.height);
    sprites.push({ canvas: out, stemAngle: s.stemAngle, set: s.id });
  }
  return sprites;
}

export async function loadAllLeaves(sets = LEAF_SETS): Promise<LeafSprite[]> {
  const all = await Promise.all(sets.map((s) => loadLeafSet(s)));
  return all.flat();
}
