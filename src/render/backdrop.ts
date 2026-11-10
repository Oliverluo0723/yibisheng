/**
 * 背景：一張圖片或一段影片，鋪滿畫布（cover，裁掉多的部分，不變形）。
 * 每幀畫一次，影片才會動。
 */
export type BackdropKind = 'image' | 'video';

export type Backdrop = {
  kind: BackdropKind;
  name: string;
  el: HTMLImageElement | HTMLVideoElement;
  /** 用 URL.createObjectURL 建的（使用者拖進來的檔案），換掉時要 revoke */
  objectUrl?: string;
};

export type BackdropParams = {
  /** 蓋在背景上的紙色紗，0 = 原圖，1 = 幾乎全是紙 */
  veil: number;
  /** 褪色 0..1（降低飽和度） */
  fade: number;
  /** 亮度倍數，1 = 原本 */
  brightness: number;
  /** 模糊（px） */
  blur: number;
  /** 筆畫疊上背景的方式 */
  blend: 'source-over' | 'multiply' | 'screen';
};

export const defaultBackdropParams: BackdropParams = {
  veil: 0.35,
  fade: 0.3,
  brightness: 1,
  blur: 0,
  blend: 'source-over',
};

/** 把來源圖（sw×sh）裁成能鋪滿目標（dw×dh）且不變形的那一塊，置中。 */
export function coverRect(sw: number, sh: number, dw: number, dh: number) {
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return { sx: 0, sy: 0, sw: 0, sh: 0 };
  const scale = Math.max(dw / sw, dh / sh);
  const cw = dw / scale;
  const ch = dh / scale;
  return { sx: (sw - cw) / 2, sy: (sh - ch) / 2, sw: cw, sh: ch };
}

/** Canvas 2D 的 filter 字串。 */
export function filterFor(p: BackdropParams): string {
  const parts: string[] = [];
  if (p.fade > 0) parts.push(`saturate(${Math.max(0, 1 - p.fade).toFixed(3)})`);
  if (p.brightness !== 1) parts.push(`brightness(${p.brightness.toFixed(3)})`);
  if (p.blur > 0) parts.push(`blur(${p.blur.toFixed(1)}px)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}

export function mediaSize(b: Backdrop): { w: number; h: number } {
  if (b.el instanceof HTMLVideoElement) return { w: b.el.videoWidth, h: b.el.videoHeight };
  return { w: b.el.naturalWidth, h: b.el.naturalHeight };
}

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  b: Backdrop,
  w: number,
  h: number,
  p: BackdropParams,
): void {
  const { w: mw, h: mh } = mediaSize(b);
  if (mw === 0 || mh === 0) return; // 影片還沒載入第一格
  const r = coverRect(mw, mh, w, h);
  ctx.save();
  ctx.filter = filterFor(p);
  // 模糊時邊緣會透出底色，多畫出去一點蓋住
  const pad = p.blur * 2;
  ctx.drawImage(b.el, r.sx, r.sy, r.sw, r.sh, -pad, -pad, w + pad * 2, h + pad * 2);
  ctx.restore();
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true; // 作品自己有聲音；而且瀏覽器只允許靜音影片自動播放
    v.loop = true;
    v.playsInline = true;
    v.crossOrigin = 'anonymous';
    v.preload = 'auto';
    v.onloadeddata = () => {
      void v.play().catch(() => {});
      resolve(v);
    };
    v.onerror = () => reject(new Error(`影片載入失敗（瀏覽器可能不支援這個格式）：${src}`));
    v.src = src;
  });
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`圖片載入失敗：${src}`));
    img.src = src;
  });
}

export async function loadBackdrop(
  src: string,
  kind: BackdropKind,
  name: string,
): Promise<Backdrop> {
  const el = kind === 'video' ? await loadVideo(src) : await loadImg(src);
  return { kind, name, el };
}

/** 從使用者拖進來（或選擇）的檔案建立背景。 */
export async function backdropFromFile(file: File): Promise<Backdrop> {
  const kind: BackdropKind | null = file.type.startsWith('video/')
    ? 'video'
    : file.type.startsWith('image/')
      ? 'image'
      : null;
  if (!kind) throw new Error(`不是圖片或影片：${file.name}（${file.type || '未知格式'}）`);
  const url = URL.createObjectURL(file);
  try {
    const b = await loadBackdrop(url, kind, file.name);
    return { ...b, objectUrl: url };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/** 換掉背景前呼叫：停影片、釋放檔案。 */
export function disposeBackdrop(b: Backdrop | undefined): void {
  if (!b) return;
  if (b.el instanceof HTMLVideoElement) {
    b.el.pause();
    b.el.removeAttribute('src');
    b.el.load();
  }
  if (b.objectUrl) URL.revokeObjectURL(b.objectUrl);
}
