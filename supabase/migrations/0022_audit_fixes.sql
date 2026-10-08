-- Fixes from the database audit. Signatures are unchanged, so the app keeps calling the same functions.

-- Phone numbers are compared by their last 10 digits (public.norm_phone). This index serves the takeaway limit
-- and account deletion, which look orders up that way.
create index if not exists orders_norm_phone_idx on public.orders (public.norm_phone(guest_phone), placed_at) where bench_id is null;

-- Takeaway limit by phone: "+91 98290 44442" and "9829044442" are the same customer.
create or replace function public.limit_takeaway_orders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.bench_id is null and new.guest_phone is not null
     and (select count(*) from public.orders
           where public.norm_phone(guest_phone) = public.norm_phone(new.guest_phone)
             and bench_id is null and placed_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Too many orders from this number. Please call us.';
  end if;
  return new;
end $$;

-- place_order:
--  * delivery distance is never lower than the straight line from the cafe x 1.35 (road factor), worked out here,
--    so a browser cannot send a small km to get a cheap or out-of-range delivery
--  * refuses orders on the weekly day off
--  * phone must be an Indian mobile (same rule as register_customer) and is stored as +91XXXXXXXXXX
--  * today's order number range uses the (cafe_id, placed_at) index
create or replace function public.place_order(
  p_bench_code text, p_order_type text, p_payment_method text,
  p_name text, p_phone text, p_note text, p_key text, p_lines jsonb,
  p_table_hint text default null, p_delivery_address text default null,
  p_delivery_km numeric default null, p_delivery_lat double precision default null, p_delivery_lng double precision default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  bench record; v_cafe uuid; v_flags jsonb; v_hours jsonb; v_ops jsonb; v_tax jsonb; v_delivery jsonb;
  v_now time := (now() at time zone 'Asia/Kolkata')::time;
  v_dow int := extract(dow from now() at time zone 'Asia/Kolkata')::int;
  ex record; line jsonb; it record; v_var_name text; v_var_price numeric; v_bench_id uuid; qty int; unit numeric; addon_sum numeric;
  addon_rows jsonb; a record; aid text; v_subtotal numeric := 0; tax_amt numeric := 0; delivery_amt numeric := 0; v_total numeric;
  rows jsonb := '[]'::jsonb; v_oid uuid; ono int; pct numeric; has_variants boolean; recent int; max_km numeric; min_order numeric;
  v_phone text := public.norm_phone(p_phone); v_km numeric; c_lat double precision; c_lng double precision;
begin
  if p_key is null or length(p_key) not between 8 and 80 then raise exception 'Missing request key'; end if;
  if p_order_type not in ('dine_in','takeaway','delivery') then raise exception 'Choose dine in, takeaway or delivery'; end if;
  if p_payment_method <> 'counter' then raise exception 'Online payment is not available yet'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 40 then
    raise exception 'Your order is empty';
  end if;
  if length(coalesce(p_name,'')) > 60 or length(coalesce(p_note,'')) > 300 or length(coalesce(p_table_hint,'')) > 20
     or length(coalesce(p_delivery_address,'')) > 300 then raise exception 'Something you typed is too long'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(p_phone,'') = '' then raise exception 'Add your name and phone so we can reach you'; end if;
  if p_phone !~ '^\+?[0-9]{10,13}$' or v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid mobile number'; end if;

  if p_bench_code is not null and p_bench_code <> '' then
    select * into bench from public.benches where code = p_bench_code;
    if not found or not bench.active then raise exception 'This table is not taking orders. Please ask the staff.'; end if;
    v_cafe := bench.cafe_id; v_bench_id := bench.id;
  else
    select id into v_cafe from public.cafes order by created_at limit 1;
    if p_order_type = 'dine_in' and coalesce(trim(p_table_hint),'') = '' then raise exception 'Tell us your table number'; end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_cafe::text));

  select id, order_no, total into ex from public.orders where cafe_id = v_cafe and idempotency_key = p_key;
  if found then return jsonb_build_object('id', ex.id, 'order_no', ex.order_no, 'total', ex.total, 'duplicate', true); end if;

  select jsonb_object_agg(key, value) into v_ops from public.settings where cafe_id = v_cafe;
  v_flags := coalesce(v_ops -> 'flags', '{}'); v_hours := v_ops -> 'hours'; v_tax := coalesce(v_ops -> 'tax', '{}');
  v_delivery := coalesce(v_ops -> 'delivery', '{}'); v_ops := coalesce(v_ops -> 'ops', '{}');

  if coalesce((v_ops ->> 'enforce_hours')::boolean, true) and v_hours is not null then
    -- weekly_off holds weekdays, 0 = Sunday (src/lib/hours.ts)
    if coalesce(v_hours -> 'weekly_off', '[]') @> to_jsonb(v_dow) then raise exception 'The cafe is closed today'; end if;
    if not public.in_window(v_now, (v_hours ->> 'open')::time, (v_hours ->> 'close')::time) then
      raise exception 'The cafe is closed right now. We open at %', (v_hours ->> 'open');
    end if;
  end if;

  if p_order_type = 'delivery' then
    max_km := coalesce((v_delivery ->> 'max_km')::numeric, 8);
    if not coalesce((v_flags ->> 'delivery')::boolean, false) then raise exception 'Delivery is not available right now'; end if;
    if length(coalesce(trim(p_delivery_address),'')) < 10 then raise exception 'Add your full delivery address'; end if;
    if p_delivery_lat is null or p_delivery_lng is null or p_delivery_lat not between -90 and 90 or p_delivery_lng not between -180 and 180 then
      raise exception 'We need your location to price the delivery';
    end if;
    c_lat := (v_delivery ->> 'lat')::double precision; c_lng := (v_delivery ->> 'lng')::double precision;
    if c_lat is null or c_lng is null then raise exception 'Delivery is not available right now'; end if;
    -- Haversine km x 1.35. The browser's road distance is used when it is longer.
    v_km := round((2 * 6371 * asin(sqrt(power(sin(radians(p_delivery_lat - c_lat) / 2), 2)
                 + cos(radians(c_lat)) * cos(radians(p_delivery_lat)) * power(sin(radians(p_delivery_lng - c_lng) / 2), 2))) * 1.35)::numeric, 2);
    v_km := greatest(coalesce(p_delivery_km, 0), v_km);
    if v_km > max_km then raise exception 'We deliver up to % km. Your address is about % km away.', max_km, round(v_km, 1); end if;
  end if;

  if v_bench_id is not null then
    select count(*) into recent from public.orders where bench_id = v_bench_id and placed_at > now() - interval '10 minutes';
    if recent >= coalesce((v_ops ->> 'max_orders_per_bench_10min')::int, 6) then
      raise exception 'Too many orders from this table. Please ask the staff.';
    end if;
  end if;
  select count(*) into recent from public.orders where cafe_id = v_cafe and placed_at > now() - interval '10 minutes';
  if recent >= coalesce((v_ops ->> 'max_orders_cafe_10min')::int, 120) then raise exception 'We are very busy. Please try again in a minute.'; end if;

  for line in select * from jsonb_array_elements(p_lines) loop
    qty := (line ->> 'qty')::int;
    if qty is null or qty not between 1 and 20 then raise exception 'Choose a quantity between 1 and 20'; end if;
    select i.id, i.name, i.price, i.hidden, i.sold_out, i.delivery_available, i.available_from, i.available_to,
           c.hidden as c_hidden, c.delivery_available as c_delivery, c.available_from as c_from, c.available_to as c_to
      into it from public.items i join public.categories c on c.id = i.category_id
     where i.id = (line ->> 'item_id')::uuid and i.cafe_id = v_cafe;
    if not found or it.hidden or it.c_hidden then raise exception 'An item in your order is no longer on the menu'; end if;
    if it.sold_out then raise exception '% is sold out', it.name; end if;
    if not public.in_window(v_now, it.available_from, it.available_to) or not public.in_window(v_now, it.c_from, it.c_to) then
      raise exception '% is not available at this time', it.name;
    end if;
    if p_order_type = 'delivery' and not (it.delivery_available and it.c_delivery) then
      raise exception '% is not available for delivery', it.name;
    end if;

    select exists (select 1 from public.item_variants where item_id = it.id) into has_variants;
    v_var_name := null; v_var_price := null;
    if has_variants then
      select name, price into v_var_name, v_var_price from public.item_variants
       where item_id = it.id and id = nullif(line ->> 'variant_id', '')::uuid;
      if not found then raise exception 'Choose an option for %', it.name; end if;
    end if;
    unit := coalesce(v_var_price, it.price);

    addon_sum := 0; addon_rows := '[]'::jsonb;
    for aid in select distinct jsonb_array_elements_text(coalesce(line -> 'addon_ids', '[]')) loop
      select a2.id, a2.name, a2.price into a from public.addons a2
        join public.item_addons ia on ia.addon_id = a2.id and ia.item_id = it.id
       where a2.id = aid::uuid and a2.cafe_id = v_cafe and not a2.hidden;
      if not found then raise exception 'An add-on for % is no longer available', it.name; end if;
      addon_sum := addon_sum + a.price;
      addon_rows := addon_rows || jsonb_build_object('id', a.id, 'name', a.name, 'price', a.price);
    end loop;

    v_subtotal := v_subtotal + (unit + addon_sum) * qty;
    rows := rows || jsonb_build_object('item_id', it.id, 'name', it.name, 'variant_name', v_var_name, 'unit_price', unit,
                                       'qty', qty, 'addons', addon_rows, 'note', left(nullif(line ->> 'note', ''), 120));
  end loop;

  pct := coalesce((v_tax ->> 'gst_percent')::numeric, 0);
  if coalesce((v_tax ->> 'inclusive')::boolean, false) then
    tax_amt := round(v_subtotal - v_subtotal / (1 + pct / 100), 2);
    v_total := v_subtotal;
  else
    tax_amt := round(v_subtotal * pct / 100, 2);
    v_total := v_subtotal + tax_amt;
  end if;

  if p_order_type = 'delivery' then
    min_order := coalesce((v_delivery ->> 'min_order')::numeric, 0);
    if v_subtotal < min_order then raise exception 'The minimum order for delivery is ₹%', min_order; end if;
    -- Base fare covers the first base_km; every km after that costs per_km. Rounded up to a whole rupee.
    delivery_amt := case when coalesce((v_delivery ->> 'free_above')::numeric, 0) > 0
                           and v_subtotal >= (v_delivery ->> 'free_above')::numeric then 0
                         else ceil(coalesce((v_delivery ->> 'base_fare')::numeric, 0)
                                 + greatest(0, v_km - coalesce((v_delivery ->> 'base_km')::numeric, 0)) * coalesce((v_delivery ->> 'per_km')::numeric, 0)) end;
    v_total := v_total + delivery_amt;
  end if;

  select coalesce(max(order_no), 0) + 1 into ono from public.orders
   where cafe_id = v_cafe and placed_at >= public.ist_day_start(0);

  insert into public.orders (cafe_id, bench_id, order_no, order_type, payment_method, guest_name, guest_phone, note, table_hint,
                             delivery_address, delivery_km, delivery_lat, delivery_lng,
                             subtotal, tax, delivery_charge, total, idempotency_key)
  values (v_cafe, v_bench_id, ono, p_order_type, p_payment_method, nullif(trim(p_name), ''), '+91' || v_phone,
          nullif(trim(p_note), ''), nullif(trim(p_table_hint), ''),
          case when p_order_type = 'delivery' then trim(p_delivery_address) end,
          case when p_order_type = 'delivery' then round(v_km, 2) end,
          case when p_order_type = 'delivery' then p_delivery_lat end,
          case when p_order_type = 'delivery' then p_delivery_lng end,
          v_subtotal, tax_amt, delivery_amt, v_total, p_key)
  returning id into v_oid;

  insert into public.order_items (order_id, item_id, name, variant_name, unit_price, qty, addons, note)
  select v_oid, (r ->> 'item_id')::uuid, r ->> 'name', r ->> 'variant_name', (r ->> 'unit_price')::numeric,
         (r ->> 'qty')::int, r -> 'addons', r ->> 'note'
  from jsonb_array_elements(rows) r;
  insert into public.order_events (order_id, status) values (v_oid, 'received');

  return jsonb_build_object('id', v_oid, 'order_no', ono, 'total', v_total, 'delivery_charge', delivery_amt, 'duplicate', false);
