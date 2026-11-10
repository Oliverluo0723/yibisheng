import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { extendedFingers } from './fingers';
import {
  cursorFrom,
  defaultPinchParams,
  isOpenPalm,
  nextPinched,
  type PinchParams,
  palmCenter,
  pinchRatio,
} from './pinch';

/**
 * 網路攝影機手勢追蹤（MediaPipe Hand Landmarker）。影像只在瀏覽器裡處理，不會上傳。
 * 草稿階段：WASM 從 jsDelivr、模型從 Google 官方網址載入（版本固定），所以第一次要連網。
 */
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm';
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type HandState = {
  /** 有看到手 */
  seen: boolean;
  /** 捏著（= 下筆） */
  pinched: boolean;
  /** 螢幕座標 */
  x: number;
  y: number;
  /** 捏合比例（除錯 / 調門檻用） */
  ratio: number | null;
  /** 張開手掌（= 轉向） */
  open: boolean;
  /** 手掌中心，鏡像後 0..1 */
  palmX: number;
  palmY: number;
  /** 這一格伸直的手指數（不含拇指）；沒看到手是 null */
  fingers: number | null;
};

/** 連續幾格判定一致才切換「張開手掌」，避免一閃一閃 */
const OPEN_FRAMES = 3;

export class HandTracker {
  readonly video: HTMLVideoElement;
  private landmarker?: HandLandmarker;
  private stream?: MediaStream;
  private lastVideoTime = -1;
  readonly state: HandState = {
    seen: false,
    pinched: false,
    x: 0,
    y: 0,
    ratio: null,
    open: false,
    palmX: 0.5,
    palmY: 0.5,
    fingers: null,
  };
  private openVotes = 0;
  params: PinchParams = { ...defaultPinchParams };

  constructor() {
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
  }

  get running(): boolean {
    return this.stream !== undefined;
  }

  /** 開相機、載模型。失敗會丟出中文錯誤訊息。 */
  async start(): Promise<void> {
    if (this.running) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('這個瀏覽器不支援攝影機');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      throw new Error(
        name === 'NotAllowedError'
          ? '攝影機權限被拒絕（可以在網址列左邊的鎖頭重新允許）'
          : '打不開攝影機',
      );
    }
    this.video.srcObject = this.stream;
    await this.video.play();
    if (!this.landmarker) {
      const fileset = await FilesetResolver.forVisionTasks(WASM);
      this.landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    }
  }

  stop(): void {
    for (const t of this.stream?.getTracks() ?? []) t.stop();
    this.stream = undefined;
    this.video.srcObject = null;
    this.state.seen = false;
    this.state.pinched = false;
    this.state.open = false;
    this.state.fingers = null;
  }

  /** 每幀呼叫；同一格影像不重算 */
  update(nowMs: number, w: number, h: number): HandState {
    const s = this.state;
    if (!this.landmarker || !this.running || this.video.readyState < 2) return s;
    if (this.video.currentTime === this.lastVideoTime) return s;
    this.lastVideoTime = this.video.currentTime;
    const result = this.landmarker.detectForVideo(this.video, nowMs);
    const lm = result.landmarks[0];
    if (!lm) {
      s.seen = false;
      s.pinched = false;
      s.open = false;
      s.ratio = null;
      s.fingers = null;
      this.openVotes = 0;
      return s;
    }
    const ratio = pinchRatio(lm);
    const at = cursorFrom(lm, w, h, this.params);
    s.seen = true;
    s.ratio = ratio;
    s.pinched = nextPinched(s.pinched, ratio, this.params);
    // 張開手掌：連續 OPEN_FRAMES 格一致才切換；捏著時一定不是
    const openNow = !s.pinched && isOpenPalm(lm, this.params);
    this.openVotes = openNow
      ? Math.min(OPEN_FRAMES, this.openVotes + 1)
      : Math.max(-OPEN_FRAMES, this.openVotes - 1);
    if (this.openVotes >= OPEN_FRAMES) s.open = true;
    else if (this.openVotes <= -OPEN_FRAMES || s.pinched) s.open = false;
    s.fingers = extendedFingers(lm);
    const pc = palmCenter(lm);
    if (pc) {
      s.palmX = pc.x;
      s.palmY = pc.y;
    }
    if (at) {
      s.x = at.x;
      s.y = at.y;
    }
    return s;
  }
}
