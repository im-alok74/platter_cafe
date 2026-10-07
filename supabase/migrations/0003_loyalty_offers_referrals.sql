-- Loyalty ledger, offers, coupons, referrals
create table public.points_ledger (
  id bigint generated always as identity primary key,
  cafe_id uuid not null references public.cafes on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  order_id uuid references public.orders on delete set null,
  kind text not null check (kind in ('earn','redeem','expire','reverse','adjust')),
  points int not null check (points <> 0),
  reason text,
  actor uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.points_ledger (user_id, created_at desc);
create index on public.points_ledger (order_id);
create index on public.points_ledger (cafe_id);
-- one earn and one reversal per order, so retries and duplicate webhooks cannot double-credit
create unique index points_one_earn_per_order on public.points_ledger (order_id) where kind = 'earn';
create unique index points_one_reverse_per_order on public.points_ledger (order_id) where kind = 'reverse';

create view public.points_balance with (security_invoker = true) as
  select user_id, sum(points)::int as balance from public.points_ledger group by user_id;

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  name text not null,
  points_cost int not null check (points_cost > 0),
  active boolean not null default true
);
create index on public.rewards (cafe_id);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  order_id uuid references public.orders on delete set null,
  reward_id uuid references public.rewards on delete set null,
  points int not null check (points > 0),
  created_at timestamptz not null default now()
);
create index on public.redemptions (user_id);
create index on public.redemptions (cafe_id);
create index on public.redemptions (order_id);
create index on public.redemptions (reward_id);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  name text not null,
  type text not null check (type in ('percent','flat','free_item','bxgy','combo','happy_hour')),
  config jsonb not null default '{}',
  min_order numeric(10,2) not null default 0,
  max_discount numeric(10,2),
  order_types text[] not null default '{dine_in,takeaway,delivery}',
  item_ids uuid[] not null default '{}',
  category_ids uuid[] not null default '{}',
  days smallint[] not null default '{0,1,2,3,4,5,6}',
  start_time time, end_time time,
  starts_at timestamptz, ends_at timestamptz,
  usage_limit int, per_customer_limit int,
  automatic boolean not null default false,
  paused boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.offers (cafe_id, paused);

create table public.coupon_codes (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  offer_id uuid not null references public.offers on delete cascade,
  code text not null,
  unique (cafe_id, code)
);
create index on public.coupon_codes (offer_id);

create table public.offer_redemptions (
  id bigint generated always as identity primary key,
  cafe_id uuid not null references public.cafes on delete cascade,
  offer_id uuid not null references public.offers on delete cascade,
  order_id uuid not null references public.orders on delete cascade,
  user_id uuid references public.profiles on delete set null,
  discount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  unique (offer_id, order_id)
);
create index on public.offer_redemptions (cafe_id);
create index on public.offer_redemptions (order_id);
create index on public.offer_redemptions (user_id);

-- owner_id null = special code (influencer, event, staff)
create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  code text not null,
  owner_id uuid references public.profiles on delete cascade,
  label text,
  reward_points int, usage_limit int, expires_at timestamptz,
  active boolean not null default true,
  unique (cafe_id, code)
);
create index on public.referral_codes (owner_id);

-- referred_id unique = one referral per customer
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  code_id uuid not null references public.referral_codes on delete cascade,
  referred_id uuid not null unique references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','rewarded','flagged','rejected')),
  created_at timestamptz not null default now()
);
create index on public.referrals (cafe_id, status);
create index on public.referrals (code_id);

create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes on delete cascade,
  referral_id uuid not null references public.referrals on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  points int not null,
  created_at timestamptz not null default now(),
  unique (referral_id, user_id)
);
create index on public.referral_rewards (cafe_id);
create index on public.referral_rewards (user_id);
