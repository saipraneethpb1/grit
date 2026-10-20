/**
 * Ryvora palettes. Dark: charcoal surfaces, sand text, one violet accent, from
 * the brand sheet (Violet #8B7CFF, Charcoal #0E0F16, Sand #E9EAF0). Light: the
 * same structure on near-white surfaces with a deeper violet so it still
 * carries meaning. The accent is used sparingly — actions, progress and the
 * active state. Every text/surface pairing in both palettes clears WCAG AA
 * (4.5:1), including `onAccent` labels on the violet fill.
 *
 * `colors` is the live palette. It is mutated in place by `applyColorScheme`,
 * and the root remounts the tree when the scheme changes, so anything that
 * reads `colors` (or `theme.colors`) during render picks up the new values.
 * Style sheets built from it must use `themed()` (constants/themed.ts) so they
 * rebuild too.
 */

export type ColorScheme = 'light' | 'dark';

export const darkColors = {
  /** Charcoal. */
  background: '#0e0f16',
  /** Cards and inputs. */
  surface: '#151722',
  /** Raised surface inside a card (chips, number tiles). */
  surfaceRaised: '#1c1f2c',
  /** Violet-tinted card (today's session, cues, program volume). */
  surfaceTint: '#17162b',
  border: '#232636',
  borderStrong: '#363a4f',
  /** Border for violet-tinted cards. */
  borderTint: '#352f66',
  /** Rules between list rows. */
  divider: '#1e2131',
  /** Progress tracks and number tiles. */
  track: '#262a3b',

  /** Sand. */
  text: '#e9eaf0',
  textSecondary: '#cfd1dc',
  textMuted: '#a0a3b5',
  textDim: '#9093a7',
  textFaint: '#858899',

  /** Label colour on a filled violet. */
  onAccent: '#0e0f16',
  /** Violet. */
  accent: '#8b7cff',
  /** Second stop of the accent gradient. */
  accentWarm: '#a89dff',
  /** Pressed state of a filled accent. */
  accentBright: '#9d90ff',
  /** Label colour on an outlined primary action. */
  accentText: '#b6adff',
  accentTextStrong: '#dcd7ff',
  /** Kickers and completed marks. */
  accentDeep: '#a194ff',
  /** Hover borders and glows. */
  accentDim: '#5a4fc2',
  /** Selected fills. */
  accentSoft: '#231f47',
  /** Translucent accent for the glow behind hero cards. */
  accentGlow: 'rgba(139, 124, 255, 0.14)',
  /** Productive-band wash behind volume bars. */
  accentBand: 'rgba(139, 124, 255, 0.22)',

  backdrop: 'rgba(6, 7, 12, 0.88)',
  /** Rose, so destructive actions never read as the violet accent. */
  danger: '#ff6f91',
  dangerSoft: 'rgba(255, 111, 145, 0.12)',
  /** Coach and status tones. */
  success: '#7ee0a3',
  warning: '#ffb35c',
  warningBorder: '#5a4220',
  info: '#7cc7ff',

  /** Training heat: rest, then four steps. */
  heat1: '#3d3478',
  heat2: '#5a4dc4',
  heat3: '#8072f5',
  heat4: '#b9b0ff',
  /** Weekly-set bands for bars and charts. */
  bandLow: '#5346b0',
  bandBuilding: '#7f71f2',
  bandTarget: '#aea3ff',
  /** Fallback exercise figure. */
  rigBody: '#3e4257',
  rigBodyFar: '#2c2f40',
  rigScenery: '#2a2d3d',
  rigLoad: '#6b6f86',

  white: '#ffffff',
  black: '#000000',
};

export const lightColors: typeof darkColors = {
  background: '#f5f5f9',
  surface: '#ffffff',
  surfaceRaised: '#eef0f5',
  surfaceTint: '#f1effe',
  border: '#e2e4ec',
  borderStrong: '#c8cbd8',
  borderTint: '#d8d2fb',
  divider: '#e8eaf1',
  track: '#e4e6ee',

  text: '#14151f',
  textSecondary: '#2c2e3d',
  textMuted: '#525669',
  textDim: '#5f6377',
  textFaint: '#666a7d',

  onAccent: '#ffffff',
  accent: '#5b4ce0',
  accentWarm: '#6e5fe9',
  accentBright: '#4d3fcf',
  accentText: '#4b3cc8',
  accentTextStrong: '#33279e',
  accentDeep: '#5444d4',
  accentDim: '#a99ff2',
  accentSoft: '#ebe8ff',
  accentGlow: 'rgba(91, 76, 224, 0.08)',
  accentBand: 'rgba(91, 76, 224, 0.14)',

  backdrop: 'rgba(20, 21, 31, 0.45)',
  danger: '#c42f5a',
  dangerSoft: 'rgba(196, 47, 90, 0.10)',
  success: '#1c7c4a',
  warning: '#a35a00',
  warningBorder: '#f0d2a8',
  info: '#1f6fa8',

  heat1: '#cfcaf7',
  heat2: '#a99ff2',
  heat3: '#7a6ce6',
  heat4: '#4d3fc9',
  bandLow: '#b8b0f5',
  bandBuilding: '#7f71f2',
  bandTarget: '#4b3cc8',
  rigBody: '#c3c6d3',
  rigBodyFar: '#d6d8e2',
  rigScenery: '#dde0e8',
  rigLoad: '#7d8196',

  white: '#ffffff',
  black: '#000000',
};

/** The live palette; starts dark until the root applies the device's scheme. */
export const colors: typeof darkColors = { ...darkColors };

let version = 0;
let scheme: ColorScheme = 'dark';

/** Switches the live palette. Returns true when anything changed. */
export function applyColorScheme(next: ColorScheme): boolean {
  if (next === scheme && version > 0) return false;
  Object.assign(colors, next === 'light' ? lightColors : darkColors);
  scheme = next;
  version++;
  return true;
}

export function colorScheme(): ColorScheme {
  return scheme;
}

/** Bumps on every palette change; `themed()` caches against it. */
export function themeVersion(): number {
  return version;
}

/** Violet gradient for filled actions and progress fills; read at render. */
export function accentGradient(): readonly [string, string] {
  return [colors.accent, colors.accentWarm];
}

export type BrandColors = typeof darkColors;

/** @deprecated Use `colors` or `theme.colors`. */
export default {
  light: lightColors,
  dark: darkColors,
};
