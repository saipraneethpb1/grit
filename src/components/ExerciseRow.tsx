import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { MUSCLE_LABELS } from '@/src/domain/muscles';
import type { Exercise } from '@/src/domain/types';

type Props = {
  exercise: Exercise;
  subtitle?: string;
  onPress?: () => void;
  right?: string;
};

export function ExerciseRow({ exercise, subtitle, onPress, right }: Props) {
  const muscles = exercise.primary_muscles
    .map((m) => MUSCLE_LABELS[m] ?? m)
    .join(' · ');

  const content = (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.meta}>{subtitle ?? muscles}</Text>
      </View>
      {right ? <Text style={styles.right}>{right}</Text> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.md,
    borderBottomWidth: theme.hairline,
    borderBottomColor: theme.colors.border,
  },
  left: { flex: 1 },
  name: { ...theme.font.bodyMedium, color: theme.colors.text, marginBottom: 2 },
  meta: { ...theme.font.caption, color: theme.colors.textMuted },
  right: { ...theme.font.caption, color: theme.colors.textSecondary },
});
