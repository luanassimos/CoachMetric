create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.studio_billing_accounts (
  studio_id text primary key references public.studios(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_checkout_session_id text,
  stripe_price_id text,
  stripe_product_id text,
  plan_key text check (plan_key in ('starter', 'growth')),
  billing_interval text check (billing_interval in ('monthly', 'annual')),
  status text not null default 'inactive',
  billing_email text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_start timestamptz,
  trial_end timestamptz,
  last_stripe_event_id text,
  last_stripe_event_type text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_billing_accounts_status_idx
  on public.studio_billing_accounts (status);

create index if not exists studio_billing_accounts_customer_idx
  on public.studio_billing_accounts (stripe_customer_id);

create index if not exists studio_billing_accounts_subscription_idx
  on public.studio_billing_accounts (stripe_subscription_id);

drop trigger if exists set_studio_billing_accounts_updated_at
  on public.studio_billing_accounts;

create trigger set_studio_billing_accounts_updated_at
before update on public.studio_billing_accounts
for each row
execute function public.set_current_timestamp_updated_at();

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  stripe_event_type text not null,
  processing_status text not null default 'processing',
  payload jsonb not null,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_stripe_webhook_events_updated_at
  on public.stripe_webhook_events;

create trigger set_stripe_webhook_events_updated_at
before update on public.stripe_webhook_events
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.studio_billing_accounts enable row level security;
alter table public.stripe_webhook_events enable row level security;
