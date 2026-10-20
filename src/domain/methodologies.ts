import type { MuscleGroup, MovementPattern } from './types';

/**
 * Training styles. Names and text describe the training itself, in generic
 * terms: no athlete, coach, book, brand or program name appears anywhere, so
 * nothing implies an affiliation or uses someone else's mark.
 */

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
];

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const EXPERIENCE_LEVEL_BLURBS: Record<ExperienceLevel, string> = {
  beginner: 'Short sessions, simple lifts, room to recover. Start here if you are new.',
  intermediate: 'More volume and more training days once the main lifts feel familiar.',
  advanced: 'High volume or to-failure work that assumes years of consistent training.',
};

export type MethodologyId =
  | 'beginner_basics'
  | 'classic_physique'
  | 'golden_era'
  | 'aesthetic'
  | 'joint_smart'
  | 'foundation'
  | 'fst7_pump'
  | 'heavy_duty'
  | 'power_hypertrophy'
  | 'anatomy_first'
  | 'practical_gym';

export interface Methodology {
  id: MethodologyId;
  name: string;
  tagline: string;
  /** Drives the grouping and ordering of the training-system picker. */
  level: ExperienceLevel;
  description: string;
  /** Preferred split template ids from catalog */
  preferredSplits: string[];
  defaultSplitId: string;
  /** Sets / reps bias applied at generation */
  setsBias: number;
  repsMinBias: number;
  repsMaxBias: number;
  /** Prefer these movement patterns earlier */
  favorPatterns: MovementPattern[];
  /** Soft-boost these muscles when scoring */
  favorMuscles: MuscleGroup[];
  /** Soft-penalize name keywords (injury-risk or off-style) */
  avoidNameKeywords: string[];
  /** Soft-boost name keywords */
  favorNameKeywords: string[];
  /**
   * Exact catalog names to pick before anything else, most-preferred first.
   *
   * Keyword scoring cannot tell "Barbell Full Squat" from "Jefferson Squats" —
   * both are barbell squats for quads — so a style that depends on a specific
   * shortlist of movements names them outright. Unmatched names are ignored,
   * and any muscle the list does not cover falls back to normal scoring, so
   * coverage never depends on this list being complete.
   */
  preferredExerciseNames?: string[];
  /** Max exercises per day */
  maxExercisesPerDay: number;
  /** Slots per focus muscle */
  slotsPerMuscle: number;
  /** HIT-style: fewer sets */
  intensityStyle: 'volume' | 'moderate' | 'hit' | 'pump_finisher';
}

