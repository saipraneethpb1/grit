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
  /** Fraction of each cell trimmed from every edge; set where a sheet has drawn divider lines. */
  cellInset?: number;
  /** Shown under the demonstration when the pictures alone could mislead (e.g. isometric holds). */
  cue?: string;
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

/**
 * Every cell loses this much from each edge before display. Generated sheets
 * often have a 1-2 px seam where cells meet, and some draw white divider lines;
 * cropping at exact halves would show them as stripes. 2% is invisible at phone
 * size. Sheets with wider lines carry a measured `cellInset`.
 */
export const DEFAULT_CELL_INSET = 0.02;

export function anatomicalInset(demo: AnatomicalDemonstration): number {
  return Math.max(DEFAULT_CELL_INSET, demo.cellInset ?? 0);
}

export function anatomicalCell(frame: number, columns: number): { column: number; row: number } {
  return { column: frame % columns, row: Math.floor(frame / columns) };
}
