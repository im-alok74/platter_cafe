-- Staff sign in by emailed code. Only invited emails can get a code; the role is granted on first sign-in.
create table public.staff_invites (
  email text primary key check (email = lower(email)),
  cafe_id uuid not null references public.cafes on delete cascade,
  role text not null check (role in ('owner','manager','kitchen')),
  created_at timestamptz not null default now()
);
create index on public.staff_invites (cafe_id);
alter table public.staff_invites enable row level security;
create policy owner_manage on public.staff_invites for all to authenticated
  using ((select public.staff_role(cafe_id)) = 'owner') with check ((select public.staff_role(cafe_id)) = 'owner');
create trigger audit after insert or update or delete on public.staff_invites for each row execute function public.audit_trigger();

-- Lets the login form decide whether to send a code, without exposing the invite list.
create function public.is_invited(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_invites where email = lower(p_email))
$$;
revoke execute on function public.is_invited(text) from public;
grant execute on function public.is_invited(text) to anon, authenticated;

-- Grant the role when an invited person signs up, or when an existing user is invited.
create function public.claim_staff_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'users' then
    insert into public.staff_roles (user_id, cafe_id, role)
    select new.id, i.cafe_id, i.role from public.staff_invites i where i.email = lower(new.email)
    on conflict (user_id, cafe_id) do update set role = excluded.role;
  else
    insert into public.staff_roles (user_id, cafe_id, role)
    select u.id, new.cafe_id, new.role from auth.users u where lower(u.email) = new.email
    on conflict (user_id, cafe_id) do update set role = excluded.role;
  end if;
  return new;
end $$;
revoke execute on function public.claim_staff_invite() from public, anon, authenticated;
create trigger claim_on_signup after insert on auth.users for each row execute function public.claim_staff_invite();
create trigger claim_on_invite after insert or update on public.staff_invites for each row execute function public.claim_staff_invite();

insert into public.staff_invites (email, cafe_id, role)
select 'hello.plattercafe@gmail.com', id, 'owner' from public.cafes where slug = 'platter';
