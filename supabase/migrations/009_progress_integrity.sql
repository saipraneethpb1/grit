-- 009: close the remaining ways a signed-in client can inflate progress or the
-- plan-intent quota. Run after 008.
--
-- 1. Logged sets must be one of the session day's planned exercises, and the
--    set number cannot exceed that exercise's target. Omitting plan_exercise_id
--    no longer bypasses the ownership check.
-- 2. Direct table writes cannot exceed the same shape limits the plan RPC
--    already enforces (days, exercises, targets, names, focus labels).
-- 3. consume_plan_intent_call ignores caller-supplied ceilings above 10, which
--    is the allowance the plan-intent function spends.

begin;

create or replace function public.guard_session_sets()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_trusted_write() then
    raise exception 'Sets are saved by finishing a workout' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if new.plan_exercise_id is null or not exists (
    select 1
    from public.plan_exercises pe
    join public.workout_sessions s on s.plan_day_id = pe.plan_day_id
    where pe.id = new.plan_exercise_id
      and pe.exercise_id = new.exercise_id
      and s.id = new.session_id
      and new.set_number between 1 and pe.target_sets
  ) then
    raise exception 'Sets must match the planned workout' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.guard_plan_day_shape()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and (
    select count(*) from public.plan_days where plan_id = new.plan_id
  ) >= 7 then
    raise exception 'Invalid program' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(coalesce(new.focus_muscles, '{}'::text[])) as muscle
    where char_length(muscle) > 40
  ) then
    raise exception 'Invalid program day' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists plan_days_guard_shape on public.plan_days;
create trigger plan_days_guard_shape
  before insert or update on public.plan_days
  for each row execute function public.guard_plan_day_shape();

create or replace function public.guard_plan_exercise_shape()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and (
    select count(*) from public.plan_exercises where plan_day_id = new.plan_day_id
  ) >= 30 then
    raise exception 'Invalid exercise count' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists plan_exercises_guard_shape on public.plan_exercises;
create trigger plan_exercises_guard_shape
  before insert on public.plan_exercises
  for each row execute function public.guard_plan_exercise_shape();

update public.profiles
set display_name = left(display_name, 80)
where display_name is not null and char_length(display_name) > 80;

alter table public.profiles
  drop constraint if exists profiles_display_name_length,
  add constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) <= 80);

update public.workout_plans
set name = left(name, 120)
where char_length(name) > 120;

alter table public.workout_plans
  drop constraint if exists workout_plans_name_length,
  add constraint workout_plans_name_length
    check (char_length(name) between 1 and 120);

update public.plan_exercises
set target_sets = least(greatest(target_sets, 1), 30),
    target_reps_min = least(greatest(target_reps_min, 1), 100),
    target_reps_max = least(greatest(greatest(target_reps_max, target_reps_min), 1), 100)
where target_sets not between 1 and 30
   or target_reps_min not between 1 and 100
   or target_reps_max not between 1 and 100
   or target_reps_min > target_reps_max;

alter table public.plan_exercises
  drop constraint if exists plan_exercises_targets_sane,
  add constraint plan_exercises_targets_sane check (
    target_sets between 1 and 30
    and target_reps_min between 1 and 100
    and target_reps_max between 1 and 100
    and target_reps_min <= target_reps_max
  );

create or replace function public.consume_plan_intent_call(p_limit int default 10)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  -- Callers may only tighten the allowance. The plan-intent function spends 10.
  ceiling int := least(greatest(coalesce(p_limit, 10), 1), 10);
  spent int;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  insert into public.plan_intent_usage as u (user_id, day, calls)
  values (caller, current_date, 1)
  on conflict (user_id, day) do update set calls = u.calls + 1
    where u.calls < ceiling
  returning calls into spent;
  return spent is not null;
end;
$$;

commit;
