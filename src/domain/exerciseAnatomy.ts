import atlas from '../../data/exercise-anatomy.json';
import guides from '../../data/exercise-guides.json';

export type AnatomicalDemonstration = {
  sourceId: string;
  name: string;
  status: string;
  columns: number;
  rows: number;
  frames: number;
  instructions: string[];
  sequence?: number[];
  phaseLabels?: string[];
};

/** Only an individually reviewed sheet with the exact catalog identity can display. */
export function getExerciseAnatomy(exerciseId: string): AnatomicalDemonstration | undefined {
  const entry = (atlas as Record<string, AnatomicalDemonstration>)[exerciseId];
  const guide = (guides as Record<string, { sourceId: string }>)[exerciseId];
  return entry?.status === 'reviewed' && entry.sourceId === guide?.sourceId ? entry : undefined;
}

export const ANATOMICAL_PHASES = ['Setup', 'Moving', 'Working position', 'Returning'] as const;

export function anatomicalSequence(demo: AnatomicalDemonstration): number[] {
  return demo.sequence ?? Array.from({ length: demo.frames }, (_, index) => index);
}

export function anatomicalCell(frame: number, columns: number): { column: number; row: number } {
  return { column: frame % columns, row: Math.floor(frame / columns) };
}
