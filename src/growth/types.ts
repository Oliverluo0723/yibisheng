/** 一小段枝條。座標是畫布比例（0..1）；born 是這段長出來時的植物年齡（ms）。 */
export type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
  born: number;
};

/** 生長過程中發生的事件，給聲音和其他模組用。 */
export type GrowthEvent = {
  kind: 'branch' | 'leaf';
  x: number;
  y: number;
  depth: number;
  age: number;
};

export type GrowthParams = {
  /** 生長速度，比例單位 / 秒 */
  speed: number;
  /** 每一段的長度（比例單位） */
  segmentLength: number;
  /** 每長一段分岔的機率 */
  branchChance: number;
  /** 分岔夾角（弧度） */
  spread: number;
  /** 每段方向的擾動幅度（弧度）：越大越彎、越亂 */
  noise: number;
  /** 分枝最深層數 */
  maxDepth: number;
  /** 生命（ms），到了所有芽都停止 */
  life: number;
  /** 從筆觸抽出的起始芽數 */
  tipsPerStroke: number;
  /** 單株同時活著的芽上限 */
  maxTips: number;
  /** 向光：0 完全不管方向，1 每根芽都很快轉向光 */
  tropism: number;
  /** 光的方向（弧度，螢幕座標 y 朝下，所以 -π/2 是正上方） */
  lightAngle: number;
  /** 每根芽自己的固定偏轉（弧度 / 秒），讓有的芽往左捲、有的往右捲 */
  curl: number;
  /** 分岔時主幹拿走夾角的比例：0 主幹直直走、側枝斜出去；0.5 對稱 Y 字 */
  apical: number;
  /** 主幹（第 0 層）一根芽能長多遠（比例單位），到了會慢下來、收尾、停 */
  reach: number;
  /** 每深一層，能長多遠乘以這個數 */
  reachDecay: number;
  /** 起始芽方向偏離法線的隨機幅度（弧度） */
  seedJitter: number;
};

/**
 * 預設值。第一輪回饋「太快、長太多」所以放慢、變少；
 * 第二輪回饋「沒有往上／往光的傾向、要更多隨機感」所以加了向光、捲、主從、各自收尾。
 */
export const defaultGrowthParams: GrowthParams = {
  speed: 0.03,
  segmentLength: 0.012,
  branchChance: 0.12,
  spread: 0.7,
  noise: 0.45,
  maxDepth: 3,
  life: 9000,
  tipsPerStroke: 4,
  maxTips: 60,
  tropism: 0.5,
  lightAngle: -Math.PI / 2,
  curl: 0.35,
  apical: 0.2,
  reach: 0.22,
  reachDecay: 0.65,
  seedJitter: 0.6,
};
