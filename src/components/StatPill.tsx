import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type Props = {
  label: string;
  value: string | number;
  showDivider?: boolean;
};

export function StatPill({ label, value, showDivider }: Props) {
  return (
    <View style={[styles.pill, showDivider && styles.divider]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.sm,
    alignItems: 'center',
  },
  divider: {
    borderRightWidth: theme.hairline,
    borderRightColor: theme.colors.border,
  },
  value: {
    ...theme.font.title,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 2,
  },
  label: {
    ...theme.font.caption,
    color: theme.colors.textMuted,
  },
});
