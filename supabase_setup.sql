-- ============================================================================
--  ArborPro — Supabase database setup
--  Paste this whole file into your Supabase project's SQL Editor and press Run.
--  Safe to run more than once (it uses "if not exists" / "on conflict").
--  It creates every table the app needs, the login/profile link, the photo
--  storage bucket, and the security rules (including the client portal).
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

-- Profiles: one row per login, linked to Supabase's built-in auth users.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  role        text not null default 'user',          -- admin | user | guest
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete set null,
  name        text not null default '',
  email       text,
  phone       text,
  role        text not null default 'arborist',       -- admin | arborist | supervisor | apprentice
  colour      text not null default '#5a8f5a',
  active       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.sites (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null default '',
  description          text not null default '',
  address              text not null default '',
  client_name          text not null default '',
  client_phone         text not null default '',
  client_email         text not null default '',
  client_portal_token  text unique default gen_random_uuid()::text,
  portal_enabled       boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create table if not exists public.reports (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid references public.sites(id) on delete set null,
  title            text not null default '',
  client_name      text not null default '',
  address          text not null default '',
  inspector        text not null default '',
  date             text not null default '',
  tree_data        jsonb not null default '{}'::jsonb,
  recommendations  text[] not null default '{}',
  status           text not null default 'draft',      -- draft | in-progress | completed
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid references public.reports(id) on delete cascade,
  site_id       uuid references public.sites(id) on delete cascade,
  storage_path  text not null default '',
  url           text not null default '',
  caption       text not null default '',
  category      text not null default 'other',         -- overview | trunk | crown | roots | damage | other
  tree_tag      text not null default '',
  taken_at      timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create table if not exists public.jobs (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid references public.sites(id) on delete set null,
  title            text not null default '',
  client_name      text not null default '',
  location         text not null default '',
  date             text not null default '',
  start_time       text not null default '',
  end_time         text not null default '',
  time_spent       numeric not null default 0,
  work_completed   text not null default '',
  work_to_complete text not null default '',
  notes            text not null default '',
  status           text not null default 'scheduled',   -- scheduled | in-progress | completed | cancelled
  job_type         text not null default 'assessment',  -- assessment | pruning | removal | treatment | consultation | emergency | other
  hourly_rate      numeric not null default 0,
  total_cost       numeric not null default 0,
  assigned_to      text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create table if not exists public.daily_risks (
  id                uuid primary key default gen_random_uuid(),
  site_address      text not null default '',
  date              text not null default '',
  client_name       text not null default '',
  client_mobile     text not null default '',
  first_aid_location text not null default '',
  nearest_hospital  text not null default '',
  hazards           jsonb not null default '{}'::jsonb,
  hazard_controls   jsonb not null default '[]'::jsonb,
  signatures        jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create table if not exists public.quotes (
  id                   uuid primary key default gen_random_uuid(),
  client_name          text not null default '',
  address              text not null default '',
  mobile               text not null default '',
  site_contact         text not null default '',
  scheduled_date       text not null default '',
  scheduled_time       text not null default '',
  job_description      jsonb not null default '[]'::jsonb,
  additional_equipment text not null default '',
  access_parking       text not null default '',
  status               text not null default 'new',      -- new | scheduled | completed
  archived             boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.chlorophyll_readings (
  id               uuid primary key default gen_random_uuid(),
  tree_id          text not null default '',
  tree_species     text not null default '',
  tree_location    text not null default '',
  tree_maturity    text not null default 'Mature',       -- Juvenile | Semi mature | Mature | Senescent
  date             text not null default '',
  chlorophyll_level numeric not null default 0,
  extension_growth numeric not null default 0,
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

-- ----------------------------------------------------------------------------
-- Auto-create a profile row whenever someone signs up
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Guest'
    ),
    coalesce(new.email, ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Row Level Security
--   * Signed-in staff can do everything.
--   * The public client portal can read ONLY sites that have the portal
--     switched on, plus the reports and photos belonging to those sites.
-- ----------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.team_members         enable row level security;
alter table public.sites                enable row level security;
alter table public.reports              enable row level security;
alter table public.photos               enable row level security;
alter table public.jobs                 enable row level security;
alter table public.daily_risks          enable row level security;
alter table public.quotes               enable row level security;
alter table public.chlorophyll_readings enable row level security;

-- Staff (any signed-in user) full access
do $$
declare t text;
begin
  foreach t in array array[
    'team_members','sites','reports','photos','jobs',
    'daily_risks','quotes','chlorophyll_readings'
  ]
  loop
    execute format('drop policy if exists "staff_all" on public.%I', t);
    execute format(
      'create policy "staff_all" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- Profiles: staff can read all; each user can create/update their own row
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_write_own" on public.profiles;
create policy "profiles_write_own" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (auth.uid() = id);

-- Public client portal (anonymous) read access, scoped to enabled sites
drop policy if exists "portal_read_sites" on public.sites;
create policy "portal_read_sites" on public.sites for select to anon
  using (portal_enabled = true);

drop policy if exists "portal_read_reports" on public.reports;
create policy "portal_read_reports" on public.reports for select to anon
  using (site_id in (select id from public.sites where portal_enabled = true));

drop policy if exists "portal_read_photos" on public.photos;
create policy "portal_read_photos" on public.photos for select to anon
  using (site_id in (select id from public.sites where portal_enabled = true));

-- ----------------------------------------------------------------------------
-- Photo storage bucket (public read so images show in reports and the portal)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos_public_read" on storage.objects;
create policy "photos_public_read" on storage.objects for select to public
  using (bucket_id = 'photos');

drop policy if exists "photos_auth_insert" on storage.objects;
create policy "photos_auth_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos');

drop policy if exists "photos_auth_update" on storage.objects;
create policy "photos_auth_update" on storage.objects for update to authenticated
  using (bucket_id = 'photos');

drop policy if exists "photos_auth_delete" on storage.objects;
create policy "photos_auth_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos');

-- ============================================================================
--  Done. Create your first login in Authentication -> Users (or via the app's
--  sign-up screen, using one of the invite codes in the app: ARBOR2024).
-- ============================================================================
