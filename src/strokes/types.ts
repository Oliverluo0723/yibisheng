/** 一個筆觸上的點。x、y 是相對於畫布寬高的比例（0..1）；t 是從這一筆開始經過的毫秒數。 */
export type StrokePoint = { x: number; y: number; t: number };

/** 一筆完整的筆觸。 */
export type Stroke = { id: string; startedAt: number; points: StrokePoint[] };

/** 匯出 / 匯入用的檔案格式。 */
export type StrokeFile = {
  version: 1;
  canvas: { width: number; height: number };
  strokes: Stroke[];
};
