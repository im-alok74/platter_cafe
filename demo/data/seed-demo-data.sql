-- DEMO DATA for showing the owner how the dashboards work. Safe to remove with DELETE-DEMO-DATA.sql.
--
-- What it makes:
--   * ~60 days of orders on the real menu, with real prices (so the 7, 14 and 30 day dashboards and their change arrows have data)
--   * 10 "live" orders right now, spread over New / Cooking / Ready / Served-unpaid, for the kitchen screen
--   * order lines, status history (so "time to ready" works), table requests, 2 demo customers with history and favourites
-- Every row is tagged so it can be found again:
--   orders.idempotency_key starts with 'demo-'; guest phones are in the reserved range +919000000xxx.
-- Order numbers are numbered #1.. in time order. The app picks the next number as max(order_no)+1, so real orders continue after them.

do $$
declare
  c uuid := (select id from cafes limit 1);
  bn uuid[] := array(select id from benches where cafe_id = (select id from cafes limit 1) and active);
  first_names text[] := array['Aarav','Vivaan','Aditya','Ananya','Diya','Isha','Kabir','Meera','Rohan','Saanvi','Arjun','Kavya','Riya','Yash','Nisha','Harsh','Pooja','Karan','Tanvi','Dev','Simran','Mohit','Neha','Rahul','Priya','Siddharth','Anjali','Varun','Shruti','Ayush'];
  last_init text[] := array['S','M','G','K','P','J','R','T','A','B'];
  areas text[] := array['Sunrise Apartments, Jhalana Doongri','Raj Nagar, Jhalana Gram','Malviya Nagar, near Gaurav Tower','Mansarovar, Sector 5','Vidhyadhar Nagar','C-Scheme, Ashok Marg','Tonk Road, near Durgapura','Vaishali Nagar','Bani Park','Gopalpura Bypass'];
  notes text[] := array['Less sugar please','Extra spicy','No onion','Pack separately','Ring the bell once'];
  cust1 uuid; cust2 uuid;
