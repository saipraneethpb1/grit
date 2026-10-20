import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { accentGradient, colors } from './Colors';

/**
 * Shared typography, spacing and surfaces for Ryvora.
 *
 * Sora (geometric, close to the wordmark) sets headings and figures; Inter sets
 * reading text. Labels are widely tracked uppercase, as on the brand sheet,
 * rather than monospace.
 */

const inter = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

const sora = {
  light: 'Sora_300Light',
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semibold: 'Sora_600SemiBold',
} as const;

const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, Menlo, monospace',
}) as string;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

const font = {
  /** Widely tracked uppercase label above a block. */
  kicker: {
    fontFamily: inter.medium,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '500' as const,
    letterSpacing: 2.2,
    textTransform: 'uppercase' as const,
  },
  /** Onboarding-scale headline. */
  hero: { fontFamily: sora.regular, fontWeight: '400' as const, fontSize: 36, lineHeight: 43, letterSpacing: -0.8 },
  /** Screen title. */
  display: { fontFamily: sora.regular, fontWeight: '400' as const, fontSize: 30, lineHeight: 37, letterSpacing: -0.7 },
  /** Card title. */
  title: { fontFamily: sora.medium, fontWeight: '500' as const, fontSize: 23, lineHeight: 29, letterSpacing: -0.5 },
  heading: { fontFamily: sora.medium, fontWeight: '500' as const, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  bodyMedium: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 14, lineHeight: 19 },
  body: { fontFamily: inter.regular, fontWeight: '400' as const, fontSize: 15, lineHeight: 23 },
  caption: { fontFamily: inter.regular, fontWeight: '400' as const, fontSize: 13, lineHeight: 19 },
  small: { fontFamily: inter.regular, fontWeight: '400' as const, fontSize: 11.5, lineHeight: 16 },
  /** Figures: targets, timers, counts. */
  mono: { fontFamily: inter.medium, fontSize: 12.5, lineHeight: 16, fontWeight: '500' as const, fontVariant: tabular },
  monoSmall: { fontFamily: inter.regular, fontSize: 11.5, lineHeight: 15, fontWeight: '400' as const, fontVariant: tabular },
  /** Big number in a stat cell. */
  stat: { fontFamily: sora.regular, fontWeight: '400' as const, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, fontVariant: tabular },
  /** Stepper value in the logger. */
  figure: { fontFamily: sora.regular, fontWeight: '400' as const, fontSize: 26, lineHeight: 31, letterSpacing: -0.6, fontVariant: tabular },
  /** Rest countdown. */
  clock: { fontFamily: sora.light, fontWeight: '300' as const, fontSize: 56, lineHeight: 64, letterSpacing: -2, fontVariant: tabular },
  cta: { fontFamily: inter.semibold, fontWeight: '600' as const, fontSize: 15, lineHeight: 19, letterSpacing: 0.1 },
  /** Tab bar labels. */
  tab: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 10, lineHeight: 12, letterSpacing: 0.4 },
};

/** "#8b7cff" at 0.35 → "rgba(139, 124, 255, 0.35)", for web box shadows. */
function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * One shadow, expressed per platform. React Native Web deprecates the
 * `shadow*` props in favour of `boxShadow`; iOS and Android keep the props
 * they have always rendered, so native appearance is unchanged.
 */
function shadowStyle(color: string, opacity: number, radius: number, y: number, elevation?: number): ViewStyle {
  if (Platform.OS === 'web') {
    return { boxShadow: `0px ${y}px ${radius}px ${rgba(color, opacity)}` };
  }
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: y },
    ...(elevation == null ? null : { elevation }),
  };
}

const shadow = {
  /** Raised card. */
  md: shadowStyle('#000000', 0.32, 24, 10, 3),
  /** Sheet or dialog. */
  lg: shadowStyle('#000000', 0.7, 48, 18, 16),
  /** Accent glow behind a filled bar. iOS and web; Android ignores coloured shadows. */
  glow: shadowStyle(colors.accent, 0.25, 10, 0),
  /** Glow under a filled button. */
  button: shadowStyle(colors.accent, 0.28, 20, 8),
};

export const theme = {
  colors,
  /** Violet → lavender; pass to `<LinearGradient colors={...}>`. */
  gradient: accentGradient,
  fontFamily: { ...inter, display: sora, mono },

  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    full: 999,
  },

  font,
  shadow,

  /** Card recipe shared by most surfaces. */
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
  } as ViewStyle,

  hairline: 1,
};

export type Theme = typeof theme;
