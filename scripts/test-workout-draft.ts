import { withTimeout, DRAFT_MAX_AGE_MS, DRAFT_VERSION, completedSetCount, isConnectivityError, queueWorkout, upsertQueued, usableDraft, type WorkoutDraft } from '../src/domain/workoutDraft';
import { playerReducer } from '../src/domain/workoutPlayer';
import type { LiveExercise } from '../src/domain/types';

let failed = 0;
function assert(cond: boolean, label: string) {
  if (cond) console.log(`OK   ${label}`);
  else { failed += 1; console.error(`FAIL ${label}`); }
}

const ex = (id: string, done: boolean[]): LiveExercise => ({
  planExerciseId: `pe-${id}`, exerciseId: id, name: id, primaryMuscles: ['chest'], notes: null,
  targetSets: done.length, targetRepsMin: 6, targetRepsMax: 10, previousBest: null,
  sets: done.map((c, i) => ({ setNumber: i + 1, targetReps: 10, reps: '8', weight: '60', completed: c })),
});
const now = 1_800_000_000_000;
const draft: WorkoutDraft = {
  version: DRAFT_VERSION, userId: 'u1', planId: 'p1', dayId: 'd1', dayName: 'Push A', dayCount: 4, dayIndex: 1,
  sessionId: null, startedAt: now - 30 * 60_000, savedAt: now - 60_000,
  state: { exercises: [ex('bench', [true, true, false]), ex('fly', [false, false])], exerciseIndex: 0, setIndex: 2 },
};

// --- resume rules ---
assert(usableDraft(draft, { userId: 'u1', dayId: 'd1', now }) !== null, 'a recent draft for this user and day resumes');
assert(usableDraft(draft, { userId: 'u2', dayId: 'd1', now }) === null, 'another account’s draft never resumes');
assert(usableDraft(draft, { userId: 'u1', dayId: 'd2', now }) === null, 'a different day starts fresh');
assert(usableDraft({ ...draft, savedAt: now - DRAFT_MAX_AGE_MS - 1 }, { userId: 'u1', dayId: 'd1', now }) === null, 'a draft older than 36 hours is stale');
assert(usableDraft({ ...draft, version: 99 }, { userId: 'u1', dayId: 'd1', now }) === null, 'an unknown draft version is ignored');
assert(usableDraft({ ...draft, state: { ...draft.state, exercises: [] } }, { userId: 'u1', dayId: 'd1', now }) === null, 'an empty draft is ignored');
const clamped = usableDraft({ ...draft, state: { ...draft.state, exerciseIndex: 9, setIndex: 9 } }, { userId: 'u1', dayId: 'd1', now });
assert(clamped?.state.exerciseIndex === 1 && clamped?.state.setIndex === 1, 'a corrupted focus pointer is clamped, not a crash');
assert(usableDraft(null, { userId: 'u1', dayId: 'd1', now }) === null, 'no draft, nothing to resume');

// --- restore keeps everything ---
const restored = playerReducer({ exercises: [], exerciseIndex: 0, setIndex: 0 }, { type: 'restore', state: draft.state });
assert(restored.setIndex === 2 && completedSetCount(restored) === 2, 'restore brings back focus and every logged set');
assert(restored.exercises[0].sets[0].weight === '60', 'restore keeps typed weights');

// --- outbox ---
const q = queueWorkout(draft, now);
assert(q.dayCount === 4 && q.finishedDayIndex === 1 && q.sessionId === null && q.attempts === 0, 'a queued workout carries what the finish needs');
const twice = upsertQueued(upsertQueued([], q), { ...q, attempts: 1 });
assert(twice.length === 1 && twice[0].attempts === 1, 'queuing the same workout twice keeps one copy');
assert(upsertQueued([{ ...q, id: 'b', queuedAt: now + 1 }], q).map((x) => x.id).join() === `${q.id},b`, 'the queue stays oldest first');

// --- error classification ---
assert(isConnectivityError(new TypeError('Network request failed')), 'fetch failures are connectivity');
assert(isConnectivityError({ message: 'FetchError: request timed out' }), 'timeouts are connectivity');
assert(isConnectivityError(new Error('upstream 503')), 'gateway errors are connectivity');
assert(!isConnectivityError(new Error('Workout day not found')), 'a missing plan day is not retried as offline');
assert(!isConnectivityError({ code: '42501', message: 'permission denied' }), 'permission errors are not treated as offline');

async function timeouts() {
  const slow = new Promise((r) => setTimeout(() => r('late'), 200));
  const err = await withTimeout(slow, 20).then(() => null, (e) => e);
  assert(err instanceof Error && isConnectivityError(err), 'a hung request becomes a retryable timeout');
  assert((await withTimeout(Promise.resolve('ok'), 50)) === 'ok', 'a fast request passes through');
}

timeouts().then(() => {
if (failed) { console.error(`\n${failed} draft test(s) failed`); process.exit(1); }
console.log('\nAll workout draft tests passed');
});
