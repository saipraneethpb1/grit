import { useQuery } from '@tanstack/react-query';
import type { AnalyticsSession } from '@/src/domain/analytics';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from './useAuth';

/** Enough for a 12-week view plus the 12 weeks it is compared against. */
export const HISTORY_WEEKS = 24;
/** PostgREST's default `max-rows`; a larger request is silently truncated. */
const PAGE_SIZE = 1000;

async function fetchTrainingHistory(userId: string): Promise<AnalyticsSession[]> {
  const since = new Date(Date.now() - HISTORY_WEEKS * 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('id, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', since)
    .order('completed_at', { ascending: true });
  if (error) throw error;
  if (!sessions?.length) return [];

  // One query for every session's sets, paged only because of the row cap: a
  // four-day lifter logs roughly 2,000 sets in 24 weeks.
  const ids = sessions.map((s) => s.id as string);
  const rows: { session_id: string; exercise_id: string; exercise_name: string; reps: number | null; weight: number | string | null }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error: setsError } = await supabase
      .from('session_sets')
      .select('session_id, exercise_id, exercise_name, reps, weight')
      .in('session_id', ids)
      .eq('completed', true)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (setsError) throw setsError;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const bySession = new Map<string, AnalyticsSession['sets']>();
  for (const r of rows) {
    const bucket = bySession.get(r.session_id) ?? [];
    bucket.push({
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      reps: r.reps == null ? null : Number(r.reps),
      // `numeric` arrives as a string through PostgREST.
      weight: r.weight == null ? null : Number(r.weight),
    });
    bySession.set(r.session_id, bucket);
  }

  return sessions.map((s) => ({
    id: s.id as string,
    completedAt: s.completed_at as string,
    sets: bySession.get(s.id as string) ?? [],
  }));
}

/**
 * Completed sessions from the last 24 weeks, with their completed sets. Keyed
 * under `sessions` so finishing a workout (which invalidates that prefix)
 * refreshes the analytics too.
 */
export function useTrainingHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sessions', user?.id, 'analytics', HISTORY_WEEKS],
    enabled: Boolean(user?.id),
    queryFn: () => fetchTrainingHistory(user!.id),
  });
}
