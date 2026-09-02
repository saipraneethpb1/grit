import { parseRepsValue, parseWeightValue } from './liveWorkout';
import type { LiveExercise, SessionSet } from './types';

/** Local calendar date YYYY-MM-DD (avoids UTC midnight streak bugs). */
export function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetweenLocalDates(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const start = Date.UTC(ay, am - 1, ad);
  const end = Date.UTC(by, bm - 1, bd);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

/** Only sets the user marked completed (reps are often pre-filled). */
export function buildCompletedSetRows(
  sessionId: string,
  exercises: LiveExercise[],
  completedAt = new Date().toISOString()
): Omit<SessionSet, 'id'>[] {
  const rows: Omit<SessionSet, 'id'>[] = [];

  for (const ex of exercises) {
    for (const set of ex.sets) {
      if (!set.completed) continue;
      rows.push({
        session_id: sessionId,
        plan_exercise_id: ex.planExerciseId,
        exercise_id: ex.exerciseId,
        exercise_name: ex.name,
        set_number: set.setNumber,
        target_reps: set.targetReps,
        reps: parseRepsValue(set.reps, set.targetReps),
        weight: parseWeightValue(set.weight),
        completed: true,
        completed_at: completedAt,
      } as Omit<SessionSet, 'id'>);
    }
  }

  return rows;
}

/** Advance rotation only when finishing the day currently due. */
export function nextRotationIndex(params: {
  finishedDayIndex: number;
  rotationIndex: number;
  dayCount: number;
}): number {
  const { finishedDayIndex, rotationIndex, dayCount } = params;
  if (dayCount <= 0) return rotationIndex;
  if (finishedDayIndex !== rotationIndex) return rotationIndex;
  return (finishedDayIndex + 1) % dayCount;
}

/**
 * Longest rest a plan can legitimately require between two sessions.
 *
 * A k-days-a-week plan, with its sessions packed as tightly as the week allows,
 * still rests `8 - k` days before the next week opens — a 3-day plan trained
 * Mon/Tue/Wed does not train again until Monday, five days later. Anything
 * inside that window is the program working as designed.
 */
export function streakGapAllowance(daysPerWeek: number): number {
  const perWeek = Math.min(7, Math.max(1, Math.floor(daysPerWeek) || 1));
  return 8 - perWeek;
}

/**
 * Consecutive sessions that stayed on-program — **not** consecutive calendar
 * days.
 *
 * Requiring a workout every single day broke the streak on every rest day the
 * app itself prescribes: a beginner following the recommended 3-day plan
 * perfectly for twelve weeks never got past a streak of 1, which made the
 * streak badges unreachable and froze the XP bonus. The gap allowance comes
 * from the plan so a rest day the program asked for cannot cost the user
 * anything.
 */
export function nextStreak(params: {
  lastWorkoutDate: string | null | undefined;
  currentStreak: number | null | undefined;
  today: string;
  /** Sessions the active plan schedules per week. */
  daysPerWeek: number;
}): number {
  const { lastWorkoutDate, currentStreak, today, daysPerWeek } = params;
  if (!lastWorkoutDate) return 1;

  const diffDays = daysBetweenLocalDates(lastWorkoutDate, today);
  // A second session the same day (or a clock that moved backwards) neither
  // advances nor breaks the chain.
  if (diffDays <= 0) return currentStreak ?? 1;
  if (diffDays <= streakGapAllowance(daysPerWeek)) return (currentStreak ?? 0) + 1;
  return 1;
}
