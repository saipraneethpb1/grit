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
/** `offset` steps the window back by whole windows: 1 is the window before this one. */
type OffsetWindowOptions = WindowOptions & { offset?: number };

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
  options: OffsetWindowOptions
): Record<MuscleGroup, number> {
  const { start, end } = rollingWindow(options, options.offset ?? 0);
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

// ---------------------------------------------------------- Balance web

/**
 * Radar axis order. Neighbours are related muscles (push, arms, trunk, legs,
 * posterior chain, pull), so a lopsided program shows as one bulging side of
 * the web rather than a scattered star.
 */
export const RADAR_AXES: readonly MuscleGroup[] = [
  'chest', 'shoulders', 'triceps', 'biceps', 'forearms', 'core',
  'quads', 'calves', 'hamstrings', 'glutes', 'back', 'traps',
];

/**
 * Outer ring of the web, in weekly sets: at least one and a half times the
 * 10-set guideline so the guideline ring sits inside, rounded up to a multiple
 * of five so the rings read as whole numbers.
 */
export function radarScale(...series: Record<MuscleGroup, number>[]): number {
  const top = Math.max(0, ...series.flatMap((s) => RADAR_AXES.map((m) => s[m] ?? 0)));
  return Math.max(MUSCLE_BAND_FLOORS.target * 1.5, Math.ceil(top / 5) * 5);
}

/** Point for each axis, clockwise from 12 o'clock, clamped to the outer ring. */
export function radarPoints(
  values: Record<MuscleGroup, number>,
  scale: number,
  radius: number,
  center: { x: number; y: number }
): { muscle: MuscleGroup; x: number; y: number }[] {
  return RADAR_AXES.map((muscle, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_AXES.length;
    const r = scale > 0 ? Math.min(1, Math.max(0, values[muscle] ?? 0) / scale) * radius : 0;
    return { muscle, x: center.x + r * Math.cos(angle), y: center.y + r * Math.sin(angle) };
  });
}

const PUSH: MuscleGroup[] = ['chest', 'shoulders', 'triceps'];
const PULL: MuscleGroup[] = ['back', 'biceps', 'traps'];
const UPPER: MuscleGroup[] = ['chest', 'shoulders', 'triceps', 'biceps', 'forearms', 'back', 'traps'];
const LOWER: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves'];

export type TrainingBalance = {
  /** Pull sets per push set; null when neither was trained. */
  pullPerPush: number | null;
  /** Share of upper+lower sets that were lower body, 0–1; null when neither was trained. */
  lowerShare: number | null;
  /** Muscle groups at or above the 4-set "building" floor. */
  covered: number;
  strongest: MuscleGroup | null;
  weakest: MuscleGroup | null;
};

/** Summary of the web: push/pull, upper/lower and how many groups get real work. */
export function trainingBalance(weekly: Record<MuscleGroup, number>): TrainingBalance {
  const sum = (ms: MuscleGroup[]) => ms.reduce((n, m) => n + (weekly[m] ?? 0), 0);
  const push = sum(PUSH);
  const pull = sum(PULL);
  const upper = sum(UPPER);
  const lower = sum(LOWER);
  const ranked = [...RADAR_AXES].sort((a, b) => (weekly[b] ?? 0) - (weekly[a] ?? 0));
  const trained = ranked.filter((m) => (weekly[m] ?? 0) > 0);
  return {
    pullPerPush: push > 0 ? pull / push : null,
    lowerShare: upper + lower > 0 ? lower / (upper + lower) : null,
    covered: RADAR_AXES.filter((m) => (weekly[m] ?? 0) >= MUSCLE_BAND_FLOORS.building).length,
    strongest: trained[0] ?? null,
    weakest: trained.length ? ranked[ranked.length - 1] : null,
  };
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

// ------------------------------------------------------ Training calendar

export type DayActivity = PeriodTotals & {
  /** Local midnight of the day. */
  date: Date;
  /** 0 = rest, 1–4 = increasing training load (see `activityLevel`). */
  level: 0 | 1 | 2 | 3 | 4;
  /** After `now`: drawn as an empty slot so the current week's column stays aligned. */
  future: boolean;
};

/** Upper bound of each heat level in completed sets per day; 30+ is the top level. */
export const ACTIVITY_LEVEL_SETS = [0, 9, 19, 29] as const;

/** Heat level for a day's completed sets. Fixed bands, so a cell means the same thing every month. */
export function activityLevel(sets: number): DayActivity['level'] {
  if (!(sets > 0)) return 0;
  if (sets <= ACTIVITY_LEVEL_SETS[1]) return 1;
  if (sets <= ACTIVITY_LEVEL_SETS[2]) return 2;
  if (sets <= ACTIVITY_LEVEL_SETS[3]) return 3;
  return 4;
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Calendar heatmap grid: `weeks` Monday-based columns of seven days, oldest
 * first, ending with the week containing `now`. Sessions count on the local day
 * they were completed.
 */
export function dailyActivity(sessions: AnalyticsSession[], { now, weeks }: WindowOptions): DayActivity[][] {
  const byDay = new Map<string, PeriodTotals>();
  for (const session of sessions) {
    const t = new Date(session.completedAt);
    if (!Number.isFinite(t.getTime())) continue;
    const key = localDayKey(t);
    const add = totalsOf([session]);
    const prev = byDay.get(key) ?? { workouts: 0, sets: 0, volume: 0 };
    byDay.set(key, { workouts: prev.workouts + add.workouts, sets: prev.sets + add.sets, volume: prev.volume + add.volume });
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const first = startOfWeek(now);
  first.setDate(first.getDate() - (weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7 + d);
      const totals = byDay.get(localDayKey(date)) ?? { workouts: 0, sets: 0, volume: 0 };
      return { ...totals, date, level: activityLevel(totals.sets), future: date.getTime() > today };
    })
  );
}

export type ActivitySummary = { activeDays: number; currentRun: number; bestRun: number; busiestWeekday: number | null };

/**
 * Headline numbers under the calendar. Runs count consecutive weeks with at
 * least one workout, not days: a program prescribes rest days, so a day-based
 * run would punish following it. `busiestWeekday` is 0 = Monday.
 */
export function activitySummary(grid: DayActivity[][]): ActivitySummary {
  const days = grid.flat().filter((d) => !d.future);
  const activeDays = days.filter((d) => d.workouts > 0).length;
  const weekActive = grid.map((week) => week.some((d) => !d.future && d.workouts > 0));
  let bestRun = 0;
  let run = 0;
  for (const on of weekActive) {
    run = on ? run + 1 : 0;
    bestRun = Math.max(bestRun, run);
  }
  // The current week still counts while it is in progress and empty so far.
  let currentRun = 0;
  for (let i = weekActive.length - 1; i >= 0; i--) {
    if (weekActive[i]) currentRun++;
    else if (i === weekActive.length - 1) continue;
    else break;
  }
  const perWeekday = Array.from({ length: 7 }, (_, i) => grid.reduce((n, week) => n + (week[i] && !week[i].future && week[i].workouts > 0 ? 1 : 0), 0));
  const top = Math.max(...perWeekday);
  return { activeDays, currentRun, bestRun, busiestWeekday: top > 0 ? perWeekday.indexOf(top) : null };
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
