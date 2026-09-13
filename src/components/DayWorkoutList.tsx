import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { PreviousBest } from '@/src/domain/liveWorkout';
import { formatMuscles, MUSCLE_LABELS } from '@/src/domain/muscles';
import type { GeneratedPlanDay, PlanDayWithExercises } from '@/src/domain/types';

type Props = {
  day: PlanDayWithExercises | GeneratedPlanDay;
  showHeader?: boolean;
  /** Last logged weight × reps per exercise id, when the caller has it. */
  lastByExercise?: Record<string, PreviousBest>;
};

function isSavedDay(
  day: PlanDayWithExercises | GeneratedPlanDay
): day is PlanDayWithExercises {
  return 'plan_exercises' in day;
}

export function formatTarget(sets: number, min: number, max: number): string {
  return `${sets} × ${min === max ? min : `${min}–${max}`}`;
}

export function DayWorkoutList({ day, showHeader = true, lastByExercise }: Props) {
  const router = useRouter();

  const exercises = (isSavedDay(day) ? day.plan_exercises : day.exercises).map((pe) => ({
    exercise: pe.exercise,
    sets: pe.target_sets,
    repsMin: pe.target_reps_min,
    repsMax: pe.target_reps_max,
  }));

  return (
    <View>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.title}>{day.name}</Text>
          <Text style={styles.muscles}>{formatMuscles(day.focus_muscles)}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {exercises.map((item) => {
          const last = lastByExercise?.[item.exercise.id];
          const muscle = item.exercise.primary_muscles[0];
          const meta = [
            muscle ? MUSCLE_LABELS[muscle] ?? muscle : null,
            last ? `last ${last.weight} × ${last.reps}` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Pressable
              key={item.exercise.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/(app)/exercises/[id]',
                  params: { id: item.exercise.id },
                })
              }
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardRow}>
                <Text style={styles.name}>{item.exercise.name}</Text>
                <Text style={styles.target}>{formatTarget(item.sets, item.repsMin, item.repsMax)}</Text>
              </View>
              {meta ? <Text style={styles.meta}>{meta}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {exercises.length === 0 ? (
        <Text style={styles.empty}>No exercises for this day.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 10 },
  title: { ...theme.font.title, color: theme.colors.text, marginBottom: 4 },
  muscles: { ...theme.font.caption, color: theme.colors.textDim },
  list: { gap: 8 },
  card: { ...theme.card, padding: 14 },
  cardPressed: { borderColor: theme.colors.accentDim },
  cardRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  name: { ...theme.font.bodyMedium, fontSize: 14.5, lineHeight: 19, color: theme.colors.text, flex: 1 },
  target: { ...theme.font.mono, color: theme.colors.textSecondary },
  meta: { ...theme.font.small, color: theme.colors.textDim, marginTop: 4 },
  empty: { ...theme.font.caption, color: theme.colors.textDim },
});
