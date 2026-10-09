import type { LiveExercise } from '../src/domain/types';
import {
  initialPlayerState,
  playerReducer,
  summarizePlayer,
  type PlayerAction,
  type PlayerState,
} from '../src/domain/workoutPlayer';

let failed = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`OK   ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

function exercise(name: string, sets: number): LiveExercise {
  return {
    planExerciseId: `pe-${name}`,
    exerciseId: `ex-${name}`,
    name,
    primaryMuscles: [],
    notes: null,
    targetSets: sets,
    targetRepsMin: 8,
    targetRepsMax: 10,
    previousBest: null,
    sets: Array.from({ length: sets }, (_, i) => ({
      setNumber: i + 1,
      targetReps: 10,
      reps: '10',
      weight: '60',
      completed: false,
    })),
  };
}

function run(state: PlayerState, ...actions: PlayerAction[]): PlayerState {
  return actions.reduce(playerReducer, state);
}

const loaded = run(initialPlayerState, {
  type: 'load',
  exercises: [exercise('Bench', 2), exercise('Row', 3)],
});

// --- loading and the empty player ---
{
  assert(loaded.exerciseIndex === 0 && loaded.setIndex === 0, 'load focuses the first set');
  const empty = summarizePlayer(initialPlayerState);
  assert(empty.totalSets === 0 && empty.progress === 0 && !empty.allDone, 'empty player is not "all done"');
  assert(run(initialPlayerState, { type: 'completeSet' }, { type: 'advance' }) === initialPlayerState, 'actions on an empty player are no-ops');
}

// --- editing the focused set only ---
{
  const s = run(loaded, { type: 'editWeight', raw: '1.2.3' }, { type: 'editReps', raw: '8x' });
  assert(s.exercises[0].sets[0].weight === '1.23', 'weight edits are sanitised');
  assert(s.exercises[0].sets[0].reps === '8', 'rep edits are sanitised');
  assert(s.exercises[0].sets[1].weight === '60', 'other sets are untouched');
  assert(s.exercises[1] === loaded.exercises[1], 'other exercises keep identity');
}

// --- steppers ---
{
  const up = run(loaded, { type: 'stepWeight', direction: 1 }, { type: 'stepReps', direction: 1 });
  assert(up.exercises[0].sets[0].weight === '62.5', 'weight steps by 2.5');
  assert(up.exercises[0].sets[0].reps === '11', 'reps step by one');
  const floor = run(loaded, { type: 'editWeight', raw: '1' }, { type: 'stepWeight', direction: -1 });
  assert(floor.exercises[0].sets[0].weight === '0', 'weight never goes negative');
  const blank = run(loaded, { type: 'editReps', raw: '' }, { type: 'stepReps', direction: 1 });
  assert(blank.exercises[0].sets[0].reps === '11', 'stepping blank reps starts from the target');
}

// --- completing, undoing, and advancing ---
{
  const done = run(loaded, { type: 'completeSet' });
  assert(done.exercises[0].sets[0].completed, 'completeSet marks the focused set');
  assert(run(done, { type: 'completeSet' }) === done, 'completing twice is a no-op');
  assert(!run(done, { type: 'undoSet' }).exercises[0].sets[0].completed, 'undoSet clears it');

  const next = run(done, { type: 'advance' });
  assert(next.exerciseIndex === 0 && next.setIndex === 1, 'advance moves to the next set');
  const wrap = run(next, { type: 'advance' });
  assert(wrap.exerciseIndex === 1 && wrap.setIndex === 0, 'advance rolls over to the next exercise');
  const end = run(wrap, { type: 'advance' }, { type: 'advance' }, { type: 'advance' });
  assert(end.exerciseIndex === 1 && end.setIndex === 2, 'advance stops at the final set');
}

// --- selection ---
{
  assert(run(loaded, { type: 'selectSet', setIndex: 5 }) === loaded, 'out-of-range set selection is ignored');
  assert(run(loaded, { type: 'selectExercise', exerciseIndex: 9 }) === loaded, 'out-of-range exercise selection is ignored');
  const partial = run(
    loaded,
    { type: 'selectExercise', exerciseIndex: 1 },
    { type: 'completeSet' },
    { type: 'selectExercise', exerciseIndex: 0 },
    { type: 'selectExercise', exerciseIndex: 1 }
  );
  assert(partial.setIndex === 1, 'jumping to an exercise lands on its first unfinished set');
  const finished = run(loaded, { type: 'completeSet' }, { type: 'advance' }, { type: 'completeSet' }, { type: 'selectExercise', exerciseIndex: 0 });
  assert(finished.setIndex === 0, 'a fully logged exercise lands on its first set');
}

// --- summary ---
{
  const start = summarizePlayer(loaded);
  assert(start.totalSets === 5 && start.doneSets === 0, 'counts every set');
  assert(start.nextLabel === 'Bench · set 2', 'rest label names the next set');
  assert(!start.isLastSet, 'first set is not the last');

  const lastOfFirst = summarizePlayer(run(loaded, { type: 'advance' }));
  assert(lastOfFirst.nextLabel === 'Row', 'rest label names the next exercise');

  let all = loaded;
  for (let i = 0; i < 5; i++) all = run(all, { type: 'completeSet' }, { type: 'advance' });
  const s = summarizePlayer(all);
  assert(s.allDone && s.progress === 1, 'all sets logged is all done');
  assert(s.isLastSet && s.nextLabel === 'Finish', 'final set rests toward Finish');
}

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('\nAll workout-player tests passed');
