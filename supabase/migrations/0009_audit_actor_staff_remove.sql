-- Audit entries show who acted by email, and the owner can remove staff.
alter table public.audit_log add column actor_email text;

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (cafe_id, actor, actor_email, action, table_name, row_id, old_data, new_data)
  values ((r->>'cafe_id')::uuid, (select auth.uid()), (select auth.jwt() ->> 'email'), tg_op, tg_table_name,
          coalesce(r->>'id', r->>'key', r->>'email'),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create function public.remove_staff(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid;
begin
  select cafe_id into c from public.staff_invites where email = lower(p_email);
  if c is null or (select public.staff_role(c)) is distinct from 'owner' then raise exception 'Not allowed'; end if;
  if lower(p_email) = lower((select auth.jwt() ->> 'email')) then raise exception 'You cannot remove yourself'; end if;
  delete from public.staff_roles where cafe_id = c and user_id in (select id from auth.users where lower(email) = lower(p_email));
  delete from public.staff_invites where email = lower(p_email);
end $$;
revoke execute on function public.remove_staff(text) from public, anon;
grant execute on function public.remove_staff(text) to authenticated;
