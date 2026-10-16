/**
 * The TypeSafe questions behind "Describe your week".
 *
 * Shared by the `plan-intent` edge function, which sends them, and the app,
 * which interprets the answers. It has no imports so both Deno and Metro can
 * load it as-is. `scripts/test-plan-intent.ts` fails if an option key here
 * drifts from the ids in `src/domain/methodologies.ts` or the catalog's
 * equipment, since the model can only pick options this file offers.
 */

export const TYPESAFE_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
export const PLAN_INTENT_MODEL = 'jev-latest';
export const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Training styles, keyed by methodology id. The text describes who each style
 * suits so the model can match it to a person's own words. Names describe
 * public training styles only; no affiliation is implied.
 */
export const STYLE_OPTIONS = {
  beginner_basics:
    'Beginner Basics. For someone new to lifting or returning after a long break. Three short full-body days built on the main lifts.',
  foundation:
    'Foundation Protocol. For a beginner or busy person who wants steady progress with modest volume and plenty of recovery.',
  classic_physique:
    'Classic Physique Volume. For an intermediate lifter who wants balanced, all-round muscle growth.',
  aesthetic:
    'Aesthetic Hypertrophy. For an intermediate lifter who wants a V-taper look: shoulders, back, arms and upper chest.',
  joint_smart:
    'Joint-Smart Strength. For someone with cranky shoulders, elbows, knees or lower back who wants joint-friendly exercises and sustainable loading.',
  power_hypertrophy:
    'Power + Hypertrophy. For an intermediate lifter who wants to get stronger on the big compound lifts as well as build muscle.',
  anatomy_first:
    'Anatomy-First Hypertrophy. For an intermediate lifter who wants to target specific muscles with compound lifts followed by isolation work.',
  practical_gym:
    'Practical Gym Hypertrophy. For an intermediate gym-goer who wants simple, effective muscle-building sessions without a particular philosophy.',
  golden_era:
    'Golden Era Volume. For an advanced bodybuilder who wants high-volume body-part days and pump work.',
  fst7_pump:
    'Pump Finisher (FST-7 style). For an advanced lifter who wants normal hypertrophy days finished with high-rep pump sets.',
  heavy_duty:
    'Heavy Duty HIT. For an experienced lifter who wants very few, very hard sets taken to failure and long recovery between sessions.',
} as const;

export type StyleOptionId = keyof typeof STYLE_OPTIONS;

export const DAY_OPTIONS = {
  days_3: 'Three days a week or fewer',
  days_4: 'Four days a week',
  days_5: 'Five days a week',
  days_6: 'Six or more days a week',
} as const;

export type DayOptionId = keyof typeof DAY_OPTIONS;

/**
 * Equipment the person might lack. Bodyweight is always available, so it has
 * no question. Keys match the app's `Equipment` type.
 */
export const EQUIPMENT_OPTIONS = {
  barbell: 'a barbell with plates',
  dumbbell: 'dumbbells',
  cable: 'a cable machine or cable station',
  machine: 'weight-stack or plate-loaded machines, such as a leg press or chest press machine',
  kettlebell: 'kettlebells',
  band: 'resistance bands',
} as const;

export type EquipmentOptionId = keyof typeof EQUIPMENT_OPTIONS;

export const equipmentQuestionId = (id: EquipmentOptionId) => `has_${id}` as const;

type Question = {
  type: 'noul' | 'choice';
  instructions: string;
  criteria?: Record<string, string | null>;
};

export type PlanIntentState = { description: string };

/**
 * One request carries every question. They run in parallel and cannot see
 * each other's answers, so each "stated" question is what lets the app tell
 * "said three days" apart from "said nothing about days".
 */
export function buildPlanIntentQuestions(): Record<string, Question> {
  const questions: Record<string, Question> = {
    style: {
      type: 'choice',
      instructions:
        'Which training style best fits the person who wrote `description`? Weigh their goal, their training experience, how much time and recovery they have, and any joint pain or injury they mention.',
      criteria: { ...STYLE_OPTIONS },
    },
    style_stated: {
      type: 'noul',
      instructions:
        'Does `description` say anything about the person\'s training goal, their lifting experience, a preferred training style, or an injury or joint problem?',
    },
    days: {
      type: 'choice',
      instructions: 'How many days a week does the person who wrote `description` want to, or can, train?',
      criteria: { ...DAY_OPTIONS },
    },
    days_stated: {
      type: 'noul',
      instructions:
        'Does `description` say how many days a week, or how often, the person can train?',
    },
    equipment_stated: {
      type: 'noul',
      instructions:
        'Does `description` say where the person trains, such as a gym or at home, or what equipment they have?',
    },
  };

  for (const [id, label] of Object.entries(EQUIPMENT_OPTIONS) as [EquipmentOptionId, string][]) {
    questions[equipmentQuestionId(id)] = {
      type: 'noul',
      instructions: `Can the person who wrote \`description\` train with ${label}?`,
      criteria: {
        true: 'They say they have it, or they train somewhere that normally has it, such as a commercial gym.',
        false: 'They say they do not have it, or they train somewhere that normally lacks it, such as at home with only a few named items.',
      },
    };
  }

  return questions;
}

export function buildPlanIntentRequest(description: string) {
  const state: PlanIntentState = { description };
  return { model: PLAN_INTENT_MODEL, state, questions: buildPlanIntentQuestions() };
}

/** One answer as TypeSafe returns it; only the fields this feature reads. */
export type TypeSafeAnswer = {
  type: 'noul' | 'choice' | 'score';
  noul?: number;
  choice?: string;
  probabilities?: Record<string, number>;
  confidence?: number;
};

export type PlanIntentAnswers = Record<string, TypeSafeAnswer>;
