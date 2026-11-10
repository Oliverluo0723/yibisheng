import GUI from 'lil-gui';
import type { Brush } from '../../src/brushes';
import type { PenParams } from '../../src/brushes/pen';

export type PanelActions = {
  selectBrush(i: number): void;
  clear(): void;
  undo(): void;
  save(): void;
};

/** 右上角面板：筆尖物理（所有筆共用）+ 目前這支筆自己的參數。 */
export function createPanel(pen: PenParams, brushes: Brush[], actions: PanelActions) {
  const gui = new GUI({ title: '02 筆', width: 270 });
  const sel = { brush: 0 };
  const options = Object.fromEntries(brushes.map((b, i) => [`${i + 1} ${b.name}`, i]));
  const brushCtl = gui
    .add(sel, 'brush', options)
    .name('筆')
    .onChange((i: number) => actions.selectBrush(i));

  const f = gui.addFolder('筆尖（共用）');
  f.add(pen, 'size', 2, 60, 0.5).name('粗細');
  f.add(pen, 'spring', 0.05, 1, 0.01).name('彈力');
  f.add(pen, 'damping', 0.05, 0.95, 0.01).name('阻尼');
  f.add(pen, 'thinning', 0, 1, 0.01).name('快則細');
  f.add(pen, 'maxSpeed', 5, 120, 1).name('最快速度');
  f.add(pen, 'taperFrames', 1, 60, 1).name('收筆幀數');
  f.add(pen, 'widthEase', 0.02, 1, 0.01).name('筆寬反應');
  f.close();

  let folder: GUI | undefined;
  function showBrush(i: number) {
    const b = brushes[i];
    if (!b) return;
    sel.brush = i;
    brushCtl.updateDisplay();
    folder?.destroy();
    folder = gui.addFolder(`${b.name}：${b.note}`);
    for (const [key, spec] of Object.entries(b.specs)) {
      folder.add(b.params, key, spec.min, spec.max, spec.step).name(spec.label);
    }
  }

  const buttons = {
    clear: () => actions.clear(),
    undo: () => actions.undo(),
    save: () => actions.save(),
  };
  gui.add(buttons, 'undo').name('復原 (Z)');
  gui.add(buttons, 'save').name('存圖 PNG (S)');
  gui.add(buttons, 'clear').name('清空 (C)');

  showBrush(0);
  return { gui, showBrush };
}