begin
  set local session_replication_role = replica;
  perform setseed(0.37);
  -- Opening-hour weights: busiest around 1-2 pm and 7-9 pm, nothing after 10:20 pm.
  create temp table _p on commit drop as select array_agg(h) hrs from (values (11,4),(12,7),(13,12),(14,10),(15,6),(16,4),(17,5),(18,8),(19,12),(20,14),(21,9),(22,3)) v(h,w), generate_series(1,w);

  -- Two demo customer accounts (phone sign-in), used to show "Your orders", reorder and favourites. Random passwords: nobody can sign in as them.
  cust1 := public._make_user('919000000001@phone.platter.invalid', md5(random()::text || clock_timestamp()::text), jsonb_build_object('name', 'Vivaan M'));
  cust2 := public._make_user('919000000002@phone.platter.invalid', md5(random()::text || clock_timestamp()::text), jsonb_build_object('name', 'Aditya G'));
  insert into profiles (id, cafe_id, phone, name) values (cust1, c, '+919000000001', 'Vivaan M'), (cust2, c, '+919000000002', 'Aditya G');

  -- One row per order: history for 60 days, plus 10 live orders.
  create temp table _o on commit drop as
  with days as (
    select d, (date_trunc('day', now() at time zone 'Asia/Kolkata') - make_interval(days => d)) as day0 from generate_series(0, 59) d
  ), counts as (
    select d, day0, greatest(3, round(7 + (60 - d) * 0.17 + (case when extract(dow from day0) in (0, 6) then 4 else 0 end) + (random() * 5 - 2.5)))::int n from days
  ), pre as (
    select d, day0, generate_series(1, n) k from counts
  ), hist as (
    select d, day0, hrs[1 + floor(random() * array_length(hrs, 1))::int] h, random() r_type, random() r_cancel, random() r_idx, random() r_note, random() r_nl, random() a1, random() a2, random() a3, random() r_km, random() r_area from pre, _p
  ), hist2 as (
    select *, (day0 + make_interval(hours => h, mins => case when h = 22 then floor(random() * 20)::int else floor(random() * 60)::int end)) at time zone 'Asia/Kolkata' as placed_at from hist
  )
  select gen_random_uuid() id, placed_at, h,
         case when r_type < 0.62 then 'dine_in' when r_type < 0.85 then 'takeaway' else 'delivery' end typ,
         case when r_cancel < 0.06 then 'cancelled' else 'served' end status,
         floor(power(r_idx, 1.4) * 400)::int idx, r_note, r_nl, a1, a2, a3, r_km, r_area, false live,
         placed_at + make_interval(secs => (2 + a1 * 4) * 60) t_prep,
         placed_at + make_interval(secs => (2 + a1 * 4 + 9 + a2 * 14 + (case when h in (13, 14, 20, 21) then a3 * 8 else 0 end)) * 60) t_ready,
         placed_at + make_interval(secs => (2 + a1 * 4 + 9 + a2 * 14 + (case when h in (13, 14, 20, 21) then a3 * 8 else 0 end) + 2 + a3 * 5) * 60) t_served,
         placed_at + make_interval(secs => (3 + a3 * 6) * 60) t_cancel
  from hist2 where placed_at <= now() - interval '55 minutes'
  union all
  select gen_random_uuid(), now() - make_interval(mins => v.age), extract(hour from (now() - make_interval(mins => v.age)) at time zone 'Asia/Kolkata')::int,
         v.typ, v.st, floor(random() * 60)::int + 10, random(), random(), random(), random(), random(), random(), random(), true,
         now() - make_interval(mins => v.age) + make_interval(secs => v.age * 60 * 0.25),
         now() - make_interval(mins => v.age) + make_interval(secs => v.age * 60 * 0.6),
         now() - make_interval(mins => v.age) + make_interval(secs => v.age * 60 * 0.85),
         null
  from (values (2, 'received', 'dine_in'), (5, 'received', 'dine_in'), (7, 'received', 'delivery'), (11, 'preparing', 'dine_in'), (14, 'preparing', 'takeaway'),
               (19, 'preparing', 'dine_in'), (23, 'ready', 'dine_in'), (27, 'ready', 'takeaway'), (33, 'served', 'dine_in'), (41, 'served', 'takeaway')) v(age, st, typ);

  -- Lines: 1 to 4 dishes per order, cheaper dishes more often; a variant is picked when the dish has sizes.
  create temp table _l on commit drop as
  select order_id, item_id, name, variant_name, unit_price, sum(qty)::int qty from (
    select o.id order_id, pick.id item_id, pick.name, v.vname variant_name, coalesce(v.vprice, pick.price) unit_price,
           case when o.q < 0.65 then 1 when o.q < 0.9 then 2 else 3 end qty
    from (select o.id, gs, random() q from _o o, generate_series(1, case when o.r_nl < 0.35 then 1 when o.r_nl < 0.7 then 2 when o.r_nl < 0.9 then 3 else 4 end) gs) o
    cross join lateral (select i.id, i.name, i.price from items i where i.cafe_id = (select id from cafes limit 1) and not i.hidden order by random() * (60 + i.price) + o.gs * 0 limit 1) pick
    left join lateral (select vv.name vname, vv.price vprice from item_variants vv where vv.item_id = pick.id order by random() + o.gs * 0 limit 1) v on true
  ) x group by order_id, item_id, name, variant_name, unit_price;

  create temp table _t on commit drop as
  select o.*, row_number() over (order by o.placed_at, o.id) rn,
         (select sum(l.unit_price * l.qty) from _l l where l.order_id = o.id) subtotal,
         case when o.typ = 'delivery' then round((1 + o.r_km * 6.5)::numeric, 1) end km
  from _o o;

  insert into orders (id, cafe_id, bench_id, order_no, order_type, status, payment_method, payment_status, customer_id, guest_name, guest_phone, delivery_address, note,
                      subtotal, discount, tax, delivery_charge, total, idempotency_key, placed_at, updated_at, delivery_km)
  select t.id, c,
         case when t.typ = 'dine_in' then bn[1 + floor(t.a2 * array_length(bn, 1))::int] end,
         t.rn, t.typ, case when t.live then t.status else t.status end, 'counter',
         case when t.status = 'served' and not (t.live) then 'paid' when t.status = 'served' and t.live then 'unpaid' else 'unpaid' end,
         case t.idx when 1 then cust1 when 2 then cust2 end,
         first_names[1 + (t.idx % 30)] || ' ' || last_init[1 + (t.idx % 10)],
         '+91' || '90000' || lpad(t.idx::text, 5, '0'),
         case when t.typ = 'delivery' then (10 + floor(t.a1 * 180))::text || ', ' || areas[1 + floor(t.r_area * 10)::int] end,
         case when t.r_note < 0.12 then notes[1 + floor(t.a3 * 5)::int] end,
         t.subtotal, 0, round(t.subtotal * 0.05, 2),
         case when t.typ = 'delivery' then 30 + greatest(0, t.km - 2) * 10 else 0 end,
         t.subtotal + round(t.subtotal * 0.05, 2) + case when t.typ = 'delivery' then 30 + greatest(0, t.km - 2) * 10 else 0 end,
         'demo-' || t.rn, t.placed_at,
         case t.status when 'cancelled' then t.t_cancel when 'served' then t.t_served when 'ready' then t.t_ready when 'preparing' then t.t_prep else t.placed_at end,
         t.km
  from _t t;

  -- Delivery orders get a delivery charge of 30 for the first 2 km and 10 per km after, like the real rules.
  insert into order_items (order_id, item_id, name, variant_name, unit_price, qty) select order_id, item_id, name, variant_name, unit_price, qty from _l;

  insert into order_events (order_id, status, created_at)
  select id, 'received', placed_at from _t
  union all select id, 'preparing', t_prep from _t where status in ('preparing', 'ready', 'served')
  union all select id, 'ready', t_ready from _t where status in ('ready', 'served')
  union all select id, 'served', t_served from _t where status = 'served'
  union all select id, 'cancelled', t_cancel from _t where status = 'cancelled';

  -- Table requests: two waiting, three already handled.
  insert into service_requests (cafe_id, bench_id, kind, status, created_at) values
    (c, bn[3], 'waiter', 'open', now() - interval '3 minutes'),
    (c, bn[7], 'bill', 'open', now() - interval '6 minutes'),
    (c, bn[2], 'waiter', 'done', now() - interval '2 hours'),
    (c, bn[5], 'bill', 'done', now() - interval '3 hours'),
    (c, bn[9], 'waiter', 'done', now() - interval '1 day');

  -- A few favourites for demo customer 1.
  insert into favourites (user_id, item_id) select cust1, id from items where name in ('Poha', 'Espresso', 'Masala Chai', 'Tomato Soup', 'Iced Americano') on conflict do nothing;
end $$;
