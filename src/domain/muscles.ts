import type { MuscleGroup } from './types';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'forearms',
  'traps',
];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
  traps: 'Traps',
};

/**
 * Standard anatomical names (public domain anatomical terminology).
 * Helps anatomy-first learning without copying any copyrighted atlas text.
 */
export const MUSCLE_ANATOMY: Record<MuscleGroup, string> = {
  chest: 'Pectoralis major (sternal & clavicular fibers)',
  back: 'Latissimus dorsi, rhomboids, erector spinae',
  shoulders: 'Deltoid (anterior, lateral, posterior)',
  biceps: 'Biceps brachii, brachialis',
  triceps: 'Triceps brachii (long, lateral, medial heads)',
  quads: 'Quadriceps femoris',
  hamstrings: 'Biceps femoris, semitendinosus, semimembranosus',
  glutes: 'Gluteus maximus / medius',
  calves: 'Gastrocnemius, soleus',
  core: 'Rectus abdominis, obliques, transverse abdominis',
  forearms: 'Wrist flexors / extensors',
  traps: 'Trapezius (upper, mid, lower)',
};

export function formatMuscles(muscles: MuscleGroup[]): string {
  return muscles.map((m) => MUSCLE_LABELS[m] ?? m).join(', ');
}

export function anatomyLabel(muscle: MuscleGroup): string {
  return MUSCLE_ANATOMY[muscle] ?? MUSCLE_LABELS[muscle] ?? muscle;
}

/** Muscle groups that count as "push" for PPL-style generation */
export const PUSH_MUSCLES: MuscleGroup[] = ['chest', 'shoulders', 'triceps'];

/** Muscle groups that count as "pull" for PPL-style generation */
export const PULL_MUSCLES: MuscleGroup[] = ['back', 'biceps', 'traps', 'forearms'];

/** Lower-body muscle groups */
export const LEG_MUSCLES: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves'];

/** Upper-body muscle groups */
export const UPPER_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'traps',
  'forearms',
];
