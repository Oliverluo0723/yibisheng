/**
 * 彈簧 + 阻尼筆尖（概念來自 InkField 的技術文件，程式自寫）。
 * 畫筆被滑鼠「拉著走」：速度 += (目標 − 筆) × 彈力；速度 ×= 阻尼；位置 += 速度。
 * 每幀呼叫一次 step()，所以手感和幀率綁在一起（和 InkField 一樣）。
 */
export type PenParams = {
  /** 彈力 0..1：越大越緊跟滑鼠 */
  spring: number;
  /** 阻尼 0..1：越小越快停下、越大越會甩 */
  damping: number;
  /** 基本筆寬（px） */
  size: number;
  /** 速度讓筆變細的程度 0..1 */
  thinning: number;
  /** 視為「最快」的速度（px/幀） */
  maxSpeed: number;
  /** 收筆漸細要幾幀 */
  taperFrames: number;
  /** 筆寬追上目標的速度 0..1（起筆漸粗也靠它） */
  widthEase: number;
};

export const defaultPenParams: PenParams = {
  spring: 0.5,
  damping: 0.5,
  size: 14,
  thinning: 0.6,
  maxSpeed: 40,
  taperFrames: 14,
  widthEase: 0.25,
};

/** 筆尖某一幀的狀態，座標是像素。 */
export type PenSample = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  /** 0 = 很快（輕），1 = 幾乎不動（重） */
  pressure: number;
  /** 這一幀的筆寬（px） */
  width: number;
  /** 從起筆到現在走了多遠（px） */
  dist: number;
  /** 第幾幀 */
  frame: number;
  /** 已經放開滑鼠、正在收筆 */
  lifting: boolean;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export class SpringPen {
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private width = 0;
  private dist = 0;
  private frame = 0;
  private lifting = false;

  constructor(public params: PenParams) {}

  /** 起筆：筆尖放在 (x, y)，從細的開始。 */
  reset(x: number, y: number): PenSample {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = this.params.size * 0.35;
    this.dist = 0;
    this.frame = 0;
    this.lifting = false;
    return this.sample(0);
  }

  /** 放開滑鼠：之後每幀筆寬遞減，直到 done。 */
  lift(): void {
    this.lifting = true;
  }

  get done(): boolean {
    return this.lifting && this.width <= 0.3;
  }

  step(targetX: number, targetY: number): PenSample {
    const p = this.params;
    this.vx = (this.vx + (targetX - this.x) * p.spring) * p.damping;
    this.vy = (this.vy + (targetY - this.y) * p.spring) * p.damping;
    this.x += this.vx;
    this.y += this.vy;
    const speed = Math.hypot(this.vx, this.vy);
    this.dist += speed;
    this.frame++;
    const pressure = 1 - clamp01(speed / Math.max(1e-6, p.maxSpeed));
    if (this.lifting) {
      this.width = Math.max(0, this.width - p.size / Math.max(1, p.taperFrames));
    } else {
      const target = p.size * (1 - p.thinning * (1 - pressure));
      this.width += (target - this.width) * p.widthEase;
    }
    return this.sample(speed, pressure);
  }

  private sample(speed: number, pressure = 1): PenSample {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      speed,
      pressure,
      width: this.width,
      dist: this.dist,
      frame: this.frame,
      lifting: this.lifting,
    };
  }
}

/**
 * 沿著線段等距取點（蓋印章用），跨線段保留餘數，讓間距在整筆上連續。
 * spacing 由呼叫端依當下筆寬決定。
 */
export class Walker {
  private carry = 0;

  reset(): void {
    this.carry = 0;
  }

  /** 對 a→b 之間每個落點呼叫 fn(t)，t ∈ (0, 1] 是線段上的位置。回傳落了幾個點。 */
  walk(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    spacing: number,
    fn: (t: number) => void,
  ): number {
    const len = Math.hypot(bx - ax, by - ay);
    const step = Math.max(0.25, spacing);
    let d = step - this.carry;
    let n = 0;
    while (d <= len) {
      fn(len === 0 ? 1 : d / len);
      n++;
      d += step;
    }
    this.carry = len - (d - step);
    return n;
  }
}
