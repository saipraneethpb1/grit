-- 007: start and finish a workout in one round trip, atomically.
--
-- Finishing used to be eight sequential requests from the phone (read status,
-- clear sets, insert sets, mark completed, read profile, count sessions, write
-- profile) with XP, streak and rotation computed on the device. A dropped
-- connection part-way left a completed session with an un-bumped profile, and
-- two devices finishing at once could each read the same counters and
-- overwrite the other's XP. Both functions below run in one transaction and
-- lock the caller's profile row first, so concurrent finishes serialise.
--
-- The rules mirror src/domain/sessionComplete.ts and src/domain/progression.ts
-- exactly; scripts/test-database.mjs replays scenarios through both and fails
-- on any divergence. Change one, change the other.
--
-- security invoker: every RLS policy from 002 and 005 still applies inside.
-- Run after 006_custom_programs.sql. Safe to re-run. The app falls back to the
-- old client-side flow until this is applied.

begin;

create or replace function public.start_workout_session(p_plan_day_id uuid)
returns public.workout_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target record;
  created public.workout_sessions;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  select d.id, d.plan_id, d.name into target
  from public.plan_days d
  join public.workout_plans p on p.id = d.plan_id
  where d.id = p_plan_day_id and p.user_id = caller;
  if not found then raise exception 'Workout day not found'; end if;

  -- A stale in_progress row from a crashed or killed player.
  update public.workout_sessions set status = 'abandoned'
  where user_id = caller and status = 'in_progress';

  insert into public.workout_sessions(user_id, plan_id, plan_day_id, day_name, status)
  values (caller, target.plan_id, target.id, target.name, 'in_progress')
  returning * into created;

  return created;
end;
$$;

-- p_sets: [{plan_exercise_id, exercise_id, exercise_name, set_number,
--           target_reps, reps, weight}], only sets the user marked completed.
-- p_today: the caller's *local* date — the server cannot know their timezone.
create or replace function public.complete_workout_session(
  p_session_id uuid,
  p_sets jsonb,
  p_today date
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  prof public.profiles;
  sess record;
  today date := p_today;
  already boolean;
  counted boolean;
  day_count int;
  completed_count int;
  set_count int;
  vol numeric;
  gap int;
  new_streak int;
  next_day int;
  xp_sets int;
  xp_streak int;
  xp_total int;
  before jsonb;
  after jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;

  -- Lock first: a second finish from another device waits here and then sees
  -- the counters this one wrote.
  select * into prof from public.profiles where id = caller for update;
  if not found then raise exception 'Profile not found'; end if;

  select s.status, s.plan_id, d.day_index into sess
  from public.workout_sessions s
  join public.plan_days d on d.id = s.plan_day_id
  where s.id = p_session_id and s.user_id = caller
  for update of s;
  if not found then raise exception 'Workout session not found'; end if;

  -- A local date can differ from UTC by at most a day. Anything further out is
  -- a wrong device clock; trust the server rather than corrupt the streak.
  if today is null or abs(today - current_date) > 1 then today := current_date; end if;

  already := sess.status = 'completed';

  if not already then
    if jsonb_typeof(p_sets) is distinct from 'array'
      or jsonb_array_length(p_sets) not between 1 and 500 then
      raise exception 'Log at least one set before finishing.';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_sets) r
      where coalesce((r->>'set_number')::int, 0) not between 1 and 100
        or coalesce((r->>'reps')::int, 0) not between 0 and 999
        or coalesce((r->>'weight')::numeric, 0) not between 0 and 9999.99
    ) then
      raise exception 'Invalid set values';
    end if;

    -- Replace, so rows left by an older client's interrupted finish cannot
    -- trip unique (session_id, plan_exercise_id, set_number).
    delete from public.session_sets where session_id = p_session_id;
    insert into public.session_sets(session_id, plan_exercise_id, exercise_id,
      exercise_name, set_number, target_reps, reps, weight, completed, completed_at)
    select p_session_id, nullif(r->>'plan_exercise_id', '')::uuid,
      (r->>'exercise_id')::uuid, left(coalesce(r->>'exercise_name', ''), 200),
      (r->>'set_number')::int, (r->>'target_reps')::int, (r->>'reps')::int,
      (r->>'weight')::numeric, true, now()
    from jsonb_array_elements(p_sets) r;

    update public.workout_sessions set status = 'completed', completed_at = now()
    where id = p_session_id;
    counted := true;
  else
    -- A retry after a lost response is a no-op. Only a session an older client
    -- marked completed without reaching the profile write still needs counting.
    select count(*) into completed_count from public.workout_sessions
    where user_id = caller and status = 'completed';
    counted := prof.workouts_completed < completed_count;
  end if;

  select count(*), coalesce(sum(coalesce(weight, 0) * coalesce(reps, 0)), 0)
  into set_count, vol
  from public.session_sets where session_id = p_session_id and completed;

  select count(*) into day_count from public.plan_days where plan_id = sess.plan_id;

  -- nextStreak + streakGapAllowance
  if prof.last_workout_date is null then
    new_streak := 1;
  else
    gap := today - prof.last_workout_date;
    if gap <= 0 then
      new_streak := coalesce(prof.current_streak, 1);
    elsif gap <= 8 - least(7, greatest(1, day_count)) then
      new_streak := coalesce(prof.current_streak, 0) + 1;
    else
      new_streak := 1;
    end if;
  end if;

  -- nextRotationIndex
  next_day := prof.current_day_index;
  if day_count > 0 and sess.day_index = prof.current_day_index then
    next_day := (sess.day_index + 1) % day_count;
  end if;

  -- xpForSession
  xp_sets := set_count * 10;
  xp_streak := least(greatest(new_streak, 0), 7) * 5;
  xp_total := 50 + xp_sets + xp_streak;

  before := jsonb_build_object(
    'workoutsCompleted', prof.workouts_completed,
    'currentStreak', prof.current_streak,
    'longestStreak', prof.longest_streak,
    'totalSets', prof.total_sets,
    'totalVolume', prof.total_volume,
    'totalXp', prof.total_xp);
  after := before;

  if counted then
    update public.profiles set
      current_day_index = next_day,
      workouts_completed = workouts_completed + 1,
      current_streak = new_streak,
      longest_streak = greatest(longest_streak, new_streak),
      last_workout_date = today,
      total_xp = total_xp + xp_total,
      total_sets = total_sets + set_count,
      total_volume = total_volume + vol
    where id = caller
    returning * into prof;

    after := jsonb_build_object(
      'workoutsCompleted', prof.workouts_completed,
      'currentStreak', prof.current_streak,
      'longestStreak', prof.longest_streak,
      'totalSets', prof.total_sets,
      'totalVolume', prof.total_volume,
      'totalXp', prof.total_xp);
  end if;

  return jsonb_build_object(
    'counted', counted,
    'setsCompleted', set_count,
    'volume', vol,
    'streak', (after->>'currentStreak')::int,
    'xp', jsonb_build_object('workout', 50, 'sets', xp_sets,
      'streak', xp_streak, 'total', xp_total),
    'before', before,
    'after', after);
end;
$$;

revoke all on function public.start_workout_session(uuid) from public, anon;
grant execute on function public.start_workout_session(uuid) to authenticated;
revoke all on function public.complete_workout_session(uuid, jsonb, date) from public, anon;
grant execute on function public.complete_workout_session(uuid, jsonb, date) to authenticated;

commit;