export const METHODOLOGIES: Methodology[] = [
  {
    id: 'beginner_basics',
    name: 'Beginner Basics',
    tagline: 'Learn the main lifts. Three short full-body days.',
    level: 'beginner',
    description:
      'A first program. Three full-body sessions a week, five or six exercises each, built around the movements worth learning early: a squat, a hinge, a push, a pull. Reps sit a little higher so you can practise the pattern with a weight you control, and the low day count leaves plenty of room to recover between sessions.',
    preferredSplits: ['beginner_full_body', 'full_body', 'upper_lower'],
    defaultSplitId: 'beginner_full_body',
    // Catalog defaults, with the rep window nudged up: a beginner should be
    // practising the pattern for 8-12 reps, not grinding near a limit single.
    setsBias: 0,
    repsMinBias: 2,
    repsMaxBias: 2,
    favorPatterns: [
      'squat',
      'hinge',
      'horizontal_push',
      'vertical_pull',
      'horizontal_pull',
    ],
    favorMuscles: ['quads', 'chest', 'back', 'glutes', 'core'],
    // Technically demanding or easily mis-loaded movements are pushed down the
    // ranking — not banned, since the catalog may have nothing else for a muscle.
    avoidNameKeywords: [
      'snatch',
      'clean',
      'jerk',
      'behind the neck',
      'guillotine',
      'kipping',
      'muscle up',
      'pistol',
      'plyo',
      'upright row',
      'good morning',
    ],
    favorNameKeywords: [
      'machine',
      'dumbbell',
      'cable',
      'goblet',
      'leg press',
      'lat pulldown',
      'chest press',
      'row',
      'curl',
    ],
    // The lifts a first program should actually be built from, in preference
    // order within each muscle. Every name is checked against the catalog by
    // scripts/test-generator.ts.
    preferredExerciseNames: [
      // Squat
      'Barbell Full Squat',
      'Dumbbell Squat To A Bench',
      'Box Squat',
      'Barbell Lunge',
      // Hinge
      'Romanian Deadlift',
      'Barbell Deadlift',
      'Stiff-Legged Barbell Deadlift',
      // Glutes
      'Barbell Hip Thrust',
      'Barbell Glute Bridge',
      'Butt Lift (Bridge)',
      // Horizontal push
      'Dumbbell Bench Press',
      'Barbell Bench Press - Medium Grip',
      'Cable Chest Press',
      'Barbell Incline Bench Press - Medium Grip',
      // Vertical push
      'Dumbbell Shoulder Press',
      'Barbell Shoulder Press',
      'Seated Barbell Military Press',
      // Pull
      'Full Range-Of-Motion Lat Pulldown',
      'Bent Over Two-Dumbbell Row',
      'Bent Over Barbell Row',
      'V-Bar Pulldown',
      'Elevated Cable Rows',
      // Arms
      'Barbell Curl',
      'Alternate Hammer Curl',
      'Bench Dips',
      'Close-Grip Barbell Bench Press',
      'Close-Grip Dumbbell Press',
      // Core
      'Bent-Knee Hip Raise',
      'Press Sit-Up',
      'Flat Bench Leg Pull-In',
      'Pallof Press With Rotation',
    ],
    maxExercisesPerDay: 6,
    slotsPerMuscle: 1,
    intensityStyle: 'moderate',
  },
  {
    id: 'classic_physique',
    level: 'intermediate',
    name: 'Classic Physique Volume',
    tagline: 'Balanced hypertrophy, clean structure, high-quality sets.',
    description:
      'Push/pull/legs or upper/lower with compounds first and controlled hypertrophy rep ranges. Built for proportion: an even upper and lower body, extra attention to back thickness, and weekly volume you can sustain.',
    preferredSplits: ['ppl', 'upper_lower'],
    defaultSplitId: 'ppl',
    setsBias: 0,
    repsMinBias: 0,
    repsMaxBias: 0,
    favorPatterns: ['horizontal_push', 'vertical_pull', 'horizontal_pull', 'squat', 'hinge'],
    favorMuscles: ['back', 'chest', 'shoulders', 'quads'],
    avoidNameKeywords: ['guillotine', 'behind the neck'],
    favorNameKeywords: ['row', 'pulldown', 'bench', 'squat', 'rdl', 'overhead', 'lateral'],
    maxExercisesPerDay: 7,
    slotsPerMuscle: 2,
    intensityStyle: 'moderate',
  },
  {
    id: 'golden_era',
    level: 'advanced',
    name: 'Golden Era Volume',
    tagline: 'High volume, body-part focus, pump work.',
    description:
      'A body-part split with higher volume: several exercises per muscle, varied angles for chest, back and arms, and a mix of machines and free weights.',
    preferredSplits: ['bro', 'ppl'],
    defaultSplitId: 'bro',
    setsBias: 1,
    repsMinBias: 0,
    repsMaxBias: 2,
    favorPatterns: ['horizontal_push', 'vertical_pull', 'isolation', 'horizontal_pull'],
    favorMuscles: ['chest', 'back', 'biceps', 'triceps', 'shoulders'],
    avoidNameKeywords: [],
    favorNameKeywords: ['fly', 'curl', 'extension', 'press', 'pullover', 'raise'],
    maxExercisesPerDay: 8,
    slotsPerMuscle: 2,
    intensityStyle: 'volume',
  },
  {
    id: 'aesthetic',
    level: 'intermediate',
    name: 'Aesthetic Hypertrophy',
    tagline: 'V-taper bias: shoulders, back, arms, upper chest.',
    description:
      'Prioritises delts, lats, upper chest and arms for a visual V-taper. Upper/lower or push/pull/legs with extra shoulder and back isolation.',
    preferredSplits: ['upper_lower', 'ppl', 'push_pull'],
    defaultSplitId: 'upper_lower',
    setsBias: 0,
    repsMinBias: 2,
    repsMaxBias: 3,
    favorPatterns: ['vertical_pull', 'vertical_push', 'isolation', 'horizontal_pull'],
    favorMuscles: ['shoulders', 'back', 'chest', 'biceps', 'triceps'],
    avoidNameKeywords: [],
    favorNameKeywords: ['lateral', 'rear delt', 'pulldown', 'incline', 'curl', 'raise', 'face pull'],
    maxExercisesPerDay: 7,
    slotsPerMuscle: 2,
    intensityStyle: 'volume',
  },
  {
    id: 'joint_smart',
    level: 'intermediate',
    name: 'Joint-Smart Strength',
    tagline: 'Shoulder-friendly patterns, scapular health, sustainable loading.',
    description:
      'Favours controlled compounds and rear-delt work, and avoids behind-the-neck and other high-stress shoulder positions. Loads progress steadily rather than aggressively.',
    preferredSplits: ['upper_lower', 'full_body', 'ppl'],
    defaultSplitId: 'upper_lower',
    setsBias: 0,
    repsMinBias: 0,
    repsMaxBias: 0,
    favorPatterns: ['horizontal_pull', 'hinge', 'squat', 'vertical_pull'],
    favorMuscles: ['back', 'shoulders', 'glutes', 'core'],
    avoidNameKeywords: ['guillotine', 'behind the neck', 'upright row', 'kipping'],
    favorNameKeywords: ['face pull', 'row', 'rdl', 'goblet', 'neutral', 'external'],
    maxExercisesPerDay: 6,
    slotsPerMuscle: 2,
    intensityStyle: 'moderate',
  },
  {
    id: 'foundation',
    level: 'beginner',
    name: 'Foundation Protocol',
    tagline: 'Recovery-aware, progressive, no junk volume.',
    description:
      'Fewer training days, full-body or upper/lower, progressive compounds and plenty of room to recover between sessions.',
    preferredSplits: ['full_body', 'upper_lower'],
    defaultSplitId: 'full_body',
    setsBias: -1,
    repsMinBias: 0,
    repsMaxBias: -2,
    favorPatterns: ['squat', 'hinge', 'horizontal_push', 'vertical_pull', 'horizontal_pull'],
    favorMuscles: ['quads', 'back', 'chest', 'hamstrings', 'core'],
    avoidNameKeywords: [],
    favorNameKeywords: ['squat', 'deadlift', 'bench', 'row', 'press', 'chin'],
    maxExercisesPerDay: 5,
    slotsPerMuscle: 1,
    intensityStyle: 'moderate',
  },
  {
    id: 'fst7_pump',
    level: 'advanced',
    name: 'Pump Finisher',
    tagline: 'A standard hypertrophy day with a high-rep pump finisher.',
    description:
      'A normal compound-led session that ends with one isolation finisher: several short, high-rep sets with brief rest to chase a pump in the target muscle.',
    preferredSplits: ['ppl', 'bro', 'upper_lower'],
    defaultSplitId: 'ppl',
    setsBias: 0,
    repsMinBias: 0,
    repsMaxBias: 2,
    favorPatterns: ['isolation', 'horizontal_push', 'vertical_pull'],
    favorMuscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    avoidNameKeywords: [],
    favorNameKeywords: ['fly', 'cable', 'extension', 'curl', 'raise', 'kickback'],
    maxExercisesPerDay: 7,
    slotsPerMuscle: 2,
    intensityStyle: 'pump_finisher',
  },
  {
    id: 'heavy_duty',
    level: 'advanced',
    name: 'High-Intensity Low Volume',
    tagline: 'Low volume, high effort, long recovery.',
    description:
      'Very few hard sets taken close to failure, full-body or abbreviated splits, and longer rest between sessions.',
    preferredSplits: ['full_body', 'upper_lower'],
    defaultSplitId: 'full_body',
    setsBias: -2,
    repsMinBias: -2,
    repsMaxBias: -2,
    favorPatterns: ['squat', 'hinge', 'horizontal_push', 'vertical_pull', 'horizontal_pull'],
    favorMuscles: ['quads', 'back', 'chest', 'hamstrings'],
    avoidNameKeywords: [],
    favorNameKeywords: ['squat', 'deadlift', 'bench', 'row', 'press', 'pulldown'],
    maxExercisesPerDay: 4,
    slotsPerMuscle: 1,
    intensityStyle: 'hit',
  },
  {
    id: 'power_hypertrophy',
    level: 'intermediate',
    name: 'Power + Hypertrophy',
    tagline: 'Strength compounds first, then muscle accessories.',
    description:
      'Squat, bench and hinge work early in each session for strength, followed by hypertrophy accessories.',
    preferredSplits: ['upper_lower', 'push_pull', 'full_body'],
    defaultSplitId: 'upper_lower',
    setsBias: 0,
    repsMinBias: -2,
    repsMaxBias: -2,
    favorPatterns: ['squat', 'hinge', 'horizontal_push', 'horizontal_pull', 'vertical_pull'],
    favorMuscles: ['quads', 'chest', 'back', 'hamstrings'],
    avoidNameKeywords: [],
    favorNameKeywords: ['squat', 'bench', 'deadlift', 'row', 'press', 'rdl'],
    maxExercisesPerDay: 6,
    slotsPerMuscle: 2,
    intensityStyle: 'moderate',
  },
  {
    id: 'anatomy_first',
    level: 'intermediate',
    name: 'Anatomy-First Hypertrophy',
    tagline: 'Prime movers first, then isolation for the target muscle.',
    description:
      'Each day leads with multi-joint movements that load the prime movers, then finishes the target muscle with isolation work.',
    preferredSplits: ['bro', 'ppl', 'upper_lower'],
    defaultSplitId: 'bro',
    setsBias: 0,
    repsMinBias: 0,
    repsMaxBias: 0,
    favorPatterns: [
      'horizontal_push',
      'vertical_pull',
      'horizontal_pull',
      'squat',
      'hinge',
      'isolation',
    ],
    favorMuscles: ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes'],
    avoidNameKeywords: ['guillotine', 'behind the neck'],
    favorNameKeywords: [
      'bench',
      'row',
      'squat',
      'deadlift',
      'pulldown',
      'press',
      'curl',
      'extension',
      'fly',
      'raise',
      'lunge',
    ],
    maxExercisesPerDay: 7,
    slotsPerMuscle: 2,
    intensityStyle: 'moderate',
  },
  {
    id: 'practical_gym',
    level: 'intermediate',
    name: 'Practical Gym Hypertrophy',
    tagline: 'Simple, equipment-friendly full-gym sessions.',
    description:
      'Straightforward compound-to-accessory days built from barbell, dumbbell and cable staples, with clear set ranges and nothing exotic.',
    preferredSplits: ['ppl', 'upper_lower', 'full_body', 'push_pull'],
    defaultSplitId: 'ppl',
    setsBias: 0,
    repsMinBias: 0,
    repsMaxBias: 0,
    favorPatterns: [
      'horizontal_push',
      'vertical_pull',
      'horizontal_pull',
      'squat',
      'hinge',
      'vertical_push',
    ],
    favorMuscles: ['chest', 'back', 'quads', 'shoulders', 'hamstrings'],
    avoidNameKeywords: [],
    favorNameKeywords: [
      'bench',
      'squat',
      'deadlift',
      'row',
      'lat',
      'press',
      'lunge',
      'curl',
      'extension',
      'raise',
      'cable',
      'dumbbell',
    ],
    maxExercisesPerDay: 6,
    slotsPerMuscle: 2,
    intensityStyle: 'moderate',
  },
];

export function getMethodology(id: string): Methodology | undefined {
  return METHODOLOGIES.find((m) => m.id === id);
}

/** The one-tap starting point offered to anyone without a program yet. */
export const QUICK_START_METHODOLOGY_ID: MethodologyId = 'beginner_basics';

export function getMethodologiesByLevel(level: ExperienceLevel): Methodology[] {
  return METHODOLOGIES.filter((m) => m.level === level);
}

/** Style names used in earlier releases; plan titles saved then still contain them. */
const RETIRED_STYLE_NAMES: [string, string][] = [
  ['Pump Finisher (FST-7 style)', 'Pump Finisher'],
  ['Heavy Duty HIT', 'High-Intensity Low Volume'],
];

/** A saved plan's title with any retired style name replaced by its current one. */
export function displayPlanName(name: string): string {
  return RETIRED_STYLE_NAMES.reduce((n, [old, current]) => n.split(old).join(current), name);
}
