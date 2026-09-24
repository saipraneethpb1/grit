/**
 * Turns TypeSafe's answers about a person's own description of their training
 * week into a program the generator can build.
 *
 * The model only picks from closed lists (styles, day counts, equipment).
 * Everything that is a rule lives here: thresholds, defaults for anything the
 * person did not mention, which split matches a day count, and how the
 * catalog is narrowed to the equipment they have. Kept pure so
 * scripts/test-plan-intent.ts can cover it without Supabase or the network.
 */

import {
  DAY_OPTIONS,
  EQUIPMENT_OPTIONS,
  STYLE_OPTIONS,
  equipmentQuestionId,
  type DayOptionId,
  type EquipmentOptionId,
  type PlanIntentAnswers,
} from '@/supabase/functions/_shared/planIntentQuestions';
import { getSplitDays, SPLIT_TEMPLATES } from './catalog';
import {
  getMethodology,
  QUICK_START_METHODOLOGY_ID,
  type Methodology,
  type MethodologyId,
} from './methodologies';
import type { Equipment, Exercise, MuscleGroup } from './types';

/** A Noul at or above this counts as yes. Yes and no are equally cheap to fix on the review screen. */
export const NOUL_YES = 0.5;
/** Nouls inside this band are flagged for the person to check rather than trusted. */
export const NOUL_UNSURE_LOW = 0.3;
export const NOUL_UNSURE_HIGH = 0.7;
/**
 * A Choice below this confidence is flagged. Deliberately conservative: a
 * wrong style still builds a valid program, and the person reviews every
 * field before anything is saved. Revisit once real descriptions are logged.
 */
export const CHOICE_CONFIDENCE_MIN = 0.5;

export const DAYS_BY_OPTION: Record<DayOptionId, number> = {
  days_3: 3,
  days_4: 4,
  days_5: 5,
  days_6: 6,
};

export const DAY_CHOICES = Object.values(DAYS_BY_OPTION);

export const INTENT_EQUIPMENT = Object.keys(EQUIPMENT_OPTIONS) as EquipmentOptionId[];

export type IntentField = 'style' | 'days' | 'equipment';

export type PlanIntent = {
  methodologyId: MethodologyId;
  daysPerWeek: number;
  /** Always includes bodyweight. */
  equipment: Equipment[];
  /** Whether the description mentioned each field at all. Unmentioned fields hold defaults. */
  stated: Record<IntentField, boolean>;
  /** Fields the model was unsure about; the review screen asks the person to check them. */
  uncertain: IntentField[];
  /** Equipment whose yes/no was close to a coin flip. */
  uncertainEquipment: EquipmentOptionId[];
};

