import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { SplitTemplate } from '@/src/domain/types';

type Props = {
  split: SplitTemplate;
  onPress: () => void;
  selected?: boolean;
  /** Short label explaining why this one stands out, e.g. "Recommended". */
  badge?: string;
};

export function SplitCard({ split, onPress, selected, badge }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? theme.colors.white : theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {badge ? <Text style={styles.recommended}>{badge}</Text> : null}
      <View style={styles.header}>
        <Text style={styles.title}>{split.name}</Text>
        <Text style={styles.days}>{split.days_per_week} days / week</Text>
      </View>
      <Text style={styles.desc} numberOfLines={3}>
        {split.description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.md,
    borderWidth: theme.hairline,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
    backgroundColor: theme.colors.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.xs,
    gap: theme.space.sm,
  },
  title: { ...theme.font.bodyMedium, color: theme.colors.text, flex: 1 },
  days: { ...theme.font.caption, color: theme.colors.textMuted },
  recommended: {
    ...theme.font.label,
    fontSize: 11,
    color: theme.colors.success,
    marginBottom: theme.space.xs,
  },
  desc: { ...theme.font.caption, color: theme.colors.textSecondary, lineHeight: 18 },
});
