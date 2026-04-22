-- Wheel Level 3 (terminal simulation)
-- Adds strategy params, market snapshots, option chains, and wheel events.

create extension if not exists "pgcrypto";

-- Strategy params per cycle
create table if not exists public.cycle_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  contracts int not null default 1,
  target_dte int not null default 30,
  target_delta numeric not null default 0.25,

  put_width numeric,
  call_width numeric,

  roll_days_before int not null default 7,
  take_profit_pct numeric not null default 0.5,
  stop_loss_pct numeric
);

create unique index if not exists cycle_strategies_user_cycle_unique
  on public.cycle_strategies(user_id, cycle_id);

-- Market snapshot: deterministic by seed + as_of_date
create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  as_of_date date not null,
  seed text not null default 'default',
  underlyings jsonb not null default '{}'::jsonb
);

create unique index if not exists market_snapshots_user_date_seed_unique
  on public.market_snapshots(user_id, as_of_date, seed);

-- Option chain data tied to a snapshot
create table if not exists public.option_chains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id uuid not null references public.market_snapshots(id) on delete cascade,
  created_at timestamptz not null default now(),
  ticker text not null,
  expiry date not null,
  right text not null, -- PUT | CALL
  strikes jsonb not null default '{}'::jsonb
);

create index if not exists option_chains_user_snapshot_ticker_idx
  on public.option_chains(user_id, snapshot_id, ticker);

-- Wheel lifecycle events (cycle-centric)
create table if not exists public.wheel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists wheel_events_user_cycle_created_idx
  on public.wheel_events(user_id, cycle_id, created_at desc);

-- RLS
alter table public.cycle_strategies enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.option_chains enable row level security;
alter table public.wheel_events enable row level security;

-- Policies: user can access only their own rows
create policy "cycle_strategies_select_own" on public.cycle_strategies
  for select using (auth.uid() = user_id);
create policy "cycle_strategies_insert_own" on public.cycle_strategies
  for insert with check (auth.uid() = user_id);
create policy "cycle_strategies_update_own" on public.cycle_strategies
  for update using (auth.uid() = user_id);
create policy "cycle_strategies_delete_own" on public.cycle_strategies
  for delete using (auth.uid() = user_id);

create policy "market_snapshots_select_own" on public.market_snapshots
  for select using (auth.uid() = user_id);
create policy "market_snapshots_insert_own" on public.market_snapshots
  for insert with check (auth.uid() = user_id);
create policy "market_snapshots_update_own" on public.market_snapshots
  for update using (auth.uid() = user_id);
create policy "market_snapshots_delete_own" on public.market_snapshots
  for delete using (auth.uid() = user_id);

create policy "option_chains_select_own" on public.option_chains
  for select using (auth.uid() = user_id);
create policy "option_chains_insert_own" on public.option_chains
  for insert with check (auth.uid() = user_id);
create policy "option_chains_update_own" on public.option_chains
  for update using (auth.uid() = user_id);
create policy "option_chains_delete_own" on public.option_chains
  for delete using (auth.uid() = user_id);

create policy "wheel_events_select_own" on public.wheel_events
  for select using (auth.uid() = user_id);
create policy "wheel_events_insert_own" on public.wheel_events
  for insert with check (auth.uid() = user_id);
create policy "wheel_events_delete_own" on public.wheel_events
  for delete using (auth.uid() = user_id);

