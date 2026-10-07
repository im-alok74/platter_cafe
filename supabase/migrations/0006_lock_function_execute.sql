revoke execute on function public.audit_trigger() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.staff_role(uuid) from public, anon;
grant execute on function public.staff_role(uuid) to authenticated;
