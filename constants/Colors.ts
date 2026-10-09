/** Warm charcoal surfaces and a lime accent for training actions. */

export const colors = {
  background: '#111512',
  /** Cards and inputs. */
  surface: '#1c231e',
  /** Accent-tinted card (cues, program volume). */
  surfaceTint: '#202a20',
  border: '#323d34',
  borderStrong: '#48594b',
  /** Border for accent-tinted cards. */
  borderTint: '#303e25',
  /** Rules between list rows. */
  divider: '#2a342d',
  /** Progress tracks and number tiles. */
  track: '#303a32',

  text: '#f3f5ed',
  textSecondary: '#d8dfd4',
  textMuted: '#a8b5a6',
  textDim: '#97a593',
  textFaint: '#859381',

  onAccent: '#19230f',
  accent: '#c2ed79',
  accentBright: '#daf7a7',
  /** Label colour on an outlined primary action. */
  accentText: '#d5f3a7',
  accentTextStrong: '#e9ffd0',
  /** Kickers and completed marks. */
  accentDeep: '#b5d98a',
  /** Hover borders and glows. */
  accentDim: '#91b65f',
  /** Selected fills. */
  accentSoft: '#303e25',

  backdrop: 'rgba(6, 12, 8, 0.88)',
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
