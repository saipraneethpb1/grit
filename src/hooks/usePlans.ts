import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getExerciseById } from '@/src/domain/catalog';
import type {
  GeneratedPlan,
  MuscleGroup,
  PlanDayWithExercises,
  PlanExerciseWithDetails,
  WorkoutPlan,
  WorkoutPlanWithDays,
} from '@/src/domain/types';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from './useAuth';

async function fetchActivePlan(userId: string): Promise<WorkoutPlanWithDays | null> {
  const { data: plan, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  if (!plan) return null;

  return hydratePlan(plan as WorkoutPlan);
}

async function fetchPlanById(planId: string): Promise<WorkoutPlanWithDays | null> {
  const { data: plan, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  if (error) throw error;
  if (!plan) return null;

  return hydratePlan(plan as WorkoutPlan);
}

async function hydratePlan(plan: WorkoutPlan): Promise<WorkoutPlanWithDays> {
  const { data: days, error: daysError } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_index', { ascending: true });

  if (daysError) throw daysError;

  const dayRows = days ?? [];
  if (dayRows.length === 0) return { ...plan, plan_days: [] };

  // Every day's exercises in one request. A query per day meant a 6-day split
  // cost seven sequential round trips on each plan open.
  const { data: planExercises, error: peError } = await supabase
    .from('plan_exercises')
    .select('*')
    .in(
      'plan_day_id',
      dayRows.map((d) => d.id)
    )
    .order('sort_order', { ascending: true });

  if (peError) throw peError;

  const byDay = new Map<string, PlanExerciseWithDetails[]>();
  for (const pe of planExercises ?? []) {
    const local = getExerciseById(pe.exercise_id);
    const withDetails: PlanExerciseWithDetails = {
      ...pe,
      exercise: local ?? {
        id: pe.exercise_id,
        name: 'Unknown exercise',
        primary_muscles: [],
        secondary_muscles: [],
        equipment: [],
        movement_pattern: 'isolation' as const,
        default_sets: pe.target_sets,
        default_reps_min: pe.target_reps_min,
        default_reps_max: pe.target_reps_max,
        notes: null,
      },
    };

    const bucket = byDay.get(pe.plan_day_id);
    if (bucket) bucket.push(withDetails);
    else byDay.set(pe.plan_day_id, [withDetails]);
  }

  const planDays: PlanDayWithExercises[] = dayRows.map((day) => ({
    ...day,
    focus_muscles: day.focus_muscles as MuscleGroup[],
    plan_exercises: byDay.get(day.id) ?? [],
  }));

  return { ...plan, plan_days: planDays };
}

async function saveGeneratedPlan(
  generated: GeneratedPlan
): Promise<string> {
  const { data, error } = await supabase.rpc('save_generated_plan', { payload: generated });
  if (error) throw error;
  return data as string;
}

export function useActivePlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['activePlan', user?.id],
    queryFn: () => fetchActivePlan(user!.id),
    enabled: Boolean(user?.id),
  });
}

export function usePlan(planId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['plan', user?.id, planId],
    queryFn: () => fetchPlanById(planId!),
    enabled: Boolean(user?.id && planId),
  });
}

export function useSavePlan() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (generated: GeneratedPlan) => {
      if (!user) throw new Error('Not signed in');
      return saveGeneratedPlan(generated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activePlan'] });
      qc.invalidateQueries({ queryKey: ['profileStats'] });
    },
  });
}
