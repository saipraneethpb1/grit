/**
 * Nocturne palette — a near-neutral blue-grey ground with a blurple accent
 * used as a line and a glow rather than a flood. Contrast comes from the
 * tonal ramp, not from saturation.
 */

export const colors = {
  background: '#161826',
  /** Cards and inputs. */
  surface: '#1d1f2e',
  /** Accent-tinted card (cues, program volume). */
  surfaceTint: '#1b1c2b',
  border: '#2e3140',
  borderStrong: '#3f424d',
  /** Border for accent-tinted cards. */
  borderTint: '#2b2741',
  /** Rules between list rows. */
  divider: '#23252f',
  /** Progress tracks and number tiles. */
  track: '#292b31',

  text: '#e9e9ed',
  textSecondary: '#cfd3e5',
  textMuted: '#9397ab',
  textDim: '#75798c',
  textFaint: '#595d6c',

  accent: '#9184d9',
  accentBright: '#b5abfc',
  /** Label colour on an outlined primary action. */
  accentText: '#d2cefd',
  accentTextStrong: '#e7e5fe',
  /** Kickers and completed marks. */
  accentDeep: '#796cbf',
  /** Hover borders and glows. */
  accentDim: '#5d5294',
  /** Selected fills. */
  accentSoft: '#2b2741',

  backdrop: 'rgba(15, 16, 25, 0.88)',
  danger: '#f28b8b',
  dangerSoft: 'rgba(242, 139, 139, 0.12)',
  white: '#ffffff',
  black: '#000000',
};

export type GritColors = typeof colors;

/** @deprecated Use `colors` or `theme.colors`. */
export default {
  light: colors,
  dark: colors,
};
