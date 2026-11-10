/**
 * 鏡頭繞注視點轉（純計算）。offset = 鏡頭位置 − 注視點，y 朝上。
 * yaw > 0：繞 +Y 轉（從上往下看，鏡頭逆時針走 = 植物看起來順時針轉）。
 * pitch > 0：鏡頭往上抬（從上面看下來），但離正上方、正下方至少 margin 弧度。
 */
export type Vec = { x: number; y: number; z: number };

function rotateAround(v: Vec, k: Vec, a: number): Vec {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const d = k.x * v.x + k.y * v.y + k.z * v.z;
  const cx = k.y * v.z - k.z * v.y;
  const cy = k.z * v.x - k.x * v.z;
  const cz = k.x * v.y - k.y * v.x;
  return {
    x: v.x * c + cx * s + k.x * d * (1 - c),
    y: v.y * c + cy * s + k.y * d * (1 - c),
    z: v.z * c + cz * s + k.z * d * (1 - c),
  };
}

export function orbitOffset(offset: Vec, yaw: number, pitch: number, margin: number): Vec {
  let o = yaw !== 0 ? rotateAround(offset, { x: 0, y: 1, z: 0 }, yaw) : { ...offset };
  if (pitch !== 0) {
    const r = Math.hypot(o.x, o.y, o.z);
    if (r < 1e-9) return o;
    const polar = Math.acos(Math.max(-1, Math.min(1, o.y / r)));
    const next = Math.max(margin, Math.min(Math.PI - margin, polar - pitch));
    // 水平方向的單位向量；鏡頭在正上方時沒有水平分量，就不俯仰
    const h = Math.hypot(o.x, o.z);
    if (h < 1e-9) return o;
    const hx = o.x / h;
    const hz = o.z / h;
    o = { x: hx * r * Math.sin(next), y: r * Math.cos(next), z: hz * r * Math.sin(next) };
  }
  return o;
}
