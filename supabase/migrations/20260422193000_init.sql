-- Initial CycleIQ schema (MVP)
--
-- Generated from the previous one-shot schema.sql, now managed as a migration.

-- Enable extensions
create extension if not exists "pgcrypto";

-- User profile (maps to auth.users)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  display_name text
);

-- UI preferences (theme, presets, overrides)
create table if not exists public.ui_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  theme_mode text not null default 'system', -- light|dark|system
  theme_preset text not null default 'terminal',
  theme_tokens jsonb not null default '{}'::jsonb
);

-- Cycles
create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ticker text not null,
  state text not null,
  current_leg text,
  premium_cents bigint not null default 0,
  stock_pnl_cents bigint not null default 0,
  total_pnl_cents bigint not null default 0,
  roll_count int not null default 0
);

-- Order intents (broker-agnostic)
create table if not exists public.order_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  created_at timestamptz not null default now(),
  ticker text not null,
  intent_type text not null,
  legs text not null,
  estimated_premium_cents bigint not null default 0,
  risk_status text not null default 'pass',
  approval_status text not null default 'draft'
);

-- Executions (OMS state)
create table if not exists public.order_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intent_id uuid not null references public.order_intents(id) on delete cascade,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ticker text not null,
  oms_status text not null,
  broker text not null,
  client_order_id text not null,
  external_order_id text
);

-- Immutable events (audit)
create table if not exists public.execution_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  execution_id uuid not null references public.order_executions(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb
);

-- RLS
alter table public.profiles enable row level security;
alter table public.ui_preferences enable row level security;
alter table public.cycles enable row level security;
alter table public.order_intents enable row level security;
alter table public.order_executions enable row level security;
alter table public.execution_events enable row level security;

-- Policies: user can access only their own rows
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

create policy "ui_prefs_select_own" on public.ui_preferences
  for select using (auth.uid() = user_id);
create policy "ui_prefs_upsert_own" on public.ui_preferences
  for insert with check (auth.uid() = user_id);
create policy "ui_prefs_update_own" on public.ui_preferences
  for update using (auth.uid() = user_id);

create policy "cycles_select_own" on public.cycles
  for select using (auth.uid() = user_id);
create policy "cycles_insert_own" on public.cycles
  for insert with check (auth.uid() = user_id);
create policy "cycles_update_own" on public.cycles
  for update using (auth.uid() = user_id);
create policy "cycles_delete_own" on public.cycles
  for delete using (auth.uid() = user_id);

create policy "intents_select_own" on public.order_intents
  for select using (auth.uid() = user_id);
create policy "intents_insert_own" on public.order_intents
  for insert with check (auth.uid() = user_id);
create policy "intents_update_own" on public.order_intents
  for update using (auth.uid() = user_id);
create policy "intents_delete_own" on public.order_intents
  for delete using (auth.uid() = user_id);

create policy "exec_select_own" on public.order_executions
  for select using (auth.uid() = user_id);
create policy "exec_insert_own" on public.order_executions
  for insert with check (auth.uid() = user_id);
create policy "exec_update_own" on public.order_executions
  for update using (auth.uid() = user_id);
create policy "exec_delete_own" on public.order_executions
  for delete using (auth.uid() = user_id);

create policy "events_select_own" on public.execution_events
  for select using (auth.uid() = user_id);
create policy "events_insert_own" on public.execution_events
  for insert with check (auth.uid() = user_id);
create policy "events_delete_own" on public.execution_events
  for delete using (auth.uid() = user_id);

