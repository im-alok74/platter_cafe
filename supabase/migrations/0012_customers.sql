-- Customer accounts: profile on first sign-in, guest orders joined to the account, account deletion.

create function public.norm_phone(p text) returns text
language sql immutable set search_path = '' as $$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10)
$$;

-- Phone sign-ups get a profile. Staff sign in with email and get none.
create function public.create_customer_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.phone is not null and new.phone <> '' then
    insert into public.profiles (id, cafe_id, phone)
    select new.id, c.id, new.phone from public.cafes c order by c.created_at limit 1
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.create_customer_profile() from public, anon, authenticated;
create trigger create_profile_on_signup after insert on auth.users for each row execute function public.create_customer_profile();

-- An order placed while signed in belongs to that customer.
create function public.link_order_customer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_id is null and (select auth.uid()) is not null then
    select id into new.customer_id from public.profiles where id = (select auth.uid());
  end if;
  return new;
end $$;
revoke execute on function public.link_order_customer() from public, anon, authenticated;
create trigger link_customer before insert on public.orders for each row execute function public.link_order_customer();

-- After signing in, earlier guest orders placed with the same phone number join the account.
-- The code sent to that number proved the customer owns it.
create function public.claim_guest_orders() returns int
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); ph text; n int;
begin
  if uid is null then return 0; end if;
  select phone into ph from public.profiles where id = uid;
  if ph is null then return 0; end if;
  update public.orders set customer_id = uid
   where customer_id is null and guest_phone is not null and public.norm_phone(guest_phone) = public.norm_phone(ph);
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.claim_guest_orders() from public, anon;
grant execute on function public.claim_guest_orders() to authenticated;

-- DPDP: delete the account and personal data. Orders stay for accounting, with the name and phone removed.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.staff_roles where user_id = uid) then raise exception 'Staff accounts are removed by the owner'; end if;
  update public.orders set guest_name = null, guest_phone = null, delivery_address = null, customer_id = null where customer_id = uid;
  delete from auth.users where id = uid;
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
