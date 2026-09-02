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
  userId: string,
  generated: GeneratedPlan
): Promise<string> {
  // Deactivate existing active plans
  await supabase
    .from('workout_plans')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true);

  // New program starts at day 0
  await supabase.from('profiles').update({ current_day_index: 0 }).eq('id', userId);

  const { data: plan, error: planError } = await supabase
    .from('workout_plans')
    .insert({
      user_id: userId,
      template_id: generated.template_id,
      name: generated.name,
      is_active: true,
    })
    .select('*')
    .single();

  if (planError) throw planError;

  for (const day of generated.days) {
    const { data: planDay, error: dayError } = await supabase
      .from('plan_days')
      .insert({
        plan_id: plan.id,
        day_index: day.day_index,
        name: day.name,
        focus_muscles: day.focus_muscles,
      })
      .select('*')
      .single();

    if (dayError) throw dayError;

    if (day.exercises.length > 0) {
      const rows = day.exercises.map((ex) => ({
        plan_day_id: planDay.id,
        exercise_id: ex.exercise_id,
        sort_order: ex.sort_order,
        target_sets: ex.target_sets,
        target_reps_min: ex.target_reps_min,
        target_reps_max: ex.target_reps_max,
      }));

      const { error: peError } = await supabase.from('plan_exercises').insert(rows);
      if (peError) throw peError;
    }
  }

  return plan.id as string;
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
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: () => fetchPlanById(planId!),
    enabled: Boolean(planId),
  });
}

export function useSavePlan() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (generated: GeneratedPlan) => {
      if (!user) throw new Error('Not signed in');
      return saveGeneratedPlan(user.id, generated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activePlan'] });
      qc.invalidateQueries({ queryKey: ['profileStats'] });
    },
  });
}
