import {
  deloadSets, loadIncrement, pickExerciseHistory, prescribe, restSeconds, roundLoad, trainingAge,
  trainingReadiness, volumeRange, warmupSets, weeklyVolume, type Exposure,
} from '../src/domain/coach';
import type { AnalyticsSession } from '../src/domain/analytics';

let failed = 0;
function assert(cond: boolean, label: string) {
  if (cond) console.log(`OK   ${label}`);
  else { failed += 1; console.error(`FAIL ${label}`); }
}

const squat = { name: 'Barbell Full Squat', equipment: ['barbell' as const], movement_pattern: 'squat' as const };
const bench = { name: 'Barbell Bench Press', equipment: ['barbell' as const], movement_pattern: 'horizontal_push' as const };
const curl = { name: 'Dumbbell Curl', equipment: ['dumbbell' as const], movement_pattern: 'isolation' as const };
const dip = { name: 'Bench Dips', equipment: ['bodyweight' as const], movement_pattern: 'vertical_push' as const };
const target = { sets: 3, repsMin: 6, repsMax: 10 };
const ex = (w: number, reps: number[], daysAgo = 3): Exposure => ({ completedAt: new Date(Date.now() - daysAgo * 864e5).toISOString(), sets: reps.map((r) => ({ weight: w, reps: r })) });

// --- loading ---
assert(loadIncrement(squat) === 5 && loadIncrement(bench) === 2.5 && loadIncrement(curl) === 2 && loadIncrement(dip) === 0, 'increments follow equipment and pattern');
assert(roundLoad(61.3, bench) === 61.25 && roundLoad(13.1, curl) === 14, 'loads round to plates and dumbbell steps');
assert(trainingAge(10) === 'beginner' && trainingAge(100) === 'intermediate' && trainingAge(400) === 'advanced', 'training age from workouts completed');

// --- double progression ---
{
  const p = prescribe({ exercise: bench, target, history: [ex(60, [10, 10, 10])], age: 'intermediate' });
  assert(p.decision === 'progress' && p.weight === 62.5 && p.reps === 6, 'top of range on every set adds weight and restarts at the bottom');
  const sq = prescribe({ exercise: squat, target, history: [ex(100, [10, 10, 10])], age: 'intermediate' });
  assert(sq.weight === 105, 'lower-body compounds jump about 5%');
}
{
  const p = prescribe({ exercise: bench, target, history: [ex(60, [10, 9, 8])], age: 'intermediate' });
  assert(p.decision === 'repeat' && p.weight === 60 && p.reps === 9, 'inside the range: same load, one more rep on the weakest set');
}
{
  const p = prescribe({ exercise: bench, target, history: [ex(60, [7, 5, 4])], age: 'intermediate' });
  assert(p.decision === 'repeat' && p.weight === 60 && p.reps === 6, 'one short session holds the load at the bottom of the range');
  const r = prescribe({ exercise: bench, target, history: [ex(60, [6, 5, 4]), ex(60, [7, 5, 5], 6)], age: 'intermediate' });
  assert(r.decision === 'reset' && r.weight === 53.75, 'two short sessions reset about 10%');
}
{
  const p = prescribe({ exercise: bench, target, history: [ex(60, [8, 8, 8]), ex(60, [8, 8, 8], 6), ex(60, [8, 8, 8], 9)], age: 'intermediate' });
  assert(p.decision === 'reset', 'three sessions without an e1RM gain is a stall');
}
{
  const p = prescribe({ exercise: bench, target, history: [], age: 'beginner' });
  assert(p.decision === 'start' && p.weight === null && /3 short of failure/.test(p.reason), 'first exposure explains how to pick a load, with beginner RIR');
  const b = prescribe({ exercise: dip, target: { sets: 3, repsMin: 8, repsMax: 12 }, history: [ex(0, [12, 12, 11])], age: 'intermediate' });
  assert(b.decision === 'reps' && b.reps === 13 && /harder variation/.test(b.reason), 'bodyweight work progresses reps, then variation');
}
{
  const away = prescribe({ exercise: bench, target, history: [ex(80, [10, 10, 10], 30)], age: 'intermediate', daysSinceLastWorkout: 30 });
  assert(away.decision === 'ease-in' && away.weight === 67.5, 'a month away starts about 15% lighter');
  const del = prescribe({ exercise: bench, target, history: [ex(80, [10, 10, 10])], age: 'intermediate', deload: true });
  assert(del.decision === 'ease-in' && del.weight === 67.5 && /Deload/.test(del.headline), 'deload week lightens the load');
  assert(deloadSets(4) === 2 && deloadSets(1) === 1, 'deload halves sets');
}