function noul(answers: PlanIntentAnswers, id: string): number | null {
  const value = answers[id]?.noul;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isUnsure(p: number | null): boolean {
  return p === null || (p > NOUL_UNSURE_LOW && p < NOUL_UNSURE_HIGH);
}

function choice<K extends string>(
  answers: PlanIntentAnswers,
  id: string,
  options: Record<K, unknown>
): { value: K | null; confident: boolean } {
  const answer = answers[id];
  const value = answer?.choice;
  if (!value || !(value in options)) return { value: null, confident: false };
  return {
    value: value as K,
    confident: typeof answer.confidence === 'number' && answer.confidence >= CHOICE_CONFIDENCE_MIN,
  };
}

/**
 * The split that best matches a style and a day count: the style's own
 * preferences first, then its default, then any active split with that many
 * days. Falls back to the style's default split when nothing matches.
 */
export function pickSplitFor(methodology: Methodology, daysPerWeek: number): string {
  const active = SPLIT_TEMPLATES.filter((s) => s.is_active);
  const withDays = (id: string) =>
    active.some((s) => s.id === id && s.days_per_week === daysPerWeek);

  const preferred = methodology.preferredSplits.find(withDays);
  if (preferred) return preferred;
  if (withDays(methodology.defaultSplitId)) return methodology.defaultSplitId;
  return active.find((s) => s.days_per_week === daysPerWeek)?.id ?? methodology.defaultSplitId;
}

export function defaultDaysFor(methodology: Methodology): number {
  return SPLIT_TEMPLATES.find((s) => s.id === methodology.defaultSplitId)?.days_per_week ?? 3;
}

export function interpretPlanIntent(answers: PlanIntentAnswers): PlanIntent {
  const uncertain = new Set<IntentField>();

  // Style. Unmentioned means the beginner quick start, the same default the
  // home screen offers someone with no program.
  const styleStated = noul(answers, 'style_stated');
  const style = choice(answers, 'style', STYLE_OPTIONS);
  const stylePicked = (styleStated ?? 0) >= NOUL_YES && style.value !== null;
  const methodologyId = (stylePicked ? style.value : QUICK_START_METHODOLOGY_ID) as MethodologyId;
  const styleSaid = (styleStated ?? 0) >= NOUL_YES;
  if (isUnsure(styleStated) || (styleSaid && !style.confident)) uncertain.add('style');
  const methodology = getMethodology(methodologyId);
  if (!methodology) throw new Error(`Unknown training style: ${methodologyId}`);

  // Days. Unmentioned means whatever the chosen style is built around.
  const daysStated = noul(answers, 'days_stated');
  const days = choice(answers, 'days', DAY_OPTIONS);
  const daysPicked = (daysStated ?? 0) >= NOUL_YES && days.value !== null;
  const daysPerWeek = daysPicked ? DAYS_BY_OPTION[days.value!] : defaultDaysFor(methodology);
  const daysSaid = (daysStated ?? 0) >= NOUL_YES;
  if (isUnsure(daysStated) || (daysSaid && !days.confident)) uncertain.add('days');

  // Equipment. Unmentioned means a full gym. Otherwise one yes/no per item.
  const equipmentStated = noul(answers, 'equipment_stated');
  const equipmentPicked = (equipmentStated ?? 0) >= NOUL_YES;
  const uncertainEquipment: EquipmentOptionId[] = [];
  const equipment: Equipment[] = ['bodyweight'];
  for (const id of INTENT_EQUIPMENT) {
    const p = noul(answers, equipmentQuestionId(id));
    if (!equipmentPicked || (p ?? 0) >= NOUL_YES) equipment.push(id);
    if (equipmentPicked && isUnsure(p)) uncertainEquipment.push(id);
  }
  if (isUnsure(equipmentStated) || uncertainEquipment.length) uncertain.add('equipment');

  return {
    methodologyId,
    daysPerWeek,
    equipment,
    stated: { style: stylePicked, days: daysPicked, equipment: equipmentPicked },
    uncertain: [...uncertain],
    uncertainEquipment,
  };
}

export type EquipmentFilterResult = {
  exercises: Exercise[];
  /** Focus muscles with no movement for the allowed equipment; they keep the full catalog. */
  fallbackMuscles: MuscleGroup[];
};

/**
 * Narrows the catalog to movements the person can do with their equipment.
 *
 * A muscle that would be left with nothing keeps its full-catalog movements
 * instead: bodyweight alone cannot train seven of the twelve muscle groups,
 * and the generator test fails any plan that skips a focus muscle. The review
 * screen names those muscles so nothing is hidden.
 */
export function filterCatalogForEquipment(
  exercises: Exercise[],
  equipment: Equipment[],
  templateId: string
): EquipmentFilterResult {
  const allowed = new Set(equipment);
  const usable = (ex: Exercise) => ex.equipment.every((e) => allowed.has(e));
  const kept = exercises.filter(usable);

  const focus = new Set(getSplitDays(templateId).flatMap((d) => d.focus_muscles));
  const fallbackMuscles = [...focus].filter(
    (m) => !kept.some((ex) => ex.primary_muscles.includes(m))
  );
  if (!fallbackMuscles.length) return { exercises: kept, fallbackMuscles };

  const keptIds = new Set(kept.map((ex) => ex.id));
  const extra = exercises.filter(
    (ex) => !keptIds.has(ex.id) && ex.primary_muscles.some((m) => fallbackMuscles.includes(m))
  );
  return { exercises: [...kept, ...extra], fallbackMuscles };
}

const KNOWN_EQUIPMENT = new Set<string>(['bodyweight', ...INTENT_EQUIPMENT]);

/** Round-trips the equipment list through a route param. */
export function encodeEquipmentParam(equipment: Equipment[]): string {
  return equipment.join(',');
}

/** `null` for a missing param, so callers keep the full catalog. */
export function parseEquipmentParam(raw: string | string[] | undefined): Equipment[] | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const parsed = value.split(',').filter((e) => KNOWN_EQUIPMENT.has(e)) as Equipment[];
  if (!parsed.includes('bodyweight')) parsed.unshift('bodyweight');
  return parsed;
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  cable: 'Cables',
  machine: 'Machines',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebells',
  smith_machine: 'Smith machine',
  ez_bar: 'EZ bar',
  band: 'Bands',
};
