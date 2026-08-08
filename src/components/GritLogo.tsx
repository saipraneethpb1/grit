import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  /** Mark size in px. */
  size?: number;
  showWordmark?: boolean;
  style?: ViewStyle;
};

/**
 * Minimal Grit mark — hairline square with a single white bar (loaded weight).
 * Matches the app's dark, restrained visual system.
 */
export function GritLogo({ size = 36, showWordmark = false, style }: Props) {
  const barWidth = Math.round(size * 0.46);
  const barHeight = Math.max(2, Math.round(size * 0.08));

  return (
    <View style={[styles.wrap, style]}>
      <View
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: theme.radius.sm,
          },
        ]}
      >
        <View style={[styles.bar, { width: barWidth, height: barHeight, borderRadius: barHeight }]} />
      </View>
      {showWordmark ? <Text style={styles.wordmark}>grit</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  mark: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    backgroundColor: theme.colors.white,
    marginTop: 1,
  },
  wordmark: {
    ...theme.font.label,
    color: theme.colors.textMuted,
    textTransform: 'lowercase',
    letterSpacing: 1.2,
  },
});
