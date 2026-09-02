import type { TextStyle } from 'react-native';
import { colors } from './Colors';

/** Shared layout and typography tokens for a minimal UI. */
export const theme = {
  colors,

  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 999,
  },

  font: {
    display: { fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.5 },
    title: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3 },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    bodyMedium: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
    caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    label: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.2 },
    mono: { fontSize: 13, fontWeight: '500' as const, fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] },
  },

  hairline: 1,
};

export type Theme = typeof theme;
