import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { anatomyLabel, MUSCLE_LABELS } from '@/src/domain/muscles';
import { useExercise } from '@/src/hooks/useExercises';

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

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{exercise.name}</Text>

      <Row label="Primary" value={exercise.primary_muscles.map((m) => MUSCLE_LABELS[m]).join(', ')} />
      <Row
        label="Anatomy"
        value={exercise.primary_muscles.map((m) => anatomyLabel(m)).join(' · ')}
      />
      <Row
        label="Secondary"
        value={
          exercise.secondary_muscles.length
            ? exercise.secondary_muscles.map((m) => MUSCLE_LABELS[m]).join(', ')
            : '—'
        }
      />
      <Row label="Equipment" value={exercise.equipment.map((e) => e.replace(/_/g, ' ')).join(', ')} />
      <Row label="Pattern" value={exercise.movement_pattern.replace(/_/g, ' ')} />
      <Row
        label="Default"
        value={`${exercise.default_sets} × ${exercise.default_reps_min}–${exercise.default_reps_max}`}
      />

      {exercise.notes ? (
        <View style={styles.notesBlock}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notes}>{exercise.notes}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  errorText: { ...theme.font.body, color: theme.colors.text },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xl },
  title: { ...theme.font.title, color: theme.colors.text, marginBottom: theme.space.lg },
  row: {
    paddingVertical: theme.space.md,
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.border,
  },
  label: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: 4 },
  value: { ...theme.font.body, color: theme.colors.text, textTransform: 'capitalize' },
  notesBlock: {
    marginTop: theme.space.md,
    paddingTop: theme.space.md,
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.border,
  },
  notesLabel: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.sm },
  notes: { ...theme.font.body, color: theme.colors.textSecondary, lineHeight: 22 },
});
