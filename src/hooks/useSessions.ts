import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  pickPreviousBests,
  type PreviousBest,
  type PreviousBestRow,
} from '@/src/domain/liveWorkout';
import {
  levelFromXp,
  newlyEarned,
  sessionVolume,
  xpForSession,
  type ProgressStats,
  type WorkoutCompletionResult,
} from '@/src/domain/progression';

export type { WorkoutCompletionResult };
import {
  buildCompletedSetRows,
  localDateString,
  nextRotationIndex,
  nextStreak,
} from '@/src/domain/sessionComplete';
import type {
  LiveExercise,
  PlanDayWithExercises,
  SessionSet,
  WorkoutSession,
  WorkoutSessionWithSets,
} from '@/src/domain/types';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from './useAuth';

const PREVIOUS_BEST_SESSION_WINDOW = 10;

/**
 * Last logged weight × reps for every exercise on the day, in two queries.
 *
 * Doing this per exercise meant up to 88 sequential round trips before the
 * workout screen could render, which read as a multi-second freeze on mobile
 * data. Batching keeps the player's cold start to a single pair of requests.
 */
export async function fetchPreviousBests(
  userId: string,
  exerciseIds: string[]
): Promise<Record<string, PreviousBest>> {
  const uniqueIds = [...new Set(exerciseIds)];
  if (uniqueIds.length === 0) return {};

  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(PREVIOUS_BEST_SESSION_WINDOW);

  if (sessionsError || !sessions?.length) return {};

  const sessionOrder = sessions.map((s) => s.id as string);

  const { data: sets, error: setsError } = await supabase
    .from('session_sets')
    .select('session_id, exercise_id, set_number, weight, reps')
    .in('session_id', sessionOrder)
    .in('exercise_id', uniqueIds)
    .eq('completed', true);

  if (setsError || !sets?.length) return {};

  return pickPreviousBests(sessionOrder, sets as PreviousBestRow[]);
}

export function buildLiveExercises(day: PlanDayWithExercises): LiveExercise[] {
  return day.plan_exercises.map((pe) => {
    const targetReps = pe.target_reps_max || pe.target_reps_min || 10;
    const sets = Array.from({ length: pe.target_sets }, (_, i) => ({
      setNumber: i + 1,
      targetReps,
      reps: String(targetReps),
      weight: '',
      completed: false,
    }));

    return {
      planExerciseId: pe.id,
      exerciseId: pe.exercise_id,
      name: pe.exercise.name,
      primaryMuscles: pe.exercise.primary_muscles,
      notes: pe.exercise.notes,
      targetSets: pe.target_sets,
      targetRepsMin: pe.target_reps_min,
      targetRepsMax: pe.target_reps_max,
      previousBest: null,
      sets,
    };
  });
}

export async function enrichWithHistory(
  userId: string,
  exercises: LiveExercise[]
): Promise<LiveExercise[]> {
  const bests = await fetchPreviousBests(
    userId,
    exercises.map((ex) => ex.exerciseId)
  );

  return exercises.map((ex) => {
    const prev = bests[ex.exerciseId] ?? null;
    if (!prev) return { ...ex, previousBest: null };
    return {
      ...ex,
      previousBest: prev,
      sets: ex.sets.map((s) => ({
        ...s,
        weight: String(prev.weight),
        reps: String(prev.reps),
      })),
    };
  });
}

export async function startSession(params: {
  userId: string;
  planId: string;
  planDayId: string;
  dayName: string;
}): Promise<WorkoutSession> {
  // Abandon any stuck in-progress sessions
  await supabase
    .from('workout_sessions')
    .update({ status: 'abandoned' })
    .eq('user_id', params.userId)
    .eq('status', 'in_progress');

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: params.userId,
      plan_id: params.planId,
      plan_day_id: params.planDayId,
      day_name: params.dayName,
      status: 'in_progress',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as WorkoutSession;
}

/**
 * Release a session the user started but left without saving, so the next
 * `startSession` is not competing with a stale `in_progress` row.
 */
export async function abandonSession(sessionId: string): Promise<void> {
  await supabase
    .from('workout_sessions')
    .update({ status: 'abandoned' })
    .eq('id', sessionId)
    .eq('status', 'in_progress');
}

/**
 * True when a write failed only because migration 004 has not been applied.
 *
 * Postgres reports an unknown column as 42703; PostgREST rejects it earlier,
 * from its own schema cache, as PGRST204. The app ships through the Play Store
 * while migrations are run by hand, so a build can reach a user before the SQL
 * does — and a finished workout must never be lost to that ordering.
 */
function isMissingProgressionColumn(error: { code?: string } | null): boolean {
  return error?.code === '42703' || error?.code === 'PGRST204';
}

/** Shape of the profile row the progression rules read and write. */
export type ProfileRow = {
  id: string;
  display_name: string | null;
  current_day_index: number;
  workouts_completed: number;
  current_streak: number;
  last_workout_date: string | null;
  total_xp: number;
  longest_streak: number;
  total_sets: number;
  total_volume: number;
};

const PROGRESS_COLUMNS =
  'workouts_completed, current_streak, longest_streak, last_workout_date, current_day_index, total_xp, total_sets, total_volume';

/** The same row as it exists before migration 004. */
const LEGACY_PROGRESS_COLUMNS =
  'workouts_completed, current_streak, last_workout_date, current_day_index';

/**
 * Missing columns read as zero rather than NaN — migration 004 backfills real
 * values, but a client running against a database that has not had it applied
 * yet should show an empty trophy case, not a broken one.
 */
