/**
 * Gamification rules: XP for a finished workout, the level curve, and the
 * achievement catalog.
 *
 * Everything here is pure so `scripts/test-progression.ts` can cover it without
 * Supabase, and so the workout player can compute "what did I just earn?"
 * locally instead of re-reading the profile row it just wrote.
 */

// ---------------------------------------------------------------- XP

/** Showing up is worth something on its own, independent of session size. */
export const XP_PER_WORKOUT = 50;
export const XP_PER_SET = 10;
export const XP_PER_STREAK_SESSION = 5;
/**
 * The streak bonus stops growing here. Uncapped, a 200-session streak would
 * dwarf the workout itself and make a token session at 200 worth more than a
 * hard one at 2 — which rewards the calendar rather than the training.
 */
export const MAX_BONUS_STREAK_SESSIONS = 7;

export type XpBreakdown = {
  workout: number;
  sets: number;
  streak: number;
  total: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * XP for one finished session. Returned itemised because the completion screen
 * shows the user where the number came from.
 */
export function xpForSession(params: {
  setsCompleted: number;
  /** Streak *after* this workout counts, so the first session earns a bonus. */
  streak: number;
}): XpBreakdown {
  const sets = Math.max(0, Math.floor(params.setsCompleted));
  const streakSteps = clamp(Math.floor(params.streak), 0, MAX_BONUS_STREAK_SESSIONS);

  const workout = XP_PER_WORKOUT;
  const setXp = sets * XP_PER_SET;
  const streakXp = streakSteps * XP_PER_STREAK_SESSION;

  return { workout, sets: setXp, streak: streakXp, total: workout + setXp + streakXp };
}

// ------------------------------------------------------------- Levels

export const XP_FIRST_LEVEL = 300;
/** Each level costs this much more than the one before it. */
export const XP_LEVEL_STEP = 100;

/** Cumulative XP needed to *reach* `level`. Level 1 starts at 0 XP. */
export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  const steps = level - 1;
  return XP_FIRST_LEVEL * steps + (XP_LEVEL_STEP * steps * (steps - 1)) / 2;
}

export type LevelProgress = {
  level: number;
  /** XP earned since reaching the current level. */
  xpIntoLevel: number;
  /** Size of the current level's band. */
  xpForLevel: number;
  xpToNextLevel: number;
  /** 0..1, for the progress bar. */
  progress: number;
};

export function levelFromXp(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));

  // Walk the curve rather than inverting it. The closed form needs a square
  // root, and a float landing a hair under an exact boundary would show someone
  // level 4 when they have paid for level 5.
  let level = 1;
  while (xpToReachLevel(level + 1) <= xp) level += 1;

  const floor = xpToReachLevel(level);
  const ceiling = xpToReachLevel(level + 1);
  const span = ceiling - floor;

  return {
    level,
    xpIntoLevel: xp - floor,
    xpForLevel: span,
    xpToNextLevel: ceiling - xp,
    progress: span > 0 ? clamp((xp - floor) / span, 0, 1) : 0,
  };
}

// ------------------------------------------------------------- Volume

/** Total weight × reps. Unitless — the app never asks for kg or lb. */
export function sessionVolume(
  rows: { weight?: number | null; reps?: number | null }[]
): number {
  let total = 0;
  for (const row of rows) total += (row.weight ?? 0) * (row.reps ?? 0);
  return total;
}

// -------------------------------------------------------- Achievements

export type ProgressStats = {
  workoutsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalSets: number;
  totalVolume: number;
  totalXp: number;
};

export const EMPTY_PROGRESS: ProgressStats = {
  workoutsCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalSets: 0,
  totalVolume: 0,
  totalXp: 0,
};

export type AchievementCategory = 'milestone' | 'streak' | 'volume' | 'level';

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  milestone: 'Sessions',
  streak: 'Consistency',
  volume: 'Work done',
  level: 'Rank',
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  /** Value of `measure` that unlocks it, and the sort order in its category. */
  threshold: number;
  /**
   * Pulling the number out (rather than a bare boolean) lets a locked badge
   * render "18 / 25" without every card re-deriving the rule.
   */
  measure: (stats: ProgressStats) => number;
};

const byWorkouts = (s: ProgressStats) => s.workoutsCompleted;
const byStreak = (s: ProgressStats) => s.longestStreak;
const bySets = (s: ProgressStats) => s.totalSets;
const byVolume = (s: ProgressStats) => s.totalVolume;
const byLevel = (s: ProgressStats) => levelFromXp(s.totalXp).level;

