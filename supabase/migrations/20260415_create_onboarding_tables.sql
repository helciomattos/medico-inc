-- ═══════════════════════════════════════════════════════════════════════════
-- Fluxo pós-venda: leads, briefings, deliveries
-- ═══════════════════════════════════════════════════════════════════════════

-- Leads capturados na landing (antes do checkout)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  source text,                          -- utm_source
  medium text,                          -- utm_medium
  campaign text,                        -- utm_campaign
  landing_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_email on public.leads(email);
create index if not exists idx_leads_created_at on public.leads(created_at desc);

-- Briefing preenchido pelo médico após pagamento
create table if not exists public.briefings (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.checkout_orders(order_id),
  doctor_name text not null,
  specialty text not null,
  city text not null,
  clinic_name text,
  differentials text,                   -- o que diferencia o médico
  target_audience text,                 -- público-alvo (particular, convênio, etc)
  services text,                        -- serviços/procedimentos principais
  phone_whatsapp text,
  address text,
  photo_urls jsonb default '[]'::jsonb, -- URLs das fotos enviadas
  brand_colors jsonb default '{}'::jsonb, -- preferências de cor
  additional_notes text,
  status text not null default 'pending', -- pending | approved | revision_requested
  submitted_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists idx_briefings_order_id on public.briefings(order_id);
create index if not exists idx_briefings_status on public.briefings(status);

-- Entregas de sites finalizados
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.checkout_orders(order_id),
  briefing_id uuid references public.briefings(id),
  preview_url text,                     -- URL do preview para aprovação
  final_url text,                       -- URL final publicada
  status text not null default 'queued', -- queued | in_progress | preview_sent | approved | published
  assigned_to text,                     -- quem da equipe está produzindo
  started_at timestamptz,
  preview_sent_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_deliveries_order_id on public.deliveries(order_id);
create index if not exists idx_deliveries_status on public.deliveries(status);

-- RLS: service_role para API, anon bloqueado
alter table public.leads enable row level security;
alter table public.briefings enable row level security;
alter table public.deliveries enable row level security;
