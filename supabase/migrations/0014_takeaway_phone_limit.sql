-- Takeaway orders from the website have no table to rate-limit, so limit by phone number instead.
create function public.limit_takeaway_orders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.bench_id is null and new.guest_phone is not null
     and (select count(*) from public.orders
           where guest_phone = new.guest_phone and bench_id is null and placed_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Too many orders from this number. Please call us.';
  end if;
  return new;
end $$;
revoke execute on function public.limit_takeaway_orders() from public, anon, authenticated;
create trigger limit_takeaway before insert on public.orders for each row execute function public.limit_takeaway_orders();
