-- 004: gamification counters (XP, level, badges, best streak)
--
-- Achievements are NOT stored. They are derived in src/domain/progression.ts
-- from the counters below, so the badge catalog can change without a migration
-- and history logged before this feature shipped still counts.
--
-- Run after 003_account_deletion.sql. Safe to re-run.

alter table public.profiles
  add column if not exists total_xp int not null default 0,
  add column if not exists longest_streak int not null default 0,
  add column if not exists total_sets int not null default 0,
  add column if not exists total_volume numeric not null default 0;

-- Backfill from existing history so current users do not open the app at
-- level 1 with an empty trophy case.
--
-- The XP here omits the per-session streak bonus: the streak at the time of
-- each past workout was never recorded, and inventing one would hand out XP
-- nobody earned. New sessions get the full formula.
with per_user as (
  select ws.user_id,
         count(distinct ws.id)                                      as workouts,
         count(ss.id)                                               as sets,
         coalesce(sum(coalesce(ss.weight, 0) * coalesce(ss.reps, 0)), 0) as volume
  from public.workout_sessions ws
  left join public.session_sets ss
    on ss.session_id = ws.id and ss.completed
  where ws.status = 'completed'
  group by ws.user_id
)
update public.profiles p
set total_sets     = per_user.sets,
    total_volume   = per_user.volume,
    total_xp       = per_user.workouts * 50 + per_user.sets * 10,
    longest_streak = greatest(p.longest_streak, p.current_streak)
from per_user
where per_user.user_id = p.id;

-- Anyone with no completed sessions still needs a sane best-streak value.
update public.profiles
set longest_streak = greatest(longest_streak, current_streak)
where longest_streak < current_streak;
