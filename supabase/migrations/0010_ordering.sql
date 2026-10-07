-- Ordering. Orders are created and advanced only through these functions, which recompute every price
-- from the database inside one transaction. Nothing the browser sends is trusted except item ids and quantities.

insert into public.settings (cafe_id, key, value)
select id, 'ops', '{"prep_base_minutes":10,"per_order_minutes":2,"max_orders_per_bench_10min":6,"max_orders_cafe_10min":120,"enforce_hours":true}'::jsonb
from public.cafes on conflict do nothing;

-- Staff and guests never write these tables directly.
revoke insert, update, delete on public.orders, public.order_items, public.order_events from anon, authenticated;
drop policy if exists staff_update on public.orders;

create function public.in_window(t time, f time, e time) returns boolean
language sql immutable set search_path = '' as $$
  select case when f is null or e is null then true
              when f <= e then t >= f and t < e
              else t >= f or t < e end
$$;

-- The QR page looks the table up by its secret code.
create function public.get_bench(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(b) from (select id, label, active from public.benches where code = p_code) b
$$;

create function public.place_order(
  p_bench_code text, p_order_type text, p_payment_method text,
  p_name text, p_phone text, p_note text, p_key text, p_lines jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  bench record; v_cafe uuid; v_flags jsonb; v_hours jsonb; v_ops jsonb; v_tax jsonb; v_delivery jsonb;
  v_now time := (now() at time zone 'Asia/Kolkata')::time;
  ex record; line jsonb; it record; v_var_name text; v_var_price numeric; v_bench_id uuid; qty int; unit numeric; addon_sum numeric;
  addon_rows jsonb; a record; aid text; v_subtotal numeric := 0; tax_amt numeric := 0; delivery_amt numeric := 0; v_total numeric;
  rows jsonb := '[]'::jsonb; v_oid uuid; ono int; pct numeric; has_variants boolean; recent int;
begin
  if p_key is null or length(p_key) not between 8 and 80 then raise exception 'Missing request key'; end if;
  if p_order_type not in ('dine_in','takeaway','delivery') then raise exception 'Choose dine in or takeaway'; end if;
  if p_payment_method <> 'counter' then raise exception 'Online payment is not available yet'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 40 then
    raise exception 'Your order is empty';
  end if;
  if length(coalesce(p_name,'')) > 60 or length(coalesce(p_note,'')) > 300 then raise exception 'Name or note is too long'; end if;
  if p_phone is not null and p_phone <> '' and p_phone !~ '^\+?[0-9]{10,13}$' then raise exception 'Enter a valid phone number'; end if;

  if p_bench_code is not null and p_bench_code <> '' then
    select * into bench from public.benches where code = p_bench_code;
    if not found or not bench.active then raise exception 'This table is not taking orders. Please ask the staff.'; end if;
    v_cafe := bench.cafe_id; v_bench_id := bench.id;
  else
    if p_order_type = 'dine_in' then raise exception 'Scan the QR code on your table to order'; end if;
    select id into v_cafe from public.cafes order by created_at limit 1;
  end if;
  if p_order_type <> 'dine_in' and (coalesce(p_name,'') = '' or coalesce(p_phone,'') = '') then
    raise exception 'Add your name and phone so we can reach you';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_cafe::text));

  -- Same request key again (double tap, retry): return the order we already made.
  select id, order_no, total into ex from public.orders where cafe_id = v_cafe and idempotency_key = p_key;
  if found then return jsonb_build_object('id', ex.id, 'order_no', ex.order_no, 'total', ex.total, 'duplicate', true); end if;

  select jsonb_object_agg(key, value) into v_ops from public.settings where cafe_id = v_cafe;
  v_flags := coalesce(v_ops -> 'flags', '{}'); v_hours := v_ops -> 'hours'; v_tax := coalesce(v_ops -> 'tax', '{}');
  v_delivery := coalesce(v_ops -> 'delivery', '{}'); v_ops := coalesce(v_ops -> 'ops', '{}');

  if coalesce((v_ops ->> 'enforce_hours')::boolean, true) and v_hours is not null
     and not public.in_window(v_now, (v_hours ->> 'open')::time, (v_hours ->> 'close')::time) then
    raise exception 'The cafe is closed right now. We open at %', (v_hours ->> 'open');
  end if;
  if p_order_type = 'delivery' and not coalesce((v_flags ->> 'delivery')::boolean, false) then
    raise exception 'Delivery is not available';
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
    delivery_amt := case when coalesce((v_delivery ->> 'free_above')::numeric, 0) > 0
                           and v_subtotal >= (v_delivery ->> 'free_above')::numeric then 0
                         else coalesce((v_delivery ->> 'charge')::numeric, 0) end;
    v_total := v_total + delivery_amt;
  end if;

  select coalesce(max(order_no), 0) + 1 into ono from public.orders
   where cafe_id = v_cafe and (placed_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date;

  insert into public.orders (cafe_id, bench_id, order_no, order_type, payment_method, guest_name, guest_phone, note,
                             subtotal, tax, delivery_charge, total, idempotency_key)
  values (v_cafe, v_bench_id, ono, p_order_type, p_payment_method, nullif(trim(p_name), ''), nullif(p_phone, ''),
          nullif(trim(p_note), ''), v_subtotal, tax_amt, delivery_amt, v_total, p_key)
  returning id into v_oid;

  insert into public.order_items (order_id, item_id, name, variant_name, unit_price, qty, addons, note)
  select v_oid, (r ->> 'item_id')::uuid, r ->> 'name', r ->> 'variant_name', (r ->> 'unit_price')::numeric,
         (r ->> 'qty')::int, r -> 'addons', r ->> 'note'
  from jsonb_array_elements(rows) r;
  insert into public.order_events (order_id, status) values (v_oid, 'received');

  return jsonb_build_object('id', v_oid, 'order_no', ono, 'total', v_total, 'duplicate', false);
end $$;

-- Order tracking: the order id is unguessable, so holding it is the permission to look.
create function public.track_order(p_id uuid) returns jsonb
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
              then least(60, coalesce((ops ->> 'prep_base_minutes')::int, 10) + ahead * coalesce((ops ->> 'per_order_minutes')::int, 2))
              else 0 end;
  return jsonb_build_object(
    'id', o.id, 'order_no', o.order_no, 'status', o.status, 'payment_status', o.payment_status,
    'payment_method', o.payment_method, 'order_type', o.order_type, 'bench_label', o.bench_label, 'bench_code', o.bench_code,
    'subtotal', o.subtotal, 'discount', o.discount, 'tax', o.tax, 'delivery_charge', o.delivery_charge, 'total', o.total,
    'note', o.note, 'placed_at', o.placed_at, 'eta_minutes', eta,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'variant_name', i.variant_name, 'qty', i.qty,
                          'unit_price', i.unit_price, 'addons', i.addons, 'note', i.note) order by i.name)
                       from public.order_items i where i.order_id = o.id), '[]'::jsonb));
