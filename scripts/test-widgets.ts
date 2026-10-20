import { generatePlan } from '../src/domain/planGenerator';
import { EXERCISES } from '../src/domain/exercises.generated';
import { buildWidgetSnapshot, WIDGET_LINKS } from '../src/domain/widgetSnapshot';
import type { PlanDayWithExercises } from '../src/domain/types';

let failed = 0;
function assert(cond: boolean, label: string) {
  if (cond) console.log(`OK   ${label}`);
  else { failed += 1; console.error(`FAIL ${label}`); }
}

// Wednesday 14 Oct 2026, 18:00 local.
const now = new Date(2026, 9, 14, 18, 0);
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const gen = generatePlan({ templateId: 'upper_lower', exercises: EXERCISES, methodologyId: 'balanced' } as never);
const plan = {
  id: 'plan-1', name: gen.name, template_id: 'upper_lower',
  plan_days: gen.days.map((d, i) => ({
    id: `day-${i}`, plan_id: 'plan-1', day_index: d.day_index, name: d.name, focus_muscles: d.focus_muscles,
    plan_exercises: d.exercises.map((e, j) => ({ id: `pe-${i}-${j}`, plan_day_id: `day-${i}`, exercise_id: e.exercise_id, sort_order: e.sort_order,
      target_sets: e.target_sets, target_reps_min: e.target_reps_min, target_reps_max: e.target_reps_max, exercise: e.exercise })),
  })) as PlanDayWithExercises[],
};
const set = { exerciseId: plan.plan_days[0].plan_exercises[0].exercise_id, exerciseName: 'x', reps: 8, weight: 50 };

{
  const s = buildWidgetSnapshot({ signedIn: true, plan, programName: 'Upper / Lower', dayIndex: 5, streak: 4, now,
    sessions: [{ id: 'mon', completedAt: daysAgo(2), sets: Array(12).fill(set) }, { id: 'last', completedAt: daysAgo(8), sets: [set] }] });
  assert(s.today?.name === plan.plan_days[1].name, 'the rotation pointer wraps to today’s day');
  assert(s.today?.position === `Day 2 of ${plan.plan_days.length}`, 'position reads "Day n of m"');
  assert(/^\d+ exercises · \d+ sets · ~\d+ min$/.test(s.today?.summary ?? ''), 'summary is pre-formatted for the widget');
  assert((s.today?.preview.length ?? 0) <= 3 && (s.today?.preview.length ?? 0) > 0, 'preview lists up to three exercises');
  assert(s.today?.done === false, 'not marked done when nothing was logged today');
  assert(s.weekDone === 1 && s.weekTarget === plan.plan_days.length, 'this week counts only this week’s workouts');
  assert(s.todayIndex === 2 && s.week.length === 7, 'week runs Monday to Sunday with today on Wednesday');
  assert(s.week[0] === 2 && s.week[1] === 0 && s.week[3] === -1, 'week shows heat for past days and -1 for days to come');
  assert(s.streak === 4, 'streak passes through');
  assert(WIDGET_LINKS.workout(s.today!) === 'grit:///workout/day-1?planId=plan-1', 'workout link opens today’s session');
}
{
  const s = buildWidgetSnapshot({ signedIn: true, plan, programName: null, dayIndex: 0, streak: 1, now,
    sessions: [{ id: 'today', completedAt: daysAgo(0), sets: [set] }] });
  assert(s.today?.done === true && s.week[2] === 1, 'a workout today marks the day done');
  assert(s.today?.programName === plan.name, 'falls back to the plan name');
}
{
  const s = buildWidgetSnapshot({ signedIn: true, plan: null, programName: null, dayIndex: 0, streak: 0, now, sessions: [] });
  assert(s.today === null && s.weekTarget === 0, 'no program leaves today empty');
  const out = buildWidgetSnapshot({ signedIn: false, plan, programName: 'x', dayIndex: 0, streak: 9, now, sessions: [] });
  assert(!out.signedIn && out.today === null && out.streak === 0, 'signed out shows nothing from the last account');
}

if (failed) { console.error(`\n${failed} widget test(s) failed`); process.exit(1); }
console.log('\nAll widget tests passed');
