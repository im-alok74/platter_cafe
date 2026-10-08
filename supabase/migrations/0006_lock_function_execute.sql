revoke execute on function public.audit_trigger() from public, anon, authenticated;
-- rls_auto_enable() exists only on projects where Supabase created it; skip it elsewhere (a fresh local database).
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
revoke execute on function public.staff_role(uuid) from public, anon;
grant execute on function public.staff_role(uuid) to authenticated;
