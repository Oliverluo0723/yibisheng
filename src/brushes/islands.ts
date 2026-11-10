export type Rect = { x: number; y: number; w: number; h: number };

/**
 * 在遮罩裡找出一塊塊相連的區域（8 連通），回傳每塊的外框。
 * 為了快，先把遮罩切成 cell×cell 的格子，格子內只要有一點超過門檻就算「有」；
 * 這樣細細的葉柄也不會斷掉。
 *
 * @param mask 每像素一個值 0..255，長度 width*height
 * @param minCells 小於這麼多格的雜點丟掉
 */
export function findIslands(
  mask: ArrayLike<number>,
  width: number,
  height: number,
  { threshold = 128, cell = 4, minCells = 40, pad = 2 } = {},
): Rect[] {
  const gw = Math.ceil(width / cell);
  const gh = Math.ceil(height / cell);
  const grid = new Uint8Array(gw * gh);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / cell) * gw;
    for (let x = 0; x < width; x++) {
      if ((mask[y * width + x] ?? 0) > threshold) grid[row + Math.floor(x / cell)] = 1;
    }
  }

  const seen = new Uint8Array(gw * gh);
  const rects: Rect[] = [];
  const stack: number[] = [];
  for (let start = 0; start < grid.length; start++) {
    if (!grid[start] || seen[start]) continue;
    let minX = gw;
    let minY = gh;
    let maxX = -1;
    let maxY = -1;
    let count = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length > 0) {
      const i = stack.pop() as number;
      const gx = i % gw;
      const gy = (i - gx) / gw;
      count++;
      if (gx < minX) minX = gx;
      if (gx > maxX) maxX = gx;
      if (gy < minY) minY = gy;
      if (gy > maxY) maxY = gy;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const j = ny * gw + nx;
          if (grid[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
    }
    if (count < minCells) continue;
    const x = Math.max(0, minX * cell - pad);
    const y = Math.max(0, minY * cell - pad);
    rects.push({
      x,
      y,
      w: Math.min(width, (maxX + 1) * cell + pad) - x,
      h: Math.min(height, (maxY + 1) * cell + pad) - y,
    });
  }
  return rects;
}
