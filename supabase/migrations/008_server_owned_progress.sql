-- 008: server-owned progress, plan-intent quota, hardening.
--
-- Run after 007 in the Supabase SQL editor. Requires 007: the app's pre-007
-- fallback writes are removed in the same release.
--
-- 1. Streak, XP, set, volume, workout-count and rotation columns on profiles,
--    completed sessions and every logged set can be written only by
--    complete_workout_session / save_generated_plan. They mark their
--    transaction with a local setting; a trigger rejects the same writes from
--    any other API request. Admin roles (dashboard, migrations) are unaffected.
-- 2. plan-intent gets a per-user daily quota the Edge Function spends before
--    calling TypeSafe.
-- 3. The two remaining security-definer functions get an empty search_path.
-- 4. Plan day names, focus lists and session day names are capped.

begin;

-- 1 -------------------------------------------------------------------------

create or replace function public.is_trusted_write()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user not in ('authenticated', 'anon')
      or coalesce(current_setting('ryvora.trusted_write', true), '') = 'on'
$$;

create or replace function public.guard_profile_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_trusted_write() and (
       new.workouts_completed is distinct from old.workouts_completed
    or new.current_streak is distinct from old.current_streak
    or new.longest_streak is distinct from old.longest_streak
    or new.last_workout_date is distinct from old.last_workout_date
    or new.current_day_index is distinct from old.current_day_index
    or new.total_xp is distinct from old.total_xp
    or new.total_sets is distinct from old.total_sets
    or new.total_volume is distinct from old.total_volume
  ) then
    raise exception 'Progress is updated by finishing a workout' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_progress on public.profiles;
create trigger profiles_guard_progress
  before update on public.profiles
  for each row execute function public.guard_profile_progress();

create or replace function public.guard_session_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_write() then return new; end if;
  if tg_op = 'INSERT' and (new.status <> 'in_progress' or new.completed_at is not null) then
    raise exception 'Workouts are completed by finishing them' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (
       (new.status = 'completed' and old.status is distinct from 'completed')
    or (old.status = 'completed' and new.status is distinct from 'completed')
    or new.completed_at is distinct from old.completed_at
  ) then
    raise exception 'Workouts are completed by finishing them' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists workout_sessions_guard_status on public.workout_sessions;
create trigger workout_sessions_guard_status
  before insert or update on public.workout_sessions
  for each row execute function public.guard_session_status();

create or replace function public.guard_session_sets()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_trusted_write() then
    raise exception 'Sets are saved by finishing a workout' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists session_sets_guard_writes on public.session_sets;
create trigger session_sets_guard_writes
  before insert or update or delete on public.session_sets
  for each row execute function public.guard_session_sets();

create or replace function public.save_generated_plan(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  new_plan uuid;
  new_day uuid;
  day jsonb;
  exercise jsonb;
begin
  -- Marks this transaction as a server-owned write; see guard_server_owned_columns.
  perform set_config('ryvora.trusted_write', 'on', true);
  if caller is null then raise exception 'Authentication required'; end if;
  -- Serialize concurrent program changes from the same account.
  perform 1 from public.profiles where id = caller for update;
  if not found then raise exception 'Profile not found'; end if;
  if jsonb_typeof(payload->'days') is distinct from 'array' then
    raise exception 'Program days must be an array';
  end if;
  if jsonb_array_length(payload->'days') not between 1 and 7
    or length(trim(coalesce(payload->>'name', ''))) not between 1 and 120 then
    raise exception 'Invalid program';
  end if;
  insert into public.workout_plans(user_id, template_id, name, is_active)
  values(caller, payload->>'template_id', payload->>'name', false)
  returning id into new_plan;
  for day in select value from jsonb_array_elements(payload->'days') loop
    if jsonb_typeof(day->'exercises') is distinct from 'array' then
      raise exception 'Exercises must be an array';
    end if;
    if jsonb_array_length(day->'exercises') not between 1 and 30 then
      raise exception 'Invalid exercise count';
    end if;
    if length(coalesce(day->>'name', '')) > 80
      or jsonb_array_length(coalesce(day->'focus_muscles', '[]'::jsonb)) > 12 then
      raise exception 'Invalid program day';
    end if;
    insert into public.plan_days(plan_id, day_index, name, focus_muscles)
    values(new_plan, (day->>'day_index')::int, day->>'name',
      array(select jsonb_array_elements_text(day->'focus_muscles')))
    returning id into new_day;
    for exercise in select value from jsonb_array_elements(day->'exercises') loop
      if coalesce((exercise->>'target_sets')::int, 0) not between 1 and 30
        or coalesce((exercise->>'target_reps_min')::int, 0) not between 1 and 100
        or coalesce((exercise->>'target_reps_max')::int, 0) not between 1 and 100
        or (exercise->>'target_reps_min')::int > (exercise->>'target_reps_max')::int then
        raise exception 'Invalid exercise targets';
      end if;
      insert into public.plan_exercises(plan_day_id, exercise_id, sort_order,
        target_sets, target_reps_min, target_reps_max)
      values(new_day, (exercise->>'exercise_id')::uuid, (exercise->>'sort_order')::int,
        (exercise->>'target_sets')::int, (exercise->>'target_reps_min')::int,
        (exercise->>'target_reps_max')::int);
    end loop;
  end loop;
  update public.workout_plans set is_active = true where id = new_plan;
  update public.profiles set current_day_index = 0 where id = caller;
  return new_plan;
end;
$$;

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
  -- Marks this transaction as a server-owned write; see guard_server_owned_columns.
  perform set_config('ryvora.trusted_write', 'on', true);
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

-- 2 -------------------------------------------------------------------------

create table if not exists public.plan_intent_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  calls int not null default 0,
  primary key (user_id, day)
);
-- No policies: only the function below reads or writes it.
alter table public.plan_intent_usage enable row level security;
revoke all on public.plan_intent_usage from anon, authenticated;

-- Spends one call from today's allowance; false once the limit is reached.
create or replace function public.consume_plan_intent_call(p_limit int default 10)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  spent int;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  insert into public.plan_intent_usage as u (user_id, day, calls)
  values (caller, current_date, 1)
  on conflict (user_id, day) do update set calls = u.calls + 1
    where u.calls < least(greatest(p_limit, 1), 50)
  returning calls into spent;
  return spent is not null;
end;
$$;
revoke all on function public.consume_plan_intent_call(int) from public, anon;
grant execute on function public.consume_plan_intent_call(int) to authenticated;

-- 3 -------------------------------------------------------------------------

alter function public.handle_new_user() set search_path = '';
alter function public.deactivate_other_plans() set search_path = '';

-- 4 -------------------------------------------------------------------------

alter table public.plan_days
  add constraint plan_days_name_length check (char_length(name) <= 80) not valid,
  add constraint plan_days_focus_count check (cardinality(focus_muscles) <= 12) not valid;
alter table public.workout_sessions
  add constraint workout_sessions_day_name_length check (char_length(day_name) <= 80) not valid;

commit;
