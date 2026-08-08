import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { SplitTemplate } from '@/src/domain/types';

type Props = {
  split: SplitTemplate;
  onPress: () => void;
  selected?: boolean;
};

export function SplitCard({ split, onPress, selected }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? theme.colors.white : theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{split.name}</Text>
        <Text style={styles.badge}>{split.days_per_week}d</Text>
      </View>
      <Text style={styles.desc} numberOfLines={2}>
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
  badge: { ...theme.font.caption, color: theme.colors.textMuted },
  desc: { ...theme.font.caption, color: theme.colors.textSecondary, lineHeight: 18 },
});
