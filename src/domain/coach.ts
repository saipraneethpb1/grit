/**
 * The coach: evidence-based decisions about what to lift next, how much weekly
 * work each muscle gets, and when to back off. Pure functions over logged sets
 * and plan targets, covered by scripts/test-coach.ts.
 *
 * Principles, kept deliberately conservative:
 * - Double progression. Earn the top of the rep range on every working set at a
 *   load before adding weight, then restart at the bottom of the range.
 * - Small, equipment-aware jumps (about 2–5%) rounded to loadable increments.
 * - Effort is prescribed as reps in reserve (RIR): stop 1–3 reps short of
 *   failure, closer on isolation work and on the last set.
 * - Two sessions short of the range, or three without an estimated-1RM gain, is
 *   a stall: drop about 10% and build back rather than grinding.
 * - Weekly hard sets per muscle are judged against ranges that widen with
 *   training age; each muscle should be trained at least twice a week.
 * - A spike in weekly volume, a long block without a lighter week, or a long
 *   break each change the recommendation for the next session.
 *
 * These are coaching heuristics drawn from common strength-and-conditioning
 * practice, not medical advice and not a substitute for a qualified coach.
 */

import { estimateOneRepMax, type AnalyticsSession, startOfWeek } from './analytics';
import type { Equipment, Exercise, MovementPattern, MuscleGroup } from './types';

// ------------------------------------------------------------ Training age

export type TrainingAge = 'beginner' | 'intermediate' | 'advanced';

/** Rough training age from completed workouts: about six months and two years of regular training. */
export function trainingAge(workoutsCompleted: number): TrainingAge {
  if (workoutsCompleted < 60) return 'beginner';
  if (workoutsCompleted < 250) return 'intermediate';
  return 'advanced';
}

// ------------------------------------------------------------- Loading

const LOWER_COMPOUND: MovementPattern[] = ['squat', 'hinge', 'lunge'];
const UPPER_COMPOUND: MovementPattern[] = ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull'];

export function isCompoundPattern(pattern: MovementPattern): boolean {
  return LOWER_COMPOUND.includes(pattern) || UPPER_COMPOUND.includes(pattern);
}

function primaryEquipment(ex: Pick<Exercise, 'equipment'>): Equipment {
  return ex.equipment[0] ?? 'bodyweight';
}

/** Smallest sensible jump for the exercise, in kg. */
export function loadIncrement(ex: Pick<Exercise, 'equipment' | 'movement_pattern'>): number {
  const eq = primaryEquipment(ex);
  if (eq === 'dumbbell' || eq === 'kettlebell') return 2;
  if (eq === 'cable' || eq === 'machine') return isCompoundPattern(ex.movement_pattern) ? 5 : 2.5;
  if (eq === 'band' || eq === 'bodyweight') return 0;
  // Barbell, EZ bar, Smith: lower-body compounds move in bigger steps.
  if (LOWER_COMPOUND.includes(ex.movement_pattern)) return 5;
  if (UPPER_COMPOUND.includes(ex.movement_pattern)) return 2.5;
  return 1.25;
}

/** Rounds to a loadable weight: multiples of the increment (1.25 kg for bar work). */
export function roundLoad(weight: number, ex: Pick<Exercise, 'equipment' | 'movement_pattern'>): number {
  const eq = primaryEquipment(ex);
  const step = eq === 'dumbbell' || eq === 'kettlebell' ? 2 : eq === 'cable' || eq === 'machine' ? 2.5 : 1.25;
  return Math.max(0, Math.round(weight / step) * step);
}

/**
 * Next jump: about 2.5% for upper body and isolation, 5% for lower-body
 * compounds, never below the equipment's increment.
 */
function nextJump(weight: number, ex: Pick<Exercise, 'equipment' | 'movement_pattern'>): number {
  const pct = LOWER_COMPOUND.includes(ex.movement_pattern) ? 0.05 : 0.025;
  return Math.max(loadIncrement(ex), roundLoad(weight * pct, ex));
}

// ---------------------------------------------------------- Prescription

export type LoggedSet = { weight: number | null; reps: number | null };
/** One past session's working sets for an exercise, in set order. */
export type Exposure = { completedAt: string; sets: LoggedSet[] };

