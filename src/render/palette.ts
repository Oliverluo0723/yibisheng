export type Palette = { paper: string; ink: string[] };

/** 米白紙 + 低飽和的植物色。 */
export const defaultPalette: Palette = {
  paper: '#f3eee4',
  ink: ['#5b6b5a', '#8a7a6a', '#a3b18a', '#b08968', '#6b705c'],
};

/** depth 0 用 ink[0]，之後循環。 */
export function inkFor(palette: Palette, depth: number): string {
  const n = palette.ink.length;
  return palette.ink[((depth % n) + n) % n] ?? palette.paper;
}
