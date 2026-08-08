import { getSplitDays, getSplitTemplate } from './catalog';
import { getMethodology, type Methodology } from './methodologies';
import type {
  Exercise,
  GeneratedPlan,
  GeneratedPlanDay,
  GeneratedPlanExercise,
  MuscleGroup,
  MovementPattern,
} from './types';

const COMPOUND_PATTERNS: MovementPattern[] = [
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'squat',
  'hinge',
  'lunge',
];

function isCompound(ex: Exercise): boolean {
  return COMPOUND_PATTERNS.includes(ex.movement_pattern);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function scoreExercise(
  ex: Exercise,
  muscle: MuscleGroup,
  usedIds: Set<string>,
  weekUsedCount: Map<string, number>,
  slotIndex: number,
  dayIndex: number,
  methodology?: Methodology
): number {
  let score = 0;
  if (ex.primary_muscles.includes(muscle)) score += 100;
  else if (ex.secondary_muscles.includes(muscle)) score += 40;

  if (slotIndex === 0 && isCompound(ex)) score += 50;
  if (slotIndex > 0 && !isCompound(ex)) score += 20;
  if (isCompound(ex)) score += 10;

  if (usedIds.has(ex.id)) score -= 1000;
  score -= (weekUsedCount.get(ex.id) ?? 0) * 30;

  if (methodology) {
    if (methodology.favorPatterns.includes(ex.movement_pattern)) score += 25;
    if (methodology.favorMuscles.some((m) => ex.primary_muscles.includes(m))) score += 12;
    const name = ex.name.toLowerCase();
    for (const kw of methodology.avoidNameKeywords) {
      if (name.includes(kw.toLowerCase())) score -= 80;
    }
    for (const kw of methodology.favorNameKeywords) {
      if (name.includes(kw.toLowerCase())) score += 18;
    }
    if (methodology.intensityStyle === 'hit' && isCompound(ex)) score += 20;
    if (methodology.intensityStyle === 'pump_finisher' && !isCompound(ex) && slotIndex > 0) {
      score += 15;
    }
  }

  const hash = ex.id.charCodeAt(ex.id.length - 1) + dayIndex;
  score += hash % 7;
  return score;
}

function pickForMuscle(
  exercises: Exercise[],
  muscle: MuscleGroup,
  usedIds: Set<string>,
  weekUsedCount: Map<string, number>,
  dayIndex: number,
  count: number,
  startSlot: number,
  methodology?: Methodology
): Exercise[] {
  const primaryPool = exercises.filter((e) => e.primary_muscles.includes(muscle));
  // Anatomy-first planning: use a movement where the requested muscle is a
  // prime mover whenever the catalog has one. Secondary loading is a fallback.
  const pool = primaryPool.length
    ? primaryPool
    : exercises.filter((e) => e.secondary_muscles.includes(muscle));

  const picked: Exercise[] = [];
  for (let slot = startSlot; slot < startSlot + count; slot++) {
    let best: Exercise | null = null;
    let bestScore = -Infinity;
    for (const ex of pool) {
      if (picked.some((p) => p.id === ex.id)) continue;
      const s = scoreExercise(
        ex,
        muscle,
        usedIds,
        weekUsedCount,
        slot,
        dayIndex,
        methodology
      );
      if (s > bestScore) {
        bestScore = s;
        best = ex;
      }
    }
    if (best && bestScore > -500) {
      picked.push(best);
      usedIds.add(best.id);
    }
  }
  return picked;
}

function applySetRepBias(
  exercise: Exercise,
  methodology: Methodology | undefined,
  isLastOnDay: boolean
): { sets: number; min: number; max: number } {
  let sets = exercise.default_sets;
  let min = exercise.default_reps_min;
  let max = exercise.default_reps_max;

  if (methodology) {
    sets = clamp(sets + methodology.setsBias, 1, 7);
    min = clamp(min + methodology.repsMinBias, 3, 20);
    max = clamp(max + methodology.repsMaxBias, min, 25);

    if (methodology.intensityStyle === 'hit') {
      sets = 2;
      min = clamp(min, 5, 10);
      max = clamp(max, min, 12);
    }

    // FST-7 style: last isolation gets 7 short sets bias
    if (
      methodology.intensityStyle === 'pump_finisher' &&
      isLastOnDay &&
      !isCompound(exercise)
    ) {
      sets = 7;
      min = 10;
      max = 15;
    }
  }

  return { sets, min, max };
}

function toGenerated(
  exercise: Exercise,
  sortOrder: number,
  methodology: Methodology | undefined,
  isLastOnDay: boolean
): GeneratedPlanExercise {
  const { sets, min, max } = applySetRepBias(exercise, methodology, isLastOnDay);
  return {
    exercise_id: exercise.id,
    exercise,
    sort_order: sortOrder,
    target_sets: sets,
    target_reps_min: min,
    target_reps_max: max,
  };
}

export type GeneratePlanOptions = {
  templateId: string;
  exercises: Exercise[];
  methodologyId?: string;
  planName?: string;
};

/**
 * Generate a weekly plan from a split + optional methodology bias.
 * Exercises should come from the open-source curated catalog.
 */
export function generatePlan(
  templateIdOrOptions: string | GeneratePlanOptions,
  exercisesArg?: Exercise[],
  planNameArg?: string
): GeneratedPlan {
  // Support old signature generatePlan(templateId, exercises, planName?)
  const options: GeneratePlanOptions =
    typeof templateIdOrOptions === 'string'
      ? {
          templateId: templateIdOrOptions,
          exercises: exercisesArg!,
          planName: planNameArg,
        }
      : templateIdOrOptions;

  const { templateId, exercises, methodologyId, planName } = options;
  const methodology = methodologyId ? getMethodology(methodologyId) : undefined;

  const template = getSplitTemplate(templateId);
  if (!template) throw new Error(`Unknown split template: ${templateId}`);

  const templateDays = getSplitDays(templateId);
  if (templateDays.length === 0) {
    throw new Error(`No days defined for split template: ${templateId}`);
  }

  const slotsPerMuscle = methodology?.slotsPerMuscle ?? 2;
  const maxPerDay = methodology?.maxExercisesPerDay ?? 8;

  const weekUsedCount = new Map<string, number>();
  const weekDirectlyCovered = new Set<MuscleGroup>();
  const days: GeneratedPlanDay[] = [];
  const focusFrequency = new Map<MuscleGroup, number>();
  for (const templateDay of templateDays) {
    for (const muscle of templateDay.focus_muscles as MuscleGroup[]) {
      focusFrequency.set(muscle, (focusFrequency.get(muscle) ?? 0) + 1);
    }
  }

  for (const day of templateDays) {
    const usedIds = new Set<string>();
    const dayExercises: Exercise[] = [];
    const muscles = day.focus_muscles as MuscleGroup[];

    // Cover muscles not yet trained this week first, then protect muscles that
    // appear on fewer days before applying methodology preferences.
    const priorityMuscles = [...muscles].sort((a, b) => {
      const coverageDelta = Number(weekDirectlyCovered.has(a)) - Number(weekDirectlyCovered.has(b));
      if (coverageDelta !== 0) return coverageDelta;
      const frequencyDelta =
        (focusFrequency.get(a) ?? 0) - (focusFrequency.get(b) ?? 0);
      if (frequencyDelta !== 0) return frequencyDelta;
      const af = methodology?.favorMuscles.includes(a) ? 0 : 1;
      const bf = methodology?.favorMuscles.includes(b) ? 0 : 1;
      return af - bf;
    });
    const orderedMuscles = priorityMuscles;

    // Fill one slot for every focus muscle before adding a second movement.
    // This prevents larger upper/full-body days from spending the exercise
    // budget on the first few muscles and silently omitting the rest.
    for (let slot = 0; slot < slotsPerMuscle; slot++) {
      for (const muscle of orderedMuscles) {
        if (dayExercises.length >= maxPerDay) break;
        const picked = pickForMuscle(
          exercises,
          muscle,
          usedIds,
          weekUsedCount,
          day.day_index,
          1,
          slot,
          methodology
        );
        dayExercises.push(...picked);
      }
      if (dayExercises.length >= maxPerDay) break;
    }

    if (dayExercises.length === 0 && muscles.length > 0) {
      const fallback = exercises.find((e) =>
        e.primary_muscles.some((m) => muscles.includes(m))
      );
      if (fallback) dayExercises.push(fallback);
    }

    dayExercises.sort((a, b) => {
      const ac = isCompound(a) ? 0 : 1;
      const bc = isCompound(b) ? 0 : 1;
      return ac - bc;
    });

    for (const ex of dayExercises) {
      weekUsedCount.set(ex.id, (weekUsedCount.get(ex.id) ?? 0) + 1);
      for (const muscle of ex.primary_muscles) weekDirectlyCovered.add(muscle);
    }

    days.push({
      day_index: day.day_index,
      name: day.name,
      focus_muscles: muscles,
      exercises: dayExercises.map((ex, i) =>
        toGenerated(ex, i, methodology, i === dayExercises.length - 1)
      ),
    });
  }

  const methodLabel = methodology ? ` · ${methodology.name}` : '';
  return {
    template_id: templateId,
    name: planName ?? `${template.name}${methodLabel}`,
    days,
  };
}

export function validateGeneratedPlan(plan: GeneratedPlan): string[] {
  const errors: string[] = [];
  if (plan.days.length === 0) errors.push('Plan has no days');
  for (const day of plan.days) {
    if (day.exercises.length === 0) errors.push(`Day "${day.name}" has no exercises`);
    const ids = new Set<string>();
    for (const pe of day.exercises) {
      if (ids.has(pe.exercise_id)) errors.push(`Duplicate exercise on ${day.name}`);
      ids.add(pe.exercise_id);
    }
  }
  return errors;
}