end $$;

-- Tracking: "orders ahead" counts only today's open orders, not a ticket forgotten last week.
create or replace function public.track_order(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o record; ops jsonb; ahead int; eta int;
begin
  select ord.*, b.label as bench_label, b.code as bench_code into o
    from public.orders ord left join public.benches b on b.id = ord.bench_id where ord.id = p_id;
  if not found then return null; end if;
  select value into ops from public.settings where cafe_id = o.cafe_id and key = 'ops';
  select count(*) into ahead from public.orders
   where cafe_id = o.cafe_id and status in ('received','preparing') and placed_at < o.placed_at and placed_at >= public.ist_day_start(0);
  eta := case when o.status in ('received','preparing')
              then least(60, coalesce((ops ->> 'prep_base_minutes')::int, 10) + ahead * coalesce((ops ->> 'per_order_minutes')::int, 2)
                             + case when o.order_type = 'delivery' then 15 else 0 end)
              else 0 end;
  return jsonb_build_object(
    'id', o.id, 'order_no', o.order_no, 'status', o.status, 'payment_status', o.payment_status,
    'payment_method', o.payment_method, 'order_type', o.order_type, 'bench_label', coalesce(o.bench_label, case when o.table_hint is not null then 'Table ' || o.table_hint end), 'bench_code', o.bench_code,
    'subtotal', o.subtotal, 'discount', o.discount, 'tax', o.tax, 'delivery_charge', o.delivery_charge, 'total', o.total,
    'delivery_address', o.delivery_address, 'delivery_km', o.delivery_km,
    'note', o.note, 'placed_at', o.placed_at, 'eta_minutes', eta,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'variant_name', i.variant_name, 'qty', i.qty,
                          'unit_price', i.unit_price, 'addons', i.addons, 'note', i.note) order by i.name)
                       from public.order_items i where i.order_id = o.id), '[]'::jsonb));
