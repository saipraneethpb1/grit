import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { formatMuscles } from '@/src/domain/muscles';
import type { GeneratedPlanDay, PlanDayWithExercises } from '@/src/domain/types';
import { ExerciseRow } from './ExerciseRow';

type Props = {
  day: PlanDayWithExercises | GeneratedPlanDay;
  showHeader?: boolean;
};

function isSavedDay(
  day: PlanDayWithExercises | GeneratedPlanDay
): day is PlanDayWithExercises {
  return 'plan_exercises' in day;
}

export function DayWorkoutList({ day, showHeader = true }: Props) {
  const router = useRouter();

  const exercises = isSavedDay(day)
    ? day.plan_exercises.map((pe) => ({
        exercise: pe.exercise,
        sets: pe.target_sets,
        repsMin: pe.target_reps_min,
        repsMax: pe.target_reps_max,
      }))
    : day.exercises.map((pe) => ({
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

      {exercises.map((item) => (
        <ExerciseRow
          key={item.exercise.id}
          exercise={item.exercise}
          right={`${item.sets} × ${item.repsMin}–${item.repsMax}`}
          onPress={() =>
            router.push({
              pathname: '/(app)/exercises/[id]',
              params: { id: item.exercise.id },
            })
          }
        />
      ))}

      {exercises.length === 0 ? (
        <Text style={styles.empty}>No exercises for this day.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.space.sm },
  title: { ...theme.font.title, color: theme.colors.text, marginBottom: 4 },
  muscles: { ...theme.font.caption, color: theme.colors.textMuted },
  empty: { ...theme.font.caption, color: theme.colors.textMuted },
});