export function toProgressStats(profile: Partial<ProfileRow> | null | undefined): ProgressStats {
  return {
    workoutsCompleted: profile?.workouts_completed ?? 0,
    currentStreak: profile?.current_streak ?? 0,
    longestStreak: profile?.longest_streak ?? 0,
    totalSets: profile?.total_sets ?? 0,
    totalVolume: Number(profile?.total_volume ?? 0),
    totalXp: profile?.total_xp ?? 0,
  };
}

export async function completeSession(params: {
  sessionId: string;
  userId: string;
  exercises: LiveExercise[];
  dayCount: number;
  /** day_index of the plan day that was just trained */
  finishedDayIndex: number;
}): Promise<WorkoutCompletionResult> {
  const rows = buildCompletedSetRows(params.sessionId, params.exercises);

  if (!rows.length) {
    throw new Error('Log at least one set before finishing.');
  }

  const { error: setsError } = await supabase.from('session_sets').insert(rows);
  if (setsError) throw setsError;

  const { error } = await supabase
    .from('workout_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', params.sessionId);

  if (error) throw error;

  const today = localDateString();

  let { data: profile, error: readError } = await supabase
    .from('profiles')
    .select(PROGRESS_COLUMNS)
    .eq('id', params.userId)
    .maybeSingle();

  if (isMissingProgressionColumn(readError)) {
    ({ data: profile } = await supabase
      .from('profiles')
      .select(LEGACY_PROGRESS_COLUMNS)
      .eq('id', params.userId)
      .maybeSingle());
  }

  const before = toProgressStats(profile as Partial<ProfileRow> | null);

  const streak = nextStreak({
    lastWorkoutDate: (profile as Partial<ProfileRow> | null)?.last_workout_date,
    currentStreak: before.currentStreak,
    today,
    daysPerWeek: params.dayCount,
  });

  const nextDay = nextRotationIndex({
    finishedDayIndex: params.finishedDayIndex,
    rotationIndex: (profile as Partial<ProfileRow> | null)?.current_day_index ?? 0,
    dayCount: params.dayCount,
  });

  const volume = sessionVolume(rows);
  const xp = xpForSession({ setsCompleted: rows.length, streak });

  const after: ProgressStats = {
    workoutsCompleted: before.workoutsCompleted + 1,
    currentStreak: streak,
    longestStreak: Math.max(before.longestStreak, streak),
    totalSets: before.totalSets + rows.length,
    totalVolume: before.totalVolume + volume,
    totalXp: before.totalXp + xp.total,
  };

  // Rotation and streak predate the gamification columns, so they are written
  // separately: if 004 has not run, the program still advances and only the XP
  // half is skipped.
  const rotationUpdate = {
    current_day_index: nextDay,
    workouts_completed: after.workoutsCompleted,
    current_streak: after.currentStreak,
    last_workout_date: today,
  };

  let progressionStored = true;
  let { error: profileError } = await supabase
    .from('profiles')
    .update({
      ...rotationUpdate,
      longest_streak: after.longestStreak,
      total_xp: after.totalXp,
      total_sets: after.totalSets,
      total_volume: after.totalVolume,
    })
    .eq('id', params.userId);

  if (isMissingProgressionColumn(profileError)) {
    progressionStored = false;
    ({ error: profileError } = await supabase
      .from('profiles')
      .update(rotationUpdate)
      .eq('id', params.userId));
  }

  if (profileError) throw profileError;

  const levelBefore = levelFromXp(before.totalXp);
  const levelAfter = levelFromXp(after.totalXp);

  return {
    setsCompleted: rows.length,
    volume,
    streak,
    xp,
    before,
    after,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter.level > levelBefore.level,
    newAchievements: progressionStored ? newlyEarned(before, after) : [],
    progressionStored,
  };
}

export function useRecentSessions(limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sessions', user?.id, limit],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<WorkoutSessionWithSets[]> => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const rows = (data ?? []) as WorkoutSession[];
      if (rows.length === 0) return [];

      // One query for every session's sets — fetching them per session made the
      // history tab issue 31 sequential requests before it could paint.
      const { data: sets, error: setsError } = await supabase
        .from('session_sets')
        .select('*')
        .in(
          'session_id',
          rows.map((s) => s.id)
        )
        .order('set_number', { ascending: true });

      if (setsError) throw setsError;

      const bySession = new Map<string, SessionSet[]>();
      for (const set of (sets ?? []) as SessionSet[]) {
        const bucket = bySession.get(set.session_id);
        if (bucket) bucket.push(set);
        else bySession.set(set.session_id, [set]);
      }

      return rows.map((session) => ({
        ...session,
        session_sets: bySession.get(session.id) ?? [],
      }));
    },
  });
}

export function useProfileStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profileStats', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  });
}

export function useCompleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completeSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['profileStats'] });
      qc.invalidateQueries({ queryKey: ['activePlan'] });
      qc.invalidateQueries({ queryKey: ['previousBests'] });
    },
  });
}

/**
 * Last logged weight × reps for a set of exercises, for screens that only
 * display it (day detail). The player fetches its own copy through
 * `enrichWithHistory` because it also pre-fills the inputs from it.
 */
export function usePreviousBests(exerciseIds: string[]) {
  const { user } = useAuth();
  // Sorted and joined so the key is stable however the caller orders the ids.
  const key = [...new Set(exerciseIds)].sort().join(',');
  return useQuery({
    queryKey: ['previousBests', user?.id, key],
    enabled: Boolean(user?.id && key),
    queryFn: () => fetchPreviousBests(user!.id, key.split(',')),
  });
}
