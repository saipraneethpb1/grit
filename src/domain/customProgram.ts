import { getExerciseById } from './catalog';
import type { GeneratedPlan } from './types';

export type CustomLift = { exerciseId: string; sets: string; minReps: string; maxReps: string };
export type CustomDay = { name: string; exercises: CustomLift[] };
export type CustomDraft = { name: string; days: CustomDay[] };
export const newCustomDay = (index: number): CustomDay => ({ name: `Day ${index + 1}`, exercises: [] });

export function buildCustomProgram(draft: CustomDraft): GeneratedPlan {
  const name = draft.name.trim();
  if (!name || name.length > 120) throw new Error('Enter a program name (up to 120 characters).');
  if (draft.days.length < 1 || draft.days.length > 7) throw new Error('Add 1–7 training days.');
  return {
    template_id: 'custom', name,
    days: draft.days.map((day, dayIndex) => {
      const dayName = day.name.trim();
      if (!dayName || dayName.length > 80) throw new Error(`Name day ${dayIndex + 1} (up to 80 characters).`);
      if (!day.exercises.length || day.exercises.length > 30) throw new Error(`Add 1–30 exercises to ${dayName}.`);
      const exercises = day.exercises.map((lift, index) => {
        const exercise = getExerciseById(lift.exerciseId);
        if (!exercise) throw new Error(`Choose a valid exercise for ${dayName}.`);
        const values = [lift.sets, lift.minReps, lift.maxReps];
        if (values.some(value => !/^\d+$/.test(value))) throw new Error(`Enter whole numbers for ${exercise.name}.`);
        const [sets, min, max] = values.map(Number);
        if (sets < 1 || sets > 30 || min < 1 || max > 100 || min > max) {
          throw new Error(`${exercise.name}: use 1–30 sets and a rep range from 1–100.`);
        }
        return { exercise_id: exercise.id, exercise, sort_order: index, target_sets: sets, target_reps_min: min, target_reps_max: max };
      });
      return { day_index: dayIndex, name: dayName, focus_muscles: [...new Set(exercises.flatMap(lift => lift.exercise.primary_muscles))], exercises };
    }),
  };
}

export function moveItem<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const result = [...items];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