export const ACHIEVEMENTS: Achievement[] = [
  // Sessions finished
  { id: 'first_session', name: 'First Session', description: 'Finish your first workout', icon: '🎬', category: 'milestone', threshold: 1, measure: byWorkouts },
  { id: 'habit_forming', name: 'Habit Forming', description: 'Finish 5 workouts', icon: '🌱', category: 'milestone', threshold: 5, measure: byWorkouts },
  { id: 'double_digits', name: 'Double Digits', description: 'Finish 10 workouts', icon: '🔟', category: 'milestone', threshold: 10, measure: byWorkouts },
  { id: 'regular', name: 'Regular', description: 'Finish 25 workouts', icon: '🏋️', category: 'milestone', threshold: 25, measure: byWorkouts },
  { id: 'half_century', name: 'Half Century', description: 'Finish 50 workouts', icon: '💪', category: 'milestone', threshold: 50, measure: byWorkouts },
  { id: 'centurion', name: 'Centurion', description: 'Finish 100 workouts', icon: '🏛️', category: 'milestone', threshold: 100, measure: byWorkouts },
  { id: 'veteran', name: 'Iron Veteran', description: 'Finish 250 workouts', icon: '🎖️', category: 'milestone', threshold: 250, measure: byWorkouts },

  // Streaks count consecutive *sessions* that stayed on-program, not calendar
  // days — see nextStreak. Measured on the best streak ever held, so breaking
  // one never takes a badge away.
  { id: 'streak_3', name: 'Three in a Row', description: 'Log 3 sessions without missing your plan', icon: '🔥', category: 'streak', threshold: 3, measure: byStreak },
  { id: 'streak_7', name: 'On a Roll', description: 'Log 7 sessions without missing your plan', icon: '📅', category: 'streak', threshold: 7, measure: byStreak },
  { id: 'streak_14', name: 'Locked In', description: 'Log 14 sessions without missing your plan', icon: '⚡', category: 'streak', threshold: 14, measure: byStreak },
  { id: 'streak_30', name: 'Thirty Deep', description: 'Log 30 sessions without missing your plan', icon: '🗓️', category: 'streak', threshold: 30, measure: byStreak },
  { id: 'streak_100', name: 'Unbroken', description: 'Log 100 sessions without missing your plan', icon: '💎', category: 'streak', threshold: 100, measure: byStreak },

  // Work done
  { id: 'sets_100', name: 'Century of Sets', description: 'Log 100 sets', icon: '📊', category: 'volume', threshold: 100, measure: bySets },
  { id: 'sets_500', name: 'Set Collector', description: 'Log 500 sets', icon: '🧱', category: 'volume', threshold: 500, measure: bySets },
  { id: 'sets_1000', name: 'Thousand Club', description: 'Log 1,000 sets', icon: '🏗️', category: 'volume', threshold: 1000, measure: bySets },
  { id: 'sets_5000', name: 'Set Machine', description: 'Log 5,000 sets', icon: '⚙️', category: 'volume', threshold: 5000, measure: bySets },
  { id: 'volume_10k', name: 'Ten Thousand', description: 'Move 10,000 in weight × reps', icon: '🪨', category: 'volume', threshold: 10_000, measure: byVolume },
  { id: 'volume_100k', name: 'Six Figures', description: 'Move 100,000 in weight × reps', icon: '🚛', category: 'volume', threshold: 100_000, measure: byVolume },
  { id: 'volume_500k', name: 'Half a Million', description: 'Move 500,000 in weight × reps', icon: '🏔️', category: 'volume', threshold: 500_000, measure: byVolume },

  // Rank
  { id: 'level_5', name: 'Level 5', description: 'Reach level 5', icon: '⭐', category: 'level', threshold: 5, measure: byLevel },
  { id: 'level_10', name: 'Level 10', description: 'Reach level 10', icon: '🌟', category: 'level', threshold: 10, measure: byLevel },
  { id: 'level_20', name: 'Level 20', description: 'Reach level 20', icon: '👑', category: 'level', threshold: 20, measure: byLevel },
];

export function isEarned(achievement: Achievement, stats: ProgressStats): boolean {
  return achievement.measure(stats) >= achievement.threshold;
}

export function earnedAchievements(stats: ProgressStats): Achievement[] {
  return ACHIEVEMENTS.filter((a) => isEarned(a, stats));
}

/**
 * Badges the finished workout just unlocked.
 *
 * Achievements are derived from the profile counters rather than stored in
 * their own table, so "new" is the difference between the stats before the
 * session was saved and the stats after — no extra round trip, and existing
 * users get credit for history logged before this feature shipped.
 */
export function newlyEarned(
  before: ProgressStats,
  after: ProgressStats
): Achievement[] {
  const had = new Set(earnedAchievements(before).map((a) => a.id));
  return earnedAchievements(after).filter((a) => !had.has(a.id));
}

/** Compact display for large counters: 1250 -> "1.3k". */
export function formatCount(n: number): string {
  const value = Math.round(n);
  if (Math.abs(value) < 1000) return String(value);
  if (Math.abs(value) < 1_000_000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return `${(value / 1_000_000).toFixed(1)}M`;
}

/**
 * Everything the completion screen needs to celebrate a finished session.
 *
 * Declared here rather than beside the Supabase call so the UI can depend on
 * the rules without depending on the data layer.
 */
export type WorkoutCompletionResult = {
  setsCompleted: number;
  volume: number;
  streak: number;
  xp: XpBreakdown;
  before: ProgressStats;
  after: ProgressStats;
  levelBefore: LevelProgress;
  levelAfter: LevelProgress;
  leveledUp: boolean;
  newAchievements: Achievement[];
  /**
   * False when the database predates migration 004. The workout is saved and
   * the rotation advanced, but there is nothing to celebrate yet.
   */
  progressionStored: boolean;
};
