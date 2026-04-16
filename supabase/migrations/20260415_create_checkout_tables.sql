create extension if not exists pgcrypto;

create table if not exists public.checkout_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  gateway text not null,
  status text not null,
  amount numeric(10,2) not null,
  payment_id text,
  customer jsonb not null default '{}'::jsonb,
  utm_params jsonb not null default '{}'::jsonb,
  request_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkout_orders_order_id on public.checkout_orders(order_id);
create index if not exists idx_checkout_orders_created_at on public.checkout_orders(created_at desc);

create table if not exists public.checkout_drafts (
  id uuid primary key default gen_random_uuid(),
  draft_id text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkout_drafts_draft_id on public.checkout_drafts(draft_id);
create index if not exists idx_checkout_drafts_created_at on public.checkout_drafts(created_at desc);

alter table public.checkout_orders enable row level security;
alter table public.checkout_drafts enable row level security;

-- API backend usa service_role para leitura/escrita; sem políticas públicas por padrão.
