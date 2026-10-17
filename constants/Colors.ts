/**
 * Ember: warm charcoal surfaces with a coral-to-amber accent for training
 * actions. Every text/surface pairing clears WCAG AA (4.5:1), including
 * `onAccent` labels across the whole accent gradient.
 */

export const colors = {
  background: '#0f0d0c',
  /** Cards and inputs. */
  surface: '#1a1715',
  /** Raised surface inside a card (chips, number tiles). */
  surfaceRaised: '#221e1b',
  /** Accent-tinted card (today's session, cues, program volume). */
  surfaceTint: '#241914',
  border: '#2f2925',
  borderStrong: '#4a3f38',
  /** Border for accent-tinted cards. */
  borderTint: '#4a2a1f',
  /** Rules between list rows. */
  divider: '#27211e',
  /** Progress tracks and number tiles. */
  track: '#2e2723',

  text: '#f7f2ee',
  textSecondary: '#e6ddd6',
  textMuted: '#b8aaa0',
  textDim: '#a69689',
  textFaint: '#958579',

  /** Label colour on a filled accent; passes on both gradient ends. */
  onAccent: '#1c0e08',
  accent: '#ff6b3d',
  /** Second stop of the accent gradient. */
  accentWarm: '#ffa94d',
  /** Pressed state of a filled accent. */
  accentBright: '#ff8f6a',
  /** Label colour on an outlined primary action. */
  accentText: '#ffa384',
  accentTextStrong: '#ffd2c2',
  /** Kickers and completed marks. */
  accentDeep: '#ff8a5c',
  /** Hover borders and glows. */
  accentDim: '#b8502f',
  /** Selected fills. */
  accentSoft: '#3a1f15',
  /** Translucent accent for the glow behind hero cards. */
  accentGlow: 'rgba(255, 107, 61, 0.16)',

  backdrop: 'rgba(10, 7, 6, 0.88)',
  /** Rose rather than red, so destructive actions never read as the coral accent. */
  danger: '#ff6f91',
  dangerSoft: 'rgba(255, 111, 145, 0.12)',
  white: '#ffffff',
  black: '#000000',
};

/** Coral → amber, used for filled actions and progress fills. */
export const accentGradient = [colors.accent, colors.accentWarm] as const;

export type GritColors = typeof colors;

/** @deprecated Use `colors` or `theme.colors`. */
export default {
  light: colors,
  dark: colors,
};
