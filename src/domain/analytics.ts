/**
 * Training analytics: which muscles a user has actually trained, and how their
 * training and strength have moved over time. Derived entirely from logged
 * sets — nothing here is stored — and pure, so scripts/test-analytics.ts can
 * cover it without Supabase.
 *
 * Muscle credit follows `trainingAnalysis.ts`: a set counts fully for the
 * exercise's prime movers and half for its secondary muscles.
 */

import { MUSCLE_GROUPS } from './muscles';
import type { MuscleGroup } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export type AnalyticsSet = {
  exerciseId: string;
  exerciseName: string;
  reps: number | null;
  weight: number | null;
};

export type AnalyticsSession = {
  id: string;
  /** ISO timestamp. */
  completedAt: string;
  sets: AnalyticsSet[];
};

/** Resolves an exercise's muscles; the app passes the bundled catalog. */
export type MuscleLookup = (
  exerciseId: string
) => { primary: MuscleGroup[]; secondary: MuscleGroup[] } | undefined;

type WindowOptions = { now: Date; weeks: number };

function rollingWindow({ now, weeks }: WindowOptions, offsetWindows = 0) {
  const end = now.getTime() - offsetWindows * weeks * WEEK_MS;
  return { start: end - weeks * WEEK_MS, end };
}

function within(session: AnalyticsSession, start: number, end: number): boolean {
  const t = new Date(session.completedAt).getTime();
  return Number.isFinite(t) && t > start && t <= end;
}

function emptyMuscleRecord(): Record<MuscleGroup, number> {
  const out = {} as Record<MuscleGroup, number>;
  for (const m of MUSCLE_GROUPS) out[m] = 0;
  return out;
}

// ------------------------------------------------------------ Muscle map

/**
 * Average weekly sets per muscle over the last `weeks` weeks (rolling, ending
 * `now`). Rolling rather than calendar weeks so a half-finished current week
 * cannot drag every muscle down.
 */
export function muscleWeeklySets(
  sessions: AnalyticsSession[],
  lookup: MuscleLookup,
  options: WindowOptions
): Record<MuscleGroup, number> {
  const { start, end } = rollingWindow(options);
  const totals = emptyMuscleRecord();
  for (const session of sessions) {
    if (!within(session, start, end)) continue;
    for (const set of session.sets) {
      const muscles = lookup(set.exerciseId);
      if (!muscles) continue;
      for (const m of muscles.primary) totals[m] += 1;
      for (const m of muscles.secondary) {
        if (!muscles.primary.includes(m)) totals[m] += 0.5;
      }
    }
  }
  const weeks = Math.max(1, options.weeks);
  for (const m of MUSCLE_GROUPS) totals[m] /= weeks;
  return totals;
}

export type MuscleBand = 'none' | 'low' | 'building' | 'target';

/** Lower bound of each band, in average sets per week. */
export const MUSCLE_BAND_FLOORS = { low: 0, building: 4, target: 10 } as const;

/**
 * Bands for the anatomy map. 10+ weekly sets is a widely used volume guideline
 * for muscle growth; it is a reference point for the map, not a prescription.
 */
export function muscleBand(weeklySets: number): MuscleBand {
  if (!(weeklySets > 0)) return 'none';
  if (weeklySets < MUSCLE_BAND_FLOORS.building) return 'low';
  if (weeklySets < MUSCLE_BAND_FLOORS.target) return 'building';
  return 'target';
}

// -------------------------------------------------------- Weekly totals

export type PeriodTotals = { workouts: number; sets: number; volume: number };

function totalsOf(sessions: AnalyticsSession[]): PeriodTotals {
  let sets = 0;
  let volume = 0;
  for (const s of sessions) {
    sets += s.sets.length;
    for (const set of s.sets) volume += (set.weight ?? 0) * (set.reps ?? 0);
  }
  return { workouts: sessions.length, sets, volume };
}

