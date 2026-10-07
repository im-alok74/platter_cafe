-- Core: cafe, settings, media, staff, benches, menu
create extension if not exists pgcrypto with schema extensions;

create table public.cafes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.settings (
  cafe_id uuid not null references public.cafes on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (cafe_id, key)
);

create table public.staff_roles (
  user_id uuid not null references auth.users on delete cascade,
  cafe_id uuid not null references public.cafes on delete cascade,
  role text not null check (role in ('owner','manager','kitchen')),
  created_at timestamptz not null default now(),
  primary key (user_id, cafe_id)
);
create index on public.staff_roles (cafe_id);

create function public.staff_role(c uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.staff_roles where user_id = (select auth.uid()) and cafe_id = c
$$;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  public_id text not null,
  url text not null,
  kind text not null check (kind in ('menu','category','banner','popup','gallery','blog','logo')),
  width int, height int, blur_data_url text,
  created_at timestamptz not null default now(),
  unique (cafe_id, public_id)
);

-- code is the unguessable value in the QR url; admin can rotate it
create table public.benches (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  number int not null,
  label text not null,
  code text not null unique default translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/=', 'xyz'),
  active boolean not null default true,
  unique (cafe_id, number)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  name text not null,
  slug text not null,
  sort int not null default 0,
  hidden boolean not null default false,
  delivery_available boolean not null default true,
  available_from time, available_to time,
  image_id uuid references public.media_assets on delete set null,
  unique (cafe_id, slug)
);
create index on public.categories (image_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  category_id uuid not null references public.categories on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  is_veg boolean not null default true,
  badges text[] not null default '{}',
  sold_out boolean not null default false,
  hidden boolean not null default false,
  is_special boolean not null default false,
  delivery_available boolean not null default true,
  available_from time, available_to time,
  sort int not null default 0,
  image_id uuid references public.media_assets on delete set null,
  search tsvector generated always as (to_tsvector('simple', name || ' ' || coalesce(description,''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.items (cafe_id, category_id, sort);
create index on public.items using gin (search);
create index on public.items (image_id);

create table public.item_images (
  item_id uuid not null references public.items on delete cascade,
  media_id uuid not null references public.media_assets on delete cascade,
  sort int not null default 0,
  primary key (item_id, media_id)
);
create index on public.item_images (media_id);

create table public.item_variants (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  item_id uuid not null references public.items on delete cascade,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  sort int not null default 0
);
create index on public.item_variants (item_id);

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  hidden boolean not null default false
);
create index on public.addons (cafe_id);

create table public.item_addons (
  item_id uuid not null references public.items on delete cascade,
  addon_id uuid not null references public.addons on delete cascade,
  primary key (item_id, addon_id)
);
create index on public.item_addons (addon_id);
