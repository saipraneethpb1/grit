/**
 * Minimal dark palette — near-black surfaces, restrained accent.
 */

export const colors = {
  background: '#000000',
  backgroundElevated: '#0a0a0a',
  card: '#0f0f0f',
  cardHover: '#141414',
  border: '#1c1c1c',
  borderStrong: '#2a2a2a',
  text: '#fafafa',
  textSecondary: '#8a8a8a',
  textMuted: '#5c5c5c',
  tint: '#e8ff47',
  tintDim: '#c4d63a',
  tintSoft: 'rgba(232, 255, 71, 0.08)',
  tabIconDefault: '#5c5c5c',
  tabIconSelected: '#fafafa',
  danger: '#f87171',
  success: '#4ade80',
  successOn: '#052e16',
  successSoft: 'rgba(74, 222, 128, 0.12)',
  successBorder: 'rgba(74, 222, 128, 0.35)',
  chip: '#141414',
  chipText: '#d4d4d4',
  orange: '#fb923c',
  white: '#ffffff',
  black: '#000000',
};

export type GritColors = typeof colors;

/** @deprecated Use `colors` or `theme.colors`. */
export default {
  light: colors,
  dark: colors,
};
