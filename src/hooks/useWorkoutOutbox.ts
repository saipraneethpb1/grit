import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { isConnectivityError, type QueuedWorkout } from '@/src/domain/workoutDraft';
import { readOutbox, updateOutbox } from '@/src/lib/workoutStore';
import { useAuth } from './useAuth';
import { completeSession, startSession } from './useSessions';

const OUTBOX_QUERY = ['workoutOutbox'] as const;
/** Retry while the app is open; a gym with no signal often regains it on the walk out. */
const RETRY_MS = 60_000;

async function syncOne(item: QueuedWorkout): Promise<void> {
  const sessionId = item.sessionId ?? (await startSession({
    userId: item.userId, planId: item.planId, planDayId: item.dayId, dayName: item.dayName,
  })).id;
  // Persist the server id first: if completion fails now, the retry must reuse
  // this row rather than open another one.
  if (!item.sessionId) await updateOutbox((q) => q.map((x) => (x.id === item.id ? { ...x, sessionId } : x)));
  await completeSession({
    sessionId, userId: item.userId, exercises: item.exercises,
    dayCount: item.dayCount, finishedDayIndex: item.finishedDayIndex,
  });
}

/**
 * Sends finished workouts that were saved offline. Completion is idempotent on
 * the server, so a retry after a lost response cannot double-count a workout.
 * Connectivity failures stay queued silently; any other failure is recorded on
 * the item so the home screen can show it.
 */
export async function flushOutbox(userId: string): Promise<{ synced: number; pending: number }> {
  let synced = 0;
  for (const item of (await readOutbox()).filter((q) => q.userId === userId)) {
    try {
      await syncOne(item);
      await updateOutbox((q) => q.filter((x) => x.id !== item.id));
      synced++;
    } catch (e) {
      const offline = isConnectivityError(e);
      await updateOutbox((q) => q.map((x) => (x.id === item.id
        ? { ...x, attempts: x.attempts + 1, lastError: offline ? null : e instanceof Error ? e.message : 'Could not sync this workout.' }
        : x)));
      if (offline) break;
    }
  }
  const pending = (await readOutbox()).filter((q) => q.userId === userId).length;
  return { synced, pending };
}

/** Queued workouts for the signed-in user, for the home banner. */
export function useWorkoutOutbox() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [...OUTBOX_QUERY, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await readOutbox()).filter((q) => q.userId === user!.id),
    staleTime: 0,
  });
  const discard = useCallback(async (id: string) => {
    await updateOutbox((q) => q.filter((x) => x.id !== id));
    await qc.invalidateQueries({ queryKey: OUTBOX_QUERY });
  }, [qc]);
  return { queued: query.data ?? [], discard };
}

/** Shared guard so a manual "Sync now" and the background loop never run together. */
let running = false;

/** One sync pass, then refreshes everything a synced workout changes. Safe to call from anywhere. */
export function useSyncNow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useCallback(async () => {
    if (!user?.id || running) return;
    running = true;
    try {
      const { synced } = await flushOutbox(user.id);
      await qc.invalidateQueries({ queryKey: OUTBOX_QUERY });
      if (synced) {
        for (const key of ['sessions', 'profileStats', 'activePlan', 'previousBests']) {
          await qc.invalidateQueries({ queryKey: [key] });
        }
      }
    } finally {
      running = false;
    }
  }, [user?.id, qc]);
}

/** Mounted once at the root: syncs on sign-in, on returning to the app, and every minute while anything is queued. */
export function useOutboxSync() {
  const { user } = useAuth();
  const run = useSyncNow();
  useEffect(() => {
    if (!user?.id) return;
    void run();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void run(); });
    const timer = setInterval(async () => {
      if ((await readOutbox()).some((q) => q.userId === user.id)) void run();
    }, RETRY_MS);
    return () => { sub.remove(); clearInterval(timer); };
  }, [user?.id, run]);
}

export { OUTBOX_QUERY };
