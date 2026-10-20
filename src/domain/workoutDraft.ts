/**
 * Offline safety for the live workout. Two records live on the phone:
 *
 * - The **draft**: the player's state, written after every change, so a crash,
 *   a killed app or a dead battery reopens the workout exactly where it was.
 * - The **outbox**: finished workouts that could not reach the server (no
 *   signal in the gym). They sync later through the same idempotent RPCs, so a
 *   retry can never double-count a session.
 *
 * Pure rules only; storage is `src/lib/workoutStore.ts` and syncing is
 * `src/hooks/useWorkoutOutbox.ts`. Covered by scripts/test-workout-draft.ts.
 */

import type { PlayerState } from './workoutPlayer';
import type { LiveExercise } from './types';

export const DRAFT_VERSION = 1;
/** A workout left open longer than this is stale, not paused. */
export const DRAFT_MAX_AGE_MS = 36 * 60 * 60 * 1000;

export type WorkoutDraft = {
  version: number;
  userId: string;
  planId: string;
  dayId: string;
  dayName: string;
  /** Plan shape the finish needs, so a draft can resume and save with no network. */
  dayCount: number;
  dayIndex: number;
  /** Set once the server row exists; null when every set so far was logged offline. */
  sessionId: string | null;
  /** Epoch ms when the workout started, so the timer survives a restart. */
  startedAt: number;
  savedAt: number;
  state: PlayerState;
};

export type QueuedWorkout = {
  /** Local id, stable across retries. */
  id: string;
  userId: string;
  planId: string;
  dayId: string;
  dayName: string;
  sessionId: string | null;
  exercises: LiveExercise[];
  dayCount: number;
  finishedDayIndex: number;
  queuedAt: number;
  attempts: number;
  /** Last failure that was not a connectivity problem; shown so the user can act on it. */
  lastError: string | null;
};

export function completedSetCount(state: PlayerState): number {
  return state.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.completed).length, 0);
}

/**
 * The saved draft to resume for this workout, or null. It must be this user's,
 * this day's, recent, from a known version, and structurally sound; indices are
 * clamped so a corrupted pointer cannot crash the player.
 */
export function usableDraft(
  draft: WorkoutDraft | null | undefined,
  expect: { userId: string; dayId: string; now: number }
): WorkoutDraft | null {
  if (!draft || draft.version !== DRAFT_VERSION) return null;
  if (draft.userId !== expect.userId || draft.dayId !== expect.dayId) return null;
  if (!(expect.now - draft.savedAt < DRAFT_MAX_AGE_MS)) return null;
  const exercises = draft.state?.exercises;
  if (!Array.isArray(exercises) || exercises.length === 0) return null;
  if (!exercises.every((ex) => Array.isArray(ex?.sets) && ex.sets.length > 0)) return null;
  const exerciseIndex = Math.min(Math.max(0, draft.state.exerciseIndex | 0), exercises.length - 1);
  const setIndex = Math.min(Math.max(0, draft.state.setIndex | 0), exercises[exerciseIndex].sets.length - 1);
  return { ...draft, state: { exercises, exerciseIndex, setIndex } };
}

/**
 * Rejects after `ms` with a "timed out" error. Weak gym signal makes requests
 * hang rather than fail, and a finish must not spin forever: past the deadline
 * the workout is queued instead. Safe because completion is idempotent; if the
 * slow request lands after all, the queued retry is a no-op.
 */
export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms);
    work.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

/** Network failures are worth retrying later; anything else needs a person to look. */
export function isConnectivityError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error ?? '');
  return /network|fetch|timed? ?out|offline|connection|socket|ECONN|ENOTFOUND|503|502|504/i.test(message);
}

export function queueWorkout(draft: WorkoutDraft, now: number): QueuedWorkout {
  return {
    id: `${draft.dayId}:${draft.startedAt}`,
    userId: draft.userId,
    planId: draft.planId,
    dayId: draft.dayId,
    dayName: draft.dayName,
    sessionId: draft.sessionId,
    exercises: draft.state.exercises,
    dayCount: draft.dayCount,
    finishedDayIndex: draft.dayIndex,
    queuedAt: now,
    attempts: 0,
    lastError: null,
  };
}

/** Adds or replaces by id, so queuing the same workout twice keeps one copy. */
export function upsertQueued(queue: QueuedWorkout[], item: QueuedWorkout): QueuedWorkout[] {
  return [...queue.filter((q) => q.id !== item.id), item].sort((a, b) => a.queuedAt - b.queuedAt);
}
