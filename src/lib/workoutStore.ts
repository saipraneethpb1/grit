import AsyncStorage from '@react-native-async-storage/async-storage';
import { upsertQueued, type QueuedWorkout, type WorkoutDraft } from '@/src/domain/workoutDraft';

/** One draft per user: the player only ever has one workout open. */
const draftKey = (userId: string) => `ryvora.workoutDraft.v1.${userId}`;
const OUTBOX_KEY = 'ryvora.workoutOutbox.v1';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readDraft(userId: string): Promise<WorkoutDraft | null> {
  return readJson<WorkoutDraft | null>(draftKey(userId), null);
}

export async function writeDraft(draft: WorkoutDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(draftKey(draft.userId), JSON.stringify(draft));
  } catch {
    // Storage full or unavailable: the workout continues; only crash recovery is lost.
  }
}

export async function clearDraft(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(draftKey(userId));
  } catch {
    // Nothing to do; a stale draft expires on its own.
  }
}

export function readOutbox(): Promise<QueuedWorkout[]> {
  return readJson<QueuedWorkout[]>(OUTBOX_KEY, []);
}

/** Serialised so a sync and a new finish can never overwrite each other's write. */
let chain: Promise<unknown> = Promise.resolve();
export function updateOutbox(change: (queue: QueuedWorkout[]) => QueuedWorkout[]): Promise<QueuedWorkout[]> {
  const next = chain.then(async () => {
    const updated = change(await readOutbox());
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(updated));
    return updated;
  });
  chain = next.catch(() => undefined);
  return next;
}

export const enqueueWorkout = (item: QueuedWorkout) => updateOutbox((q) => upsertQueued(q, item));
