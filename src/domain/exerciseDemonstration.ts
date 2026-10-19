import guides from '../../data/exercise-guides.json';
import { EXERCISE_MOTION_SPECS, getExerciseMotion } from './exerciseMotions';
import type { MotionTemplate } from './motion';
import { getExerciseAnatomy, type AnatomicalDemonstration } from './exerciseAnatomy';

export type ExerciseDemonstration =
  | { kind: 'anatomical'; anatomy: AnatomicalDemonstration; motion?: MotionTemplate }
  | { kind: 'motion'; motion: MotionTemplate }
  | { kind: 'unavailable' };

/** The articulated rig for this exact exercise, or undefined if its identity drifted. */
function exactMotion(exerciseId: string, sourceId: string): MotionTemplate | undefined {
  const spec = EXERCISE_MOTION_SPECS[exerciseId];
  return spec && spec.sourceId === sourceId ? getExerciseMotion(exerciseId) : undefined;
}

/**
 * A reviewed anatomical sheet wins; the exact articulated rig is carried alongside it
 * as the fallback if the bundled artwork is ever missing.
 */
export function getExerciseDemonstration(exerciseId: string): ExerciseDemonstration {
  const source = (guides as Record<string, { sourceId: string }>)[exerciseId];
  if (!source) return { kind: 'unavailable' };
  const motion = exactMotion(exerciseId, source.sourceId);
  const anatomy = getExerciseAnatomy(exerciseId);
  if (anatomy) return { kind: 'anatomical', anatomy, motion };
  return motion ? { kind: 'motion', motion } : { kind: 'unavailable' };
}
