import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  children: string;
  /** Optional ordinal shown above the label, as on the brand sheet ("01"). */
  index?: number;
  style?: ViewStyle;
};

/** Tracked uppercase label with a short violet rule beneath. */
export function BrandKicker({ children, index, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {index != null ? <Text style={styles.index}>{String(index).padStart(2, '0')}</Text> : null}
      <Text style={styles.label}>{children}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
  index: { ...theme.font.kicker, color: theme.colors.text, marginBottom: 6 },
  label: { ...theme.font.kicker, color: theme.colors.textMuted },
  rule: { width: 28, height: 2, borderRadius: 1, backgroundColor: theme.colors.accent, marginTop: 10 },
});