end $$;

create function public.request_service(p_code text, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare b record; existing uuid; recent int; sid uuid;
begin
  if p_kind not in ('waiter','bill') then raise exception 'Unknown request'; end if;
  select * into b from public.benches where code = p_code and active;
  if not found then raise exception 'This table is not available'; end if;
  select id into existing from public.service_requests
   where bench_id = b.id and kind = p_kind and status = 'open' and created_at > now() - interval '15 minutes' limit 1;
  if existing is not null then return jsonb_build_object('id', existing, 'duplicate', true); end if;
  select count(*) into recent from public.service_requests where bench_id = b.id and created_at > now() - interval '10 minutes';
  if recent >= 6 then raise exception 'Please wait, the staff has been notified'; end if;
  insert into public.service_requests (cafe_id, bench_id, kind) values (b.cafe_id, b.id, p_kind) returning id into sid;
  return jsonb_build_object('id', sid, 'duplicate', false);
end $$;

-- Staff: move an order along. One step forward or back, or cancel an unpaid order.
create function public.set_order_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare o record; ranks text[] := array['received','preparing','ready','served']; cur int; nxt int;
begin
  select * into o from public.orders where id = p_id for update;
  if not found then raise exception 'Order not found'; end if;
  if (select public.staff_role(o.cafe_id)) is null then raise exception 'Not allowed'; end if;
  if o.status in ('served','cancelled') then raise exception 'This order is already closed'; end if;
  if p_status = 'cancelled' then
    if o.payment_status = 'paid' then raise exception 'Refund the payment before cancelling'; end if;
  else
    cur := array_position(ranks, o.status); nxt := array_position(ranks, p_status);
    if nxt is null or abs(nxt - cur) <> 1 then raise exception 'That is not a valid next step'; end if;
  end if;
  update public.orders set status = p_status where id = p_id;
end $$;

create function public.mark_counter_paid(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare o record;
begin
  select * into o from public.orders where id = p_id for update;
  if not found then raise exception 'Order not found'; end if;
  if (select public.staff_role(o.cafe_id)) is null then raise exception 'Not allowed'; end if;
  if o.payment_method <> 'counter' or o.payment_status <> 'unpaid' or o.status = 'cancelled' then raise exception 'This order cannot be marked paid'; end if;
  update public.orders set payment_status = 'paid' where id = p_id;
end $$;

create function public.log_order_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_events (order_id, status, actor) values (new.id, new.status, (select auth.uid()));
  end if;
  return new;
end $$;
create trigger log_status after update of status on public.orders for each row execute function public.log_order_status();

revoke execute on function public.in_window(time, time, time), public.get_bench(text), public.place_order(text,text,text,text,text,text,text,jsonb),
  public.track_order(uuid), public.request_service(text,text), public.set_order_status(uuid,text), public.mark_counter_paid(uuid),
  public.log_order_status() from public;
revoke execute on function public.log_order_status() from anon, authenticated;
grant execute on function public.get_bench(text), public.place_order(text,text,text,text,text,text,text,jsonb),
  public.track_order(uuid), public.request_service(text,text) to anon, authenticated;
grant execute on function public.set_order_status(uuid,text), public.mark_counter_paid(uuid) to authenticated;
grant execute on function public.in_window(time, time, time) to anon, authenticated;
