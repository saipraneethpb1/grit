import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '@/constants/theme';
import { EmptyState } from '@/src/components/EmptyState';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import type { SessionSet, WorkoutSessionWithSets } from '@/src/domain/types';
import { useRecentSessions } from '@/src/hooks/useSessions';

type SessionSummary = {
  id: string;
  dayName: string;
  when: string;
  setCount: number;
  volume: number;
  exercises: { name: string; sets: SessionSet[] }[];
};

function summarize(session: WorkoutSessionWithSets): SessionSummary {
  const sets = session.session_sets.filter((s) => s.completed);

  let volume = 0;
  const byExercise = new Map<string, SessionSet[]>();

  for (const set of sets) {
    volume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
    const key = set.exercise_name || set.exercise_id;
    const bucket = byExercise.get(key);
    if (bucket) bucket.push(set);
    else byExercise.set(key, [set]);
  }

  return {
    id: session.id,
    dayName: session.day_name,
    when: session.completed_at
      ? new Date(session.completed_at).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '—',
    setCount: sets.length,
    volume: Math.round(volume),
    exercises: [...byExercise.entries()].map(([name, exSets]) => ({ name, sets: exSets })),
  };
}

function SessionCard({ session }: { session: SessionSummary }) {
  return (
    <View style={styles.card}>
      <Text style={styles.day}>{session.dayName}</Text>
      <Text style={styles.meta}>
        {session.when} · {session.setCount} sets · {session.volume} kg
      </Text>

      {session.exercises.map((ex) => (
        <View key={ex.name} style={styles.exBlock}>
          <Text style={styles.exName}>{ex.name}</Text>
          {ex.sets.map((s) => (
            <Text key={s.id} style={styles.setLine}>
              {s.set_number}. {s.weight ?? '—'} kg × {s.reps ?? '—'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function HistoryScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useRecentSessions(30);

  // Volume and per-exercise grouping are derived once per fetch rather than on
  // every scroll frame.
  const sessions = useMemo(() => (data ?? []).map(summarize), [data]);

  const renderItem = useCallback(
    ({ item }: { item: SessionSummary }) => <SessionCard session={item} />,
    []
  );

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
        <EmptyState
          title="Couldn't load history"
          message={
            error instanceof Error
              ? error.message
              : 'Could not load history. Run 002_sessions.sql if you have not.'
          }
          action={<PrimaryButton title="Retry" onPress={() => refetch()} />}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      data={sessions}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={[
        styles.content,
        sessions.length === 0 && styles.contentEmpty,
      ]}
      initialNumToRender={6}
      windowSize={7}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.colors.textSecondary}
          colors={[theme.colors.text]}
          progressBackgroundColor={theme.colors.card}
        />
      }
      ListHeaderComponent={
        sessions.length > 0 ? <Text style={styles.subtitle}>Completed sessions</Text> : null
      }
      ListEmptyComponent={
        <EmptyState
          title="No sessions yet"
          message="Finish a workout and it will show up here with every set you logged."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  content: { padding: theme.space.lg, paddingBottom: theme.space.xl },
  contentEmpty: { flexGrow: 1, justifyContent: 'center' },
  subtitle: { ...theme.font.caption, color: theme.colors.textMuted, marginBottom: theme.space.md },
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
