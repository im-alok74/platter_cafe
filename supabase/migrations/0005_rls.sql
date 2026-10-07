-- Row Level Security on every table.
-- Orders, payments, points and popup events are written only by the server (service role).
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Owner/manager full access to admin-managed tables.
do $$
declare t text;
begin
  foreach t in array array['settings','categories','items','item_variants','addons',
    'media_assets','banners','popups','blog_posts','offers','coupon_codes','rewards',
    'referral_codes','referrals','referral_rewards','redemptions','profiles']
  loop
    execute format($f$create policy staff_all on public.%I for all to authenticated
      using ((select public.staff_role(cafe_id)) in ('owner','manager'))
      with check ((select public.staff_role(cafe_id)) in ('owner','manager'))$f$, t);
  end loop;
end $$;

-- Join tables have no cafe_id: authorise through the parent item.
create policy staff_all on public.item_addons for all to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and (select public.staff_role(i.cafe_id)) in ('owner','manager')))
  with check (exists (select 1 from public.items i where i.id = item_id and (select public.staff_role(i.cafe_id)) in ('owner','manager')));
create policy staff_all on public.item_images for all to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and (select public.staff_role(i.cafe_id)) in ('owner','manager')))
  with check (exists (select 1 from public.items i where i.id = item_id and (select public.staff_role(i.cafe_id)) in ('owner','manager')));

-- Public (anon + signed-in) reads: only published and active data.
create policy public_read on public.cafes for select using (true);
create policy public_read on public.settings for select using (key not like 'private\_%');
create policy public_read on public.categories for select using (not hidden);
create policy public_read on public.items for select using (not hidden);
create policy public_read on public.item_variants for select using (true);
create policy public_read on public.addons for select using (not hidden);
create policy public_read on public.item_addons for select using (true);
create policy public_read on public.item_images for select using (true);
create policy public_read on public.media_assets for select using (true);
create policy public_read on public.banners for select using (not hidden);
create policy public_read on public.blog_posts for select using (published_at is not null and published_at <= now());
create policy public_read on public.popups for select using (active);
create policy public_read on public.offers for select using (automatic and not paused);
create policy public_read on public.rewards for select using (active);
-- benches and coupon_codes have no public policy: bench codes and coupon codes are looked up on the server.

create policy owner_update on public.cafes for update to authenticated
  using ((select public.staff_role(id)) = 'owner') with check ((select public.staff_role(id)) = 'owner');

-- Staff accounts.
create policy own_row on public.staff_roles for select to authenticated using (user_id = (select auth.uid()));
create policy owner_manage on public.staff_roles for all to authenticated
  using ((select public.staff_role(cafe_id)) = 'owner') with check ((select public.staff_role(cafe_id)) = 'owner');

-- Audit log: owner reads, only triggers write.
create policy owner_read on public.audit_log for select to authenticated using ((select public.staff_role(cafe_id)) = 'owner');

-- Kitchen: sees and advances orders, sees and closes service requests.
create policy staff_read on public.orders for select to authenticated
  using ((select public.staff_role(cafe_id)) in ('owner','manager','kitchen'));
create policy staff_update on public.orders for update to authenticated
  using ((select public.staff_role(cafe_id)) in ('owner','manager','kitchen'))
  with check ((select public.staff_role(cafe_id)) in ('owner','manager','kitchen'));
create policy staff_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (select public.staff_role(o.cafe_id)) in ('owner','manager','kitchen')));
create policy staff_read on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (select public.staff_role(o.cafe_id)) in ('owner','manager','kitchen')));
create policy staff_all on public.service_requests for all to authenticated
  using ((select public.staff_role(cafe_id)) in ('owner','manager','kitchen'))
  with check ((select public.staff_role(cafe_id)) in ('owner','manager','kitchen'));
create policy staff_read on public.benches for select to authenticated
  using ((select public.staff_role(cafe_id)) in ('owner','manager','kitchen'));
create policy owner_manager_write on public.benches for all to authenticated
  using ((select public.staff_role(cafe_id)) in ('owner','manager'))
  with check ((select public.staff_role(cafe_id)) in ('owner','manager'));
create policy staff_read on public.points_ledger for select to authenticated
  using ((select public.staff_role(cafe_id)) in ('owner','manager'));
create policy staff_read on public.offer_redemptions for select to authenticated
  using ((select public.staff_role(cafe_id)) in ('owner','manager'));
create policy staff_read on public.popup_events for select to authenticated
  using (exists (select 1 from public.popups p where p.id = popup_id and (select public.staff_role(p.cafe_id)) in ('owner','manager')));

-- Customers: own rows only.
create policy own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy own on public.orders for select to authenticated using (customer_id = (select auth.uid()));
create policy own on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())));
create policy own on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())));
create policy own on public.points_ledger for select to authenticated using (user_id = (select auth.uid()));
create policy own on public.redemptions for select to authenticated using (user_id = (select auth.uid()));
create policy own on public.favourites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own on public.referral_codes for select to authenticated using (owner_id = (select auth.uid()));
create policy own on public.referrals for select to authenticated using (referred_id = (select auth.uid()));
create policy own on public.referral_rewards for select to authenticated using (user_id = (select auth.uid()));

-- Realtime for the kitchen screen and order tracking.
alter publication supabase_realtime add table public.orders, public.service_requests;
