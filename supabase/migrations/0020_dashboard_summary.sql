-- One database call for the whole owner/manager dashboard, instead of ~10 queries and a 3,000-row pull
-- that was added up in JavaScript. The server caches the result for 30 seconds.

-- Range scans by time (dashboard, orders list, CSV) had no index of their own: the existing one leads with status.
create index if not exists orders_cafe_id_placed_at_idx on public.orders (cafe_id, placed_at desc);

-- Start of the IST calendar day `p_back` days ago.
create or replace function public.ist_day_start(p_back int) returns timestamptz
language sql stable as $$
  select (date_trunc('day', now() at time zone 'Asia/Kolkata') - make_interval(days => p_back)) at time zone 'Asia/Kolkata'
$$;

create or replace function public.dashboard_summary(p_cafe uuid, p_days int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_days int := least(greatest(coalesce(p_days, 7), 1), 90);
  v_from timestamptz := ist_day_start(v_days - 1);        -- this period starts here
  v_prev timestamptz := ist_day_start(2 * v_days - 1);    -- the period before it, for the change arrows
  v_out jsonb;
begin
  with dash as materialized (
    select id, status::text status, order_type::text order_type, total, placed_at, customer_id, guest_phone
    from orders where cafe_id = p_cafe and placed_at >= v_prev
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
        select oi.name, sum(oi.qty)::int qty, round(sum(oi.qty * oi.unit_price)) revenue
        from order_items oi join dash c on c.id = oi.order_id and c.status <> 'cancelled' and c.placed_at >= v_from
        group by oi.name order by sum(oi.qty) desc, oi.name limit 6
      ) t
    ),
    'sections', (
      select coalesce(jsonb_agg(t), '[]') from (
        select cat.name, round(sum(oi.qty * oi.unit_price)) revenue
        from order_items oi
        join dash c on c.id = oi.order_id and c.status <> 'cancelled' and c.placed_at >= v_from
        join items i on i.id = oi.item_id join categories cat on cat.id = i.category_id
        group by cat.name order by sum(oi.qty * oi.unit_price) desc limit 6
      ) t
    ),
    -- Repeat customers: the same account or phone number ordering more than once in the period.
    'customers', (
      select jsonb_build_object('total', count(*) filter (where k is not null), 'repeat', count(*) filter (where k is not null and n > 1))
      from (
        select coalesce(customer_id::text, nullif(right(regexp_replace(coalesce(guest_phone, ''), '\D', '', 'g'), 10), '')) k, count(*) n
        from dash where status <> 'cancelled' and placed_at >= v_from group by 1
      ) w
    ),
    -- Time to ready: order placed to the first "ready" event, ignoring anything over 3 hours (a forgotten ticket).
    'avgReadyMin', (
      select round(avg(m))::int from (
        select extract(epoch from (min(e.created_at) - c.placed_at)) / 60 m
        from dash c join order_events e on e.order_id = c.id and e.status = 'ready'
        where c.status <> 'cancelled' and c.placed_at >= v_from group by c.id, c.placed_at
      ) r where m >= 0 and m < 180
    ),
    'pipeline', (
      select jsonb_build_object(
        'received',  count(*) filter (where status = 'received'),
        'preparing', count(*) filter (where status = 'preparing'),
        'ready',     count(*) filter (where status = 'ready'))
      from dash where placed_at >= ist_day_start(1)
    ),
    'menu', (
      select jsonb_build_object('items', count(*), 'soldOut', count(*) filter (where sold_out), 'hidden', count(*) filter (where hidden), 'noPhoto', count(*) filter (where image_id is null))
      from items where cafe_id = p_cafe
    ),
    'tables', (select count(*) from benches where cafe_id = p_cafe and active),
    'requests', (select count(*) from service_requests where cafe_id = p_cafe and status = 'open'),
    'recent', (
      select coalesce(jsonb_agg(r order by r.placed_at desc), '[]') from (
        select o.id, o.order_no, o.order_type, o.status, o.total, o.placed_at, o.guest_name, o.table_hint, o.delivery_km,
               case when b.id is null then null else jsonb_build_object('label', b.label) end as benches
        from orders o left join benches b on b.id = o.bench_id
        where o.cafe_id = p_cafe order by o.placed_at desc limit 6
      ) r
    )
  ) into v_out;
  return v_out;
end $$;

revoke all on function public.dashboard_summary(uuid, int) from public, anon, authenticated;
grant execute on function public.dashboard_summary(uuid, int) to service_role;
