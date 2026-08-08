-- Allow an authenticated user to permanently delete only their own account.
-- Existing ON DELETE CASCADE constraints remove their profile, plans, sessions,
-- and logged sets. The function owns the privileged auth.users deletion while
-- the WHERE clause remains bound to the caller's JWT identity.

create or replace function public.delete_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
