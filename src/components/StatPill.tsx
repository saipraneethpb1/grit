import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  label: string;
  value: string | number;
  showDivider?: boolean;
};

/** One cell of the four-up stat strip. Wrap cells in `StatRow`. */
export function StatPill({ label, value, showDivider }: Props) {
  return (
    <View style={[styles.pill, showDivider && styles.divider]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  pill: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  divider: {
    borderRightWidth: theme.hairline,
    borderRightColor: theme.colors.border,
  },
  value: { ...theme.font.stat, color: theme.colors.text },
  label: {
    ...theme.font.kicker,
    letterSpacing: 0.6,
    color: theme.colors.textDim,
    marginTop: 3,
  },
});
