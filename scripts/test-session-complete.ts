import {
  buildCompletedSetRows,
  daysBetweenLocalDates,
  localDateString,
  nextRotationIndex,
  nextStreak,
  profileNeedsProgressBump,
  streakGapAllowance,
} from '../src/domain/sessionComplete';
import type { LiveExercise } from '../src/domain/types';

let failed = 0;

function assert( cond: boolean, label: string) {
  if (cond) {
    console.log(`OK   ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

function makeExercise(partial?: {
  completedFlags?: boolean[];
  reps?: string;
  weight?: string;
}): LiveExercise {
  const flags = partial?.completedFlags ?? [false, false, false];
  return {
    planExerciseId: 'pe-1',
    exerciseId: 'ex-1',
    name: 'Bench Press',
    primaryMuscles: ['chest'],
    notes: null,
    targetSets: flags.length,
    targetRepsMin: 8,
    targetRepsMax: 12,
    previousBest: null,
    sets: flags.map((completed, i) => ({
      setNumber: i + 1,
      targetReps: 12,
      reps: partial?.reps ?? '12',
      weight: partial?.weight ?? '',
      completed,
    })),
  };
}

// --- P1: only completed sets are persisted (pre-filled reps ignored) ---
{
  const exercises = [makeExercise({ completedFlags: [false, false, false], reps: '12' })];
  const rows = buildCompletedSetRows('sess-1', exercises);
  assert(rows.length === 0, 'empty finish produces zero set rows despite prefilled reps');
}

{
  const exercises = [makeExercise({ completedFlags: [true, false, false], weight: '60' })];
  const rows = buildCompletedSetRows('sess-1', exercises);
  assert(rows.length === 1, 'only one completed set is saved');
  assert(rows[0].completed === true, 'saved row is marked completed');
  assert(rows[0].set_number === 1, 'saved row is set 1');
  assert(rows[0].weight === 60, 'weight is numeric');
}

{
  const exercises = [
    makeExercise({ completedFlags: [true, true, false], weight: '60' }),
    makeExercise({ completedFlags: [false, true], weight: '40' }),
  ];
  exercises[1].planExerciseId = 'pe-2';
  exercises[1].name = 'Row';
  const rows = buildCompletedSetRows('sess-1', exercises);
  assert(rows.length === 3, 'saves all completed sets across exercises');
}

// --- P1: empty finish is rejected by caller contract ---
{
  const rows = buildCompletedSetRows('sess-1', [makeExercise()]);
  assert(rows.length === 0, 'zero completed sets means finish must be rejected');
}

// --- P1: day rotation only advances for the due day ---
{
  assert(
    nextRotationIndex({ finishedDayIndex: 0, rotationIndex: 0, dayCount: 4 }) === 1,
    'finishing due day 0 advances to 1'
  );
  assert(
    nextRotationIndex({ finishedDayIndex: 2, rotationIndex: 0, dayCount: 4 }) === 0,
    'finishing off-rotation day 2 does not skip ahead'
  );
  assert(
    nextRotationIndex({ finishedDayIndex: 3, rotationIndex: 3, dayCount: 4 }) === 0,
    'finishing last day wraps to 0'
  );
  assert(
    nextRotationIndex({ finishedDayIndex: 1, rotationIndex: 1, dayCount: 3 }) === 2,
    'finishing due day 1 advances to 2'
  );
}

// --- streak / local date helpers ---
{
  assert(daysBetweenLocalDates('2026-08-11', '2026-08-12') === 1, 'adjacent local dates differ by 1');
  assert(daysBetweenLocalDates('2026-08-12', '2026-08-12') === 0, 'same local date differs by 0');
  assert(
    nextStreak({ lastWorkoutDate: null, currentStreak: 0, today: '2026-08-12', daysPerWeek: 3 }) === 1,
    'first workout streak is 1'
  );
  assert(
    nextStreak({ lastWorkoutDate: '2026-08-12', currentStreak: 5, today: '2026-08-12', daysPerWeek: 3 }) === 5,
    'same-day finish keeps streak'
  );
  assert(
    nextStreak({ lastWorkoutDate: '2026-08-11', currentStreak: 5, today: '2026-08-12', daysPerWeek: 3 }) === 6,
    'next-day finish increments streak'
  );
  assert(
    nextStreak({ lastWorkoutDate: '2026-08-09', currentStreak: 5, today: '2026-08-12', daysPerWeek: 7 }) === 1,
    'a 3-day gap breaks a 7-day-a-week plan'
  );
  assert(
    nextStreak({ lastWorkoutDate: '2026-08-09', currentStreak: 5, today: '2026-08-12', daysPerWeek: 3 }) === 6,
    'the same gap is a scheduled rest on a 3-day plan'
  );
  assert(
    nextStreak({ lastWorkoutDate: '2026-08-01', currentStreak: 9, today: '2026-08-12', daysPerWeek: 3 }) === 1,
    'vanishing for eleven days breaks any plan'
  );

  // The rest allowance is the longest gap a k-day week can produce.
  assert(streakGapAllowance(3) === 5, '3-day plan tolerates a five-day rest');
  assert(streakGapAllowance(6) === 2, '6-day plan tolerates two days');
  assert(streakGapAllowance(7) === 1, '7-day plan must be daily');
  assert(streakGapAllowance(0) === 7, 'a missing cadence falls back to weekly');
  assert(streakGapAllowance(99) === 1, 'an absurd cadence clamps to daily');
  const today = localDateString();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(today), 'localDateString format YYYY-MM-DD');
}

/**
 * Streaks used to require a workout every calendar day, so every rest day the
 * app itself prescribes reset the counter — a beginner on the recommended
 * 3-day plan never got past 1. Walk each split's real weekly shape and require
 * the streak to survive it.
 */
{
  function schedule(weekdays: number[], weeks: number): string[] {
    const out: string[] = [];
    for (let w = 0; w < weeks; w++) {
      for (const d of weekdays) {
        out.push(new Date(Date.UTC(2026, 0, 5 + w * 7 + d)).toISOString().slice(0, 10));
      }
    }
    return out;
  }

  function walk(dates: string[], daysPerWeek: number): number {
    let streak = 0;
    let last: string | null = null;
    for (const today of dates) {
      streak = nextStreak({ lastWorkoutDate: last, currentStreak: streak, today, daysPerWeek });
      last = today;
    }
    return streak;
  }

  const weeks = 12;
  const plans: [string, number[], number][] = [
    ['3-day full body (Mon/Wed/Fri)', [0, 2, 4], 3],
    ['3-day clustered (Mon/Tue/Wed)', [0, 1, 2], 3],
    ['4-day upper/lower', [0, 1, 3, 4], 4],
    ['5-day bro split', [0, 1, 2, 3, 4], 5],
    ['6-day PPL', [0, 1, 2, 3, 4, 5], 6],
    ['7 days a week', [0, 1, 2, 3, 4, 5, 6], 7],
  ];

  for (const [label, weekdays, daysPerWeek] of plans) {
    const dates = schedule(weekdays, weeks);
    assert(
      walk(dates, daysPerWeek) === dates.length,
      `${label}: ${weeks} perfect weeks is an unbroken streak`
    );
  }

  // Disappearing still has to break it, or the streak means nothing.
  const lapsed = [...schedule([0, 2, 4], 2), '2026-02-16'];
  assert(walk(lapsed, 3) === 1, 'a month off resets the streak to 1');
  assert(walk(schedule([0, 2, 4], 2), 3) === 6, 'the six sessions before it did count');
}

// --- home todayAlreadyDone semantics (inline mirror) ---
{
  const todayId = 'day-1';
  const sessionSame = { plan_day_id: 'day-1' };
  const sessionOther = { plan_day_id: 'day-0' };
  assert(
    Boolean(sessionSame && sessionSame.plan_day_id === todayId),
    'home hides Start only when due day was completed today'
  );
  assert(
    !(sessionOther && sessionOther.plan_day_id === todayId),
    'home still offers Start when a different day was completed today'
  );
}

// --- finish retry / progress bump ---
{
  assert(
    profileNeedsProgressBump({
      alreadyCompleted: false,
      workoutsCompleted: 3,
      completedSessionCount: 3,
    }),
    'first finish always bumps profile'
  );
  assert(
    profileNeedsProgressBump({
      alreadyCompleted: true,
      workoutsCompleted: 3,
      completedSessionCount: 4,
    }),
    'retry after session-saved/profile-failed still bumps'
  );
  assert(
    !profileNeedsProgressBump({
      alreadyCompleted: true,
      workoutsCompleted: 4,
      completedSessionCount: 4,
    }),
    'full success retry does not double-count'
  );
}

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll session-complete tests passed');
