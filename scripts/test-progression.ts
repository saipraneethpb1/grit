import {
  ACHIEVEMENTS,
  EMPTY_PROGRESS,
  MAX_BONUS_STREAK_SESSIONS,
  XP_PER_SET,
  XP_PER_STREAK_SESSION,
  XP_PER_WORKOUT,
  earnedAchievements,
  formatCount,
  isEarned,
  levelFromXp,
  newlyEarned,
  sessionVolume,
  xpForSession,
  xpToReachLevel,
  type ProgressStats,
} from '../src/domain/progression';

let failed = 0;

function check(label: string, cond: boolean) {
  if (cond) console.log(`OK   ${label}`);
  else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

function eq(label: string, actual: unknown, expected: unknown) {
  check(`${label} (${JSON.stringify(actual)})`, Object.is(actual, expected));
}

function stats(partial: Partial<ProgressStats>): ProgressStats {
  return { ...EMPTY_PROGRESS, ...partial };
}

// ---------------------------------------------------------------- XP

{
  const xp = xpForSession({ setsCompleted: 20, streak: 3 });
  eq('workout base is flat', xp.workout, XP_PER_WORKOUT);
  eq('sets are worth 10 each', xp.sets, 20 * XP_PER_SET);
  eq('streak pays per session', xp.streak, 3 * XP_PER_STREAK_SESSION);
  eq('total is the sum', xp.total, xp.workout + xp.sets + xp.streak);
}

{
  const short = xpForSession({ setsCompleted: 10, streak: MAX_BONUS_STREAK_SESSIONS });
  const long = xpForSession({ setsCompleted: 10, streak: 500 });
  eq('streak bonus caps', long.streak, short.streak);
  check('a huge streak never outweighs the session', long.sets > long.streak);
}

{
  const none = xpForSession({ setsCompleted: 0, streak: 0 });
  eq('a zero-set session still pays the base', none.total, XP_PER_WORKOUT);
  const junk = xpForSession({ setsCompleted: -5, streak: -2 });
  eq('negative sets cannot drain XP', junk.total, XP_PER_WORKOUT);
}

// ------------------------------------------------------------- Levels

eq('level 1 starts at zero', xpToReachLevel(1), 0);
eq('level 2 costs 300', xpToReachLevel(2), 300);
eq('each level costs 100 more', xpToReachLevel(3) - xpToReachLevel(2), 400);
eq('level 4 is cumulative', xpToReachLevel(4), 1200);

eq('no XP is level 1', levelFromXp(0).level, 1);
eq('one XP short stays put', levelFromXp(299).level, 1);
eq('the exact threshold levels up', levelFromXp(300).level, 2);
eq('negative XP clamps to level 1', levelFromXp(-100).level, 1);

{
  // Every boundary on the curve must land exactly, in both directions.
  for (let level = 1; level <= 40; level++) {
    const at = xpToReachLevel(level);
    if (levelFromXp(at).level !== level || levelFromXp(at - 1).level !== Math.max(1, level - 1)) {
      failed += 1;
      console.error(`FAIL level boundary ${level} at ${at} XP`);
    }
  }
  console.log('OK   40 level boundaries land exactly');
}

{
  const p = levelFromXp(500);
  eq('progress starts at the level floor', p.xpIntoLevel, 200);
  eq('the band is the level cost', p.xpForLevel, 400);
  eq('remaining XP is the gap', p.xpToNextLevel, 200);
  check('progress is a 0..1 fraction', p.progress > 0.49 && p.progress < 0.51);
}

// ------------------------------------------------------------- Volume

eq('volume is weight times reps', sessionVolume([{ weight: 60, reps: 10 }]), 600);
eq(
  'bodyweight sets contribute nothing rather than NaN',
  sessionVolume([{ weight: null, reps: 12 }, { weight: 40, reps: 5 }]),
  200
);
eq('missing reps are not NaN', sessionVolume([{ weight: 40 }]), 0);

// -------------------------------------------------------- Achievements

{
  const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
  eq('achievement ids are unique', ids.size, ACHIEVEMENTS.length);
  check(
    'every achievement has an icon and a description',
    ACHIEVEMENTS.every((a) => a.icon.length > 0 && a.description.length > 0)
  );
  check('thresholds are positive', ACHIEVEMENTS.every((a) => a.threshold > 0));
}

{
  const fresh = earnedAchievements(EMPTY_PROGRESS);
  eq('a brand new account has earned nothing', fresh.length, 0);
}

{
  const first = stats({ workoutsCompleted: 1, currentStreak: 1, longestStreak: 1, totalSets: 12, totalXp: 175 });
  const ids = earnedAchievements(first).map((a) => a.id);
  check('the first workout unlocks First Session', ids.includes('first_session'));
  check('the first workout does not unlock 5 sessions', !ids.includes('habit_forming'));
}

{
  const before = stats({ workoutsCompleted: 4, longestStreak: 2, totalSets: 90, totalXp: 900 });
  const after = stats({ workoutsCompleted: 5, longestStreak: 3, totalSets: 115, totalXp: 1215 });
  const fresh = newlyEarned(before, after).map((a) => a.id).sort();
  check('crossing several thresholds reports them all', fresh.join(',') === 'habit_forming,sets_100,streak_3');
  eq('nothing new when nothing changed', newlyEarned(after, after).length, 0);
}

{
  // Streaks are measured on the best ever held, so a broken streak must not
  // silently revoke a badge the user already saw.
  const peak = stats({ longestStreak: 30, currentStreak: 30 });
  const broken = stats({ longestStreak: 30, currentStreak: 1 });
  eq('breaking a streak keeps the badge', newlyEarned(peak, broken).length, 0);
  check('the badge is still earned', isEarned(ACHIEVEMENTS.find((a) => a.id === 'streak_30')!, broken));
}

{
  const levelled = stats({ totalXp: xpToReachLevel(5) });
  check('level badges read the XP curve', earnedAchievements(levelled).some((a) => a.id === 'level_5'));
}

// -------------------------------------------------------------- Format

eq('small counts print plainly', formatCount(999), '999');
eq('round thousands drop the decimal', formatCount(2000), '2k');
eq('thousands keep one decimal', formatCount(1250), '1.3k');
eq('millions switch unit', formatCount(2_400_000), '2.4M');

if (failed > 0) {
  console.error(`\n${failed} progression test(s) failed`);
  process.exit(1);
}

console.log('\nAll progression tests passed');
