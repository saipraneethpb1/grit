begin;

-- A session must reference the caller's plan and a day in that same plan.
create policy sessions_owned_plan_insert
on public.workout_sessions as restrictive for insert to authenticated
with check (exists (
  select 1 from public.workout_plans p
  join public.plan_days d on d.plan_id = p.id
  where p.id = workout_sessions.plan_id
    and d.id = workout_sessions.plan_day_id and p.user_id = auth.uid()
));
create policy sessions_owned_plan_update
on public.workout_sessions as restrictive for update to authenticated
using (user_id = auth.uid())
with check (exists (
  select 1 from public.workout_plans p
  join public.plan_days d on d.plan_id = p.id
  where p.id = workout_sessions.plan_id
    and d.id = workout_sessions.plan_day_id and p.user_id = auth.uid()
));


-- Prevent attaching another day's planned exercise to an owned session.
create policy sets_matching_plan_insert
on public.session_sets as restrictive for insert to authenticated
with check (plan_exercise_id is null or exists (
  select 1 from public.plan_exercises pe
  join public.workout_sessions s on s.plan_day_id = pe.plan_day_id
  where pe.id = session_sets.plan_exercise_id
    and pe.exercise_id = session_sets.exercise_id
    and s.id = session_sets.session_id and s.user_id = auth.uid()
));
create policy sets_matching_plan_update
on public.session_sets as restrictive for update to authenticated
using (exists (select 1 from public.workout_sessions s
  where s.id = session_sets.session_id and s.user_id = auth.uid()))
with check (plan_exercise_id is null or exists (
  select 1 from public.plan_exercises pe
  join public.workout_sessions s on s.plan_day_id = pe.plan_day_id
  where pe.id = session_sets.plan_exercise_id
    and pe.exercise_id = session_sets.exercise_id
    and s.id = session_sets.session_id and s.user_id = auth.uid()
));

-- Save the entire program in one transaction. Any invalid exercise or day
-- rolls back everything, including activation of the previous program.
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
revoke all on function public.save_generated_plan(jsonb) from public, anon;
grant execute on function public.save_generated_plan(jsonb) to authenticated;
commit;
