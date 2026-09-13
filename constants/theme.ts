import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from './Colors';

/**
 * Nocturne tokens: Inter at medium weight, a monospace face for kickers and
 * figures, 8px radii and dense spacing. Every screen reads from here so the
 * look can be retuned in one place.
 */

const inter = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, Menlo, monospace',
}) as string;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

const font = {
  /** Uppercase monospace label above a block. */
  kicker: {
    fontFamily: mono,
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '500' as const,
    letterSpacing: 1.3,
    textTransform: 'uppercase' as const,
  },
  /** Onboarding-scale headline. */
  hero: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 27, lineHeight: 32, letterSpacing: -0.5 },
  /** Screen title. */
  display: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 25, lineHeight: 30, letterSpacing: -0.5 },
  /** Card title. */
  title: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 21, lineHeight: 25, letterSpacing: -0.4 },
  heading: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 17, lineHeight: 21, letterSpacing: -0.2 },
  bodyMedium: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 14, lineHeight: 18 },
  body: { fontFamily: inter.regular, fontWeight: '400' as const, fontSize: 13.5, lineHeight: 20 },
  caption: { fontFamily: inter.regular, fontWeight: '400' as const, fontSize: 12.5, lineHeight: 18 },
  small: { fontFamily: inter.regular, fontWeight: '400' as const, fontSize: 11.5, lineHeight: 16 },
  /** Figures: targets, timers, counts. */
  mono: { fontFamily: mono, fontSize: 12, lineHeight: 16, fontWeight: '500' as const, fontVariant: tabular },
  monoSmall: { fontFamily: mono, fontSize: 11, lineHeight: 14, fontWeight: '400' as const, fontVariant: tabular },
  /** Big number in a stat cell. */
  stat: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 19, lineHeight: 23, fontVariant: tabular },
  /** Stepper value in the logger. */
  figure: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, fontVariant: tabular },
  /** Rest countdown. */
  clock: { fontFamily: inter.light, fontWeight: '300' as const, fontSize: 56, lineHeight: 62, letterSpacing: -2, fontVariant: tabular },
  cta: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 15, lineHeight: 19 },
  /** Tab bar labels. */
  tab: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 10, lineHeight: 12, letterSpacing: 0.2 },
};

const shadow = {
  /** Raised card. */
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  } as ViewStyle,
  /** Sheet or dialog. */
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.65,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  } as ViewStyle,
  /** Accent glow behind a filled bar. iOS only; Android ignores coloured shadows. */
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  } as ViewStyle,
};

export const theme = {
  colors,
  fontFamily: { ...inter, mono },

  space: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
  },

  radius: {
    sm: 6,
    md: 8,
    lg: 14,
    full: 999,
  },

  font,
  shadow,

  /** Card recipe shared by most surfaces. */
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  } as ViewStyle,

  hairline: 1,
};

export type Theme = typeof theme;
