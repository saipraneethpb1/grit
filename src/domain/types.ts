export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'traps';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'smith_machine'
  | 'ez_bar'
  | 'band';

export type MovementPattern =
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'isolation'
  | 'carry'
  | 'core';

export interface Exercise {
  id: string;
  name: string;
  primary_muscles: MuscleGroup[];
  secondary_muscles: MuscleGroup[];
  equipment: Equipment[];
  movement_pattern: MovementPattern;
  default_sets: number;
  default_reps_min: number;
  default_reps_max: number;
  notes: string | null;
}

export interface SplitTemplate {
  id: string;
  name: string;
  description: string;
  days_per_week: number;
  is_active: boolean;
}

export interface SplitTemplateDay {
  id: string;
  template_id: string;
  day_index: number;
  name: string;
  focus_muscles: MuscleGroup[];
}

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  template_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanDay {
  id: string;
  plan_id: string;
  day_index: number;
  name: string;
  focus_muscles: MuscleGroup[];
}

export interface PlanExercise {
  id: string;
  plan_day_id: string;
  exercise_id: string;
  sort_order: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
}

export interface PlanExerciseWithDetails extends PlanExercise {
  exercise: Exercise;
}

export interface PlanDayWithExercises extends PlanDay {
  plan_exercises: PlanExerciseWithDetails[];
}

export interface WorkoutPlanWithDays extends WorkoutPlan {
  plan_days: PlanDayWithExercises[];
  split_templates?: SplitTemplate | null;
}

/** In-memory shape produced by the plan generator before save */
export interface GeneratedPlanDay {
  day_index: number;
  name: string;
  focus_muscles: MuscleGroup[];
  exercises: GeneratedPlanExercise[];
}

export interface GeneratedPlanExercise {
  exercise_id: string;
  exercise: Exercise;
  sort_order: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
}

export interface GeneratedPlan {
  template_id: string;
  name: string;
  days: GeneratedPlanDay[];
}

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface WorkoutSession {
  id: string;
  user_id: string;
  plan_id: string;
  plan_day_id: string;
  day_name: string;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
}

export interface SessionSet {
  id: string;
  session_id: string;
  plan_exercise_id: string | null;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  target_reps: number | null;
  reps: number | null;
  weight: number | null;
  completed: boolean;
  completed_at: string | null;
}

export interface WorkoutSessionWithSets extends WorkoutSession {
  session_sets: SessionSet[];
}

/** Local working set during an active workout */
export interface LiveSet {
  setNumber: number;
  targetReps: number;
  reps: string;
  weight: string;
  completed: boolean;
}

export interface LiveExercise {
  planExerciseId: string;
  exerciseId: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  notes: string | null;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  previousBest?: { weight: number; reps: number } | null;
  sets: LiveSet[];
}

export interface ProfileExtended extends Profile {
  current_day_index: number;
  workouts_completed: number;
  current_streak: number;
  last_workout_date: string | null;
}

