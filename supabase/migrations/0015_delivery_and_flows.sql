-- Ordering v2:
--  * name and phone are required for every order
--  * dine in without a table QR is allowed (the customer says which table)
--  * delivery is priced by distance, calculated here from the km the server worked out
alter table public.orders
  add column table_hint text,
  add column delivery_km numeric(6,2),
  add column delivery_lat double precision,
  add column delivery_lng double precision;

-- Delivery rules, like a ride app: a base fare that covers the first km, then a rate per km, up to a limit.
-- These numbers are placeholders for the owner to set (admin, Delivery).
update public.settings
   set value = '{"base_fare":30,"base_km":2,"per_km":10,"max_km":8,"free_above":0,"min_order":0,"lat":26.8668664,"lng":75.8190989}'::jsonb
 where key = 'delivery';
update public.settings set value = jsonb_set(value, '{delivery}', 'true') where key = 'flags';

drop function public.place_order(text, text, text, text, text, text, text, jsonb);

create function public.place_order(
  p_bench_code text, p_order_type text, p_payment_method text,
  p_name text, p_phone text, p_note text, p_key text, p_lines jsonb,
  p_table_hint text default null, p_delivery_address text default null,
  p_delivery_km numeric default null, p_delivery_lat double precision default null, p_delivery_lng double precision default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  bench record; v_cafe uuid; v_flags jsonb; v_hours jsonb; v_ops jsonb; v_tax jsonb; v_delivery jsonb;
  v_now time := (now() at time zone 'Asia/Kolkata')::time;
  ex record; line jsonb; it record; v_var_name text; v_var_price numeric; v_bench_id uuid; qty int; unit numeric; addon_sum numeric;
  addon_rows jsonb; a record; aid text; v_subtotal numeric := 0; tax_amt numeric := 0; delivery_amt numeric := 0; v_total numeric;
  rows jsonb := '[]'::jsonb; v_oid uuid; ono int; pct numeric; has_variants boolean; recent int; max_km numeric; min_order numeric;
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
  if p_phone !~ '^\+?[0-9]{10,13}$' then raise exception 'Enter a valid phone number'; end if;

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

  if coalesce((v_ops ->> 'enforce_hours')::boolean, true) and v_hours is not null
     and not public.in_window(v_now, (v_hours ->> 'open')::time, (v_hours ->> 'close')::time) then
    raise exception 'The cafe is closed right now. We open at %', (v_hours ->> 'open');
  end if;

  if p_order_type = 'delivery' then
    max_km := coalesce((v_delivery ->> 'max_km')::numeric, 8);
    if not coalesce((v_flags ->> 'delivery')::boolean, false) then raise exception 'Delivery is not available right now'; end if;
    if length(coalesce(trim(p_delivery_address),'')) < 10 then raise exception 'Add your full delivery address'; end if;
    if p_delivery_km is null or p_delivery_km < 0 then raise exception 'We need your location to price the delivery'; end if;
    if p_delivery_km > max_km then raise exception 'We deliver up to % km. Your address is about % km away.', max_km, round(p_delivery_km, 1); end if;
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
                                 + greatest(0, p_delivery_km - coalesce((v_delivery ->> 'base_km')::numeric, 0)) * coalesce((v_delivery ->> 'per_km')::numeric, 0)) end;
    v_total := v_total + delivery_amt;
  end if;

  select coalesce(max(order_no), 0) + 1 into ono from public.orders
   where cafe_id = v_cafe and (placed_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date;

  insert into public.orders (cafe_id, bench_id, order_no, order_type, payment_method, guest_name, guest_phone, note, table_hint,
                             delivery_address, delivery_km, delivery_lat, delivery_lng,
                             subtotal, tax, delivery_charge, total, idempotency_key)
  values (v_cafe, v_bench_id, ono, p_order_type, p_payment_method, nullif(trim(p_name), ''), nullif(p_phone, ''),
          nullif(trim(p_note), ''), nullif(trim(p_table_hint), ''),
          case when p_order_type = 'delivery' then trim(p_delivery_address) end,
          case when p_order_type = 'delivery' then round(p_delivery_km, 2) end,
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

revoke execute on function public.place_order(text,text,text,text,text,text,text,jsonb,text,text,numeric,double precision,double precision) from public;
grant execute on function public.place_order(text,text,text,text,text,text,text,jsonb,text,text,numeric,double precision,double precision) to anon, authenticated;

-- Tracking shows the table hint and delivery details too.
create or replace function public.track_order(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o record; ops jsonb; ahead int; eta int;
begin
  select ord.*, b.label as bench_label, b.code as bench_code into o
    from public.orders ord left join public.benches b on b.id = ord.bench_id where ord.id = p_id;
  if not found then return null; end if;
  select value into ops from public.settings where cafe_id = o.cafe_id and key = 'ops';
  select count(*) into ahead from public.orders
   where cafe_id = o.cafe_id and status in ('received','preparing') and placed_at < o.placed_at;
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
