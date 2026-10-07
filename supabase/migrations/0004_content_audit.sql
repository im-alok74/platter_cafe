-- Popups, banners, blog, audit
create table public.popups (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  title text not null, body text,
  image_id uuid references public.media_assets on delete set null,
  button_label text, button_link text,
  style text not null default 'modal' check (style in ('modal','sheet','banner')),
  pages text[] not null default '{}',
  audience text not null default 'all' check (audience in ('all','new','logged_in')),
  start_time time, end_time time,
  starts_at timestamptz, ends_at timestamptz,
  frequency text not null default 'once' check (frequency in ('once','daily','always')),
  priority int not null default 0,
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.popups (cafe_id, active);
create index on public.popups (image_id);

create table public.popup_events (
  id bigint generated always as identity primary key,
  popup_id uuid not null references public.popups on delete cascade,
  kind text not null check (kind in ('view','click','close')),
  created_at timestamptz not null default now()
);
create index on public.popup_events (popup_id, kind);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  title text, link text,
  image_id uuid references public.media_assets on delete set null,
  placement text not null default 'home_hero',
  sort int not null default 0,
  hidden boolean not null default false
);
create index on public.banners (cafe_id, placement, sort);
create index on public.banners (image_id);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  slug text not null,
  title text not null,
  excerpt text,
  body text not null default '',
  cover_id uuid references public.media_assets on delete set null,
  category text, tags text[] not null default '{}',
  seo_title text, seo_description text,
  embed_item_id uuid references public.items on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cafe_id, slug)
);
create index on public.blog_posts (cafe_id, published_at desc);
create index on public.blog_posts (cover_id);
create index on public.blog_posts (embed_item_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  cafe_id uuid,
  actor uuid,
  action text not null,
  table_name text not null,
  row_id text,
  old_data jsonb, new_data jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log (cafe_id, created_at desc);

create function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (cafe_id, actor, action, table_name, row_id, old_data, new_data)
  values ((r->>'cafe_id')::uuid, (select auth.uid()), tg_op, tg_table_name,
          coalesce(r->>'id', r->>'key'),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['settings','categories','items','item_variants','addons','benches','banners','popups',
    'blog_posts','offers','coupon_codes','rewards','referral_codes','staff_roles','media_assets','points_ledger']
  loop
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger touch before update on public.items for each row execute function public.touch_updated_at();
create trigger touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger touch before update on public.settings for each row execute function public.touch_updated_at();
