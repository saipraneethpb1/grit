import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  LiveExercise,
  PlanDayWithExercises,
  SessionSet,
  WorkoutSession,
  WorkoutSessionWithSets,
} from '@/src/domain/types';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from './useAuth';

export async function fetchLastSetsForExercise(
  userId: string,
  exerciseId: string
): Promise<{ weight: number; reps: number } | null> {
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10);

  if (!sessions?.length) return null;

  for (const s of sessions) {
    const { data: sets } = await supabase
      .from('session_sets')
      .select('weight, reps, completed')
      .eq('session_id', s.id)
      .eq('exercise_id', exerciseId)
      .eq('completed', true)
      .order('set_number', { ascending: false })
      .limit(1);

    if (sets?.[0]?.weight != null && sets[0].reps != null) {
      return { weight: Number(sets[0].weight), reps: Number(sets[0].reps) };
    }
  }
  return null;
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
  const result: LiveExercise[] = [];
  for (const ex of exercises) {
    const prev = await fetchLastSetsForExercise(userId, ex.exerciseId);
    const sets = ex.sets.map((s) => ({
      ...s,
      weight: prev ? String(prev.weight) : s.weight,
      reps: prev ? String(prev.reps) : s.reps,
    }));
    result.push({ ...ex, previousBest: prev, sets });
  }
  return result;
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

export async function completeSession(params: {
  sessionId: string;
  userId: string;
  exercises: LiveExercise[];
  dayCount: number;
  currentDayIndex: number;
}): Promise<void> {
  const rows: Omit<SessionSet, 'id'>[] = [];

  for (const ex of params.exercises) {
    for (const set of ex.sets) {
      if (!set.completed && !set.weight && !set.reps) continue;
      rows.push({
        session_id: params.sessionId,
        plan_exercise_id: ex.planExerciseId,
        exercise_id: ex.exerciseId,
        exercise_name: ex.name,
        set_number: set.setNumber,
        target_reps: set.targetReps,
        reps: set.reps ? Number(set.reps) : null,
        weight: set.weight ? Number(set.weight) : null,
        completed: set.completed,
        completed_at: set.completed ? new Date().toISOString() : null,
      } as Omit<SessionSet, 'id'>);
    }
  }

  if (rows.length) {
    const { error: setsError } = await supabase.from('session_sets').insert(rows);
    if (setsError) throw setsError;
  }

  const { error } = await supabase
    .from('workout_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', params.sessionId);

  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  const nextDay =
    params.dayCount > 0
      ? (params.currentDayIndex + 1) % params.dayCount
      : 0;

  // Best-effort profile progress update
  const { data: profile } = await supabase
    .from('profiles')
    .select('workouts_completed, current_streak, last_workout_date')
    .eq('id', params.userId)
    .maybeSingle();

  let streak = 1;
  if (profile?.last_workout_date) {
    const last = new Date(profile.last_workout_date);
    const now = new Date(today);
    const diffDays = Math.round(
      (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) {
      streak = profile.current_streak ?? 1;
    } else if (diffDays === 1) {
      streak = (profile.current_streak ?? 0) + 1;
    }
  }

  await supabase
    .from('profiles')
    .update({
      current_day_index: nextDay,
      workouts_completed: (profile?.workouts_completed ?? 0) + 1,
      current_streak: streak,
      last_workout_date: today,
    })
    .eq('id', params.userId);
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

      const sessions: WorkoutSessionWithSets[] = [];
      for (const s of data ?? []) {
        const { data: sets } = await supabase
          .from('session_sets')
          .select('*')
          .eq('session_id', s.id)
          .order('set_number', { ascending: true });

        sessions.push({
          ...(s as WorkoutSession),
          session_sets: (sets ?? []) as SessionSet[],
        });
      }
      return sessions;
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
      return data as {
        id: string;
        display_name: string | null;
        current_day_index: number;
        workouts_completed: number;
        current_streak: number;
        last_workout_date: string | null;
      } | null;
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
    },
  });
}