end $$;

-- Account deletion clears name, phone and address on the account's own orders. Guest orders with the same phone are left alone:
-- phones are unverified, so matching on them would let anyone wipe a stranger's orders.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.staff_roles where user_id = uid) then raise exception 'Staff accounts are removed by the owner'; end if;
  update public.orders set guest_name = null, guest_phone = null, delivery_address = null, customer_id = null where customer_id = uid;
  delete from auth.users where id = uid;
end $$;

-- Passwords: bcrypt reads at most 72 bytes, not characters, so the limit is in bytes.
create or replace function public.register_customer(p_identifier text, p_password text, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  ident text := lower(btrim(coalesce(p_identifier, '')));
  nm text := nullif(left(btrim(coalesce(p_name, '')), 60), '');
  em text; ph text; digits text; uid uuid; cafe uuid;
begin
  if length(coalesce(p_password, '')) < 8 or octet_length(p_password) > 72 then raise exception 'weak_password'; end if;
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

create or replace function public.create_staff(p_email text, p_password text, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid; em text := lower(btrim(coalesce(p_email, '')));
begin
  select cafe_id into c from public.staff_roles where user_id = (select auth.uid()) and role = 'owner' limit 1;
  if c is null then raise exception 'Not allowed'; end if;
  if p_role not in ('owner', 'manager', 'kitchen') then raise exception 'invalid_role'; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_identifier'; end if;
  if length(coalesce(p_password, '')) < 8 or octet_length(p_password) > 72 then raise exception 'weak_password'; end if;
  if exists (select 1 from auth.users where email = em) then raise exception 'already_registered'; end if;
  insert into public.staff_roles (user_id, cafe_id, role) values (public._make_user(em, p_password, '{}'::jsonb), c, p_role);
end $$;

-- An owner cannot reset another owner's password, and a reset signs that person out everywhere.
create or replace function public.reset_staff_password(p_email text, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid; uid uuid; r text;
begin
  select cafe_id into c from public.staff_roles where user_id = (select auth.uid()) and role = 'owner' limit 1;
  if c is null then raise exception 'Not allowed'; end if;
  if length(coalesce(p_password, '')) < 8 or octet_length(p_password) > 72 then raise exception 'weak_password'; end if;
  select u.id, s.role into uid, r from auth.users u join public.staff_roles s on s.user_id = u.id and s.cafe_id = c
   where u.email = lower(p_email);
  if uid is null then return; end if;
  if r = 'owner' and uid <> (select auth.uid()) then raise exception 'You cannot reset another owner''s password'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = uid;
  delete from auth.sessions where user_id = uid;           -- cascades to their refresh tokens
  delete from auth.refresh_tokens where user_id = uid::text; -- older tokens with no session
end $$;

-- Sizes and add-ons of a dish, replaced as one set in one transaction.
create or replace function public.save_item_options(p_item uuid, p_variants jsonb, p_addons jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid;
begin
  select cafe_id into c from public.items where id = p_item;
  if c is null or coalesce(public.staff_role(c), '') not in ('owner', 'manager') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_variants, '[]')) <> 'array' or jsonb_typeof(coalesce(p_addons, '[]')) <> 'array'
     or jsonb_array_length(coalesce(p_variants, '[]')) > 10 or jsonb_array_length(coalesce(p_addons, '[]')) > 30 then
    raise exception 'invalid_options';
  end if;
  delete from public.item_variants where item_id = p_item;
  insert into public.item_variants (cafe_id, item_id, name, price, sort)
  select c, p_item, left(btrim(v ->> 'name'), 60), (v ->> 'price')::numeric, (n - 1)::int
  from jsonb_array_elements(coalesce(p_variants, '[]')) with ordinality as t(v, n);
  delete from public.item_addons where item_id = p_item;
  insert into public.item_addons (item_id, addon_id)
  select p_item, a.id from public.addons a
   where a.cafe_id = c and a.id in (select x::uuid from jsonb_array_elements_text(coalesce(p_addons, '[]')) x);
end $$;
revoke execute on function public.save_item_options(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_item_options(uuid, jsonb, jsonb) to authenticated;

-- Dashboard: empty search_path with qualified names; dish and section revenue include add-ons;
-- sections keep sales of dishes deleted since, under "Other".
create or replace function public._dashboard_summary(p_cafe uuid, p_days int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_days int := least(greatest(coalesce(p_days, 7), 1), 90);
  v_from timestamptz := public.ist_day_start(v_days - 1);        -- this period starts here
  v_prev timestamptz := public.ist_day_start(2 * v_days - 1);    -- the period before it, for the change arrows
  v_out jsonb;
begin
  with dash as materialized (
    select id, status::text status, order_type::text order_type, total, placed_at, customer_id, guest_phone
    from public.orders where cafe_id = p_cafe and placed_at >= v_prev
  ), lines as materialized (
    -- one row per dish sold this period, priced with its add-ons
    select oi.name, oi.item_id, oi.qty,
           oi.qty * (oi.unit_price + coalesce((select sum((x ->> 'price')::numeric) from jsonb_array_elements(oi.addons) x), 0)) amount
    from public.order_items oi join dash c on c.id = oi.order_id and c.status <> 'cancelled' and c.placed_at >= v_from
  )
  select jsonb_build_object(
    'days', v_days,
    'sales',      (select coalesce(sum(total), 0) from dash where status <> 'cancelled' and placed_at >= v_from),
    'orders',     (select count(*) from dash where status <> 'cancelled' and placed_at >= v_from),
    'prevSales',  (select coalesce(sum(total), 0) from dash where status <> 'cancelled' and placed_at < v_from),
    'prevOrders', (select count(*) from dash where status <> 'cancelled' and placed_at < v_from),
    'cancelled',  (select count(*) from dash where status = 'cancelled' and placed_at >= v_from),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', to_char(g, 'YYYY-MM-DD'), 'sales', round(coalesce(s.sales, 0)), 'orders', coalesce(s.n, 0)) order by g), '[]')
      from generate_series((v_from at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') g
      left join (
        select (placed_at at time zone 'Asia/Kolkata')::date dd, sum(total) sales, count(*) n
        from dash where status <> 'cancelled' and placed_at >= v_from group by 1
      ) s on s.dd = g::date
    ),
    'hours', (
      select jsonb_agg(coalesce(c.n, 0) order by h)
      from generate_series(0, 23) h
      left join (
        select extract(hour from placed_at at time zone 'Asia/Kolkata')::int hh, count(*) n
        from dash where status <> 'cancelled' and placed_at >= v_from group by 1
      ) c on c.hh = h
    ),
    'types', (
      select jsonb_build_object(
        'dine_in',  count(*) filter (where order_type = 'dine_in'),
        'takeaway', count(*) filter (where order_type = 'takeaway'),
        'delivery', count(*) filter (where order_type = 'delivery'))
      from dash where status <> 'cancelled' and placed_at >= v_from
    ),
    'topDishes', (
      select coalesce(jsonb_agg(t), '[]') from (
        select l.name, sum(l.qty)::int qty, round(sum(l.amount)) revenue
        from lines l group by l.name order by sum(l.qty) desc, l.name limit 6
      ) t
    ),
    'sections', (
      select coalesce(jsonb_agg(t), '[]') from (
        select coalesce(cat.name, 'Other') name, round(sum(l.amount)) revenue
        from lines l
        left join public.items i on i.id = l.item_id left join public.categories cat on cat.id = i.category_id
        group by 1 order by sum(l.amount) desc limit 6
      ) t
    ),
    -- Repeat customers: the same account or phone number ordering more than once in the period.
    'customers', (
      select jsonb_build_object('total', count(*) filter (where k is not null), 'repeat', count(*) filter (where k is not null and n > 1))
      from (
        select coalesce(customer_id::text, nullif(public.norm_phone(guest_phone), '')) k, count(*) n
        from dash where status <> 'cancelled' and placed_at >= v_from group by 1
      ) w
    ),
    -- Time to ready: order placed to the first "ready" event, ignoring anything over 3 hours (a forgotten ticket).
    'avgReadyMin', (
      select round(avg(m))::int from (
        select extract(epoch from (min(e.created_at) - c.placed_at)) / 60 m
        from dash c join public.order_events e on e.order_id = c.id and e.status = 'ready'
        where c.status <> 'cancelled' and c.placed_at >= v_from group by c.id, c.placed_at
      ) r where m >= 0 and m < 180
    ),
    'pipeline', (
      select jsonb_build_object(
        'received',  count(*) filter (where status = 'received'),
        'preparing', count(*) filter (where status = 'preparing'),
        'ready',     count(*) filter (where status = 'ready'))
      from dash where placed_at >= public.ist_day_start(1)
    ),
    'menu', (
      select jsonb_build_object('items', count(*), 'soldOut', count(*) filter (where sold_out), 'hidden', count(*) filter (where hidden), 'noPhoto', count(*) filter (where image_id is null))
      from public.items where cafe_id = p_cafe
    ),
    'tables', (select count(*) from public.benches where cafe_id = p_cafe and active),
    'requests', (select count(*) from public.service_requests where cafe_id = p_cafe and status = 'open'),
    'recent', (
      select coalesce(jsonb_agg(r order by r.placed_at desc), '[]') from (
        select o.id, o.order_no, o.order_type, o.status, o.total, o.placed_at, o.guest_name, o.table_hint, o.delivery_km,
               case when b.id is null then null else jsonb_build_object('label', b.label) end as benches
        from public.orders o left join public.benches b on b.id = o.bench_id
        where o.cafe_id = p_cafe order by o.placed_at desc limit 6
      ) r
    )
  ) into v_out;
  return v_out;
end $$;

create or replace function public.dashboard_summary(p_cafe uuid, p_days int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.staff_roles where user_id = (select auth.uid()) and cafe_id = p_cafe and role in ('owner', 'manager')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return public._dashboard_summary(p_cafe, p_days);
end $$;
