import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { useRecentSessions } from '@/src/hooks/useSessions';

export default function HistoryScreen() {
  const { data, isLoading, error } = useRecentSessions(30);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { padding: theme.space.lg }]}>
        <Text style={styles.error}>
          {error instanceof Error
            ? error.message
            : "Could not load history. Run 002_sessions.sql if you have not."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>Completed sessions</Text>

      {(data ?? []).length === 0 ? (
        <Text style={styles.empty}>No sessions yet.</Text>
      ) : (
        (data ?? []).map((session) => {
          const sets = session.session_sets.filter((s) => s.completed);
          const volume = sets.reduce(
            (n, s) => n + (Number(s.weight) || 0) * (Number(s.reps) || 0),
            0
          );
          const byExercise = new Map<string, typeof sets>();
          for (const s of sets) {
            const key = s.exercise_name || s.exercise_id;
            if (!byExercise.has(key)) byExercise.set(key, []);
            byExercise.get(key)!.push(s);
          }

          return (
            <View key={session.id} style={styles.card}>
              <Text style={styles.day}>{session.day_name}</Text>
              <Text style={styles.meta}>
                {session.completed_at
                  ? new Date(session.completed_at).toLocaleString()
                  : '—'}{' '}
                · {sets.length} sets · {Math.round(volume)} kg
              </Text>

              {[...byExercise.entries()].map(([name, exSets]) => (
                <View key={name} style={styles.exBlock}>
                  <Text style={styles.exName}>{name}</Text>
                  {exSets.map((s) => (
                    <Text key={s.id} style={styles.setLine}>
                      {s.set_number}. {s.weight ?? '—'} kg × {s.reps ?? '—'}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xl },
  subtitle: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.md },
  empty: { ...theme.font.body, color: theme.colors.textMuted, marginTop: theme.space.lg },
  error: { ...theme.font.body, color: theme.colors.text, textAlign: 'center' },
  card: {
    borderTopWidth: theme.hairline,
    borderTopColor: theme.colors.border,
    paddingVertical: theme.space.md,
  },
  day: { ...theme.font.bodyMedium, color: theme.colors.text, marginBottom: 4 },
  meta: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.sm },
  exBlock: { marginTop: theme.space.sm },
  exName: { ...theme.font.caption, color: theme.colors.textSecondary, marginBottom: 2 },
  setLine: { ...theme.font.caption, color: theme.colors.textMuted, lineHeight: 20 },
});
