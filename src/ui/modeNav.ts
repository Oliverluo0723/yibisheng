import './panels.css';

/**
 * 頁面正上方的 ［2D｜2.5D｜3D］：三種模式是各自獨立的頁面，這裡只是連結，
 * 點了直接換頁，不帶任何東西過去。
 */
export type Mode = '2D' | '2.5D' | '3D';

const PAGES: { mode: Mode; path: string; title: string }[] = [
  { mode: '2D', path: 'experiments/02-brushes/index.html', title: '02 筆' },
  { mode: '2.5D', path: 'experiments/03-depth/index.html', title: '03 景深' },
  { mode: '3D', path: 'experiments/04-space/index.html', title: '04 空間' },
];

export function mountModeNav(current: Mode): void {
  const nav = document.createElement('nav');
  nav.className = 'ui-modenav';
  for (const p of PAGES) {
    const a = document.createElement('a');
    a.textContent = p.mode;
    a.title = p.title;
    if (p.mode === current) {
      a.className = 'on';
      a.setAttribute('aria-current', 'page');
    } else {
      a.href = `${import.meta.env.BASE_URL}${p.path}`;
    }
    nav.append(a);
  }
  document.body.append(nav);
}
