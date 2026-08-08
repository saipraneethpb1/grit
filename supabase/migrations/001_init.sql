-- Grit MVP schema: catalog + user plans with RLS

-- ---------------------------------------------------------------------------
-- Catalog (readable by all authenticated users)
-- ---------------------------------------------------------------------------

create table if not exists public.exercises (
  id uuid primary key,
  name text not null,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  movement_pattern text not null,
  default_sets int not null default 3,
  default_reps_min int not null default 8,
  default_reps_max int not null default 12,
  notes text
);

create table if not exists public.split_templates (
  id text primary key,
  name text not null,
  description text not null default '',
  days_per_week int not null,
  is_active boolean not null default true
);

create table if not exists public.split_template_days (
  id text primary key,
  template_id text not null references public.split_templates (id) on delete cascade,
  day_index int not null,
  name text not null,
  focus_muscles text[] not null default '{}',
  unique (template_id, day_index)
);

-- ---------------------------------------------------------------------------
-- User data
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text not null references public.split_templates (id),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_plans_user_id_idx on public.workout_plans (user_id);
create index if not exists workout_plans_user_active_idx on public.workout_plans (user_id, is_active);

create table if not exists public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  day_index int not null,
  name text not null,
  focus_muscles text[] not null default '{}',
  unique (plan_id, day_index)
);

create table if not exists public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  sort_order int not null default 0,
  target_sets int not null default 3,
  target_reps_min int not null default 8,
  target_reps_max int not null default 12
);

create index if not exists plan_exercises_day_idx on public.plan_exercises (plan_day_id);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Ensure only one active plan per user
-- ---------------------------------------------------------------------------

create or replace function public.deactivate_other_plans()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active then
    update public.workout_plans
    set is_active = false, updated_at = now()
    where user_id = new.user_id
      and id <> new.id
      and is_active = true;
  end if;
  return new;
end;
$$;

drop trigger if exists workout_plans_single_active on public.workout_plans;
create trigger workout_plans_single_active
  after insert or update of is_active on public.workout_plans
  for each row
  when (new.is_active = true)
  execute function public.deactivate_other_plans();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.exercises enable row level security;
alter table public.split_templates enable row level security;
alter table public.split_template_days enable row level security;
alter table public.profiles enable row level security;
alter table public.workout_plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_exercises enable row level security;

-- Catalog: read for authenticated
create policy "exercises_select_authenticated"
  on public.exercises for select to authenticated using (true);

create policy "split_templates_select_authenticated"
  on public.split_templates for select to authenticated using (true);

create policy "split_template_days_select_authenticated"
  on public.split_template_days for select to authenticated using (true);

-- Profiles
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Workout plans
create policy "plans_select_own"
  on public.workout_plans for select to authenticated
  using (user_id = auth.uid());

create policy "plans_insert_own"
  on public.workout_plans for insert to authenticated
  with check (user_id = auth.uid());

create policy "plans_update_own"
  on public.workout_plans for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "plans_delete_own"
  on public.workout_plans for delete to authenticated
  using (user_id = auth.uid());

-- Plan days (via parent plan ownership)
create policy "plan_days_select_own"
  on public.plan_days for select to authenticated
  using (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );

create policy "plan_days_insert_own"
  on public.plan_days for insert to authenticated
  with check (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );

create policy "plan_days_update_own"
  on public.plan_days for update to authenticated
  using (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );

create policy "plan_days_delete_own"
  on public.plan_days for delete to authenticated
  using (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_id and p.user_id = auth.uid()
    )
  );

-- Plan exercises (via plan_day → plan ownership)
create policy "plan_exercises_select_own"
  on public.plan_exercises for select to authenticated
  using (
    exists (
      select 1
      from public.plan_days d
      join public.workout_plans p on p.id = d.plan_id
      where d.id = plan_day_id and p.user_id = auth.uid()
    )
  );

create policy "plan_exercises_insert_own"
  on public.plan_exercises for insert to authenticated
  with check (
    exists (
      select 1
      from public.plan_days d
      join public.workout_plans p on p.id = d.plan_id
      where d.id = plan_day_id and p.user_id = auth.uid()
    )
  );

create policy "plan_exercises_update_own"
  on public.plan_exercises for update to authenticated
  using (
    exists (
      select 1
      from public.plan_days d
      join public.workout_plans p on p.id = d.plan_id
      where d.id = plan_day_id and p.user_id = auth.uid()
    )
  );

create policy "plan_exercises_delete_own"
  on public.plan_exercises for delete to authenticated
  using (
    exists (
      select 1
      from public.plan_days d
      join public.workout_plans p on p.id = d.plan_id
      where d.id = plan_day_id and p.user_id = auth.uid()
    )
  );
