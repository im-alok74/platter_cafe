-- Password accounts. Customers register with a mobile number or an email plus a password; staff sign in with email and password.
-- This replaces sign-in by SMS code (customers) and by emailed code (staff). No SMS provider or email delivery is needed.
-- Accounts are created in auth.users by SECURITY DEFINER functions, so the password is stored hashed (bcrypt) exactly as Supabase Auth expects.

alter table public.profiles add column email text;

-- Staff are no longer granted a role by an invite claimed on sign-in: with no code to prove who owns an email, anyone could
-- register an invited address first. The owner now creates staff accounts directly.
drop trigger if exists claim_on_signup on auth.users;
drop trigger if exists claim_on_invite on public.staff_invites;
drop function if exists public.claim_staff_invite();
drop function if exists public.is_invited(text);
drop function if exists public.remove_staff(text);
drop table if exists public.staff_invites;

-- Past guest orders are no longer merged into an account by phone number: without a code, typing someone else's number would expose their orders.
drop function if exists public.claim_guest_orders();

-- Internal: creates a confirmed email and password user. Not callable from the API.
create function public._make_user(p_email text, p_password text, p_meta jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', lower(p_email),
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(), now(), now(),
          '{"provider":"email","providers":["email"]}', coalesce(p_meta, '{}'), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', lower(p_email)), 'email', now(), now(), now());
  return uid;
end $$;
revoke execute on function public._make_user(text, text, jsonb) from public, anon, authenticated;

-- Customer registration. The identifier is an email, or an Indian mobile number (stored behind a private email address so one password login serves both).
create function public.register_customer(p_identifier text, p_password text, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ident text := lower(btrim(coalesce(p_identifier, '')));
  nm text := nullif(left(btrim(coalesce(p_name, '')), 60), '');
  em text; ph text; digits text; uid uuid; cafe uuid;
begin
  if length(coalesce(p_password, '')) < 8 or length(p_password) > 72 then raise exception 'weak_password'; end if;
  if position('@' in ident) > 0 then
    if ident !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(ident) > 120 then raise exception 'invalid_identifier'; end if;
    em := ident;
  else
    digits := right(regexp_replace(ident, '\D', '', 'g'), 10);
    if digits !~ '^[6-9][0-9]{9}$' then raise exception 'invalid_identifier'; end if;
    em := '91' || digits || '@phone.platter.invalid';
    ph := '91' || digits;
  end if;
  if exists (select 1 from auth.users where email = em) then raise exception 'already_registered'; end if;
  if (select count(*) from public.profiles where created_at > now() - interval '10 minutes') > 200 then raise exception 'busy'; end if;
  select id into cafe from public.cafes order by created_at limit 1;
  uid := public._make_user(em, p_password, jsonb_build_object('name', nm));
  insert into public.profiles (id, cafe_id, phone, name, email) values (uid, cafe, ph, nm, case when ph is null then em end);
end $$;
revoke execute on function public.register_customer(text, text, text) from public;
grant execute on function public.register_customer(text, text, text) to anon, authenticated;

-- Staff management, owner only.
create function public.list_staff() returns table (email text, role text)
language plpgsql stable security definer set search_path = '' as $$
declare c uuid;
begin
  select o.cafe_id into c from public.staff_roles o where o.user_id = (select auth.uid()) and o.role = 'owner' limit 1;
  if c is null then raise exception 'Not allowed'; end if;
  return query select u.email::text, r.role::text from public.staff_roles r join auth.users u on u.id = r.user_id where r.cafe_id = c order by r.created_at;
end $$;

create function public.create_staff(p_email text, p_password text, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid; em text := lower(btrim(coalesce(p_email, '')));
begin
  select cafe_id into c from public.staff_roles where user_id = (select auth.uid()) and role = 'owner' limit 1;
  if c is null then raise exception 'Not allowed'; end if;
  if p_role not in ('owner', 'manager', 'kitchen') then raise exception 'invalid_role'; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_identifier'; end if;
  if length(coalesce(p_password, '')) < 8 or length(p_password) > 72 then raise exception 'weak_password'; end if;
  if exists (select 1 from auth.users where email = em) then raise exception 'already_registered'; end if;
  insert into public.staff_roles (user_id, cafe_id, role) values (public._make_user(em, p_password, '{}'::jsonb), c, p_role);
end $$;

create function public.set_staff_role(p_email text, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid;
begin
  select cafe_id into c from public.staff_roles where user_id = (select auth.uid()) and role = 'owner' limit 1;
  if c is null then raise exception 'Not allowed'; end if;
  if p_role not in ('owner', 'manager', 'kitchen') then raise exception 'invalid_role'; end if;
  if lower(p_email) = lower((select auth.jwt() ->> 'email')) then raise exception 'You cannot change your own role'; end if;
  update public.staff_roles set role = p_role where cafe_id = c and user_id in (select id from auth.users where email = lower(p_email));
end $$;

create function public.reset_staff_password(p_email text, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid;
begin
  select cafe_id into c from public.staff_roles where user_id = (select auth.uid()) and role = 'owner' limit 1;
  if c is null then raise exception 'Not allowed'; end if;
  if length(coalesce(p_password, '')) < 8 or length(p_password) > 72 then raise exception 'weak_password'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
   where email = lower(p_email) and id in (select user_id from public.staff_roles where cafe_id = c);
end $$;

create function public.remove_staff(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid; uid uuid;
begin
  select cafe_id into c from public.staff_roles where user_id = (select auth.uid()) and role = 'owner' limit 1;
  if c is null then raise exception 'Not allowed'; end if;
  if lower(p_email) = lower((select auth.jwt() ->> 'email')) then raise exception 'You cannot remove yourself'; end if;
  select u.id into uid from auth.users u join public.staff_roles r on r.user_id = u.id where u.email = lower(p_email) and r.cafe_id = c;
  if uid is null then return; end if;
  delete from public.staff_roles where user_id = uid;
  delete from auth.users where id = uid;
end $$;

revoke execute on function public.list_staff(), public.create_staff(text, text, text), public.set_staff_role(text, text), public.reset_staff_password(text, text), public.remove_staff(text) from public, anon;
grant execute on function public.list_staff(), public.create_staff(text, text, text), public.set_staff_role(text, text), public.reset_staff_password(text, text), public.remove_staff(text) to authenticated;
