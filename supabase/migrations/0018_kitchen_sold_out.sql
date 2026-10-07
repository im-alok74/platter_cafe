-- The kitchen can mark a dish sold out or back in stock without being able to edit anything else on the menu.
create function public.set_item_sold_out(p_item uuid, p_sold_out boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid;
begin
  select cafe_id into c from public.items where id = p_item;
  if c is null or (select public.staff_role(c)) is null then raise exception 'Not allowed'; end if;
  update public.items set sold_out = p_sold_out where id = p_item;
end $$;
revoke execute on function public.set_item_sold_out(uuid, boolean) from public, anon;
grant execute on function public.set_item_sold_out(uuid, boolean) to authenticated;
