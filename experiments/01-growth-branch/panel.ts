import GUI from 'lil-gui';
import type { GrowthParams } from '../../src/growth/types';
import type { RenderParams } from '../../src/render/paper';

export type PanelState = {
  growth: GrowthParams;
  render: RenderParams;
  sound: { enabled: boolean; volume: number };
};

export type PanelActions = {
  clear(): void;
  exportJson(): void;
  importJson(file: File): void;
  onChange(): void;
};

/** 右上角的 lil-gui 面板：生長、畫面、聲音三組參數，加上清除 / 匯出 / 匯入。 */
export function createPanel(state: PanelState, actions: PanelActions): GUI {
  const gui = new GUI({ title: '01 畫一筆，它會長', width: 280 });

  const g = gui.addFolder('生長');
  g.add(state.growth, 'speed', 0.01, 0.3, 0.005).name('速度');
  g.add(state.growth, 'segmentLength', 0.004, 0.04, 0.001).name('段長');
  g.add(state.growth, 'branchChance', 0, 1, 0.01).name('分岔機率');
  g.add(state.growth, 'spread', 0.1, 2.5, 0.05).name('分岔夾角');
  g.add(state.growth, 'noise', 0, 1.5, 0.05).name('彎曲雜訊');
  g.add(state.growth, 'maxDepth', 1, 8, 1).name('最深層數');
  g.add(state.growth, 'life', 1000, 20000, 250).name('生命 (ms)');
  g.add(state.growth, 'tipsPerStroke', 1, 20, 1).name('起始芽數');
  g.add(state.growth, 'maxTips', 10, 800, 10).name('芽上限');

  const r = gui.addFolder('畫面');
  r.add(state.render, 'grain', 0, 4, 0.1).name('顆粒感');
  r.add(state.render, 'strokeWeight', 0.5, 8, 0.1).name('筆觸粗細');
  r.add(state.render, 'branchWeight', 0.3, 4, 0.1).name('枝條粗細');
  r.add(state.render, 'alpha', 20, 255, 1).name('透明度');

  const s = gui.addFolder('聲音');
  s.add(state.sound, 'enabled').name('開啟');
  s.add(state.sound, 'volume', 0, 1, 0.01).name('音量');

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) actions.importJson(file);
    input.value = '';
  });

  const buttons = {
    清除: () => actions.clear(),
    匯出JSON: () => actions.exportJson(),
    匯入JSON: () => input.click(),
  };
  gui.add(buttons, '清除');
  gui.add(buttons, '匯出JSON').name('匯出 JSON');
  gui.add(buttons, '匯入JSON').name('匯入 JSON');

  gui.onChange(() => actions.onChange());
  return gui;
}
