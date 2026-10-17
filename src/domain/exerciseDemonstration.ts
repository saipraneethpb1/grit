import guides from '../../data/exercise-guides.json';
import { EXERCISE_MOTION_SPECS, getExerciseMotion } from './exerciseMotions';
import type { MotionTemplate } from './motion';

export type ExerciseDemonstration =
  | { kind: 'motion'; motion: MotionTemplate }
  | { kind: 'unavailable' };

/** Exact catalog/source identity selects the corrected articulated animation. */
export function getExerciseDemonstration(exerciseId: string): ExerciseDemonstration {
  const source = (guides as Record<string, { sourceId: string }>)[exerciseId];
  const spec = EXERCISE_MOTION_SPECS[exerciseId];
  if (!source || !spec || source.sourceId !== spec.sourceId) return { kind: 'unavailable' };
  const motion = getExerciseMotion(exerciseId);
  return motion ? { kind: 'motion', motion } : { kind: 'unavailable' };
}
