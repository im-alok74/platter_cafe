-- Admin > Menu saves a dish's sizes and add-ons as one set. The app calls this function (saveItem in menu/actions.ts),
-- but it was never created, so every dish save stopped after the main fields: sizes and add-ons were not saved and the
-- public menu cache was not refreshed.
--
-- SECURITY INVOKER: it runs as the signed-in person, so the existing staff row level security policies decide who may write.
create or replace function public.save_item_options(p_item uuid, p_variants jsonb, p_addons uuid[]) returns void
language plpgsql security invoker set search_path = public as $$
declare v_cafe uuid;
begin
  select cafe_id into v_cafe from items where id = p_item;
  if v_cafe is null then raise exception 'item not found' using errcode = 'P0002'; end if;

  delete from item_variants where item_id = p_item;
  insert into item_variants (cafe_id, item_id, name, price, sort)
    select v_cafe, p_item, x.v ->> 'name', (x.v ->> 'price')::numeric, (x.n - 1)::int
    from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) with ordinality as x(v, n);

  delete from item_addons where item_id = p_item;
  insert into item_addons (item_id, addon_id) select p_item, a from unnest(coalesce(p_addons, '{}'::uuid[])) as a;
end $$;

revoke all on function public.save_item_options(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.save_item_options(uuid, jsonb, uuid[]) to authenticated;
