import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { MUSCLE_LABELS } from '@/src/domain/muscles';
import type { Exercise } from '@/src/domain/types';

type Props = {
  exercise: Exercise;
  subtitle?: string;
  onPress?: () => void;
  /** Figure on the trailing edge, e.g. a set × rep target. */
  right?: string;
};

function equipmentLabel(exercise: Exercise): string {
  const first = exercise.equipment[0];
  if (!first) return '';
  return first.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function ExerciseRowBase({ exercise, subtitle, onPress, right }: Props) {
  const muscle = exercise.primary_muscles[0];
  const meta =
    subtitle ??
    [muscle ? MUSCLE_LABELS[muscle] ?? muscle : null, equipmentLabel(exercise)]
      .filter(Boolean)
      .join(' · ');

  const content = (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{exercise.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
      </View>
      {right ? <Text style={styles.right}>{right}</Text> : null}
      {onPress ? (
        <Ionicons name="chevron-forward" size={13} color={theme.colors.textFaint} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

/** Memoised: the library re-filters on every keystroke of the search box. */
export const ExerciseRow = memo(ExerciseRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: theme.hairline,
    borderBottomColor: theme.colors.divider,
  },
  left: { flex: 1, minWidth: 0 },
  name: { ...theme.font.body, fontSize: 14, lineHeight: 18, color: theme.colors.text },
  meta: { ...theme.font.small, color: theme.colors.textDim, marginTop: 3 },
  right: { ...theme.font.mono, color: theme.colors.textSecondary },
});