/** Local Monday 00:00 of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

export type WeekTotals = PeriodTotals & { weekStart: Date };

/** Calendar weeks (Monday-based), oldest first, ending with the current week. */
export function weeklyTotals(sessions: AnalyticsSession[], { now, weeks }: WindowOptions): WeekTotals[] {
  const current = startOfWeek(now);
  const buckets: WeekTotals[] = Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date(current);
    weekStart.setDate(current.getDate() - (weeks - 1 - i) * 7);
    return { weekStart, workouts: 0, sets: 0, volume: 0 };
  });
  for (const session of sessions) {
    const t = new Date(session.completedAt);
    if (!Number.isFinite(t.getTime())) continue;
    const week = startOfWeek(t).getTime();
    const bucket = buckets.find((b) => b.weekStart.getTime() === week);
    if (!bucket) continue;
    const add = totalsOf([session]);
    bucket.workouts += add.workouts;
    bucket.sets += add.sets;
    bucket.volume += add.volume;
  }
  return buckets;
}

/** This window against the one before it, for "+12% vs previous 4 weeks". */
export function periodComparison(sessions: AnalyticsSession[], options: WindowOptions) {
  const cur = rollingWindow(options);
  const prev = rollingWindow(options, 1);
  return {
    current: totalsOf(sessions.filter((s) => within(s, cur.start, cur.end))),
    previous: totalsOf(sessions.filter((s) => within(s, prev.start, prev.end))),
  };
}

/** Fractional change, or null when there is no baseline to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (!(previous > 0)) return null;
  return (current - previous) / previous;
}

// ------------------------------------------------------ Strength trends

/** Rep counts above this make the Epley estimate too loose to be useful. */
export const MAX_ESTIMATE_REPS = 12;

/**
 * Estimated one-rep max (Epley). Lets sets of different rep counts be compared
 * on one scale; `null` for bodyweight/unweighted sets and high-rep sets.
 */
export function estimateOneRepMax(weight: number | null, reps: number | null): number | null {
  if (weight == null || reps == null || !(weight > 0) || reps < 1 || reps > MAX_ESTIMATE_REPS) {
    return null;
  }
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export type StrengthTrend = {
  exerciseId: string;
  name: string;
  /** Sessions in the window with an estimable set. */
  sessions: number;
  start: number;
  latest: number;
  best: number;
  /** Fractional change from first to latest session. */
  change: number;
};

/**
 * Per-exercise estimated-1RM movement across the window, using each session's
 * best set. Only exercises trained in two or more sessions qualify. Ordered by
 * how often they were trained, so the main lifts lead.
 */
export function strengthTrends(
  sessions: AnalyticsSession[],
  options: WindowOptions & { limit?: number }
): StrengthTrend[] {
  const { start, end } = rollingWindow(options);
  const ordered = sessions
    .filter((s) => within(s, start, end))
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

  const series = new Map<string, { name: string; points: number[] }>();
  for (const session of ordered) {
    const bestHere = new Map<string, { name: string; e1rm: number }>();
    for (const set of session.sets) {
      const e1rm = estimateOneRepMax(set.weight, set.reps);
      if (e1rm == null) continue;
      const cur = bestHere.get(set.exerciseId);
      if (!cur || e1rm > cur.e1rm) bestHere.set(set.exerciseId, { name: set.exerciseName, e1rm });
    }
    for (const [id, { name, e1rm }] of bestHere) {
      const entry = series.get(id) ?? { name, points: [] };
      entry.points.push(e1rm);
      series.set(id, entry);
    }
  }

  const trends: StrengthTrend[] = [];
  for (const [exerciseId, { name, points }] of series) {
    if (points.length < 2) continue;
    const first = points[0];
    const latest = points[points.length - 1];
    trends.push({
      exerciseId,
      name,
      sessions: points.length,
      start: first,
      latest,
      best: Math.max(...points),
      change: (latest - first) / first,
    });
  }
  trends.sort((a, b) => b.sessions - a.sessions || Math.abs(b.change) - Math.abs(a.change));
  return trends.slice(0, options.limit ?? 5);
}
