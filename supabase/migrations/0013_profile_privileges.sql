-- A customer may edit only their name and marketing consent. Row level security cannot limit columns,
-- so without this a customer could change their own phone number to someone else's and pull in that person's guest orders.
revoke update on public.profiles from anon, authenticated;
grant update (name, marketing_consent) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- A customer can see the table (name and code) of orders they placed, so history can say "Table 4".
create policy own_orders_bench on public.benches for select to authenticated
  using (exists (select 1 from public.orders o where o.bench_id = benches.id and o.customer_id = (select auth.uid())));