export type Decision = 'start' | 'progress' | 'repeat' | 'reset' | 'ease-in' | 'reps';

export type Prescription = {
  decision: Decision;
  /** Working weight in kg, or null when there is nothing to base it on (first time, bodyweight). */
  weight: number | null;
  /** Rep goal for every working set. */
  reps: number;
  /** Reps in reserve on working sets, and on the last set. */
  rir: number;
  lastSetRir: number;
  restSeconds: number;
  /** Ramp-up sets before the first working set; empty when not needed. */
  warmup: { weight: number; reps: number }[];
  /** One line, plain language. */
  headline: string;
  /** Why, in a sentence. */
  reason: string;
};

export type PrescribeInput = {
  exercise: Pick<Exercise, 'name' | 'equipment' | 'movement_pattern'>;
  target: { sets: number; repsMin: number; repsMax: number };
  /** Newest first. */
  history: Exposure[];
  age: TrainingAge;
  /** First compound of the session: gets warm-up sets. */
  firstCompound?: boolean;
  /** Days since the last workout of any kind; a long break eases the load. */
  daysSinceLastWorkout?: number | null;
  /** From `trainingReadiness`; a deload week lightens every prescription. */
  deload?: boolean;
};

const fmt = (kg: number) => `${Math.round(kg * 100) / 100} kg`;

function working(sets: LoggedSet[]): { weight: number; reps: number }[] {
  return sets
    .filter((s) => s.reps != null && s.reps > 0)
    .map((s) => ({ weight: Number(s.weight ?? 0), reps: Number(s.reps) }));
}

/** Heaviest load used for more than a single set (or the only set), and the sets done at it. */
function topSets(sets: { weight: number; reps: number }[]) {
  const top = Math.max(...sets.map((s) => s.weight));
  return { top, atTop: sets.filter((s) => s.weight === top) };
}

function bestE1rm(e: Exposure): number {
  return Math.max(0, ...working(e.sets).map((s) => estimateOneRepMax(s.weight, s.reps) ?? 0));
}

/** Rest by goal: heavy compound work needs the most, short isolation sets the least. */
export function restSeconds(pattern: MovementPattern, repsMax: number): number {
  const compound = isCompoundPattern(pattern);
  if (compound && repsMax <= 6) return 180;
  if (compound) return 120;
  if (repsMax >= 15) return 60;
  return 75;
}

/** Ramp to the working weight in a few sets that leave the lifter fresh. */
export function warmupSets(weight: number, ex: Pick<Exercise, 'equipment' | 'movement_pattern'>): { weight: number; reps: number }[] {
  const eq = primaryEquipment(ex);
  const barbell = eq === 'barbell' || eq === 'smith_machine' || eq === 'ez_bar';
  const floor = barbell ? 20 : roundLoad(weight * 0.4, ex);
  if (weight < (barbell ? 40 : 15)) return [];
  const steps: [number, number][] = weight >= 100 ? [[0.4, 8], [0.6, 5], [0.75, 3], [0.88, 1]] : [[0.5, 8], [0.7, 4], [0.85, 2]];
  const out: { weight: number; reps: number }[] = [];
  if (barbell) out.push({ weight: 20, reps: 10 });
  for (const [pct, reps] of steps) {
    const w = Math.max(floor, roundLoad(weight * pct, ex));
    if (w >= weight || out.some((s) => s.weight === w)) continue;
    out.push({ weight: w, reps });
  }
  return out;
}