// --- effort, rest, warm-up ---
{
  const c = prescribe({ exercise: squat, target, history: [ex(100, [8, 8, 8])], age: 'intermediate' });
  const i = prescribe({ exercise: curl, target, history: [ex(14, [8, 8, 8])], age: 'intermediate' });
  assert(c.rir === 2 && c.lastSetRir === 1 && i.rir === 1 && i.lastSetRir === 0, 'compounds stop further from failure than isolation');
  assert(restSeconds('squat', 5) === 180 && restSeconds('squat', 10) === 120 && restSeconds('isolation', 12) === 75 && restSeconds('isolation', 15) === 60, 'rest matches load and rep range');
  const w = warmupSets(140, squat);
  assert(w[0].weight === 20 && w.every((s, k) => k === 0 || s.weight > w[k - 1].weight) && w.every((s) => s.weight < 140), 'warm-ups ramp from the bar and stay under working weight');
  assert(warmupSets(30, bench).length === 0, 'light work needs no warm-up');
  const first = prescribe({ exercise: squat, target, history: [ex(100, [8, 8, 8])], age: 'intermediate', firstCompound: true });
  const later = prescribe({ exercise: squat, target, history: [ex(100, [8, 8, 8])], age: 'intermediate' });
  assert(first.warmup.length > 0 && later.warmup.length === 0, 'only the first compound gets warm-ups');
}

// --- weekly volume ---
{
  assert(volumeRange('chest', 'beginner')[0] === 6 && volumeRange('calves', 'advanced')[1] === 20, 'ranges widen with training age and are smaller for small muscles');
  const day = (sets: number) => ({ focus_muscles: ['chest' as const], exercises: [{ target_sets: sets, exercise: { primary_muscles: ['chest' as const], secondary_muscles: ['triceps' as const] } }] });
  const [chest, triceps] = weeklyVolume([day(4), day(4)], 'intermediate', ['chest', 'triceps']);
  assert(chest.sets === 8 && chest.frequency === 2 && chest.status === 'low', 'chest sets and frequency are counted across days');
  assert(triceps.sets === 4 && triceps.frequency === 0, 'secondary muscles count half and add no direct frequency');
}

// --- readiness ---
{
  const now = new Date(2026, 9, 14, 18);
  const session = (daysAgo: number, sets: number): AnalyticsSession => ({ id: `s${daysAgo}`, completedAt: new Date(now.getTime() - daysAgo * 864e5).toISOString(), sets: Array.from({ length: sets }, () => ({ exerciseId: 'x', exerciseName: 'x', reps: 8, weight: 50 })) });
  assert(trainingReadiness([], now).status === 'new', 'no history asks for a base');
  assert(trainingReadiness([session(20, 20)], now).status === 'ease-in', 'two weeks off eases back in');
  const steady = [3, 7, 10, 14, 17, 21, 24, 28, 31].map((d) => session(d, 20));
  assert(trainingReadiness(steady.slice(0, 4), now).status === 'ready', 'a short steady block is ready to progress');
  assert(trainingReadiness(steady, now).status === 'ready', 'steady weekly volume is never a spike');
  const long = Array.from({ length: 16 }, (_, k) => session(2 + k * 3.5, 20));
  const r = trainingReadiness(long, now);
  assert(r.status === 'deload' && r.blockWeeks >= 6, 'six or more hard weeks call for a deload');
  const spike = [session(3, 30), session(5, 30), session(9, 12), session(16, 12), session(23, 12), session(30, 12), session(37, 12)];
  assert(trainingReadiness(spike, now).status === 'spike', 'a jump to 1.5× usual weekly sets flags a spike');
}

// --- history picking ---
{
  const order = [{ id: 'b', completedAt: '2026-10-10' }, { id: 'a', completedAt: '2026-10-07' }];
  const h = pickExerciseHistory(order, [
    { session_id: 'a', exercise_id: 'x', set_number: 1, weight: '50', reps: 8 },
    { session_id: 'b', exercise_id: 'x', set_number: 2, weight: 55, reps: '6' },
    { session_id: 'b', exercise_id: 'x', set_number: 1, weight: 55, reps: 7 },
    { session_id: 'zzz', exercise_id: 'x', set_number: 1, weight: 99, reps: 1 },
  ]);
  assert(h.x.length === 2 && h.x[0].completedAt === '2026-10-10', 'exposures come newest first and ignore unknown sessions');
  assert(h.x[0].sets.map((s) => s.reps).join() === '7,6' && h.x[0].sets[0].weight === 55, 'sets keep their order and numeric values');
}

if (failed) { console.error(`\n${failed} coach test(s) failed`); process.exit(1); }
console.log('\nAll coach tests passed');
