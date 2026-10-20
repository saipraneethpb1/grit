/**
 * Ryvora: charcoal surfaces, sand text and a single violet accent, taken from
 * the brand sheet (Violet #8B7CFF, Charcoal #0E0F16, Sand #E9EAF0). The accent
 * is used sparingly — actions, progress and the active state — so screens stay
 * quiet and the violet carries meaning. Every text/surface pairing clears WCAG
 * AA (4.5:1), including `onAccent` labels on the violet fill.
 */

export const colors = {
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

  backdrop: 'rgba(6, 7, 12, 0.88)',
  /** Rose, so destructive actions never read as the violet accent. */
  danger: '#ff6f91',
  dangerSoft: 'rgba(255, 111, 145, 0.12)',
  white: '#ffffff',
  black: '#000000',
};

/** Violet → lavender, used for filled actions and progress fills. */
export const accentGradient = [colors.accent, colors.accentWarm] as const;

export type BrandColors = typeof colors;

/** @deprecated Use `colors` or `theme.colors`. */
export default {
  light: colors,
  dark: colors,
};
