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
  /** 每段方向的擾動幅度（弧度） */
  noise: number;
  /** 分枝最深層數 */
  maxDepth: number;
  /** 生命（ms），到了所有芽都停止 */
  life: number;
  /** 從筆觸抽出的起始芽數 */
  tipsPerStroke: number;
  /** 單株同時活著的芽上限 */
  maxTips: number;
};

/** 預設值：使用者第一次試玩的回饋是「太快、長太多」，所以放慢、變少、拉長生命。 */
export const defaultGrowthParams: GrowthParams = {
  speed: 0.03,
  segmentLength: 0.012,
  branchChance: 0.12,
  spread: 0.6,
  noise: 0.35,
  maxDepth: 3,
  life: 9000,
  tipsPerStroke: 4,
  maxTips: 60,
};
