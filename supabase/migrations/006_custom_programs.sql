begin;
-- Custom programs use the existing owner-scoped, transactional save RPC.
-- Actual training cadence comes from each program's plan_days, not this marker.
insert into public.split_templates (id, name, description, days_per_week, is_active)
values ('custom', 'Custom program', 'A program built by its owner.', 1, false)
on conflict (id) do nothing;
commit;
