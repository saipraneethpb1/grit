import type {
  GeneratedPlan,
  GeneratedPlanDay,
  MuscleGroup,
  PlanDayWithExercises,
  WorkoutPlanWithDays,
} from './types';

export interface DayTrainingAnalysis {
  totalSets: number;
  estimatedMinutes: number;
  directlyCovered: MuscleGroup[];
  missingDirectCoverage: MuscleGroup[];
  effectiveSets: Partial<Record<MuscleGroup, number>>;
}

export interface PlanTrainingAnalysis {
  totalSets: number;
  estimatedMinutes: number;
  coveragePercent: number;
  missingDirectCoverage: MuscleGroup[];
  days: DayTrainingAnalysis[];
}

type AnalyzableDay = GeneratedPlanDay | PlanDayWithExercises;
type AnalyzablePlan = GeneratedPlan | WorkoutPlanWithDays;

function dayExercises(day: AnalyzableDay) {
  return 'exercises' in day ? day.exercises : day.plan_exercises;
}

/**
 * Audits a workout using the atlas-style distinction between prime movers and
 * secondary muscles. The time estimate is deliberately a planning heuristic,
 * not a claim taken from the book: ~2.5 minutes per work set plus transitions.
 */
export function analyzeTrainingDay(day: AnalyzableDay): DayTrainingAnalysis {
  const exercises = dayExercises(day);
  const effectiveSets: Partial<Record<MuscleGroup, number>> = {};
  const directlyCovered = new Set<MuscleGroup>();
  let totalSets = 0;

  for (const item of exercises) {
    const sets = item.target_sets;
    totalSets += sets;
    for (const muscle of item.exercise.primary_muscles) {
      directlyCovered.add(muscle);
      effectiveSets[muscle] = (effectiveSets[muscle] ?? 0) + sets;
    }
    for (const muscle of item.exercise.secondary_muscles) {
      effectiveSets[muscle] = (effectiveSets[muscle] ?? 0) + sets * 0.5;
    }
  }

  return {
    totalSets,
    estimatedMinutes: Math.ceil(totalSets * 2.5 + exercises.length * 2),
    directlyCovered: [...directlyCovered],
    missingDirectCoverage: day.focus_muscles.filter((m) => !directlyCovered.has(m)),
    effectiveSets,
  };
}

export function analyzeTrainingPlan(plan: AnalyzablePlan): PlanTrainingAnalysis {
  const planDays = 'days' in plan ? plan.days : plan.plan_days;
  const days = planDays.map(analyzeTrainingDay);
  const requested = new Set(planDays.flatMap((day) => day.focus_muscles));
  const covered = new Set(days.flatMap((day) => day.directlyCovered));
  const missingDirectCoverage = [...requested].filter((m) => !covered.has(m));

  return {
    totalSets: days.reduce((sum, day) => sum + day.totalSets, 0),
    estimatedMinutes: days.reduce((sum, day) => sum + day.estimatedMinutes, 0),
    coveragePercent: requested.size
      ? Math.round((([...requested].filter((m) => covered.has(m)).length) / requested.size) * 100)
      : 100,
    missingDirectCoverage,
    days,
  };
}
