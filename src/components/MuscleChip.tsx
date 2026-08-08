import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '@/constants/theme';
import { MUSCLE_LABELS } from '@/src/domain/muscles';
import type { MuscleGroup } from '@/src/domain/types';

type Props = {
  muscle: MuscleGroup | 'all';
  selected?: boolean;
  onPress?: () => void;
};

export function MuscleChip({ muscle, selected, onPress }: Props) {
  const label = muscle === 'all' ? 'All' : MUSCLE_LABELS[muscle];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.white : 'transparent',
          borderColor: selected ? theme.colors.white : theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: selected ? theme.colors.black : theme.colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: theme.hairline,
    marginRight: theme.space.sm,
    marginBottom: theme.space.sm,
  },
  text: { ...theme.font.caption, fontWeight: '500' },
});
