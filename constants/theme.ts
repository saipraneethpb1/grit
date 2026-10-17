import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { accentGradient, colors } from './Colors';

/** Shared typography, spacing, and surfaces for the Grit training experience. */

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
  hero: { fontFamily: inter.semibold, fontWeight: '600' as const, fontSize: 38, lineHeight: 43, letterSpacing: -0.5 },
  /** Screen title. */
  display: { fontFamily: inter.semibold, fontWeight: '600' as const, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  /** Card title. */
  title: { fontFamily: inter.semibold, fontWeight: '600' as const, fontSize: 25, lineHeight: 31, letterSpacing: -0.4 },
  heading: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 17, lineHeight: 21, letterSpacing: -0.2 },
  bodyMedium: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 14, lineHeight: 18 },
  body: { fontFamily: inter.regular, fontWeight: '400' as const, fontSize: 15, lineHeight: 23 },
  caption: { fontFamily: inter.regular, fontWeight: '400' as const, fontSize: 13, lineHeight: 19 },
  small: { fontFamily: inter.regular, fontWeight: '400' as const, fontSize: 11.5, lineHeight: 16 },
  /** Figures: targets, timers, counts. */
  mono: { fontFamily: mono, fontSize: 12, lineHeight: 16, fontWeight: '500' as const, fontVariant: tabular },
  monoSmall: { fontFamily: mono, fontSize: 11, lineHeight: 14, fontWeight: '400' as const, fontVariant: tabular },
  /** Big number in a stat cell. */
  stat: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 25, lineHeight: 30, fontVariant: tabular },
  /** Stepper value in the logger. */
  figure: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, fontVariant: tabular },
  /** Rest countdown. */
  clock: { fontFamily: inter.light, fontWeight: '300' as const, fontSize: 56, lineHeight: 62, letterSpacing: -2, fontVariant: tabular },
  cta: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 15, lineHeight: 19 },
  /** Tab bar labels. */
  tab: { fontFamily: inter.medium, fontWeight: '500' as const, fontSize: 10, lineHeight: 12, letterSpacing: 0.2 },
};

/** "#ff6b3d" at 0.35 → "rgba(255, 107, 61, 0.35)", for web box shadows. */
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
  md: shadowStyle('#000000', 0.18, 18, 6, 3),
  /** Sheet or dialog. */
  lg: shadowStyle('#000000', 0.65, 40, 16, 16),
  /** Accent glow behind a filled bar. iOS and web; Android ignores coloured shadows. */
  glow: shadowStyle(colors.accent, 0.2, 8, 0),
  /** Glow under a gradient button. */
  button: shadowStyle(colors.accent, 0.35, 16, 6),
};

export const theme = {
  colors,
  /** Coral → amber; pass to `<LinearGradient colors={...}>`. */
  gradient: accentGradient,
  fontFamily: { ...inter, mono },

  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  radius: {
    sm: 10,
    md: 14,
    lg: 22,
    full: 999,
  },

  font,
  shadow,

  /** Card recipe shared by most surfaces. */
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
  } as ViewStyle,

  hairline: 1,
};

export type Theme = typeof theme;
