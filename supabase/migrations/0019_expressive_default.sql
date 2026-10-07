-- The expressive look is the website's default. Owners can still switch to minimal in Admin > Design.
update public.settings set value = '{"name":"expressive"}'::jsonb where key = 'template';
