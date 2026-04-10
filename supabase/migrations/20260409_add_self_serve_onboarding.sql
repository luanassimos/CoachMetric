create table if not exists public.user_onboarding_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'developer_contact')),
  current_step text not null default 'welcome',
  selected_plan text
    check (selected_plan in ('starter', 'growth', 'developer')),
  preferred_billing_interval text
    check (preferred_billing_interval in ('monthly', 'annual')),
  intended_studio_count integer
    check (intended_studio_count between 1 and 15),
  studio_limit integer
    check (studio_limit between 1 and 15),
  studio_drafts jsonb not null default '[]'::jsonb,
  primary_studio_id text references public.studios(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_onboarding_states_status_idx
  on public.user_onboarding_states (status);

drop trigger if exists set_user_onboarding_states_updated_at
  on public.user_onboarding_states;

create trigger set_user_onboarding_states_updated_at
before update on public.user_onboarding_states
for each row
execute function public.set_current_timestamp_updated_at();

create table if not exists public.user_studio_ownerships (
  user_id uuid not null references auth.users(id) on delete cascade,
  studio_id text not null references public.studios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, studio_id)
);

create index if not exists user_studio_ownerships_studio_idx
  on public.user_studio_ownerships (studio_id);

alter table public.user_onboarding_states enable row level security;
alter table public.user_studio_ownerships enable row level security;

drop policy if exists "Users can view their onboarding state"
  on public.user_onboarding_states;
create policy "Users can view their onboarding state"
  on public.user_onboarding_states
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their onboarding state"
  on public.user_onboarding_states;
create policy "Users can create their onboarding state"
  on public.user_onboarding_states
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their onboarding state"
  on public.user_onboarding_states;
create policy "Users can update their onboarding state"
  on public.user_onboarding_states
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their studio ownerships"
  on public.user_studio_ownerships;
create policy "Users can view their studio ownerships"
  on public.user_studio_ownerships
  for select
  to authenticated
  using (auth.uid() = user_id);
