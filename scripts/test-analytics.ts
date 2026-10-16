import {
  estimateOneRepMax,
  muscleBand,
  muscleWeeklySets,
  percentChange,
  periodComparison,
  startOfWeek,
  strengthTrends,
  weeklyTotals,
  type AnalyticsSession,
  type MuscleLookup,
} from '../src/domain/analytics';
import { getExerciseById } from '../src/domain/catalog';
import { EXERCISES } from '../src/domain/exercises.generated';

let failed = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`OK   ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

const lookup: MuscleLookup = (id) =>
  ({
    bench: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
    squat: { primary: ['quads', 'glutes'], secondary: ['hamstrings', 'glutes'] },
  })[id] as ReturnType<MuscleLookup>;

// Wednesday, local time, so week boundaries are unambiguous.
const now = new Date(2026, 9, 14, 18, 0);
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const set = (exerciseId: string, weight: number | null, reps: number | null) => ({
  exerciseId,
  exerciseName: exerciseId === 'bench' ? 'Bench Press' : 'Squat',
  weight,
  reps,
});
const session = (id: string, ago: number, sets: AnalyticsSession['sets']): AnalyticsSession => ({
  id,
  completedAt: daysAgo(ago),
  sets,
});

// --- muscle credit ---
{
  const sessions = [
    session('a', 1, [set('bench', 60, 8), set('bench', 60, 8)]),
    session('b', 3, [set('squat', 100, 5)]),
    session('old', 40, [set('bench', 60, 8)]),
    session('unknown', 2, [set('mystery', 10, 10)]),
  ];
  const week = muscleWeeklySets(sessions, lookup, { now, weeks: 1 });
  assert(week.chest === 2, 'prime movers get a full set each');
  assert(week.triceps === 1 && week.shoulders === 1, 'secondary muscles get half a set each');
  assert(week.glutes === 1, 'a muscle listed as both prime and secondary counts once');
  assert(week.hamstrings === 0.5, 'secondary-only muscle from another lift');
  assert(week.back === 0, 'untrained muscles read zero, not undefined');
  const month = muscleWeeklySets(sessions, lookup, { now, weeks: 4 });
  assert(near(month.chest, 0.5), 'longer windows average per week');
  assert(muscleWeeklySets(sessions, lookup, { now, weeks: 8 }).chest === 3 / 8, 'old sessions count once inside the window');
}

// --- bands ---
{
  assert(muscleBand(0) === 'none', '0 sets is untrained');
  assert(muscleBand(Number.NaN) === 'none', 'NaN is untrained');
  assert(muscleBand(0.5) === 'low', 'any work is light');
  assert(muscleBand(4) === 'building', '4 sets/week is building');
  assert(muscleBand(9.9) === 'building', 'just under 10 is still building');
  assert(muscleBand(10) === 'target', '10 sets/week reaches the reference band');
}

// --- weekly totals ---
{
  const monday = startOfWeek(now);
  assert(monday.getDay() === 1 && monday.getHours() === 0, 'weeks start Monday at local midnight');
  assert(startOfWeek(new Date(2026, 9, 18)).getDate() === 12, 'Sunday belongs to the week before it');
  const weeks = weeklyTotals(
    [
      session('this', 0, [set('bench', 50, 10)]),
      session('last', 7, [set('bench', 50, 10), set('bench', 50, 10)]),
      session('ancient', 200, [set('bench', 50, 10)]),
    ],
    { now, weeks: 4 }
  );
  assert(weeks.length === 4, 'one bucket per week');
  assert(weeks[3].workouts === 1 && weeks[3].volume === 500, 'current week is last');
  assert(weeks[2].sets === 2 && weeks[2].volume === 1000, 'previous week is second to last');
  assert(weeks[0].workouts === 0, 'out-of-range sessions are dropped');
}

// --- period comparison ---
{
  const cmp = periodComparison(
    [
      session('now1', 2, [set('bench', 50, 10)]),
      session('now2', 5, [set('bench', 50, 10)]),
      session('prev', 10, [set('bench', 50, 10)]),
    ],
    { now, weeks: 1 }
  );
  assert(cmp.current.workouts === 2 && cmp.previous.workouts === 1, 'splits into this and previous window');
  assert(percentChange(cmp.current.volume, cmp.previous.volume) === 1, 'doubling reads +100%');
  assert(percentChange(5, 0) === null, 'no baseline gives no percentage');
}

// --- estimated 1RM ---
{
  assert(estimateOneRepMax(100, 1) === 100, 'a single is the max');
  assert(near(estimateOneRepMax(100, 10)!, 100 * (1 + 10 / 30)), 'Epley for a set of ten');
  assert(estimateOneRepMax(0, 10) === null, 'bodyweight sets have no estimate');
  assert(estimateOneRepMax(100, 20) === null, 'high-rep sets are too loose to estimate');
  assert(estimateOneRepMax(100, 0) === null && estimateOneRepMax(null, 5) === null, 'missing values have no estimate');
}

// --- strength trends ---
{
  const trends = strengthTrends(
    [
      session('s1', 20, [set('bench', 60, 5), set('bench', 70, 1), set('squat', 100, 5)]),
      session('s2', 10, [set('bench', 75, 1)]),
      session('s3', 1, [set('bench', 80, 1), set('bench', 20, 30)]),
    ],
    { now, weeks: 4 }
  );
  assert(trends.length === 1, 'an exercise trained once has no trend');
  const bench = trends[0];
  assert(bench.sessions === 3, 'counts sessions with an estimable set');
  assert(near(bench.start, 70), "uses each session's best estimate");
  assert(bench.latest === 80 && bench.best === 80, 'latest and best estimates');
  assert(near(bench.change, 10 / 70), 'change runs from first to latest session');
  assert(strengthTrends([], { now, weeks: 4 }).length === 0, 'no history, no trends');
}

// --- the real catalog resolves for the app's lookup ---
{
  const sample = EXERCISES.slice(0, 20);
  assert(
    sample.every((e) => getExerciseById(e.id)?.primary_muscles.length),
    'catalog exercises carry prime movers for the muscle map'
  );
}

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll analytics tests passed');
