import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExerciseGuide } from '@/src/components/ExerciseGuide';
import { FadeRule } from '@/src/components/FadeRule';
import { theme } from '@/constants/theme';
import { anatomyLabel, MUSCLE_LABELS } from '@/src/domain/muscles';
import { useExercise } from '@/src/hooks/useExercises';

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExercise(id);

  if (!exercise) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Exercise not found.</Text>
      </View>
    );
  }

  const primary = exercise.primary_muscles.map((m) => MUSCLE_LABELS[m]).join(', ');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>{primary}</Text>
      <Text style={styles.title}>{exercise.name}</Text>
      <ExerciseGuide key={exercise.id} exerciseId={exercise.id} name={exercise.name} notes={exercise.notes} />

      <FadeRule style={styles.rule} />

      <Row label="Anatomy" value={exercise.primary_muscles.map((m) => anatomyLabel(m)).join(' · ')} />
      <Row
        label="Secondary"
        value={
          exercise.secondary_muscles.length
            ? exercise.secondary_muscles.map((m) => MUSCLE_LABELS[m]).join(', ')
            : '—'
        }
      />
      <Row label="Equipment" value={exercise.equipment.map(humanize).join(', ')} />
      <Row label="Pattern" value={humanize(exercise.movement_pattern)} />
      <Row
        label="Default"
        value={`${exercise.default_sets} × ${exercise.default_reps_min}–${exercise.default_reps_max}`}
        mono
      />
    </ScrollView>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, mono && styles.valueMono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { ...theme.font.body, color: theme.colors.text },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xl },
  kicker: { ...theme.font.kicker, color: theme.colors.accentDeep, marginBottom: 7 },
  title: { ...theme.font.display, color: theme.colors.text },
  rule: { marginTop: 18, marginBottom: 4 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: theme.hairline,
    borderBottomColor: theme.colors.divider,
  },
  label: { ...theme.font.kicker, color: theme.colors.textDim, marginBottom: 5 },
  value: { ...theme.font.body, color: theme.colors.textSecondary, textTransform: 'capitalize' },
  valueMono: { ...theme.font.mono, fontSize: 13, textTransform: 'none' },
});
