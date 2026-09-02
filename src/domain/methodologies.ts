import type { MuscleGroup, MovementPattern } from './types';

/**
 * Training systems curated from *publicly documented* training principles.
 *
 * IMPORTANT: Grit is NOT affiliated with, endorsed by, or partnered with any
 * of the named athletes/coaches or their commercial apps/brands (STNDRD,
 * Athlean-X, etc.). Names appear only to describe well-known public methodologies
 * so users can pick a style. Exercise movements come from open-source catalogs.
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
  /** Public attribution — not a commercial endorsement */
  inspiredBy: string;
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
  sources: { title: string; note: string }[];
}

export const METHODOLOGIES: Methodology[] = [
  {
    id: 'beginner_basics',
    name: 'Beginner Basics',
    tagline: 'Learn the main lifts. Three short full-body days.',
    inspiredBy:
      'Widely published beginner guidance: full-body frequency, compound lifts, gradual load increases',
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
    sources: [
      {
        title: 'Common beginner programming principles (public domain)',
        note: 'Full-body frequency, compound-first selection, modest volume, progressive loading.',
      },
    ],
  },
  {
    id: 'classic_physique',
    level: 'intermediate',
    name: 'Classic Physique Volume',
    tagline: 'Balanced hypertrophy, clean structure, high-quality sets.',
    inspiredBy: 'Principles popularized in modern classic physique training (e.g. public CBum programming themes)',
    description:
      'Push/pull/legs or upper-lower emphasis, compounds first, controlled hypertrophy ranges. Inspired by publicly discussed classic-physique training: proportion, back thickness, and sustainable weekly volume — not an official STNDRD/CBum program.',
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
    sources: [
      {
        title: 'Public classic physique programming themes',
        note: 'High-frequency muscle groups, compounds + isolation balance, mid-rep hypertrophy.',
      },
    ],
  },
  {
    id: 'golden_era',
    level: 'advanced',
    name: 'Golden Era Volume',
    tagline: 'High volume, body-part focus, pump work.',
    inspiredBy: 'Arnold-era bodybuilding (Encyclopedia of Modern Bodybuilding principles)',
    description:
      'Bro-split friendly, higher volume, lots of angles on chest/back/arms. Reflects golden-era volume culture: multiple exercises per body part, classic machines and free weights.',
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
    sources: [
      {
        title: 'Golden-era bodybuilding literature (public domain discussion)',
        note: 'High volume per muscle, split routines, mind-muscle emphasis.',
      },
    ],
  },
  {
    id: 'aesthetic',
    level: 'intermediate',
    name: 'Aesthetic Hypertrophy',
    tagline: 'V-taper bias: shoulders, back, arms, upper chest.',
    inspiredBy: 'Aesthetic-focused influencers (e.g. David Laid–style public training aesthetics)',
    description:
      'Prioritizes delts, lats, upper chest, and arms for a visual V-taper. Upper/lower or PPL with extra shoulder/back isolation. Style-inspired only — not an official program.',
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
    sources: [
      {
        title: 'Aesthetic hypertrophy community norms',
        note: 'Higher relative volume for delts/lats/arms; moderate lower-body emphasis.',
      },
    ],
  },
  {
    id: 'joint_smart',
    level: 'intermediate',
    name: 'Joint-Smart Strength',
    tagline: 'Shoulder-friendly patterns, scap health, sustainable loading.',
    inspiredBy: 'Injury-conscious coaching themes (e.g. Athlean-X public education themes)',
    description:
      'Favors controlled compounds, face-pull style rear-delt work, and avoids behind-the-neck / guillotine patterns. Inspired by publicly shared joint-health cues — not an official Athlean-X program.',
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
    sources: [
      {
        title: 'Public shoulder-health & biomechanics education',
        note: 'Scapular control, avoid end-range risky patterns, balance push/pull.',
      },
    ],
  },
  {
    id: 'foundation',
    level: 'beginner',
    name: 'Foundation Protocol',
    tagline: 'Recovery-aware, progressive, no junk volume.',
    inspiredBy: 'Performance + recovery principles discussed in public science communication (e.g. Huberman Lab themes)',
    description:
      'Fewer training days, full-body or upper/lower, progressive compounds, leave room for recovery. Inspired by publicly discussed recovery-first training — not a clinical protocol or official Huberman program.',
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
    sources: [
      {
        title: 'Public recovery & progressive overload education',
        note: 'Sleep/recovery-aware frequency, progressive loading, limited junk volume.',
      },
    ],
  },
  {
    id: 'fst7_pump',
    level: 'advanced',
    name: 'Pump Finisher (FST-7 style)',
    tagline: 'Standard hypertrophy day + high-rep stretch/pump finisher.',
    inspiredBy: 'FST-7 concept as publicly described by Hany Rambod',
    description:
      'Normal compound-led session with a final isolation “finisher” bias (higher reps). Based on the publicly discussed FST-7 idea (fascia stretch training) — not an official FST-7 certification product.',
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
    sources: [
      {
        title: 'Public FST-7 descriptions',
        note: 'Multiple short-rest sets on a final isolation movement for a target muscle.',
      },
    ],
  },
  {
    id: 'heavy_duty',
    level: 'advanced',
    name: 'Heavy Duty HIT',
    tagline: 'Low volume, high effort, long recovery.',
    inspiredBy: 'Mike Mentzer Heavy Duty / HIT principles (public writings)',
    description:
      'Very few hard sets, full-body or abbreviated splits, longer rest between sessions. Reflects publicly known HIT/Heavy Duty ideas — not a commercial Mentzer product license.',
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
    sources: [
      {
        title: 'Heavy Duty / HIT public literature',
        note: 'Low set count, high intensity, recovery between infrequent sessions.',
      },
    ],
  },
  {
    id: 'power_hypertrophy',
    level: 'intermediate',
    name: 'Power + Hypertrophy',
    tagline: 'Strength compounds first, then muscle accessories.',
    inspiredBy: 'Powerbuilding community standards (open lifting culture)',
    description:
      'Squat/bench/hinge emphasis early, then hypertrophy accessories. Common open powerbuilding template used across free lifting communities.',
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
    sources: [
      {
        title: 'Open powerbuilding community templates',
        note: 'Main lifts heavy; accessories for hypertrophy.',
      },
    ],
  },
  {
    id: 'anatomy_first',
    level: 'intermediate',
    name: 'Anatomy-First Hypertrophy',
    tagline: 'Prime movers first, then isolation for the target muscle.',
    inspiredBy:
      'Anatomy-led training education (the teaching style popularized by illustrated anatomy references such as Delavier’s Strength Training Anatomy — principles only)',
    description:
      'Each day prioritizes multi-joint patterns that load the prime movers, then isolation to finish the target muscle. Uses standard muscle anatomy labels in the app. Inspired by how anatomy atlases teach movement—not a reproduction of any book’s text or art.',
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
    sources: [
      {
        title: 'Anatomy education principles (public domain knowledge)',
        note: 'Identify prime mover → load it with compounds → isolate for local fatigue.',
      },
      {
        title: 'Recommended reading (not included)',
        note: 'Frédéric Delavier — Strength Training Anatomy (buy/read separately).',
      },
    ],
  },
  {
    id: 'practical_gym',
    level: 'intermediate',
    name: 'Practical Gym Hypertrophy',
    tagline: 'Blog-style full-gym sessions: simple, equipment-friendly, effective.',
    inspiredBy:
      'Common free gym guides from popular fitness brands/blogs (e.g. MyProtein training zone style articles)',
    description:
      'Straightforward compound-to-accessory days that match what most free “gym workout” articles prescribe: barbell/dumbbell/cable staples, clear set ranges, no exotic programming. Structure inspired by public blog templates only — we do not copy MyProtein (or any brand) article text or workout PDFs.',
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
    sources: [
      {
        title: 'Public fitness-blog session structure',
        note: 'Warm pattern: heavy compound → secondary compound → isolation accessories.',
      },
      {
        title: 'External reading (not scraped)',
        note: 'MyProtein The Zone / Training articles — open in browser for ideas.',
      },
    ],
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
