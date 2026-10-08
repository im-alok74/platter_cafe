-- Optional dish details shown in the dish sheet on the menu. Both stay empty until someone writes them in Admin > Menu,
-- and the sheet shows a section only when it has text, so a dish never displays made-up information.
alter table public.items add column if not exists ingredients text;
alter table public.items add column if not exists method text;
alter table public.items add constraint items_ingredients_len check (ingredients is null or char_length(ingredients) <= 400);
alter table public.items add constraint items_method_len check (method is null or char_length(method) <= 1200);
