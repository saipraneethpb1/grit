import { StyleSheet, View, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

const STEPS = 6;

/**
 * Nocturne rule: a hairline that fades to transparent at both ends instead of
 * stopping cleanly. Built from stepped segments so it needs no gradient library.
 */
export function FadeRule({ style }: { style?: ViewStyle }) {
  const ramp = Array.from({ length: STEPS }, (_, i) => (i + 1) / (STEPS + 1));
  return (
    <View style={[styles.row, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ramp.map((opacity, i) => (
        <View key={`l${i}`} style={[styles.seg, { opacity }]} />
      ))}
      <View style={styles.mid} />
      {ramp
        .slice()
        .reverse()
        .map((opacity, i) => (
          <View key={`r${i}`} style={[styles.seg, { opacity }]} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', height: 1, marginVertical: theme.space.md },
  seg: { width: '1.5%', height: 1, backgroundColor: theme.colors.border },
  mid: { flex: 1, height: 1, backgroundColor: theme.colors.border },
});
