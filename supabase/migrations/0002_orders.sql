-- Orders, events, service requests, customers
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  cafe_id uuid not null references public.cafes on delete cascade,
  phone text unique,
  name text,
  marketing_consent boolean not null default false,
  referral_code text unique,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.profiles (cafe_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  bench_id uuid references public.benches on delete set null,
  order_no int,
  order_type text not null check (order_type in ('dine_in','takeaway','delivery')),
  status text not null default 'received' check (status in ('received','preparing','ready','served','cancelled')),
  payment_method text not null check (payment_method in ('online','counter')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','failed','refunded')),
  customer_id uuid references public.profiles on delete set null,
  guest_name text, guest_phone text,
  delivery_address text,
  note text,
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  delivery_charge numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  offer_id uuid,
  idempotency_key text not null,
  razorpay_order_id text unique,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cafe_id, idempotency_key)
);
create index on public.orders (cafe_id, status, placed_at desc);
create index on public.orders (customer_id, placed_at desc);
create index on public.orders (bench_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  item_id uuid references public.items on delete set null,
  name text not null,
  variant_name text,
  unit_price numeric(10,2) not null,
  qty int not null check (qty > 0),
  addons jsonb not null default '[]',
  note text
);
create index on public.order_items (order_id);
create index on public.order_items (item_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders on delete cascade,
  status text not null,
  actor uuid,
  created_at timestamptz not null default now()
);
create index on public.order_events (order_id);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  bench_id uuid not null references public.benches on delete cascade,
  kind text not null check (kind in ('waiter','bill')),
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now()
);
create index on public.service_requests (cafe_id, status, created_at desc);
create index on public.service_requests (bench_id);

create table public.favourites (
  user_id uuid not null references public.profiles on delete cascade,
  item_id uuid not null references public.items on delete cascade,
  primary key (user_id, item_id)
);
create index on public.favourites (item_id);