export function prescribe(input: PrescribeInput): Prescription {
  const { exercise: ex, target, age } = input;
  const compound = isCompoundPattern(ex.movement_pattern);
  // Beginners leave an extra rep in the tank; technique degrades first.
  const rir = (compound ? 2 : 1) + (age === 'beginner' ? 1 : 0);
  const lastSetRir = Math.max(0, rir - 1);
  const rest = restSeconds(ex.movement_pattern, target.repsMax);
  const base = { rir, lastSetRir, restSeconds: rest };
  const exposures = input.history.filter((e) => working(e.sets).length > 0);
  const last = exposures[0];
  const withWarmup = (p: Omit<Prescription, 'warmup' | 'rir' | 'lastSetRir' | 'restSeconds'>): Prescription => ({
    ...base,
    ...p,
    warmup: input.firstCompound && compound && p.weight ? warmupSets(p.weight, ex) : [],
  });

  if (!last) {
    return withWarmup({
      decision: 'start', weight: null, reps: target.repsMax,
      headline: `Find a weight for ${target.repsMin}–${target.repsMax} reps`,
      reason: `First time logged. Choose a load you could lift for about ${target.repsMax + rir} reps, so each set ends ${rir} short of failure.`,
    });
  }

  const sets = working(last.sets);
  const { top, atTop } = topSets(sets);
  const loaded = top > 0 && loadIncrement(ex) > 0;
  const minAtTop = Math.min(...atTop.map((s) => s.reps));
  const needed = Math.min(target.sets, Math.max(1, atTop.length));
  const hitTop = atTop.length >= needed && atTop.every((s) => s.reps >= target.repsMax);
  const missed = atTop.filter((s) => s.reps < target.repsMin).length >= Math.ceil(atTop.length / 2);

  // Bodyweight and band work progress by reps, then by harder variations.
  if (!loaded) {
    const bestReps = Math.max(...sets.map((s) => s.reps));
    const reps = Math.min(target.repsMax + 5, bestReps + 1);
    return withWarmup({
      decision: 'reps', weight: top > 0 ? top : null, reps,
      headline: `Aim for ${reps} reps`,
      reason: bestReps >= target.repsMax
        ? `You reached ${bestReps} reps. Add load, slow the lowering to 3 seconds, or move to a harder variation.`
        : `Last time your best set was ${bestReps}. One more rep per set is the next step.`,
    });
  }

  const prior = exposures[1];
  const stalled = exposures.length >= 3 && bestE1rm(exposures[0]) <= bestE1rm(exposures[2]) && bestE1rm(exposures[1]) <= bestE1rm(exposures[2]);
  const missedTwice = missed && prior != null && (() => {
    const p = working(prior.sets);
    const pt = topSets(p);
    return pt.top >= top && pt.atTop.filter((s) => s.reps < target.repsMin).length >= Math.ceil(pt.atTop.length / 2);
  })();

  let rx: Omit<Prescription, 'warmup' | 'rir' | 'lastSetRir' | 'restSeconds'>;
  if (missedTwice || (stalled && !hitTop)) {
    const w = roundLoad(top * 0.9, ex);
    rx = {
      decision: 'reset', weight: w, reps: target.repsMax,
      headline: `Reset to ${fmt(w)} for ${target.repsMax}`,
      reason: missedTwice
        ? `Two sessions below ${target.repsMin} reps at ${fmt(top)}. Dropping about 10% lets you rebuild with clean reps and pass it.`
        : `No estimated-1RM gain in three sessions. A 10% reset and a fresh build usually breaks a stall.`,
    };
  } else if (hitTop) {
    const w = roundLoad(top + nextJump(top, ex), ex);
    rx = {
      decision: 'progress', weight: w, reps: target.repsMin,
      headline: `Add weight: ${fmt(w)} × ${target.repsMin}–${target.repsMax}`,
      reason: `You hit ${target.repsMax} reps on every set at ${fmt(top)}. Move up and work back toward ${target.repsMax}.`,
    };
  } else if (missed) {
    rx = {
      decision: 'repeat', weight: top, reps: target.repsMin,
      headline: `Hold ${fmt(top)}, reach ${target.repsMin} on every set`,
      reason: `Some sets fell short of ${target.repsMin} last time. Keep the load and own the bottom of the range first.`,
    };
  } else {
    const reps = Math.min(target.repsMax, minAtTop + 1);
    rx = {
      decision: 'repeat', weight: top, reps,
      headline: `Same weight, aim for ${reps} reps`,
      reason: `${fmt(top)} for ${minAtTop}–${Math.max(...atTop.map((s) => s.reps))} reps last time. Add a rep per set until all sets reach ${target.repsMax}.`,
    };
  }

  // Context can override the progression: a long break or a deload week.
  const days = input.daysSinceLastWorkout ?? 0;
  if (days >= 14 && rx.weight) {
    const w = roundLoad(Math.min(rx.weight, top) * 0.85, ex);
    rx = { decision: 'ease-in', weight: w, reps: target.repsMin, headline: `Ease back in: ${fmt(w)}`, reason: `${days} days since your last workout. Start about 15% lighter; strength returns within a session or two.` };
  } else if (input.deload && rx.weight) {
    const w = roundLoad(top * 0.85, ex);
    rx = { decision: 'ease-in', weight: w, reps: target.repsMin, headline: `Deload: ${fmt(w)} × ${target.repsMin}`, reason: 'Deload week: lighter loads and easy sets let fatigue clear so the next block starts stronger.' };
  }
  return withWarmup(rx);
}

