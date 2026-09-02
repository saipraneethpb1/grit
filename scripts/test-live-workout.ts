import {
  parseRepsValue,
  parseWeightValue,
  pickPreviousBests,
  sanitizeRepsInput,
  sanitizeWeightInput,
  type PreviousBestRow,
} from '../src/domain/liveWorkout';
import { buildCompletedSetRows } from '../src/domain/sessionComplete';
import type { LiveExercise } from '../src/domain/types';

let failed = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`OK   ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

// --- weight input can never become NaN ---
{
  assert(sanitizeWeightInput('60') === '60', 'plain weight passes through');
  assert(sanitizeWeightInput('62.5') === '62.5', 'one decimal separator is kept');
  assert(sanitizeWeightInput('1.2.3') === '1.23', 'second separator is dropped');
  assert(sanitizeWeightInput('60kg') === '60', 'letters are stripped');
  assert(sanitizeWeightInput('.5') === '0.5', 'leading separator gains a zero');
  assert(sanitizeWeightInput('60.125') === '60.12', 'decimals capped at two');
  assert(sanitizeWeightInput('123456') === '1234', 'integer part capped at four digits');
  assert(Number.isFinite(Number(sanitizeWeightInput('1.2.3.4'))), 'sanitised weight always parses');
}

{
  assert(sanitizeRepsInput('12') === '12', 'plain reps pass through');
  assert(sanitizeRepsInput('1.5') === '15', 'reps drop separators');
  assert(sanitizeRepsInput('12345') === '123', 'reps capped at three digits');
}

// --- parsing never yields NaN into the insert payload ---
{
  assert(parseWeightValue('') === null, 'blank weight is null');
  assert(parseWeightValue('.') === null, 'lone separator is null');
  assert(parseWeightValue('62.5') === 62.5, 'weight parses to a number');
  assert(parseWeightValue('0') === 0, 'bodyweight zero is preserved, not dropped');
  assert(parseRepsValue('', 10) === 10, 'blank reps fall back to the target');
  assert(parseRepsValue('8', 10) === 8, 'typed reps win over the target');
}

// --- a completed set always records reps ---
{
  const exercise: LiveExercise = {
    planExerciseId: 'pe-1',
    exerciseId: 'ex-1',
    name: 'Bench Press',
    primaryMuscles: ['chest'],
    notes: null,
    targetSets: 1,
    targetRepsMin: 8,
    targetRepsMax: 12,
    previousBest: null,
    sets: [{ setNumber: 1, targetReps: 12, reps: '', weight: '60', completed: true }],
  };
  const rows = buildCompletedSetRows('sess-1', [exercise]);
  assert(rows[0].reps === 12, 'completed set with a cleared reps field falls back to target');
  assert(rows[0].weight === 60, 'weight survives the parse');
}

{
  const exercise: LiveExercise = {
    planExerciseId: 'pe-1',
    exerciseId: 'ex-1',
    name: 'Push Up',
    primaryMuscles: ['chest'],
    notes: null,
    targetSets: 1,
    targetRepsMin: 8,
    targetRepsMax: 12,
    previousBest: null,
    sets: [{ setNumber: 1, targetReps: 12, reps: '20', weight: '', completed: true }],
  };
  const rows = buildCompletedSetRows('sess-1', [exercise]);
  assert(rows[0].weight === null, 'bodyweight set saves a null weight, not NaN');
  assert(rows[0].reps === 20, 'bodyweight set keeps its reps');
}

// --- previous best: newest session wins, latest set within it ---
{
  const sessionOrder = ['s3', 's2', 's1'];
  const rows: PreviousBestRow[] = [
    { session_id: 's1', exercise_id: 'bench', set_number: 1, weight: 50, reps: 10 },
    { session_id: 's2', exercise_id: 'bench', set_number: 1, weight: 60, reps: 10 },
    { session_id: 's2', exercise_id: 'bench', set_number: 3, weight: 65, reps: 8 },
    { session_id: 's3', exercise_id: 'row', set_number: 2, weight: 40, reps: 12 },
  ];
  const best = pickPreviousBests(sessionOrder, rows);

  assert(best.bench.weight === 65 && best.bench.reps === 8, 'newest session and latest set win');
  assert(best.row.weight === 40, 'each exercise resolves independently');
  assert(best.squat === undefined, 'an exercise with no history is absent');
}

{
  // Rows arrive unordered because they come from one batched query.
  const best = pickPreviousBests(
    ['s2', 's1'],
    [
      { session_id: 's1', exercise_id: 'bench', set_number: 9, weight: 100, reps: 5 },
      { session_id: 's2', exercise_id: 'bench', set_number: 1, weight: 60, reps: 10 },
    ]
  );
  assert(best.bench.weight === 60, 'a high set number in an older session does not win');
}

{
  const best = pickPreviousBests(
    ['s1'],
    [
      { session_id: 's1', exercise_id: 'bench', set_number: 1, weight: null, reps: 10 },
      { session_id: 'unknown', exercise_id: 'bench', set_number: 1, weight: 80, reps: 5 },
    ]
  );
  assert(best.bench === undefined, 'null weights and out-of-window sessions are ignored');
}

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll live-workout tests passed');
