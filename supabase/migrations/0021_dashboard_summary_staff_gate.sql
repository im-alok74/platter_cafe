-- The dashboard is read with the staff member's own session, so the app needs no service-role secret for it.
-- The aggregation moves behind a thin gate that checks the caller is an owner or manager of that cafe.
alter function public.dashboard_summary(uuid, int) rename to _dashboard_summary;
-- (keeps its service_role-only grant: nobody can call the inner function directly)

create function public.dashboard_summary(p_cafe uuid, p_days int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from staff_roles where user_id = (select auth.uid()) and cafe_id = p_cafe and role in ('owner', 'manager')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return _dashboard_summary(p_cafe, p_days);
end $$;

revoke all on function public.dashboard_summary(uuid, int) from public, anon;
grant execute on function public.dashboard_summary(uuid, int) to authenticated;
