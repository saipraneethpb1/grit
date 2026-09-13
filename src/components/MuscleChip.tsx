import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { MUSCLE_LABELS } from '@/src/domain/muscles';
import type { MuscleGroup } from '@/src/domain/types';

type Props = {
  muscle: MuscleGroup | 'all';
  selected?: boolean;
  onPress?: () => void;
};

/** Filter pill: outlined at rest, accent-soft when selected. */
export function MuscleChip({ muscle, selected, onPress }: Props) {
  const label = muscle === 'all' ? 'All' : MUSCLE_LABELS[muscle];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      style={({ pressed }) => [styles.chip, pressed && !selected && styles.pressed]}
    >
      {selected ? <View style={styles.selectedFill} /> : null}
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    borderWidth: theme.hairline,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  pressed: { borderColor: theme.colors.accentDim },
  selectedFill: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: theme.hairline,
    borderColor: theme.colors.accent,
  },
  text: { ...theme.font.bodyMedium, fontSize: 12, lineHeight: 16, color: theme.colors.textSecondary },
});
