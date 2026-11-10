import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { cursorFrom, defaultPinchParams, nextPinched, type PinchParams, pinchRatio } from './pinch';

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
};

export class HandTracker {
  readonly video: HTMLVideoElement;
  private landmarker?: HandLandmarker;
  private stream?: MediaStream;
  private lastVideoTime = -1;
  readonly state: HandState = { seen: false, pinched: false, x: 0, y: 0, ratio: null };
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
      s.ratio = null;
      return s;
    }
    const ratio = pinchRatio(lm);
    const at = cursorFrom(lm, w, h, this.params);
    s.seen = true;
    s.ratio = ratio;
    s.pinched = nextPinched(s.pinched, ratio, this.params);
    if (at) {
      s.x = at.x;
      s.y = at.y;
    }
    return s;
  }
}
