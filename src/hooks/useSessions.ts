import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  pickPreviousBests,
  type PreviousBest,
  type PreviousBestRow,
} from '@/src/domain/liveWorkout';
import {
  levelFromXp,
  newlyEarned,
  type ProgressStats,
  type WorkoutCompletionResult,
} from '@/src/domain/progression';

export type { WorkoutCompletionResult };
import {
  buildCompletedSetRows,
  localDateString,
} from '@/src/domain/sessionComplete';
import type {
  LiveExercise,
  PlanDayWithExercises,
  SessionSet,
  WorkoutSession,
  WorkoutSessionWithSets,
} from '@/src/domain/types';
import { supabase } from '@/src/lib/supabase';
import {
  deloadSets,
  isCompoundPattern,
  pickExerciseHistory,
  prescribe,
  type Exposure,
  type HistoryRow,
  type TrainingAge,
} from '@/src/domain/coach';
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
      movementPattern: pe.exercise.movement_pattern,
      equipment: pe.exercise.equipment,
      prescription: null,
      sets,
    };
  });
}

export type CoachContext = { age: TrainingAge; deload: boolean; daysSinceLastWorkout: number | null };

/**
 * Past exposures and previous bests for the day's exercises in one pair of
 * requests, the same shape as `fetchPreviousBests`.
 */
async function fetchExerciseHistory(userId: string, exerciseIds: string[]) {
  const uniqueIds = [...new Set(exerciseIds)];
  const empty = { bests: {} as Record<string, PreviousBest>, history: {} as Record<string, Exposure[]> };
  if (uniqueIds.length === 0) return empty;
  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(PREVIOUS_BEST_SESSION_WINDOW);
  if (sessionsError || !sessions?.length) return empty;
  const order = sessions.map((s) => ({ id: s.id as string, completedAt: (s.completed_at as string) ?? '' }));
  const { data: sets, error: setsError } = await supabase
    .from('session_sets')
    .select('session_id, exercise_id, set_number, weight, reps')
    .in('session_id', order.map((o) => o.id))
    .in('exercise_id', uniqueIds)
    .eq('completed', true);
  if (setsError || !sets?.length) return empty;
  return {
    bests: pickPreviousBests(order.map((o) => o.id), sets as PreviousBestRow[]),
    history: pickExerciseHistory(order, sets as HistoryRow[]),
  };
}

/**
 * Attaches the coach's prescription to every exercise and pre-fills the inputs
 * from it: the recommended load (or last load when the coach has none) and the
 * rep goal. A deload week also halves the set count.
 */
export async function enrichWithHistory(
  userId: string,
  exercises: LiveExercise[],
  context: CoachContext = { age: 'beginner', deload: false, daysSinceLastWorkout: null }
): Promise<LiveExercise[]> {
  const { bests, history } = await fetchExerciseHistory(userId, exercises.map((ex) => ex.exerciseId));
  const firstCompound = exercises.findIndex((ex) => ex.movementPattern && isCompoundPattern(ex.movementPattern));

  return exercises.map((ex, index) => {
    const prev = bests[ex.exerciseId] ?? null;
    const prescription = ex.movementPattern
      ? prescribe({
          exercise: { name: ex.name, equipment: ex.equipment ?? [], movement_pattern: ex.movementPattern },
          target: { sets: ex.targetSets, repsMin: ex.targetRepsMin, repsMax: ex.targetRepsMax },
          history: history[ex.exerciseId] ?? [],
          age: context.age,
          firstCompound: index === firstCompound,
          daysSinceLastWorkout: context.daysSinceLastWorkout,
          deload: context.deload,
        })
      : null;
    const weight = prescription?.weight ?? prev?.weight ?? null;
    const reps = prescription?.reps ?? prev?.reps ?? null;
    const setCount = context.deload ? deloadSets(ex.sets.length) : ex.sets.length;
    return {
      ...ex,
      previousBest: prev,
      prescription,
      sets: ex.sets.slice(0, setCount).map((s) => ({
        ...s,
        weight: weight == null ? s.weight : String(weight),
        reps: reps == null ? s.reps : String(reps),
      })),
    };
  });
}

type StartSessionParams = {
  userId: string;
  planId: string;
  planDayId: string;
  dayName: string;
};

/**
 * One round trip via `start_workout_session` (migration 007), which abandons a
 * stale `in_progress` row and opens the new one in the same transaction.
 */
export async function startSession(params: StartSessionParams): Promise<WorkoutSession> {
  const { data, error } = await supabase.rpc('start_workout_session', {
    p_plan_day_id: params.planDayId,
  });
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

type CompleteSessionParams = {
  sessionId: string;
  userId: string;
  exercises: LiveExercise[];
  dayCount: number;
  /** day_index of the plan day that was just trained */
  finishedDayIndex: number;
};

/** What `complete_workout_session` returns; field names match ProgressStats. */
type CompletionRpcResult = {
  counted: boolean;
  setsCompleted: number;
  volume: number | string;
  streak: number;
  xp: WorkoutCompletionResult['xp'];
  before: ProgressStats;
  after: ProgressStats;
};

/** `numeric` columns can arrive as strings through PostgREST. */
function normalizeStats(stats: ProgressStats): ProgressStats {
  return { ...stats, totalVolume: Number(stats.totalVolume ?? 0) };
}

/**
 * Finish a workout in one atomic request (`complete_workout_session`, migration
 * 007; since 008 the only path that may change progress, sets or session status). Sets, session status and every profile counter commit together or not
 * at all, and the profile row is locked so two devices finishing at once
 * cannot overwrite each other's XP. A retry after a lost response is a no-op.
 *
 * The streak, rotation and XP rules run server-side but mirror
 * `sessionComplete.ts` / `progression.ts`; `test-database` checks they agree.
 */
export async function completeSession(
  params: CompleteSessionParams
): Promise<WorkoutCompletionResult> {
  const rows = buildCompletedSetRows(params.sessionId, params.exercises);

  if (!rows.length) {
    throw new Error('Log at least one set before finishing.');
  }

  const { data, error } = await supabase.rpc('complete_workout_session', {
    p_session_id: params.sessionId,
    p_sets: rows.map(({ session_id: _session, completed: _done, completed_at: _at, ...set }) => set),
    p_today: localDateString(),
  });
  if (error) throw error;

  const result = data as CompletionRpcResult;
  const before = normalizeStats(result.before);
  const after = normalizeStats(result.after);
  const levelBefore = levelFromXp(before.totalXp);
  const levelAfter = levelFromXp(after.totalXp);

  return {
    setsCompleted: result.setsCompleted,
    volume: Number(result.volume),
    streak: result.streak,
    xp: result.xp,
    before,
    after,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter.level > levelBefore.level,
    newAchievements: result.counted ? newlyEarned(before, after) : [],
    progressionStored: true,
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