/** Set count for a deload week: roughly half, never below one. */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.round(sets / 2));
}

// --------------------------------------------------------- Weekly volume

export type VolumeStatus = 'low' | 'productive' | 'high';
export type MuscleVolume = { muscle: MuscleGroup; sets: number; frequency: number; status: VolumeStatus; range: [number, number] };

/** Small muscles that also get heavy indirect work from compounds. */
const SMALL: MuscleGroup[] = ['forearms', 'calves', 'traps', 'core', 'biceps', 'triceps'];

/**
 * Weekly hard sets per muscle that most lifters grow on, widening with
 * training age. Prime movers count fully, secondary muscles half.
 */
export function volumeRange(muscle: MuscleGroup, age: TrainingAge): [number, number] {
  const big: Record<TrainingAge, [number, number]> = { beginner: [6, 14], intermediate: [10, 20], advanced: [12, 24] };
  const small: Record<TrainingAge, [number, number]> = { beginner: [4, 12], intermediate: [6, 16], advanced: [8, 20] };
  return (SMALL.includes(muscle) ? small : big)[age];
}

type PlanDayLike = { focus_muscles: MuscleGroup[]; exercises?: { target_sets: number; exercise: Pick<Exercise, 'primary_muscles' | 'secondary_muscles'> }[]; plan_exercises?: { target_sets: number; exercise: Pick<Exercise, 'primary_muscles' | 'secondary_muscles'> }[] };

export function weeklyVolume(days: PlanDayLike[], age: TrainingAge, muscles: MuscleGroup[]): MuscleVolume[] {
  const sets = new Map<MuscleGroup, number>();
  const freq = new Map<MuscleGroup, number>();
  for (const day of days) {
    const items = day.exercises ?? day.plan_exercises ?? [];
    const hit = new Set<MuscleGroup>();
    for (const it of items) {
      for (const m of it.exercise.primary_muscles) { sets.set(m, (sets.get(m) ?? 0) + it.target_sets); hit.add(m); }
      for (const m of it.exercise.secondary_muscles) {
        if (!it.exercise.primary_muscles.includes(m)) sets.set(m, (sets.get(m) ?? 0) + it.target_sets * 0.5);
      }
    }
    for (const m of hit) freq.set(m, (freq.get(m) ?? 0) + 1);
  }
  return muscles.map((muscle) => {
    const s = sets.get(muscle) ?? 0;
    const range = volumeRange(muscle, age);
    return { muscle, sets: s, frequency: freq.get(muscle) ?? 0, range, status: s < range[0] ? 'low' : s > range[1] ? 'high' : 'productive' };
  });
}

/**
 * Nudges a generated week toward every focus muscle's productive range, one set
 * at a time: trims sets where a muscle is over its ceiling (isolation work for
 * that muscle first, so other muscles keep their stimulus) and adds sets where
 * one is under its floor. Never touches set counts outside `min..max`, never
 * adds or removes a movement, and stops when a change would push a different
 * muscle out of range. Mutates `target_sets` in place.
 */
