import { EXERCISES, EXERCISE_SOURCE_META } from './exercises.generated';
import type { Exercise, SplitTemplate, SplitTemplateDay } from './types';

export { EXERCISES, EXERCISE_SOURCE_META };

/**
 * Split templates (week structure). Exercise movements come from open-source
 * free-exercise-db curation; methodologies live in methodologies.ts.
 */

export const SPLIT_TEMPLATES: SplitTemplate[] = [
  {
    id: 'beginner_full_body',
    name: 'Beginner Full Body',
    description:
      'Three interchangeable full-body sessions of four lifts each. Every session is the same length, so missing a day costs little while you build the habit.',
    days_per_week: 3,
    is_active: true,
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description:
      'Classic 6-day structure: push, pull, legs — twice per week for high frequency.',
    days_per_week: 6,
    is_active: true,
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower',
    description:
      'Four days alternating upper and lower. Strong balance of frequency and recovery.',
    days_per_week: 4,
    is_active: true,
  },
  {
    id: 'bro',
    name: 'Bro Split',
    description:
      'Five body-part days: chest, back, shoulders, arms, legs. Three muscles each, so no day runs long.',
    days_per_week: 5,
    is_active: true,
  },
  {
    id: 'full_body',
    name: 'Full Body',
    description:
      'Three full-body sessions. Ideal for HIT, foundations, or busy schedules.',
    days_per_week: 3,
    is_active: true,
  },
  {
    id: 'push_pull',
    name: 'Push / Pull',
    description:
      'Four days alternating push (+ quads) and pull (+ hinges). Each muscle twice a week.',
    days_per_week: 4,
    is_active: true,
  },
];

export const SPLIT_TEMPLATE_DAYS: SplitTemplateDay[] = [
  // Every split below declares the same number of focus muscles on every one of
  // its days. Session length follows muscle count almost exactly (the generator
  // fills one movement per muscle, then a second), so equal counts are what keep
  // day one and day five the same length. A/B days name identical muscles;
  // variety comes from the generator's repeat penalty, not from swapping which
  // muscle gets trained.

  // Beginner full body — 4 muscles a day.
  { id: 'bfb-d0', template_id: 'beginner_full_body', day_index: 0, name: 'Session A', focus_muscles: ['quads', 'chest', 'back', 'core'] },
  { id: 'bfb-d1', template_id: 'beginner_full_body', day_index: 1, name: 'Session B', focus_muscles: ['hamstrings', 'glutes', 'shoulders', 'core'] },
  { id: 'bfb-d2', template_id: 'beginner_full_body', day_index: 2, name: 'Session C', focus_muscles: ['quads', 'chest', 'back', 'biceps'] },
  // PPL — 4 muscles a day, so every muscle gets exactly two sessions a week.
  // Core rides with the push days and traps/forearms with both pull days rather
  // than alternating, which used to halve their frequency for no stated reason.
  { id: 'ppl-d0', template_id: 'ppl', day_index: 0, name: 'Push A', focus_muscles: ['chest', 'shoulders', 'triceps', 'core'] },
  { id: 'ppl-d1', template_id: 'ppl', day_index: 1, name: 'Pull A', focus_muscles: ['back', 'biceps', 'traps', 'forearms'] },
  { id: 'ppl-d2', template_id: 'ppl', day_index: 2, name: 'Legs A', focus_muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { id: 'ppl-d3', template_id: 'ppl', day_index: 3, name: 'Push B', focus_muscles: ['chest', 'shoulders', 'triceps', 'core'] },
  { id: 'ppl-d4', template_id: 'ppl', day_index: 4, name: 'Pull B', focus_muscles: ['back', 'biceps', 'traps', 'forearms'] },
  { id: 'ppl-d5', template_id: 'ppl', day_index: 5, name: 'Legs B', focus_muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  // Upper / Lower — 5 muscles a day.
  { id: 'ul-d0', template_id: 'upper_lower', day_index: 0, name: 'Upper A', focus_muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { id: 'ul-d1', template_id: 'upper_lower', day_index: 1, name: 'Lower A', focus_muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] },
  { id: 'ul-d2', template_id: 'upper_lower', day_index: 2, name: 'Upper B', focus_muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { id: 'ul-d3', template_id: 'upper_lower', day_index: 3, name: 'Lower B', focus_muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] },
  // Bro — 3 muscles a day. Calves ride with shoulders and abs with chest, which
  // is what stops leg day from running twice as long as chest day.
  { id: 'bro-d0', template_id: 'bro', day_index: 0, name: 'Chest Day', focus_muscles: ['chest', 'triceps', 'core'] },
  { id: 'bro-d1', template_id: 'bro', day_index: 1, name: 'Back Day', focus_muscles: ['back', 'biceps', 'traps'] },
  { id: 'bro-d2', template_id: 'bro', day_index: 2, name: 'Shoulder Day', focus_muscles: ['shoulders', 'traps', 'calves'] },
  { id: 'bro-d3', template_id: 'bro', day_index: 3, name: 'Arm Day', focus_muscles: ['biceps', 'triceps', 'forearms'] },
  { id: 'bro-d4', template_id: 'bro', day_index: 4, name: 'Leg Day', focus_muscles: ['quads', 'hamstrings', 'glutes'] },
  // Full body — 5 muscles a day.
  { id: 'fb-d0', template_id: 'full_body', day_index: 0, name: 'Full Body A', focus_muscles: ['quads', 'chest', 'back', 'shoulders', 'core'] },
  { id: 'fb-d1', template_id: 'full_body', day_index: 1, name: 'Full Body B', focus_muscles: ['hamstrings', 'glutes', 'chest', 'back', 'biceps'] },
  { id: 'fb-d2', template_id: 'full_body', day_index: 2, name: 'Full Body C', focus_muscles: ['quads', 'shoulders', 'back', 'triceps', 'core'] },
  // Push / Pull — 5 muscles a day. Core and calves get a fixed home here too.
  { id: 'pp-d0', template_id: 'push_pull', day_index: 0, name: 'Push A', focus_muscles: ['chest', 'shoulders', 'triceps', 'quads', 'core'] },
  { id: 'pp-d1', template_id: 'push_pull', day_index: 1, name: 'Pull A', focus_muscles: ['back', 'biceps', 'hamstrings', 'glutes', 'calves'] },
  { id: 'pp-d2', template_id: 'push_pull', day_index: 2, name: 'Push B', focus_muscles: ['chest', 'shoulders', 'triceps', 'quads', 'core'] },
  { id: 'pp-d3', template_id: 'push_pull', day_index: 3, name: 'Pull B', focus_muscles: ['back', 'biceps', 'hamstrings', 'glutes', 'calves'] },
];

export function getSplitTemplate(id: string): SplitTemplate | undefined {
  return SPLIT_TEMPLATES.find((t) => t.id === id);
}

export function getSplitDays(templateId: string): SplitTemplateDay[] {
  return SPLIT_TEMPLATE_DAYS.filter((d) => d.template_id === templateId).sort(
    (a, b) => a.day_index - b.day_index
  );
}

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
