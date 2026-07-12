-- ============================================================================
--  Ginkgo — Operations: Certifications, Equipment, Permits, Contracts,
--  Quote Follow-up
--
--  Run this in Supabase: Project -> SQL Editor -> New query -> paste -> Run.
--  Safe to run more than once — every statement is "if not exists" or
--  "create or replace".
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Make sure the helper functions used by the policies below exist.
--    (These normally come from supabase_migration_teams.sql — recreating
--    them here, identically, means this file no longer depends on that one
--    having been run first.)
-- ----------------------------------------------------------------------------
create or replace function public.current_team_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.team_members where profile_id = auth.uid() and active = true limit 1;
$$;

create or replace function public.current_team_member_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.team_members where profile_id = auth.uid() and active = true limit 1;
$$;

-- ----------------------------------------------------------------------------
-- 1. Quote follow-up tracking
-- ----------------------------------------------------------------------------
alter table public.quotes add column if not exists follow_up_date date;
alter table public.quotes add column if not exists follow_up_note text not null default '';

-- ----------------------------------------------------------------------------
-- 2. Team certifications (chainsaw ticket, EWP licence, first aid, etc.)
-- ----------------------------------------------------------------------------
create table if not exists public.team_certifications (
  id              uuid primary key default gen_random_uuid(),
  team_member_id  uuid not null references public.team_members(id) on delete cascade,
  cert_type       text not null default 'Other',
  cert_label      text not null default '',   -- used when cert_type = 'Other'
  cert_number     text not null default '',
  issued_date     date,
  expiry_date     date,
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists team_certifications_member_idx on public.team_certifications (team_member_id);

alter table public.team_certifications enable row level security;
drop policy if exists "team_certifications_select" on public.team_certifications;
drop policy if exists "team_certifications_insert" on public.team_certifications;
drop policy if exists "team_certifications_update" on public.team_certifications;
drop policy if exists "team_certifications_delete" on public.team_certifications;

create policy "team_certifications_select" on public.team_certifications for select to authenticated using (true);
create policy "team_certifications_insert" on public.team_certifications for insert to authenticated with check (true);
create policy "team_certifications_update" on public.team_certifications for update to authenticated using (true);
create policy "team_certifications_delete" on public.team_certifications for delete to authenticated using (
  public.current_team_role() in ('admin','supervisor')
);

-- ----------------------------------------------------------------------------
-- 3. Equipment register
-- ----------------------------------------------------------------------------
create table if not exists public.equipment (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null default '',
  category           text not null default 'Other', -- Chainsaw | Chipper | Stump Grinder | EWP | Climbing Gear | Vehicle | Trailer | Other
  serial_number      text not null default '',
  purchase_date      date,
  last_service_date  date,
  next_service_due   date,
  status             text not null default 'active', -- active | in-repair | retired
  notes              text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

alter table public.equipment enable row level security;
drop policy if exists "equipment_select" on public.equipment;
drop policy if exists "equipment_insert" on public.equipment;
drop policy if exists "equipment_update" on public.equipment;
drop policy if exists "equipment_delete" on public.equipment;

create policy "equipment_select" on public.equipment for select to authenticated using (true);
create policy "equipment_insert" on public.equipment for insert to authenticated with check (true);
create policy "equipment_update" on public.equipment for update to authenticated using (true);
create policy "equipment_delete" on public.equipment for delete to authenticated using (
  public.current_team_role() in ('admin','supervisor')
);

-- ----------------------------------------------------------------------------
-- 4. Permit tracker (council / authority approvals, tied to a site)
-- ----------------------------------------------------------------------------
create table if not exists public.permits (
  id                uuid primary key default gen_random_uuid(),
  site_id           uuid not null references public.sites(id) on delete cascade,
  permit_type       text not null default 'Removal', -- Removal | Pruning | Other
  authority         text not null default '',
  reference_number  text not null default '',
  status            text not null default 'draft', -- draft | submitted | approved | rejected | expired
  submitted_date    date,
  decision_date     date,
  expiry_date       date,
  conditions        text not null default '',
  notes             text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists permits_site_idx on public.permits (site_id);

alter table public.permits enable row level security;
drop policy if exists "permits_select" on public.permits;
drop policy if exists "permits_insert" on public.permits;
drop policy if exists "permits_update" on public.permits;
drop policy if exists "permits_delete" on public.permits;

create policy "permits_select" on public.permits for select to authenticated using (true);
create policy "permits_insert" on public.permits for insert to authenticated with check (true);
create policy "permits_update" on public.permits for update to authenticated using (true);
create policy "permits_delete" on public.permits for delete to authenticated using (
  public.current_team_role() in ('admin','supervisor')
);

-- ----------------------------------------------------------------------------
-- 5. Recurring maintenance contracts (tied to a site)
-- ----------------------------------------------------------------------------
create table if not exists public.contracts (
  id                  uuid primary key default gen_random_uuid(),
  site_id             uuid not null references public.sites(id) on delete cascade,
  title               text not null default '',
  frequency_months    integer not null default 12,
  next_due_date       date not null default current_date,
  job_type            text not null default 'assessment',
  default_assigned_to text[] not null default '{}',
  notes               text not null default '',
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create index if not exists contracts_site_idx on public.contracts (site_id);
create index if not exists contracts_due_idx on public.contracts (next_due_date) where active = true;

alter table public.contracts enable row level security;
drop policy if exists "contracts_select" on public.contracts;
drop policy if exists "contracts_insert" on public.contracts;
drop policy if exists "contracts_update" on public.contracts;
drop policy if exists "contracts_delete" on public.contracts;

create policy "contracts_select" on public.contracts for select to authenticated using (true);
create policy "contracts_insert" on public.contracts for insert to authenticated with check (true);
create policy "contracts_update" on public.contracts for update to authenticated using (true);
create policy "contracts_delete" on public.contracts for delete to authenticated using (
  public.current_team_role() in ('admin','supervisor')
);

-- ============================================================================
--  Done. Adds: quotes.follow_up_date / follow_up_note, and four new tables —
--  team_certifications, equipment, permits, contracts. Nothing existing is
--  touched or removed.
-- ============================================================================
