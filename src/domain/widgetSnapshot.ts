/**
 * What the home-screen widgets show, derived from the same plan, profile and
 * history the app already loads. Pure, so `scripts/test-widgets.ts` covers it;
 * the platform writers in `src/widgets/` only hand the result to the OS.
 *
 * Widgets render in a separate process with no network or app state, so the
 * snapshot carries every string already formatted and nothing that needs the
 * catalog to interpret.
 */

import { dailyActivity, type AnalyticsSession } from './analytics';
import { analyzeTrainingDay } from './trainingAnalysis';
import type { PlanDayWithExercises } from './types';

export type WidgetSnapshot = {
  /** False when signed out: widgets show a sign-in prompt instead of stale data. */
  signedIn: boolean;
  /** Today's session, or null when there is no active program. */
  today: {
    dayId: string;
    planId: string;
    name: string;
    programName: string;
    /** "Day 2 of 4". */
    position: string;
    /** "8 exercises · 29 sets · ~89 min". */
    summary: string;
    /** Up to three exercise names, for the larger widget. */
    preview: string[];
    /** Finished today already. */
    done: boolean;
  } | null;
  streak: number;
  /** Workouts finished this calendar week (Monday-based) and the program's days per week. */
  weekDone: number;
  weekTarget: number;
  /** Heat level 0–4 for Monday … Sunday of this week; -1 for days still to come. */
  week: number[];
  /** Index of today in `week`, 0 = Monday. */
  todayIndex: number;
  /** ISO time the snapshot was built. */
  updatedAt: string;
};

export type WidgetSnapshotInput = {
  signedIn: boolean;
  plan: { id: string; name: string; template_id: string; plan_days: PlanDayWithExercises[] } | null;
  programName: string | null;
  /** Rotation pointer from the profile. */
  dayIndex: number;
  streak: number;
  sessions: AnalyticsSession[];
  now: Date;
};

export const SIGNED_OUT_SNAPSHOT = (now: Date): WidgetSnapshot => ({
  signedIn: false, today: null, streak: 0, weekDone: 0, weekTarget: 0,
  week: [-1, -1, -1, -1, -1, -1, -1], todayIndex: (now.getDay() + 6) % 7, updatedAt: now.toISOString(),
});

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function buildWidgetSnapshot(input: WidgetSnapshotInput): WidgetSnapshot {
  const { now } = input;
  if (!input.signedIn) return SIGNED_OUT_SNAPSHOT(now);

  const [thisWeek] = dailyActivity(input.sessions, { now, weeks: 1 });
  const todayIndex = (now.getDay() + 6) % 7;
  const days = [...(input.plan?.plan_days ?? [])].sort((a, b) => a.day_index - b.day_index);

  let today: WidgetSnapshot['today'] = null;
  if (input.plan && days.length) {
    const day = days[((input.dayIndex % days.length) + days.length) % days.length];
    const audit = analyzeTrainingDay(day);
    const doneDay = thisWeek[todayIndex].workouts > 0;
    today = {
      dayId: day.id,
      planId: input.plan.id,
      name: day.name,
      programName: input.programName ?? input.plan.name,
      position: `Day ${day.day_index + 1} of ${days.length}`,
      summary: `${plural(day.plan_exercises.length, 'exercise')} · ${plural(audit.totalSets, 'set')} · ~${audit.estimatedMinutes} min`,
      preview: day.plan_exercises.slice(0, 3).map((pe) => pe.exercise.name),
      done: doneDay,
    };
  }

  return {
    signedIn: true,
    today,
    streak: input.streak,
    weekDone: thisWeek.reduce((n, d) => n + d.workouts, 0),
    weekTarget: days.length,
    week: thisWeek.map((d) => (d.future ? -1 : d.level)),
    todayIndex,
    updatedAt: now.toISOString(),
  };
}

/** Deep links the widgets open; the app's URL scheme stays `grit` (bound to the live listing). */
export const WIDGET_LINKS = {
  home: 'grit:///',
  progress: 'grit:///progress',
  workout: (t: NonNullable<WidgetSnapshot['today']>) => `grit:///workout/${t.dayId}?planId=${t.planId}`,
};
