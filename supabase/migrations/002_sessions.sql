-- Live workout sessions + set logging (STNDRD-style training mode)

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  day_name text not null default '',
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text
);

create index if not exists workout_sessions_user_idx
  on public.workout_sessions (user_id, started_at desc);

create index if not exists workout_sessions_user_status_idx
  on public.workout_sessions (user_id, status);

create table if not exists public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  plan_exercise_id uuid references public.plan_exercises (id) on delete set null,
  exercise_id uuid not null references public.exercises (id),
  exercise_name text not null default '',
  set_number int not null,
  target_reps int,
  reps int,
  weight numeric,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (session_id, plan_exercise_id, set_number)
);

create index if not exists session_sets_session_idx
  on public.session_sets (session_id);

create index if not exists session_sets_exercise_user_lookup
  on public.session_sets (exercise_id);

-- User training state: which day in the program cycle they're on
alter table public.profiles
  add column if not exists current_day_index int not null default 0,
  add column if not exists workouts_completed int not null default 0,
  add column if not exists current_streak int not null default 0,
  add column if not exists last_workout_date date;

alter table public.workout_sessions enable row level security;
alter table public.session_sets enable row level security;

create policy "sessions_select_own"
  on public.workout_sessions for select to authenticated
  using (user_id = auth.uid());

create policy "sessions_insert_own"
  on public.workout_sessions for insert to authenticated
  with check (user_id = auth.uid());

create policy "sessions_update_own"
  on public.workout_sessions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sessions_delete_own"
  on public.workout_sessions for delete to authenticated
  using (user_id = auth.uid());

create policy "session_sets_select_own"
  on public.session_sets for select to authenticated
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

create policy "session_sets_insert_own"
  on public.session_sets for insert to authenticated
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

create policy "session_sets_update_own"
  on public.session_sets for update to authenticated
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

create policy "session_sets_delete_own"
  on public.session_sets for delete to authenticated
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
