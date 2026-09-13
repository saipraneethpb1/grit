import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  /** Mark size in px. */
  size?: number;
  showWordmark?: boolean;
  style?: ViewStyle;
};

/**
 * Minimal Grit mark — hairline square with a single accent bar (loaded weight).
 */
export function GritLogo({ size = 36, showWordmark = false, style }: Props) {
  const barWidth = Math.round(size * 0.46);
  const barHeight = Math.max(2, Math.round(size * 0.08));

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.mark, { width: size, height: size, borderRadius: theme.radius.md }]}>
        <View style={[styles.bar, { width: barWidth, height: barHeight, borderRadius: barHeight }]} />
      </View>
      {showWordmark ? <Text style={styles.wordmark}>grit</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    borderWidth: theme.hairline,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { backgroundColor: theme.colors.accent, marginTop: 1, ...theme.shadow.glow },
  wordmark: { ...theme.font.kicker, fontSize: 11, color: theme.colors.textMuted },
});
