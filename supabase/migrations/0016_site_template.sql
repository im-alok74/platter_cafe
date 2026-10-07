-- Which look the public website uses: "minimal" (calm, clean) or "expressive" (kinetic type, cafe animations).
-- Owners switch it in Admin > Design. Defaults to minimal so nothing changes until they choose.
insert into public.settings (cafe_id, key, value)
select id, 'template', '{"name":"minimal"}'::jsonb from public.cafes
on conflict (cafe_id, key) do nothing;
