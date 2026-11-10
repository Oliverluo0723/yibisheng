import type { Stroke, StrokeFile } from './types';

export function toFile(strokes: Stroke[], canvas: { width: number; height: number }): StrokeFile {
  return { version: 1, canvas: { width: canvas.width, height: canvas.height }, strokes };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** 驗證匯入的 JSON；格式錯或版本不對時丟出帶訊息的 Error。 */
export function fromFile(json: unknown): StrokeFile {
  if (typeof json !== 'object' || json === null) throw new Error('stroke file: not an object');
  const obj = json as Record<string, unknown>;
  if (obj.version !== 1) throw new Error(`stroke file: unsupported version ${String(obj.version)}`);
  const canvas = obj.canvas as Record<string, unknown> | undefined;
  if (!canvas || !isNum(canvas.width) || !isNum(canvas.height)) {
    throw new Error('stroke file: missing canvas size');
  }
  if (!Array.isArray(obj.strokes)) throw new Error('stroke file: strokes must be an array');
  for (const s of obj.strokes as Record<string, unknown>[]) {
    if (typeof s?.id !== 'string' || !isNum(s.startedAt) || !Array.isArray(s.points)) {
      throw new Error('stroke file: malformed stroke');
    }
    for (const p of s.points as Record<string, unknown>[]) {
      if (!isNum(p?.x) || !isNum(p.y) || !isNum(p.t))
        throw new Error('stroke file: malformed point');
    }
  }
  return {
    version: 1,
    canvas: { width: canvas.width, height: canvas.height },
    strokes: obj.strokes as Stroke[],
  };
}
