import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { exerciseGuideImages } from '@/src/domain/exerciseGuideImages';
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
      <View style={styles.thumbnail}>
        {exerciseGuideImages[exercise.id] ? (
          <Image source={exerciseGuideImages[exercise.id][0]} style={styles.image} resizeMode="contain" accessible={false} />
        ) : <Ionicons name="barbell-outline" size={24} color={theme.colors.accent} />}
      </View>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={2}>{exercise.name}</Text>
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
    padding: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
  },
  thumbnail: { width: 54, height: 60, borderRadius: 10, backgroundColor: theme.colors.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  left: { flex: 1, minWidth: 0 },
  name: { ...theme.font.bodyMedium, fontSize: 14, lineHeight: 20, color: theme.colors.text },
  meta: { ...theme.font.small, color: theme.colors.textDim, marginTop: 3 },
  right: { ...theme.font.mono, color: theme.colors.textSecondary },
});
