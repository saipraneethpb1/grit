/**
 * Pure rules for the live workout player: numeric input sanitising and
 * "previous best" selection. Kept free of Supabase/React so the behaviour is
 * covered by scripts/test-live-workout.ts.
 */

export type PreviousBest = { weight: number; reps: number };

export type PreviousBestRow = {
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight: number | string | null;
  reps: number | string | null;
};

const MAX_WEIGHT_INTEGER_DIGITS = 4;
const MAX_WEIGHT_DECIMALS = 2;
const MAX_REP_DIGITS = 3;

/**
 * Keyboards with a decimal pad still let a user type several separators, and
 * `Number('1.2.3')` is NaN — which Postgres rejects on insert. Keep at most one
 * separator so the field can never hold an unparseable weight.
 */
export function sanitizeWeightInput(raw: string): string {
  let value = raw.replace(/[^0-9.]/g, '');

  const firstDot = value.indexOf('.');
  if (firstDot !== -1) {
    value =
      value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, '');
  }
  if (value.startsWith('.')) value = `0${value}`;

  const [whole, decimals] = value.split('.');
  const clippedWhole = whole.slice(0, MAX_WEIGHT_INTEGER_DIGITS);
  if (decimals === undefined) return clippedWhole;
  return `${clippedWhole}.${decimals.slice(0, MAX_WEIGHT_DECIMALS)}`;
}

export function sanitizeRepsInput(raw: string): string {
  return raw.replace(/[^0-9]/g, '').slice(0, MAX_REP_DIGITS);
}

/** `null` for a blank or unusable field — never NaN. */
export function parseWeightValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '.') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * A set the user marked complete should always carry a rep count, so an empty
 * field falls back to the target rather than saving a set with no reps.
 */
export function parseRepsValue(raw: string, fallback: number | null = null): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

/**
 * Last logged weight × reps per exercise, taken from the most recent session
 * that has one, and within it the heaviest-numbered (latest) set.
 *
 * `sessionOrder` is newest-first; rows may arrive in any order because they are
 * fetched for every exercise in a single query.
 */
export function pickPreviousBests(
  sessionOrder: string[],
  rows: PreviousBestRow[]
): Record<string, PreviousBest> {
  const rankBySession = new Map<string, number>();
  sessionOrder.forEach((id, index) => rankBySession.set(id, index));

  type Candidate = PreviousBest & { rank: number; setNumber: number };
  const best = new Map<string, Candidate>();

  for (const row of rows) {
    if (row.weight == null || row.reps == null) continue;

    const rank = rankBySession.get(row.session_id);
    if (rank === undefined) continue;

    const weight = Number(row.weight);
    const reps = Number(row.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) continue;

    const current = best.get(row.exercise_id);
    const isBetter =
      !current ||
      rank < current.rank ||
      (rank === current.rank && row.set_number > current.setNumber);

    if (isBetter) {
      best.set(row.exercise_id, { rank, setNumber: row.set_number, weight, reps });
    }
  }

  const result: Record<string, PreviousBest> = {};
  for (const [exerciseId, candidate] of best) {
    result[exerciseId] = { weight: candidate.weight, reps: candidate.reps };
  }
  return result;
}
