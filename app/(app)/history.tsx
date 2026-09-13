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
      <View style={styles.cardHead}>
        <Text style={styles.day}>{session.dayName}</Text>
        <Text style={styles.when}>{session.when}</Text>
      </View>
      <Text style={styles.meta}>
        {session.setCount} sets{session.volume > 0 ? ` · ${session.volume} kg moved` : ''}
      </Text>

      {session.exercises.map((ex) => (
        <View key={ex.name} style={styles.exBlock}>
          <Text style={styles.exName}>{ex.name}</Text>
          <Text style={styles.setLine}>
            {ex.sets.map((s) => `${s.weight ?? '—'} × ${s.reps ?? '—'}`).join('   ')}
          </Text>
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
        <ActivityIndicator color={theme.colors.accent} />
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
          tintColor={theme.colors.accent}
          colors={[theme.colors.accent]}
          progressBackgroundColor={theme.colors.surface}
        />
      }
      ListHeaderComponent={
        sessions.length > 0 ? <Text style={styles.kicker}>Completed sessions</Text> : null
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
  kicker: { ...theme.font.kicker, color: theme.colors.textDim, marginBottom: 10 },
  card: { ...theme.card, padding: 14, marginBottom: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  day: { ...theme.font.bodyMedium, fontSize: 14.5, color: theme.colors.text, flex: 1 },
  when: { ...theme.font.monoSmall, fontSize: 11.5, color: theme.colors.textDim },
  meta: { ...theme.font.small, color: theme.colors.textDim, marginTop: 3 },
  exBlock: { marginTop: 10 },
  exName: { ...theme.font.caption, color: theme.colors.textSecondary },
  setLine: { ...theme.font.monoSmall, fontSize: 11.5, color: theme.colors.textDim, marginTop: 2 },
});