export function tuneWeeklyVolume(
  days: { focus_muscles: MuscleGroup[]; exercises: { target_sets: number; exercise: Pick<Exercise, 'primary_muscles' | 'secondary_muscles' | 'movement_pattern'> }[] }[],
  age: TrainingAge,
  limits: { min: number; max: number } = { min: 2, max: 5 },
  /** Largest allowed gap between the longest and shortest session, in minutes. */
  maxSpreadMinutes = 14
): void {
  const focus = [...new Set(days.flatMap((d) => d.focus_muscles))];
  const items = days.flatMap((d) => d.exercises);
  const dayOf = new Map(days.flatMap((d, i) => d.exercises.map((it) => [it, i] as const)));
  // Same estimate as trainingAnalysis: ~2.5 min per set plus 2 per movement.
  const minutes = () => days.map((d) => d.exercises.reduce((n, it) => n + it.target_sets * 2.5 + 2, 0));
  const spreadAfter = (it: (typeof items)[number], delta: number) => {
    const m = minutes();
    m[dayOf.get(it)!] += delta * 2.5;
    return Math.max(...m) - Math.min(...m);
  };
  /** A change may not open the week past the spread limit (or widen a week already past it). */
  const keepsBalance = (it: (typeof items)[number], delta: number) => {
    const now = minutes();
    const before = Math.max(...now) - Math.min(...now);
    const after = spreadAfter(it, delta);
    return after <= Math.max(maxSpreadMinutes, before) && (after <= maxSpreadMinutes || after <= before);
  };
  const contribution = (it: (typeof items)[number], m: MuscleGroup) =>
    it.exercise.primary_muscles.includes(m) ? 1 : it.exercise.secondary_muscles.includes(m) ? 0.5 : 0;
  const totals = () => {
    const t = new Map<MuscleGroup, number>();
    for (const it of items) for (const m of focus) t.set(m, (t.get(m) ?? 0) + it.target_sets * contribution(it, m));
    return t;
  };
  /** Would changing this item by `delta` push any other focus muscle out of range? */
  const harmsOthers = (it: (typeof items)[number], delta: number, target: MuscleGroup, t: Map<MuscleGroup, number>) =>
    focus.some((m) => {
      if (m === target) return false;
      const c = contribution(it, m);
      if (!c) return false;
      const [lo, hi] = volumeRange(m, age);
      const now = t.get(m) ?? 0;
      const next = now + delta * c;
      return (delta < 0 && next < lo && now >= lo) || (delta > 0 && next > hi && now <= hi);
    });

  for (let guard = 0; guard < 200; guard++) {
    const t = totals();
    let changed = false;
    for (const m of focus) {
      const [lo, hi] = volumeRange(m, age);
      const sets = t.get(m) ?? 0;
      if (sets > hi) {
        // Isolation for this muscle first, then the movement giving it the most.
        const candidates = items
          .filter((it) => it.exercise.primary_muscles.includes(m) && it.target_sets > limits.min && !harmsOthers(it, -1, m, t) && keepsBalance(it, -1))
          .sort((a, b) => Number(isCompoundPattern(a.exercise.movement_pattern)) - Number(isCompoundPattern(b.exercise.movement_pattern)) || b.target_sets - a.target_sets);
        if (candidates[0]) { candidates[0].target_sets -= 1; changed = true; break; }
      } else if (sets < lo) {
        const candidates = items
          .filter((it) => it.exercise.primary_muscles.includes(m) && it.target_sets < limits.max && !harmsOthers(it, 1, m, t) && keepsBalance(it, 1))
          .sort((a, b) => a.exercise.primary_muscles.length - b.exercise.primary_muscles.length || a.target_sets - b.target_sets);
        if (candidates[0]) { candidates[0].target_sets += 1; changed = true; break; }
      }
    }
    if (!changed) return;
  }
}

// -------------------------------------------------------------- Readiness

export type Readiness = {
  status: 'ready' | 'deload' | 'ease-in' | 'spike' | 'new';
  title: string;
  detail: string;
  /** Weeks in a row at or near normal volume, without a lighter week. */
  blockWeeks: number;
  /** This week's sets over the average of the four before it. */
  loadRatio: number | null;
  daysSinceLastWorkout: number | null;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * What the next session should feel like, from the shape of recent training:
 * a long break, a sharp jump in weekly sets, or six or more hard weeks without
 * a lighter one each take precedence over "ready to train".
 */
export function trainingReadiness(sessions: AnalyticsSession[], now: Date): Readiness {
  const done = sessions.filter((s) => Number.isFinite(new Date(s.completedAt).getTime()));
  if (!done.length) {
    return { status: 'new', title: 'Build the base', detail: 'Log a few sessions and the coach starts adjusting your loads, volume and recovery.', blockWeeks: 0, loadRatio: null, daysSinceLastWorkout: null };
  }
  const lastAt = Math.max(...done.map((s) => new Date(s.completedAt).getTime()));
  const daysSince = Math.floor((now.getTime() - lastAt) / DAY);

  const thisWeek = startOfWeek(now).getTime();
  const weekSets = (k: number) => done
    .filter((s) => { const w = startOfWeek(new Date(s.completedAt)).getTime(); return w === thisWeek - k * 7 * DAY; })
    .reduce((n, s) => n + s.sets.length, 0);
  // Ratio of the last full week to the four before it, so a half-done week cannot fake a dip.
  const last = weekSets(1);
  const chronic = [2, 3, 4, 5].map(weekSets);
  const chronicAvg = chronic.reduce((a, b) => a + b, 0) / 4;
  const loadRatio = chronicAvg > 0 ? last / chronicAvg : null;

  let blockWeeks = 0;
  const reference = Math.max(...[1, 2, 3, 4, 5, 6, 7, 8].map(weekSets), 1);
  for (let k = 1; k <= 12; k++) {
    const s = weekSets(k);
    if (s >= reference * 0.6) blockWeeks++;
    else break;
  }

  if (daysSince >= 14) {
    return { status: 'ease-in', title: 'Ease back in', detail: `${daysSince} days since your last workout. Loads start about 15% lighter this session and build back from there.`, blockWeeks, loadRatio, daysSinceLastWorkout: daysSince };
  }
  // A spike needs a real baseline: at least three of the four earlier weeks trained.
  const baselineWeeks = chronic.filter((n) => n > 0).length;
  if (loadRatio != null && loadRatio >= 1.5 && chronicAvg >= 10 && baselineWeeks >= 3) {
    return { status: 'spike', title: 'Volume jumped', detail: `Last week was ${Math.round(loadRatio * 100)}% of your usual weekly sets. Keep this week at a similar level rather than adding more, so recovery can catch up.`, blockWeeks, loadRatio, daysSinceLastWorkout: daysSince };
  }
  if (blockWeeks >= 6) {
    return { status: 'deload', title: 'Deload this week', detail: `${blockWeeks} hard weeks in a row. Halve your sets and use about 85% of your loads for one week; you will come back stronger.`, blockWeeks, loadRatio, daysSinceLastWorkout: daysSince };
  }
  return { status: 'ready', title: 'Ready to progress', detail: blockWeeks ? `Week ${blockWeeks + 1} of this block. Keep chasing the top of each rep range.` : 'Keep chasing the top of each rep range.', blockWeeks, loadRatio, daysSinceLastWorkout: daysSince };
}

// --------------------------------------------------------- History rows

export type HistoryRow = { session_id: string; exercise_id: string; set_number: number; weight: number | string | null; reps: number | string | null };

/**
 * Past exposures per exercise, newest first, from the same rows the player
 * already fetches for "previous best" (one batched query).
 */
export function pickExerciseHistory(
  sessionOrder: { id: string; completedAt: string }[],
  rows: HistoryRow[],
  maxExposures = 4
): Record<string, Exposure[]> {
  const rank = new Map(sessionOrder.map((s, i) => [s.id, i]));
  const grouped = new Map<string, Map<number, { set: number; weight: number | null; reps: number | null }[]>>();
  for (const r of rows) {
    const k = rank.get(r.session_id);
    if (k === undefined) continue;
    const byExercise = grouped.get(r.exercise_id) ?? new Map();
    const list = byExercise.get(k) ?? [];
    const weight = r.weight == null ? null : Number(r.weight);
    const reps = r.reps == null ? null : Number(r.reps);
    list.push({ set: r.set_number, weight: Number.isFinite(weight) ? weight : null, reps: Number.isFinite(reps) ? reps : null });
    byExercise.set(k, list);
    grouped.set(r.exercise_id, byExercise);
  }
  const out: Record<string, Exposure[]> = {};
  for (const [exerciseId, bySession] of grouped) {
    out[exerciseId] = [...bySession.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, maxExposures)
      .map(([k, sets]) => ({
        completedAt: sessionOrder[k].completedAt,
        sets: sets.sort((a, b) => a.set - b.set).map(({ weight, reps }) => ({ weight, reps })),
      }));
  }
  return out;
}
